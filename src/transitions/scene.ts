import { frameAt, type FramePalette, type VariantConfig } from "./config";
import { clamp, cubicBezier, latchHump, lerp, smoothstep } from "./math";

function paletteCss(palette: FramePalette, softness: number) {
  const blobs = palette.blobs.map((blob) => {
    const r = blob.r * softness * 100;
    return `radial-gradient(ellipse ${r}% ${r}% at ${blob.x * 100}% ${blob.y * 100}%, ${blob.color} 0%, transparent 100%)`;
  });
  return [...blobs, palette.base].join(", ");
}

const COPIED_STYLES = [
  "object-fit",
  "object-position",
  "filter",
  "border-radius",
  "mask-image",
  "mask-size",
  "mask-repeat",
  "mask-position",
  "mask-mode",
  "-webkit-mask-image",
  "-webkit-mask-size",
  "-webkit-mask-repeat",
  "-webkit-mask-position",
  "background",
];

function copyLook(from: Element, to: HTMLElement) {
  const computed = getComputedStyle(from);
  for (const name of COPIED_STYLES) {
    const value = computed.getPropertyValue(name);
    if (value) to.style.setProperty(name, value);
  }
}

/** The copy lives outside its frame, so it carries the custom properties it inherited there. */
function copyCustomProperties(from: Element, to: HTMLElement) {
  const computed = getComputedStyle(from);
  for (let index = 0; index < computed.length; index += 1) {
    const name = computed[index];
    if (name.startsWith("--")) to.style.setProperty(name, computed.getPropertyValue(name));
  }
}

function cloneMain(main: HTMLElement) {
  if (main instanceof HTMLImageElement) {
    const image = document.createElement("img");
    image.src = main.currentSrc || main.src;
    image.alt = "";
    image.draggable = false;
    copyLook(main, image);
    return image;
  }
  const copy = main.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  const sourceCanvases = main.querySelectorAll("canvas");
  copy.querySelectorAll("canvas").forEach((canvas, index) => {
    const source = sourceCanvases[index];
    if (!source) return;
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
  });
  copyCustomProperties(main, copy);
  copyLook(main, copy);
  copy.inert = true;
  return copy;
}

type Box = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

function div(className: string) {
  const node = document.createElement("div");
  node.className = className;
  return node;
}

const SVG = "http://www.w3.org/2000/svg";

function svg<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string> = {}) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x,
    y: w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y,
  };
}

let sceneCount = 0;
const RAIL_SAMPLES = 40;

/**
 * The visible side of one push. The frame you leave is pushed away against
 * the scroll and sinks into a mix of both frames' colors, while the
 * destination's main object travels in from the edge the visitor scrolled
 * toward, on a track, and stands up as it arrives.
 */
export class Scene {
  private readonly backdrop = div("tx-backdrop");
  private readonly fieldFrom = div("tx-field-from");
  private readonly fieldTo = div("tx-field-to");
  private readonly layer = div("tx-layer");
  private readonly rails = svg("svg", { class: "tx-rails" });
  private readonly railPaths = [svg("path"), svg("path")];
  private readonly blurDefs = svg("svg", { class: "tx-defs", width: "0", height: "0" });
  private readonly plane = div("tx-plane");
  private readonly shadow = div("tx-shadow");
  private readonly paper = div("tx-paper");
  private readonly print = div("tx-print");
  private readonly shade = div("tx-shade");
  private readonly id = `tx${(sceneCount += 1)}`;
  private clone: HTMLElement | null = null;
  private source: HTMLElement | null = null;
  private dest: HTMLElement | null = null;
  private destMain: HTMLElement | null = null;
  private cfg: VariantConfig | null = null;
  private dir = 1;
  private height = 0;
  private center: Point = { x: 0, y: 0 };
  private track: [Point, Point, Point, Point] | null = null;
  private sourceHidden = false;
  private lastY = 0;
  private blur = 0;
  private blurStep = 0;
  private revealCurve = (x: number) => x;

