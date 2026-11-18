import { scrollConfig } from "./config";
import { attachWhyNote, type WhyNote } from "../whyNote/whyNote";
import { interludeStyle, interludeWhy, type Interlude } from "./interludes";
import { clamp, lerp, smoothstep } from "./math";

type Word = { el: HTMLSpanElement; focus: boolean; lit: number };
type Line = { el: HTMLElement; words: Word[] };

/** What the engine must show around the interlude. */
export type InterludeView = {
  /** The frame being left shows under the scene while the scene darkens over it. */
  source: boolean;
  /** The frame ahead shows over the scene, cut by `clip` and faded by `destOpacity`. */
  dest: boolean;
  clip: string | null;
  destOpacity: number;
};

function div(className: string) {
  const node = document.createElement("div");
  node.className = className;
  return node;
}

function parseHex(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16));
}

const TEXT_RGB = parseHex(interludeStyle.textColor);
const FOCUS_RGB = parseHex(interludeStyle.focusColor);

function focusColor(t: number) {
  const [r, g, b] = TEXT_RGB.map((from, index) => Math.round(lerp(from, FOCUS_RGB[index], t)));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The dark scene between two frames. Its lines sit centered, every word dim
 * until the scroll lights it, and a gold line under them draws itself with
 * the scroll. When the line is complete the scene holds still, with the note
 * control on screen, and then the line becomes the edge of the next frame,
 * which opens from it upward and downward. The text, the line and the
 * control fade out over the start of that opening.
 */
export class InterludeScene {
  private readonly root = div("txd-layer");
  private readonly bg = div("txd-bg");
  private readonly stack = div("txd-stack");
  private readonly text = div("txd-text");
  private readonly rule = div("txd-rule");
  private readonly fill = div("txd-rule-fill");
  private readonly tip = div("txd-tip");
  private readonly edges = div("txd-edges");
  private readonly edgeTop = div("txd-edge");
  private readonly edgeBottom = div("txd-edge");
  private readonly why = document.createElement("button");
  private interlude: Interlude | null = null;
  private lines: Line[] = [];
  /** The gold line on screen: its ends and its vertical center, in pixels. */
  private ruleBox = { left: 0, right: 0, y: 0 };
  private width = 0;
  private height = 0;
  private shown = false;
  private whyNote: WhyNote | null = null;
  private whyShown = false;

  constructor(private readonly stage: HTMLElement) {
    const style = interludeStyle;
    this.why.type = "button";
    this.why.className = "why-button txd-why";
    this.why.textContent = interludeWhy.label;
    this.root.style.setProperty("--txd-bg", style.background);
    this.root.style.setProperty("--txd-font", `"${style.font}", serif`);
    this.root.style.setProperty("--txd-line", String(style.lineHeight));
    this.root.style.setProperty("--txd-text", style.textColor);
    this.root.style.setProperty("--txd-rule", style.rule.color);
    this.root.style.setProperty("--txd-rule-w", `${style.rule.width}px`);
    this.root.style.setProperty("--txd-tip", `${style.rule.tip}px`);
    this.root.style.setProperty("--txd-glow", style.rule.glow);
    this.root.style.setProperty("--txd-why-gap", `${interludeWhy.gap}px`);
    this.edges.style.setProperty("--txd-rule", style.rule.color);
    this.edges.style.setProperty("--txd-rule-w", `${style.rule.width}px`);
    this.edges.setAttribute("aria-hidden", "true");
    this.rule.setAttribute("aria-hidden", "true");

    this.rule.append(this.fill, this.tip);
    this.stack.append(this.text, this.rule, this.why);
    this.root.append(this.bg, this.stack);
    this.edges.append(this.edgeTop, this.edgeBottom);
    stage.append(this.root, this.edges);
  }

  destroy() {
    this.whyNote?.destroy();
    this.root.remove();
    this.edges.remove();
  }

  /** True while the note of the current interlude is open. */
  noteOpen() {
    return Boolean(this.whyNote?.isOpen());
  }

  /** Scroll length of a pair, in screen heights. */
  static length(interlude: Interlude | null) {
    if (!interlude || interlude.lines.length === 0) return scrollConfig.plain;
    const c = scrollConfig.interlude;
    return interlude.lines.length * c.perLine + c.hold + c.open;
  }

  /**
   * Places inside a pair where a key press stops: the end of every line, or
   * with reduced motion only the end of the last one. The last of these is
   * the resting place. The gold line is complete there, the note control is
   * on screen, and the next frame waits through the hold.
   */
  static stops(interlude: Interlude | null, reduced: boolean) {
    if (!interlude || interlude.lines.length === 0) return [];
    const per = scrollConfig.interlude.perLine;
    const n = interlude.lines.length;
    if (reduced) return [n * per];
    return interlude.lines.map((_, index) => (index + 1) * per);
  }

  set(interlude: Interlude | null) {
    if (interlude === this.interlude) return;
    this.interlude = interlude;
    this.whyNote?.destroy();
    this.whyNote = interlude?.note
      ? attachWhyNote(this.why, this.stage, { note: interlude.note, label: interludeWhy.label })
      : null;
    this.build();
    this.measure();
  }

  private build() {
    this.text.replaceChildren();
    this.lines = [];
    const interlude = this.interlude;
    if (!interlude) return;
    for (const line of interlude.lines) {
      const el = document.createElement("p");
      el.className = "txd-line";
      const focusFrom = line.text.indexOf(line.focus);
      const focusTo = focusFrom < 0 ? -1 : focusFrom + line.focus.length;
      const words: Word[] = [];
      let at = 0;
      for (const part of line.text.split(" ")) {
        if (words.length) el.append(" ");
        const span = document.createElement("span");
        span.className = "txd-word";
        span.textContent = part;
        const focus = focusFrom >= 0 && at < focusTo && at + part.length > focusFrom;
        if (focus) span.classList.add("is-focus");
        el.append(span);
        words.push({ el: span, focus, lit: -1 });
        at += part.length + 1;
      }
      this.text.append(el);
      this.lines.push({ el, words });
    }
  }

  /** Sizes the text to fit the screen with margins, and finds the gold line on screen. */
  measure() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const narrow = this.width < scrollConfig.tall.maxWidth;
    this.root.classList.toggle("is-narrow", narrow);
    if (!this.lines.length) return;
    if (narrow) {
      this.measureNarrow();
      return;
    }
    this.stack.style.width = "";
    const style = interludeStyle;
    const probe = 100;
    this.text.style.fontSize = `${probe}px`;
    const widest = Math.max(1, ...this.lines.map((line) => line.el.offsetWidth));
    const room = {
      width: this.width * (1 - 2 * style.marginX),
      height: this.height * (1 - 2 * style.marginY),
    };
    const below = style.rule.width + interludeWhy.gap + this.why.offsetHeight;
    const perPx = this.lines.length * style.lineHeight + style.rule.gap;
    const size = Math.max(
      8,
      Math.min(style.maxSize, this.height * style.maxHeightShare, (room.width * probe) / widest, (room.height - below) / perPx),
    );
    this.text.style.fontSize = `${size.toFixed(2)}px`;
    this.rule.style.marginTop = `${(size * style.rule.gap).toFixed(2)}px`;
    this.rule.style.width = `${((widest * size) / probe).toFixed(2)}px`;
    this.findRule();
  }

  /**
   * On a phone the lines wrap inside the side margins at a fixed readable
   * size, and the gold line spans the widest wrapped line.
   */
  private measureNarrow() {
    const style = interludeStyle;
    const phone = style.phone;
    const room = Math.max(1, this.width - 2 * phone.marginX);
    this.stack.style.width = `${room}px`;
    const size = clamp(this.width * phone.sizeShare, phone.minSize, phone.maxSize);
    this.text.style.fontSize = `${size.toFixed(2)}px`;
    this.rule.style.marginTop = `${(size * style.rule.gap).toFixed(2)}px`;
    // Lines are centered, so the widest wrapped line spans from the leftmost word to the rightmost.
    let left = Infinity;
    let right = -Infinity;
    for (const line of this.lines) {
      for (const word of line.words) {
        const rect = word.el.getBoundingClientRect();
        left = Math.min(left, rect.left);
        right = Math.max(right, rect.right);
      }
    }
    const widest = right > left ? Math.min(room, right - left) : room;
    this.rule.style.width = `${widest.toFixed(2)}px`;
    this.findRule();
  }

  private findRule() {
    const box = this.rule.getBoundingClientRect();
    this.ruleBox = { left: box.left, right: box.right, y: box.top + box.height / 2 };
  }

  hide() {
    this.showWhy(false);
    if (!this.shown) return;
    this.shown = false;
    this.root.classList.remove("is-on");
    this.edges.classList.remove("is-on");
  }

  /**
   * `driven` is the scroll fade at the start of the opening. The control's
   * own fade is turned off then, so its opacity follows the text in both
   * directions instead of easing on a timer.
   */
  private showWhy(on: boolean, driven = false) {
    if (!on) this.whyNote?.close();
    if (on !== this.whyShown) {
      this.whyShown = on;
      this.why.classList.toggle("is-on", on);
    }
    if (driven && on) {
      this.why.style.transition = "none";
      this.why.style.opacity = "1";
    } else {
      this.why.style.transition = "";
      this.why.style.opacity = "";
    }
  }

  private light(word: Word, lit: number) {
    if (Math.abs(word.lit - lit) < 1e-3) return;
    word.lit = lit;
    const dim = interludeStyle.dim;
    word.el.style.opacity = (dim + (1 - dim) * lit).toFixed(3);
    if (word.focus) word.el.style.color = focusColor(lit);
  }

  /**
   * x is the scroll position inside the pair, in screen heights, from 0 to
   * InterludeScene.length(). Returns which frames must show around it.
   */
  render(x: number, reduced: boolean): InterludeView {
    if (!this.shown) {
      this.shown = true;
      this.root.classList.add("is-on");
    }
    const interlude = this.interlude;
    if (!interlude || !this.lines.length) {
      const u = clamp(x / scrollConfig.plain);
      this.stack.style.opacity = "0";
      this.root.style.opacity = clamp(u / 0.5).toFixed(4);
      this.bg.style.opacity = "";
      this.edges.classList.remove("is-on");
      this.showWhy(false);
      return { source: u < 0.5, dest: u > 0.5, clip: null, destOpacity: clamp((u - 0.5) / 0.5) };
    }

    const c = scrollConfig.interlude;
    const n = this.lines.length;
    const litEnd = n * c.perLine;
    const openAt = litEnd + c.hold;
    const u = clamp((x - openAt) / Math.max(1e-6, c.open));
    const exit = u <= 0 ? 1 : clamp(1 - u / Math.max(1e-6, c.fadeShare));

    if (reduced) {
      // Each half of a crossfade passes through the dark, so the text never sits over a frame.
      const a = clamp(x / litEnd);
      const textIn = clamp((a - 0.5) / 0.5) * (1 - clamp(u / 0.5));
      this.root.style.opacity = "";
      this.bg.style.opacity = a < 0.5 ? (a / 0.5).toFixed(4) : "";
      this.stack.style.opacity = textIn < 1 ? textIn.toFixed(4) : "";
      this.lines.forEach((line) => line.words.forEach((word) => this.light(word, 1)));
      this.rule.style.visibility = "hidden";
      this.edges.classList.remove("is-on");
      this.showWhy(Boolean(interlude.note) && a >= 1 && textIn > 0.001, u > 0);
      return { source: a < 0.5, dest: u > 0.5, clip: null, destOpacity: clamp((u - 0.5) / 0.5) };
    }

    const textFrom = c.darken + c.appear;
    this.root.style.opacity = "";
    this.bg.style.opacity = x < c.darken ? clamp(x / c.darken).toFixed(4) : "";
    const textIn = clamp((x - c.darken) / c.appear);
    const veil = textIn * exit;
    this.stack.style.opacity = veil < 1 ? veil.toFixed(4) : "";

    this.lines.forEach((line, k) => {
      const from = k === 0 ? textFrom : k * c.perLine;
      const to = k * c.perLine + c.perLine * c.lightShare;
      const t = clamp((x - from) / Math.max(1e-6, to - from));
      const m = line.words.length;
      line.words.forEach((word, j) => this.light(word, clamp(t * m - j)));
    });
    const allLit = x >= (n - 1) * c.perLine + c.perLine * c.lightShare - 1e-4;

    const progress = clamp((x - textFrom) / (litEnd - textFrom));
    const ruleWidth = this.ruleBox.right - this.ruleBox.left;
    this.rule.style.visibility = "";
    this.fill.style.transform = `scaleX(${progress.toFixed(5)})`;
    this.tip.style.transform = `translate(${(progress * ruleWidth).toFixed(2)}px, -50%) translateX(-50%)`;

    let clip: string | null = null;
    if (u > 0) {
      const e = smoothstep(0, 1, u);
      const { left, right, y } = this.ruleBox;
      const top = y * (1 - e);
      const bottom = (this.height - y) * (1 - e);
      const l = left * (1 - e);
      const r = (this.width - right) * (1 - e);
      clip = `inset(${top.toFixed(2)}px ${r.toFixed(2)}px ${bottom.toFixed(2)}px ${l.toFixed(2)}px)`;
      this.edges.classList.add("is-on");
      this.edges.style.opacity = (1 - smoothstep(0.55, 1, u)).toFixed(4);
      for (const [edge, at] of [
        [this.edgeTop, top],
        [this.edgeBottom, this.height - bottom],
      ] as const) {
        edge.style.transform = `translate(${l.toFixed(2)}px, ${at.toFixed(2)}px) translateY(-50%)`;
        edge.style.width = `${(this.width - l - r).toFixed(2)}px`;
      }
    } else {
      this.edges.classList.remove("is-on");
    }

    this.showWhy(Boolean(interlude.note) && allLit && exit > 0.001, u > 0);
    return { source: x < c.darken, dest: u > 0, clip, destOpacity: 1 };
  }
}
