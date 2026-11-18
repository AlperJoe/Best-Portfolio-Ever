import { frame1Config } from "../frame1/config";
import { frameOrder, type FrameId } from "../frameOrder";
import { OPENING_EVENT, frameIndex, scrollConfig, transitionConfig } from "./config";
import { InterludeScene, type InterludeView } from "./interludeScene";
import { frameColors, interludes, type FramePair, type Interlude } from "./interludes";
import { clamp, cubicBezier, lerp } from "./math";
import { Track } from "./track";

const NEXT_KEYS = new Set(["ArrowDown", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "PageUp"]);
const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
const PRESSABLE = "button, a[href], summary, [role='button'], video, audio";
const EPS = 1e-4;

type Pair = {
  from: number;
  to: number;
  start: number;
  end: number;
  interlude: Interlude | null;
};

type Glide = { from: number; to: number; start: number; ms: number; curve: (x: number) => number };
type Jump = { to: number; start: number; swapped: boolean };

/**
 * Variant d. One scroll position, in screen heights, runs from the Frame 1
 * start state to Frame 5. Input moves it directly and nothing moves on its
 * own, except a key glide or a jump the visitor asked for.
 */
export class ScrollEngine {
  private pos = 0;
  private readonly openingEnd = frame1Config.scrollOpening.distance;
  private readonly pairs: Pair[] = [];
  /** Scroll position of every frame, where it sits fully on screen. Frame 1 sits at the end of its opening. */
  private readonly frameStops: number[] = [];
  /** Every place a key press can stop: the Frame 1 start, each frame and each interlude line. */
  private readonly stops: number[] = [];
  private readonly end: number;
  private readonly scene: InterludeScene;
  private readonly track: Track | null;
  private readonly overlays: MutationObserver;
  private readonly cover = document.createElement("div");
  private readonly media = window.matchMedia("(prefers-reduced-motion: reduce)");
  private reduced: boolean;
  private readonly keyCurve = cubicBezier(scrollConfig.keyCurve);

  private holdUntil = 0;
  private glide: Glide | null = null;
  private jump: Jump | null = null;
  private frameId = 0;
  private stepSum = 0;
  private lastInput = 0;
  private touchY: number | null = null;
  private openingSent = -1;
  private active: number | null = null;
  private visible = new Set<number>();
  private behind = new Set<number>();
  private grown: number | null = null;
  private pairShown: Pair | null = null;

  constructor(
    private readonly stage: HTMLElement,
    private readonly slots: HTMLElement[],
  ) {
    this.reduced = this.media.matches;
    stage.dataset.transition = "d";
    let at = this.openingEnd;
    this.stops.push(0, at);
    this.frameStops.push(at);
    for (let index = 0; index + 1 < slots.length; index += 1) {
      const key = `${frameOrder[index]}>${frameOrder[index + 1]}` as FramePair;
      const interlude = interludes[key] ?? null;
      const length = InterludeScene.length(interlude);
      this.pairs.push({ from: index, to: index + 1, start: at, end: at + length, interlude });
      for (const stop of InterludeScene.stops(interlude)) this.stops.push(at + stop);
      at += length;
      this.stops.push(at);
      this.frameStops.push(at);
    }
    this.end = at;

    this.scene = new InterludeScene(stage);
    this.track = scrollConfig.showTrack ? new Track(stage, slots.length, this.onPick) : null;
    this.cover.className = "txd-cover";
    this.cover.setAttribute("aria-hidden", "true");
    stage.append(this.cover);
    this.overlays = new MutationObserver(this.syncOverlay);
    slots.forEach((slot) => {
      slot.classList.add("is-parked");
      slot.toggleAttribute("inert", true);
      slot.setAttribute("aria-hidden", "true");
    });
    this.render();
  }

  attach() {
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("tx:goto", this.onGoto);
    this.media.addEventListener("change", this.onMotionPreference);
    this.slots.forEach((slot) => this.overlays.observe(slot, { childList: true, subtree: true }));
    const font = `"Instrument Serif"`;
    Promise.all([document.fonts?.load(`400 100px ${font}`), document.fonts?.load(`italic 400 100px ${font}`)])
      .catch(() => undefined)
      .then(() => {
        this.scene.measure();
        this.render();
      });
  }

  detach() {
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchcancel", this.onTouchEnd);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("tx:goto", this.onGoto);
    this.media.removeEventListener("change", this.onMotionPreference);
    this.overlays.disconnect();
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.scene.destroy();
    this.track?.destroy();
    this.cover.remove();
  }

