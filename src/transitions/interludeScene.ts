import { scrollConfig } from "./config";
import { interludeStyle, type Interlude } from "./interludes";
import { clamp, lerp, smoothstep } from "./math";

const SVG = "http://www.w3.org/2000/svg";

type Point = { x: number; y: number };

type LineLayout = {
  /** Text size, in pixels, when the line sits at its own size on screen. */
  size: number;
  /** Center of the focus word, relative to the line's center, at that size. */
  focus: Point;
  group: SVGGElement;
  focusSpan: SVGTSpanElement;
};

type Layout = {
  lines: LineLayout[];
  /** Deepest point inside the ink of the last focus word, relative to its line's center. */
  ink: Point;
  /** Distance from that point to the nearest edge of the ink, in pixels at line size. */
  depth: number;
  maskGroup: SVGGElement;
  maskFocus: SVGTSpanElement;
};

/** What the engine must show behind the interlude. */
export type InterludeView = {
  /** The frame being left is visible behind the scene, growing by sourceGrow. */
  source: boolean;
  sourceGrow: number;
  /** The frame ahead is visible behind the scene. */
  dest: boolean;
};

function svg<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string> = {}) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function mixHex(a: string, b: string, t: number) {
  const parse = (hex: string) => {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16));
  };
  const [ra, ga, ba] = parse(a);
  const [rb, gb, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(lerp(x, y, clamp(t)));
  return `rgb(${mix(ra, rb)}, ${mix(ga, gb)}, ${mix(ba, bb)})`;
}

function fontFor(size: number, italic: boolean) {
  return `${italic ? "italic " : ""}400 ${size}px "${interludeStyle.font}", serif`;
}

let measureCanvas: HTMLCanvasElement | null = null;
function context() {
  measureCanvas ??= document.createElement("canvas");
  return measureCanvas.getContext("2d")!;
}

/**
 * Deepest point inside the ink of `word`, found with a chamfer distance
 * transform on a canvas rendering. Coordinates are relative to the start of
 * the word on its baseline, at text size `size`.
 */
function deepestInk(word: string, size: number, italic: boolean, letter?: number) {
  const scale = Math.min(4, 420 / size);
  const px = size * scale;
  const ctx = context();
  ctx.font = fontFor(px, italic);
  const metrics = ctx.measureText(word);
  const pad = Math.ceil(px * 0.25);
  const left = Math.ceil(metrics.actualBoundingBoxLeft);
  const width = Math.ceil(metrics.actualBoundingBoxRight + left) + pad * 2;
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent);
  const height = Math.ceil(ascent + metrics.actualBoundingBoxDescent) + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const draw = canvas.getContext("2d", { willReadFrequently: true })!;
  draw.font = fontFor(px, italic);
  draw.fillStyle = "#fff";
  const originX = pad + left;
  const originY = pad + ascent;
  draw.fillText(word, originX, originY);
  const pixels = draw.getImageData(0, 0, canvas.width, canvas.height).data;

  const w = canvas.width;
  const h = canvas.height;
  const far = 1e9;
  const dist = new Float32Array(w * h);
  for (let index = 0; index < w * h; index += 1) dist[index] = pixels[index * 4 + 3] > 127 ? far : 0;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const at = y * w + x;
      if (dist[at] === 0) continue;
      let best = dist[at];
      if (x > 0) best = Math.min(best, dist[at - 1] + 1);
      if (y > 0) {
        best = Math.min(best, dist[at - w] + 1);
        if (x > 0) best = Math.min(best, dist[at - w - 1] + diagonal);
        if (x < w - 1) best = Math.min(best, dist[at - w + 1] + diagonal);
      }
      dist[at] = best;
    }
  }
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = w - 1; x >= 0; x -= 1) {
      const at = y * w + x;
      if (dist[at] === 0) continue;
      let best = dist[at];
      if (x < w - 1) best = Math.min(best, dist[at + 1] + 1);
      if (y < h - 1) {
        best = Math.min(best, dist[at + w] + 1);
        if (x < w - 1) best = Math.min(best, dist[at + w + 1] + diagonal);
        if (x > 0) best = Math.min(best, dist[at + w - 1] + diagonal);
      }
      dist[at] = best;
    }
  }

  let fromX = 0;
  let toX = w;
  if (letter !== undefined && letter >= 0 && letter < word.length) {
    fromX = Math.floor(originX + ctx.measureText(word.slice(0, letter)).width);
    toX = Math.ceil(originX + ctx.measureText(word.slice(0, letter + 1)).width);
  }
  let bestAt = -1;
  let bestDepth = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = Math.max(0, fromX); x < Math.min(w, toX); x += 1) {
      const value = dist[y * w + x];
      if (value > bestDepth && value < far) {
        bestDepth = value;
        bestAt = y * w + x;
      }
    }
  }
  if (bestAt < 0) return { x: 0, y: -size * 0.3, depth: size * 0.04 };
  return {
    x: ((bestAt % w) - originX) / scale,
    y: (Math.floor(bestAt / w) - originY) / scale,
    depth: bestDepth / scale,
  };
}