  constructor(stage: HTMLElement) {
    this.backdrop.append(this.fieldFrom, this.fieldTo);
    this.backdrop.setAttribute("aria-hidden", "true");
    this.rails.append(...this.railPaths);
    this.plane.append(this.shadow, this.paper, this.print);
    this.layer.append(this.blurDefs, this.rails, this.plane, this.shade);
    this.layer.setAttribute("aria-hidden", "true");
    stage.prepend(this.backdrop);
    stage.append(this.layer);
  }

  destroy() {
    this.backdrop.remove();
    this.layer.remove();
  }

  begin(
    source: HTMLElement,
    dest: HTMLElement,
    fromIndex: number,
    toIndex: number,
    dir: number,
    cfg: VariantConfig,
  ) {
    this.cfg = cfg;
    this.dir = dir;
    this.source = source;
    this.dest = dest;
    this.revealCurve = cubicBezier(cfg.reveal.curve);
    const fromPalette = frameAt(fromIndex).palette;
    const toPalette = frameAt(toIndex).palette;
    this.fieldFrom.style.background = paletteCss(fromPalette, cfg.field.softness);
    this.fieldTo.style.background = paletteCss(toPalette, cfg.field.softness);
    this.print.style.background = cfg.print.enabled
      ? paletteCss(toPalette, cfg.field.softness)
      : "none";
    this.plane.classList.toggle("is-print", cfg.print.enabled);
    this.buildBlurFilters(cfg);

    for (const path of this.railPaths) {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", cfg.rails.color);
      path.setAttribute("stroke-width", String(cfg.rails.width));
      path.setAttribute("stroke-linecap", "round");
    }

    const main = dest.querySelector<HTMLElement>(frameAt(toIndex).main);
    this.destMain = main;
    this.clone?.remove();
    this.clone = main ? cloneMain(main) : null;
    if (this.clone) {
      this.clone.classList.add("tx-clone");
      this.clone.style.position = "absolute";
      this.print.append(this.clone);
    }

    source.classList.add("is-leaving");
    this.sourceHidden = false;
    this.blur = 0;
    this.blurStep = 0;
    this.measure();
    this.lastY = this.positionAt(0).y;
    this.backdrop.classList.add("is-on");
    this.layer.classList.add("is-on");
    this.render(0);
  }

  private buildBlurFilters(cfg: VariantConfig) {
    const steps = Math.max(1, Math.round(cfg.motionBlur.steps));
    this.blurDefs.replaceChildren();
    for (let step = 1; step <= steps; step += 1) {
      const filter = svg("filter", {
        id: `${this.id}-mb-${step}`,
        x: "-5%",
        y: "-20%",
        width: "110%",
        height: "140%",
        "color-interpolation-filters": "sRGB",
      });
      filter.append(
        svg("feGaussianBlur", { stdDeviation: `0 ${((cfg.motionBlur.max * step) / steps).toFixed(2)}` }),
      );
      this.blurDefs.append(filter);
    }
  }