  private overlayOpen() {
    if (this.scene.noteOpen()) return true;
    return this.slots.some((slot) => !slot.classList.contains("is-parked") && slot.querySelector(transitionConfig.overlays));
  }

  private syncOverlay = () => {
    this.track?.setHidden(this.overlayOpen());
  };

  private onMotionPreference = () => {
    this.reduced = this.media.matches;
    this.render();
  };

  private onResize = () => {
    this.track?.measure();
    this.scene.measure();
    this.render();
  };

  /** Moves by d screen heights. Stops at a frame on the way, and holds there for arrivalHoldMs. */
  private move(d: number, now: number) {
    if (now < this.holdUntil || d === 0) return;
    this.glide = null;
    let next = clamp(this.pos + d, 0, this.end);
    if (d > 0) {
      const stop = this.frameStops.find((at) => at > this.pos + EPS && at <= next + EPS);
      if (stop !== undefined) {
        next = stop;
        this.holdUntil = now + scrollConfig.arrivalHoldMs;
      }
    } else {
      const stop = [...this.frameStops].reverse().find((at) => at < this.pos - EPS && at >= next - EPS);
      if (stop !== undefined) {
        next = stop;
        this.holdUntil = now + scrollConfig.arrivalHoldMs;
      }
    }
    this.pos = next;
    this.render();
  }

  /** With reduced motion, input adds up to a step, and each step crossfades to the next stop. */
  private step(delta: number, now: number) {
    if (now < this.holdUntil || this.glide || this.jump) return;
    const dir = Math.sign(delta);
    if (now - this.lastInput > transitionConfig.input.quietMs || Math.sign(this.stepSum) !== dir) this.stepSum = 0;
    this.lastInput = now;
    this.stepSum += delta;
    if (Math.abs(this.stepSum) < scrollConfig.reduced.threshold) return;
    this.stepSum = 0;
    const to = this.nextStop(dir, this.pos);
    if (to === null) return;
    this.startGlide(to, scrollConfig.reduced.ms, (x) => x, now);
  }

  private nextStop(dir: number, from: number) {
    if (dir > 0) return this.stops.find((at) => at > from + EPS) ?? null;
    return [...this.stops].reverse().find((at) => at < from - EPS) ?? null;
  }

  private startGlide(to: number, ms: number, curve: (x: number) => number, now: number) {
    this.glide = { from: this.pos, to, start: now, ms, curve };
    this.run();
  }

  private run() {
    if (this.frameId) return;
    this.frameId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frameId = 0;
    if (this.jump) {
      const jump = this.jump;
      const x = clamp((now - jump.start) / scrollConfig.jumpMs, 0, 2);
      if (x >= 1 && !jump.swapped) {
        jump.swapped = true;
        this.pos = jump.to;
        this.render();
      }
      this.cover.style.opacity = (x < 1 ? x : 2 - x).toFixed(4);
      if (x >= 2) {
        this.jump = null;
        this.cover.style.opacity = "";
        this.cover.classList.remove("is-on");
      }
    } else if (this.glide) {
      const glide = this.glide;
      const x = clamp((now - glide.start) / glide.ms);
      this.pos = lerp(glide.from, glide.to, glide.curve(x));
      if (x >= 1) {
        this.pos = glide.to;
        this.glide = null;
        if (this.frameStops.some((at) => Math.abs(at - this.pos) < EPS)) {
          this.holdUntil = now + scrollConfig.arrivalHoldMs;
        }
      }
      this.render();
    }
    if (this.jump || this.glide) this.run();
  };

  /** Fades through black straight to a position, however far away it is. */
  private jumpTo(to: number) {
    if (Math.abs(to - this.pos) < EPS && !this.glide) return;
    this.glide = null;
    this.jump = { to, start: performance.now(), swapped: false };
    this.cover.classList.add("is-on");
    this.run();
  }

  private onPick = (index: number) => {
    if (this.overlayOpen()) return;
    this.jumpTo(this.frameStops[index]);
  };

  private onGoto = (event: Event) => {
    const index = frameIndex((event as CustomEvent<FrameId>).detail);
    if (index < 0 || this.overlayOpen()) return;
    // Frame 1 is reached at its start state, so the opening plays again.
    this.jumpTo(index === 0 ? 0 : this.frameStops[index]);
  };