let maskCount = 0;

/**
 * The dark scene between two frames in variant d. Each line is centered on
 * screen at its own size; line k + 1 sits inside the focus word of line k at
 * 1 / zoomPerLine of the size, so one continuous camera zoom carries the eye
 * from one line into the next. The last focus word is cut out of the
 * background, so the next frame shows through its letters, and the camera
 * dives into the thickest stroke until the frame fills the screen.
 */
export class InterludeScene {
  private readonly root = document.createElement("div");
  private readonly svgRoot = svg("svg", { class: "txd-svg" });
  private readonly mask = svg("mask");
  private readonly maskRect = svg("rect", { fill: "#fff" });
  private readonly bg = svg("rect", { class: "txd-bg" });
  private readonly linesRoot = svg("g");
  private readonly maskId = `txd-mask-${(maskCount += 1)}`;
  private interlude: Interlude | null = null;
  private layout: Layout | null = null;
  private tint = interludeStyle.base;
  private width = 0;
  private height = 0;
  private shown = false;

  constructor(stage: HTMLElement) {
    this.root.className = "txd-layer";
    this.root.setAttribute("aria-hidden", "true");
    this.mask.id = this.maskId;
    this.mask.setAttribute("maskUnits", "userSpaceOnUse");
    this.mask.setAttribute("maskContentUnits", "userSpaceOnUse");
    this.mask.append(this.maskRect);
    const defs = svg("defs");
    defs.append(this.mask);
    this.svgRoot.append(defs, this.bg, this.linesRoot);
    this.root.append(this.svgRoot);
    stage.append(this.root);
  }

  destroy() {
    this.root.remove();
  }

  /** Scroll length of a pair, in screen heights. */
  static length(interlude: Interlude | null) {
    if (!interlude || interlude.lines.length === 0) return scrollConfig.plain;
    return scrollConfig.enter + interlude.lines.length * scrollConfig.perLine;
  }

  /** Positions of the stops inside a pair: each line at its own size. */
  static stops(interlude: Interlude | null) {
    if (!interlude || interlude.lines.length === 0) return [];
    return interlude.lines.map((_, index) => scrollConfig.enter + index * scrollConfig.perLine);
  }

  set(interlude: Interlude | null, tint: string) {
    this.tint = tint;
    if (interlude === this.interlude && this.layout) return;
    this.interlude = interlude;
    this.build();
  }

  measure() {
    this.build();
  }

  private build() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.width = width;
    this.height = height;
    this.svgRoot.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svgRoot.setAttribute("width", String(width));
    this.svgRoot.setAttribute("height", String(height));
    for (const rect of [this.maskRect, this.bg]) {
      rect.setAttribute("x", "0");
      rect.setAttribute("y", "0");
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", String(height));
    }
    for (const [key, value] of Object.entries({ x: "0", y: "0", width: String(width), height: String(height) })) {
      this.mask.setAttribute(key, value);
    }
    this.linesRoot.replaceChildren();
    this.mask.replaceChildren(this.maskRect);
    this.layout = null;
    const interlude = this.interlude;
    if (!interlude || interlude.lines.length === 0) return;

    const style = interludeStyle;
    const ctx = context();
    const lines: LineLayout[] = [];
    let maskGroup: SVGGElement | null = null;
    let maskFocus: SVGTSpanElement | null = null;
    let ink = { x: 0, y: 0, depth: 1 };

