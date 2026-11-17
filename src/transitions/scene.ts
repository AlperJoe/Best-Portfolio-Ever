import { transitionConfig, type FramePalette, type VariantConfig } from "./config";
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
  copyLook(main, copy);
  return copy;
}

type Box = { left: number; top: number; width: number; height: number };

function div(className: string) {
  const node = document.createElement("div");
  node.className = className;
  return node;
}

/**
 * The visible side of one push: the frame being left blurs into a mix of
 * both frames' colors while the destination's main object comes forward.
 */
export class Scene {
  private readonly layer = div("tx-layer");
  private readonly field = div("tx-field");
  private readonly fieldFrom = div("tx-field-from");
  private readonly fieldTo = div("tx-field-to");
  private readonly plane = div("tx-plane");
  private readonly paper = div("tx-paper");
  private readonly print = div("tx-print");
  private readonly shade = div("tx-shade");
  private clone: HTMLElement | null = null;
  private source: HTMLElement | null = null;
  private dest: HTMLElement | null = null;
  private destMain: HTMLElement | null = null;
  private cfg: VariantConfig | null = null;
  private width = 0;
  private height = 0;
  private sourceHidden = false;
  private revealCurve = (x: number) => x;

  constructor(stage: HTMLElement) {
    this.field.append(this.fieldFrom, this.fieldTo);
    this.plane.append(this.paper, this.print);
    this.layer.append(this.field, this.plane, this.shade);
    this.layer.setAttribute("aria-hidden", "true");
    stage.append(this.layer);
  }

  destroy() {
    this.layer.remove();
  }

  begin(source: HTMLElement, dest: HTMLElement, fromIndex: number, toIndex: number, cfg: VariantConfig) {
    this.cfg = cfg;
    this.source = source;
    this.dest = dest;
    this.revealCurve = cubicBezier(cfg.reveal.curve);
    const palettes = transitionConfig.palettes;
    this.fieldFrom.style.background = paletteCss(palettes[fromIndex], cfg.field.softness);
    this.fieldTo.style.background = paletteCss(palettes[toIndex], cfg.field.softness);
    this.print.style.background = cfg.print.enabled
      ? paletteCss(palettes[toIndex], cfg.field.softness)
      : "none";
    this.plane.classList.toggle("is-print", cfg.print.enabled);

    const main = dest.querySelector<HTMLElement>(transitionConfig.mainObjects[toIndex]);
    this.destMain = main;
    this.clone?.remove();
    this.clone = main ? cloneMain(main) : null;
    if (this.clone) {
      this.clone.classList.add("tx-clone");
      this.print.append(this.clone);
    }

    source.classList.add("is-leaving");
    this.sourceHidden = false;
    this.measure();
    this.layer.classList.add("is-on");
    this.render(0);
  }

  measure() {
    const cfg = this.cfg;
    if (!cfg) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const origin = `${cfg.depth.vanishX * this.width}px ${cfg.depth.vanishY * this.height}px`;
    this.plane.style.width = `${this.width}px`;
    this.plane.style.height = `${this.height}px`;
    this.plane.style.transformOrigin = origin;
    if (this.source) this.source.style.transformOrigin = origin;

    const edge = cfg.print.edge * Math.min(this.width, this.height);
    this.paper.style.inset = `${-edge}px`;
    this.paper.style.background = cfg.print.enabled ? cfg.print.color : "none";
    this.paper.style.boxShadow = cfg.print.enabled ? cfg.print.shadow : "none";
    this.print.style.overflow = cfg.print.enabled ? "hidden" : "visible";

    if (this.clone && this.destMain && this.dest) {
      const box = this.relativeBox(this.destMain, this.dest);
      this.clone.style.left = `${box.left}px`;
      this.clone.style.top = `${box.top}px`;
      this.clone.style.width = `${box.width}px`;
      this.clone.style.height = `${box.height}px`;
    }
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

  private scaleAt(p: number) {
    const depth = this.cfg!.depth;
    const start = depth.startScale;
    const linear = lerp(start, 1, p);
    const perspective = 1 / (1 + (1 - p) * (1 / start - 1));
    return lerp(linear, perspective, depth.perspective);
  }

  /** p is the push progress. latch runs 0 to 1 through the lock. */
  render(p: number, latch = -1, impact = 1) {
    const cfg = this.cfg;
    if (!cfg) return;
    const cover = smoothstep(0, cfg.source.coverAt, p);

    if (this.source) {
      const hide = cover >= 0.999;
      if (hide !== this.sourceHidden) {
        this.sourceHidden = hide;
        this.source.style.visibility = hide ? "hidden" : "";
      }
      if (!hide) {
        const scale = lerp(1, cfg.source.scale, cover);
        const drift = cfg.source.drift * this.height * cover;
        this.source.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0) scale(${scale.toFixed(5)})`;
        const blur = cfg.source.blur * cover;
        this.source.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
      }
    }

    this.field.style.opacity = cover.toFixed(4);
    this.fieldTo.style.opacity = smoothstep(cfg.field.mixFrom, cfg.field.mixTo, p).toFixed(4);

    const hump = latch >= 0 ? latchHump(latch) * impact : 0;
    const scale = this.scaleAt(clamp(p)) * (1 + cfg.lock.kick * hump);
    this.plane.style.opacity = smoothstep(0, cfg.depth.fadeIn, p).toFixed(4);
    this.plane.style.transform = `scale(${scale.toFixed(5)})`;
    const shake = cfg.lock.shake * hump;
    this.layer.style.transform = shake ? `translate3d(0, ${shake.toFixed(2)}px, 0)` : "";
    this.shade.style.opacity = (cfg.lock.shade * hump).toFixed(4);
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
      this.source.style.visibility = "";
      this.source.style.transformOrigin = "";
    }
    if (this.dest) {
      this.dest.classList.remove("is-revealing");
      this.dest.style.opacity = "";
    }
    this.layer.classList.remove("is-on");
    this.layer.style.transform = "";
    this.clone?.remove();
    this.clone = null;
    this.source = null;
    this.dest = null;
    this.destMain = null;
    this.cfg = null;
  }
}