  measure() {
    const cfg = this.cfg;
    if (!cfg) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.height = height;
    this.plane.style.width = `${width}px`;
    this.plane.style.height = `${height}px`;
    this.rails.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.rails.setAttribute("width", String(width));
    this.rails.setAttribute("height", String(height));
    if (this.source) this.source.style.transformOrigin = `${width / 2}px ${height / 2}px`;

    const edge = cfg.print.edge * Math.min(width, height);
    this.paper.style.inset = `${-edge}px`;
    this.paper.style.background = cfg.print.enabled ? cfg.print.color : "none";
    this.paper.style.boxShadow = cfg.print.enabled ? cfg.print.shadow : "none";
    this.print.style.overflow = cfg.print.enabled ? "hidden" : "visible";

    let box: Box = { left: width * 0.25, top: height * 0.25, width: width * 0.5, height: height * 0.5 };
    if (this.clone && this.destMain && this.dest) {
      box = this.relativeBox(this.destMain, this.dest);
      this.clone.style.left = `${box.left}px`;
      this.clone.style.top = `${box.top}px`;
      this.clone.style.width = `${box.width}px`;
      this.clone.style.height = `${box.height}px`;
    }

    // The card that travels: the whole print in variant b, otherwise the object.
    const card: Box = cfg.print.enabled ? { left: 0, top: 0, width, height } : box;
    const center = { x: card.left + card.width / 2, y: card.top + card.height / 2 };
    this.center = center;
    this.plane.style.transformOrigin = `${center.x}px ${center.y}px`;

    const shadow = cfg.shadow;
    const shadowWidth = card.width * shadow.width;
    const shadowHeight = card.width * shadow.height;
    this.shadow.style.left = `${center.x - shadowWidth / 2}px`;
    this.shadow.style.top = `${card.top + card.height - shadowHeight / 2}px`;
    this.shadow.style.width = `${shadowWidth}px`;
    this.shadow.style.height = `${shadowHeight}px`;

    const path = cfg.path;
    const startHalf = (path.startScale * card.height) / 2;
    const gap = path.startGap * height;
    const start = {
      x: center.x + (width / 2 - center.x) * path.startToCenter,
      y: this.dir > 0 ? height + gap + startHalf : -gap - startHalf,
    };
    const side = Math.sign(center.x - width / 2) || 1;
    const bow = path.bow * width * side;
    this.track = [
      start,
      { x: start.x + bow, y: lerp(start.y, center.y, path.straight) },
      { x: center.x + bow, y: lerp(center.y, start.y, path.straight) },
      center,
    ];

    const left: string[] = [];
    const right: string[] = [];
    for (let index = 0; index <= RAIL_SAMPLES; index += 1) {
      const t = index / RAIL_SAMPLES;
      const point = this.positionAt(t);
      const half = (this.scaleAt(t) * card.width * cfg.rails.gauge) / 2;
      const command = index === 0 ? "M" : "L";
      left.push(`${command}${(point.x - half).toFixed(1)} ${point.y.toFixed(1)}`);
      right.push(`${command}${(point.x + half).toFixed(1)} ${point.y.toFixed(1)}`);
    }
    this.railPaths[0].setAttribute("d", left.join(""));
    this.railPaths[1].setAttribute("d", right.join(""));
  }

  private relativeBox(element: HTMLElement, slot: HTMLElement): Box {
    const rect = element.getBoundingClientRect();
    const frame = slot.getBoundingClientRect();
    return {
      left: rect.left - frame.left,
      top: rect.top - frame.top,
      width: rect.width,
      height: rect.height,
    };
  }

  private positionAt(p: number): Point {
    if (!this.track) return this.center;
    const [a, b, c, d] = this.track;
    return cubic(a, b, c, d, clamp(p));
  }

  private scaleAt(p: number) {
    const path = this.cfg!.path;
    const start = path.startScale;
    const linear = lerp(start, 1, p);
    const perspective = 1 / (1 + (1 - p) * (1 / start - 1));
    return lerp(linear, perspective, path.perspective);
  }