    interlude.lines.forEach((line, index) => {
      const at = line.text.indexOf(line.focus);
      const before = at >= 0 ? line.text.slice(0, at) : line.text;
      const focus = at >= 0 ? line.focus : "";
      const after = at >= 0 ? line.text.slice(at + line.focus.length) : "";
      const italic = style.focusItalic;
      const measure = (text: string, slant: boolean, size: number) => {
        ctx.font = fontFor(size, slant);
        return ctx.measureText(text);
      };
      const widthAt = (size: number) =>
        measure(before, false, size).width + measure(focus, italic, size).width + measure(after, false, size).width;
      const probe = 100;
      const size = Math.min(
        style.maxSize,
        (width * style.widthShare * probe) / Math.max(1, widthAt(probe)),
        height * style.heightShare,
      );
      const plain = measure(line.text, false, size);
      const ascent = plain.actualBoundingBoxAscent;
      const descent = plain.actualBoundingBoxDescent;
      const total = widthAt(size);
      const x0 = -total / 2;
      const baseline = (ascent - descent) / 2;
      const beforeW = measure(before, false, size).width;
      const focusMetrics = measure(focus, italic, size);
      const focusW = focusMetrics.width;
      const focusCenter = {
        x: x0 + beforeW + focusW / 2,
        y: baseline - (focusMetrics.actualBoundingBoxAscent - focusMetrics.actualBoundingBoxDescent) / 2,
      };

      const makeText = (fills: [string, string, string]) => {
        const text = svg("text", {
          "font-family": `"${style.font}", serif`,
          "font-size": size.toFixed(3),
          "font-weight": "400",
        });
        const spans = [
          { value: before, x: x0, slant: false, fill: fills[0] },
          { value: focus, x: x0 + beforeW, slant: italic, fill: fills[1] },
          { value: after, x: x0 + beforeW + focusW, slant: false, fill: fills[2] },
        ].map((part) => {
          const span = svg("tspan", {
            x: part.x.toFixed(3),
            y: baseline.toFixed(3),
            fill: part.fill,
          });
          if (part.slant) span.setAttribute("font-style", "italic");
          span.textContent = part.value;
          return span;
        });
        text.append(...spans);
        return { text, focusSpan: spans[1] };
      };

      const group = svg("g", { class: "txd-line" });
      const visible = makeText([style.textColor, style.textColor, style.textColor]);
      group.append(visible.text);
      this.linesRoot.append(group);
      lines.push({ size, focus: focusCenter, group, focusSpan: visible.focusSpan });

      if (index === interlude.lines.length - 1) {
        maskGroup = svg("g");
        const hole = makeText(["#fff", "#000", "#fff"]);
        maskGroup.append(hole.text);
        this.mask.append(maskGroup);
        maskFocus = hole.focusSpan;
        const deep = deepestInk(focus || line.text, size, italic && Boolean(focus), interlude.letter);
        ink = { x: x0 + (focus ? beforeW : 0) + deep.x, y: baseline + deep.y, depth: Math.max(0.5, deep.depth) };
      }
    });