  private onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    if (this.jump) return;
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= transitionConfig.input.lineHeight;
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    if (Math.abs(event.deltaX) > Math.abs(delta)) return;
    const max = transitionConfig.input.maxDelta;
    delta = clamp(delta, -max, max);
    const now = performance.now();
    if (this.reduced) this.step(delta, now);
    else this.move((delta * scrollConfig.scrollScale) / window.innerHeight, now);
  };

  private onTouchStart = (event: TouchEvent) => {
    this.touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (this.touchY === null || event.touches.length !== 1) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const delta = (this.touchY - y) * transitionConfig.input.touchScale;
    this.touchY = y;
    if (this.jump) return;
    const now = performance.now();
    if (this.reduced) this.step(delta, now);
    else this.move((delta * scrollConfig.scrollScale) / window.innerHeight, now);
  };

  private onTouchEnd = () => {
    this.touchY = null;
  };

  private onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(TYPING)) return;
    let dir = 0;
    if (NEXT_KEYS.has(event.key)) dir = 1;
    else if (PREVIOUS_KEYS.has(event.key)) dir = -1;
    else if (event.key === " " || event.key === "Spacebar") {
      if (target?.closest(PRESSABLE)) return;
      dir = event.shiftKey ? -1 : 1;
    } else return;

    if (this.overlayOpen()) return;
    event.preventDefault();
    if (this.jump) return;
    const from = this.glide && Math.sign(this.glide.to - this.glide.from) === dir ? this.glide.to : this.pos;
    const to = this.nextStop(dir, from);
    if (to === null) return;
    const now = performance.now();
    if (this.reduced) this.startGlide(to, scrollConfig.reduced.ms, (x) => x, now);
    else this.startGlide(to, scrollConfig.keyMs, this.keyCurve, now);
  };

  private pairAt(pos: number) {
    return this.pairs.find((pair) => pos > pair.start + EPS && pos < pair.end - EPS) ?? null;
  }

  private render() {
    const pos = this.pos;
    const opening = clamp(pos / this.openingEnd);
    if (Math.abs(opening - this.openingSent) > 1e-5) {
      this.openingSent = opening;
      window.dispatchEvent(new CustomEvent<number>(OPENING_EVENT, { detail: opening }));
    }

    const pair = this.pairAt(pos);
    let active: number | null = null;
    const visible = new Set<number>();
    const behind = new Set<number>();
    let grow = 0;
    let growing: number | null = null;
    let view: InterludeView | null = null;

    if (pair) {
      if (pair !== this.pairShown) {
        this.pairShown = pair;
        this.scene.set(pair.interlude, frameColors[frameOrder[pair.to]]);
      }
      view = this.scene.render(pos - pair.start, this.reduced);
      if (view.source) {
        visible.add(pair.from);
        behind.add(pair.from);
        grow = view.sourceGrow;
        growing = pair.from;
      }
      if (view.dest) {
        visible.add(pair.to);
        behind.add(pair.to);
      }
    } else {
      this.scene.hide();
      this.pairShown = null;
      let index = 0;
      for (let at = 0; at < this.frameStops.length; at += 1) {
        if (pos >= this.frameStops[at] - EPS) index = at;
      }
      active = index;
      visible.add(index);
    }

    this.slots.forEach((slot, index) => {
      const show = visible.has(index);
      if (show !== this.visible.has(index)) {
        slot.classList.toggle("is-parked", !show);
        if (show) slot.removeAttribute("aria-hidden");
        else slot.setAttribute("aria-hidden", "true");
      }
      const back = behind.has(index);
      if (back !== this.behind.has(index)) slot.classList.toggle("is-revealing", back);
      slot.toggleAttribute("inert", index !== active);
    });
    this.visible = visible;
    this.behind = behind;

    if (growing !== this.grown && this.grown !== null) {
      const old = this.slots[this.grown];
      old.style.transform = "";
      old.style.transformOrigin = "";
    }
    this.grown = growing;
    if (growing !== null) {
      const slot = this.slots[growing];
      slot.style.transformOrigin = "50% 50%";
      slot.style.transform = grow > 0 ? `scale(${(1 + grow).toFixed(5)})` : "";
    }

    if (active !== this.active) {
      const was = this.active;
      this.active = active;
      if (active !== null) {
        this.track?.setActive(active);
        if (was !== null || this.stage.dataset.active !== undefined) this.slots[active].focus({ preventScroll: true });
        this.syncOverlay();
      }
    }
    const nearest = active ?? (pair ? (pos - pair.start < (pair.end - pair.start) / 2 ? pair.from : pair.to) : 0);
    this.stage.dataset.active = String(nearest);
    this.stage.dataset.phase = pair ? "move" : "idle";
    this.track?.setBusy(Boolean(pair));
    if (this.track) {
      if (pair) this.track.render(pair.from, pair.to, (pos - pair.start) / (pair.end - pair.start));
      else this.track.place(active ?? 0);
    }
  }
}