  /**
   * p is the push progress. latch runs 0 to 1 through the lock. dt is the
   * time since the last render, in seconds, for the motion blur.
   */
  render(p: number, latch = -1, impact = 1, dt = 0) {
    const cfg = this.cfg;
    if (!cfg) return;
    const q = clamp(p);
    const dir = this.dir;
    const lens = cfg.lens * this.height;
    const settled = latch >= 0 ? smoothstep(0, 1, latch) : 0;

    if (this.source) {
      const src = cfg.source;
      const opacity = 1 - smoothstep(src.fadeFrom, src.fadeTo, q);
      const hide = opacity <= 0.002;
      if (hide !== this.sourceHidden) {
        this.sourceHidden = hide;
        this.source.style.visibility = hide ? "hidden" : "";
      }
      if (!hide) {
        const shift = -dir * src.travel * this.height * q;
        const tilt = dir * src.tilt * q;
        const scale = lerp(1, src.scale, q);
        this.source.style.transform =
          `translate3d(0, ${shift.toFixed(2)}px, 0) perspective(${lens.toFixed(0)}px) ` +
          `rotateX(${tilt.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
        const blur = src.blur * q;
        const dim = 1 - src.darken * q;
        this.source.style.filter =
          q > 0.0005 ? `brightness(${dim.toFixed(4)}) blur(${blur.toFixed(2)}px)` : "";
        this.source.style.opacity = opacity < 0.999 ? opacity.toFixed(4) : "";
      }
    }

    this.fieldTo.style.opacity = smoothstep(cfg.field.mixFrom, cfg.field.mixTo, q).toFixed(4);

    const path = cfg.path;
    const point = this.positionAt(q);
    const hump = latch >= 0 ? latchHump(latch) * impact : 0;
    const scale = this.scaleAt(q) * (1 + cfg.lock.kick * hump);
    const tilt = dir * path.tilt * Math.pow(1 - q, path.tiltCurve);
    this.plane.style.opacity = smoothstep(0, path.fadeIn, q).toFixed(4);
    this.plane.style.transform =
      `translate3d(${(point.x - this.center.x).toFixed(2)}px, ${(point.y - this.center.y).toFixed(2)}px, 0) ` +
      `perspective(${lens.toFixed(0)}px) rotateX(${tilt.toFixed(3)}deg) scale(${scale.toFixed(5)})`;

    this.shadow.style.opacity = (cfg.shadow.opacity * Math.pow(q, 1.5) * (1 - settled)).toFixed(4);
    this.rails.style.opacity = (cfg.rails.opacity * smoothstep(0, cfg.rails.fadeIn, q) * (1 - settled)).toFixed(4);

    this.renderMotionBlur(point.y, dt);

    const shake = -dir * cfg.lock.shake * hump;
    this.layer.style.transform = shake ? `translate3d(0, ${shake.toFixed(2)}px, 0)` : "";
    this.shade.style.opacity = (cfg.lock.shade * hump).toFixed(4);
  }

  private renderMotionBlur(y: number, dt: number) {
    const blur = this.cfg!.motionBlur;
    if (dt > 0) {
      const speed = Math.abs(y - this.lastY) / dt / Math.max(1, this.height);
      const target = smoothstep(blur.from, blur.to, speed);
      this.blur += (target - this.blur) * (1 - Math.exp(-dt / Math.max(0.001, blur.smoothing)));
    }
    this.lastY = y;
    const steps = Math.max(1, Math.round(blur.steps));
    const step = Math.round(this.blur * steps);
    if (step === this.blurStep) return;
    this.blurStep = step;
    this.print.style.filter = step > 0 ? `url(#${this.id}-mb-${step})` : "";
  }

  /** x runs 0 to 1 while the rest of the destination frame appears. */
  reveal(x: number) {
    if (!this.dest) return;
    if (!this.dest.classList.contains("is-revealing")) {
      this.dest.classList.remove("is-parked");
      this.dest.classList.add("is-revealing");
    }
    this.dest.style.opacity = this.revealCurve(clamp(x)).toFixed(4);
  }

  /** Clears every style the push set. */
  end() {
    if (this.source) {
      this.source.classList.remove("is-leaving");
      this.source.style.transform = "";
      this.source.style.filter = "";
      this.source.style.opacity = "";
      this.source.style.visibility = "";
      this.source.style.transformOrigin = "";
    }
    if (this.dest) {
      this.dest.classList.remove("is-revealing");
      this.dest.style.opacity = "";
    }
    this.backdrop.classList.remove("is-on");
    this.layer.classList.remove("is-on");
    this.layer.style.transform = "";
    this.print.style.filter = "";
    this.blurStep = 0;
    this.clone?.remove();
    this.clone = null;
    this.source = null;
    this.dest = null;
    this.destMain = null;
    this.track = null;
    this.cfg = null;
  }
}