    this.layout = {
      lines,
      ink: { x: ink.x, y: ink.y },
      depth: ink.depth,
      maskGroup: maskGroup!,
      maskFocus: maskFocus!,
    };
  }

  hide() {
    if (!this.shown) return;
    this.shown = false;
    this.root.classList.remove("is-on");
  }

  /**
   * x is the scroll position inside the pair, in screen heights, from 0 to
   * InterludeScene.length(). Returns which frames must show behind it.
   */
  render(x: number, reduced: boolean): InterludeView {
    if (!this.shown) {
      this.shown = true;
      this.root.classList.add("is-on");
    }
    const style = interludeStyle;
    const interlude = this.interlude;
    const total = InterludeScene.length(interlude);
    const depth = clamp(x / total);
    this.bg.setAttribute("fill", mixHex(style.base, this.tint, style.tint * Math.pow(depth, 1.2)));

    const layout = this.layout;
    if (!interlude || !layout) {
      const u = clamp(x / total);
      this.root.style.opacity = (u < 0.5 ? smoothstep(0, 0.5, u) : 1 - smoothstep(0.5, 1, u)).toFixed(4);
      this.bg.removeAttribute("mask");
      return { source: u < 0.5, sourceGrow: 0, dest: u >= 0.5 };
    }

    const n = layout.lines.length;
    const enter = scrollConfig.enter;
    const per = scrollConfig.perLine;
    const center = { x: this.width / 2, y: this.height / 2 };
    const opacity = layout.lines.map(() => 0);
    const transforms = layout.lines.map(() => ({ x: center.x, y: center.y, s: 1 }));
    let hole = 0;
    let layerOpacity = 1;
    const view: InterludeView = { source: false, sourceGrow: 0, dest: false };

    // World: line k is centered at world[k] with scale scales[k].
    const zoom = style.zoomPerLine;
    const world: Point[] = [{ x: 0, y: 0 }];
    const scales = [1];
    for (let index = 1; index < n; index += 1) {
      const prev = layout.lines[index - 1];
      world.push({
        x: world[index - 1].x + scales[index - 1] * prev.focus.x,
        y: world[index - 1].y + scales[index - 1] * prev.focus.y,
      });
      scales.push(scales[index - 1] / zoom);
    }
    const place = (camera: { tx: number; ty: number; c: number }) => {
      layout.lines.forEach((_, index) => {
        transforms[index] = {
          x: camera.tx + camera.c * world[index].x,
          y: camera.ty + camera.c * world[index].y,
          s: camera.c * scales[index],
        };
      });
    };

    if (x < enter) {
      const e = smoothstep(0, 1, x / enter);
      view.source = true;
      view.sourceGrow = reduced ? 0 : style.sourceGrow * e;
      layerOpacity = e;
      opacity[0] = 1;
      const c = reduced ? 1 : lerp(style.enterScale, 1, e);
      place({ tx: center.x, ty: center.y, c });
      if (n === 1) hole = 0;
    } else {
      const along = (x - enter) / per;
      const k = Math.min(n - 1, Math.floor(along));
      const u = clamp(along - k);
      const last = k === n - 1;
      if (reduced) {
        layout.lines.forEach((_, index) => {
          transforms[index] = { x: center.x, y: center.y, s: 1 };
        });
        if (last) {
          opacity[k] = 1;
          hole = smoothstep(0, 0.4, u);
          layerOpacity = 1 - smoothstep(0.3, 1, u);
          view.dest = true;
        } else {
          opacity[k] = 1 - smoothstep(0, 0.5, u);
          opacity[k + 1] = smoothstep(0.5, 1, u);
        }
      } else {
        const line = layout.lines[k];
        const target = last ? layout.ink : line.focus;
        const f = { x: world[k].x + scales[k] * target.x, y: world[k].y + scales[k] * target.y };
        const c0 = 1 / scales[k];
        const reach = last
          ? Math.max(zoom, (1.15 * Math.hypot(this.width, this.height)) / 2 / layout.depth)
          : zoom;
        const c = c0 * Math.pow(reach, u);
        const start = { x: center.x + target.x, y: center.y + target.y };
        const pan = smoothstep(0, 1, u);
        const sx = lerp(start.x, center.x, pan);
        const sy = lerp(start.y, center.y, pan);
        place({ tx: sx - c * f.x, ty: sy - c * f.y, c });
        if (last) {
          opacity[k] = 1;
          hole = smoothstep(0, style.holeOpen, u);
          layerOpacity = 1 - smoothstep(1 - style.handOver, 1, u);
          view.dest = true;
        } else {
          opacity[k] = 1 - smoothstep(style.currentOut[0], style.currentOut[1], u);
          opacity[k + 1] = smoothstep(style.nextIn[0], style.nextIn[1], u);
        }
      }
    }

    layout.lines.forEach((line, index) => {
      const t = transforms[index];
      const visible = opacity[index] > 0.002;
      line.group.style.display = visible ? "" : "none";
      if (!visible) return;
      line.group.setAttribute("transform", `translate(${t.x.toFixed(3)} ${t.y.toFixed(3)}) scale(${t.s.toFixed(6)})`);
      line.group.setAttribute("opacity", opacity[index].toFixed(4));
    });

    const lastLine = layout.lines[n - 1];
    if (hole > 0.001) {
      const t = transforms[n - 1];
      layout.maskGroup.setAttribute("transform", `translate(${t.x.toFixed(3)} ${t.y.toFixed(3)}) scale(${t.s.toFixed(6)})`);
      const level = Math.round((1 - hole) * 255);
      layout.maskFocus.setAttribute("fill", `rgb(${level}, ${level}, ${level})`);
      this.bg.setAttribute("mask", `url(#${this.maskId})`);
      lastLine.focusSpan.setAttribute("fill-opacity", (1 - hole).toFixed(4));
    } else {
      this.bg.removeAttribute("mask");
      lastLine.focusSpan.setAttribute("fill-opacity", "1");
    }
    this.root.style.opacity = layerOpacity < 0.999 ? layerOpacity.toFixed(4) : "";
    return view;
  }
}
