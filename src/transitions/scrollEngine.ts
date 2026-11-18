import { frame1Config } from "../frame1/config";
import { frameOrder, type FrameId } from "../frameOrder";
import { OPENING_EVENT, TAIL_VAR, frameIndex, scrollConfig } from "./config";
import { InterludeScene } from "./interludeScene";
import { interludes, type FramePair, type Interlude } from "./interludes";
import { clamp, cubicBezier, lerp } from "./math";

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
 * One scroll position, in screen heights, runs from the Frame 1 start state
 * through every frame and interlude. Input sets where it is heading, and the
 * scene follows with a short ease that comes to rest soon after input stops.
 * Nothing moves on its own, except a key glide or a jump the visitor asked for.
 */
export class ScrollEngine {
  /** Where the scene is drawn, and where input has sent it. */
  private pos = 0;
  private target = 0;
  /** Slowest the scene closes the gap to the target, in screen heights per millisecond. */
  private floor = 0;
  private readonly openingEnd = frame1Config.scrollOpening.distance;
  private readonly pairs: Pair[] = [];
  /** Scroll position of every frame, where it sits fully on screen. Frame 1 sits at the end of its opening. */
  private readonly frameStops: number[] = [];
  /** Every place a key press can stop, with and without reduced motion. */
  private readonly stops: number[] = [];
  private readonly reducedStops: number[] = [];
  private readonly lastFrame: number;
  private readonly end: number;
  private readonly scene: InterludeScene;
  private readonly cover = document.createElement("div");
  private readonly media = window.matchMedia("(prefers-reduced-motion: reduce)");
  private reduced: boolean;
  private readonly keyCurve = cubicBezier(scrollConfig.keyCurve);
  /** Shortest time to rest, from the follow time constant, so the ease and the floor meet smoothly. */
  private readonly floorMs: number;

  private glide: Glide | null = null;
  private jump: Jump | null = null;
  private frameId = 0;
  private lastTick = 0;
  private stepSum = 0;
  private lastStep = 0;
  private wheel = { at: -Infinity, size: 0, dir: 0, fading: false };
  private touchY: number | null = null;
  private openingSent = -1;
  private tailSent = -1;
  private active: number | null = null;
  private visible = new Set<number>();
  private revealing = new Set<number>();
  private styled = new Set<number>();
  private pairShown: Pair | null = null;

  constructor(
    private readonly stage: HTMLElement,
    private readonly slots: HTMLElement[],
  ) {
    this.reduced = this.media.matches;
    const tau = scrollConfig.follow.ms;
    this.floorMs = tau * Math.exp(scrollConfig.follow.settleMs / tau - 1);

    let at = this.openingEnd;
    this.stops.push(0, at);
    this.reducedStops.push(0, at);
    this.frameStops.push(at);
    for (let index = 0; index + 1 < slots.length; index += 1) {
      const key = `${frameOrder[index]}>${frameOrder[index + 1]}` as FramePair;
      const interlude = interludes[key] ?? null;
      const length = InterludeScene.length(interlude);
      this.pairs.push({ from: index, to: index + 1, start: at, end: at + length, interlude });
      for (const stop of InterludeScene.stops(interlude, false)) this.stops.push(at + stop);
      for (const stop of InterludeScene.stops(interlude, true)) this.reducedStops.push(at + stop);
      at += length;
      this.stops.push(at);
      this.reducedStops.push(at);
      this.frameStops.push(at);
    }
    this.lastFrame = at;
    this.end = at + scrollConfig.tail;
    this.stops.push(this.end);

    this.scene = new InterludeScene(stage);
    this.cover.className = "txd-cover";
    this.cover.setAttribute("aria-hidden", "true");
    stage.append(this.cover);
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
    const font = `"Instrument Serif"`;
    Promise.all([document.fonts?.load(`400 100px ${font}`), document.fonts?.load(`italic 400 100px ${font}`)])
      .catch(() => undefined)
      .then(() => document.fonts?.ready)
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
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.scene.destroy();
    this.cover.remove();
  }

  private overlayOpen() {
    if (this.scene.noteOpen()) return true;
    return this.slots.some(
      (slot) => !slot.classList.contains("is-parked") && slot.querySelector(scrollConfig.overlays),
    );
  }

  private onMotionPreference = () => {
    this.reduced = this.media.matches;
    this.settle(this.reduced ? this.nearestStop(this.pos) : this.pos);
  };

  private onResize = () => {
    this.scene.measure();
    this.render();
  };

  /** Puts the scene straight at `to`, with nothing left to ease. */
  private settle(to: number) {
    this.glide = null;
    this.pos = to;
    this.target = to;
    this.render();
  }

  private nearestStop(at: number) {
    const stops = this.reduced ? this.reducedStops : this.stops;
    return stops.reduce((best, stop) => (Math.abs(stop - at) < Math.abs(best - at) ? stop : best), stops[0]);
  }

  /**
   * Moves the target by d screen heights. A frame on the way stops it, and
   * the tail of a flick does not carry past a frame it has reached.
   */
  private move(d: number, tail: boolean) {
    if (d === 0) return;
    if (this.glide) {
      this.glide = null;
      this.target = this.pos;
    }
    const from = this.target;
    if (tail && this.frameStops.some((at) => Math.abs(at - from) < EPS)) return;
    let next = clamp(from + d, 0, this.end);
    const crossed =
      d > 0
        ? this.frameStops.find((at) => at > from + EPS && at < next - EPS)
        : [...this.frameStops].reverse().find((at) => at < from - EPS && at > next + EPS);
    if (crossed !== undefined) next = crossed;
    this.target = next;
    this.floor = Math.abs(this.target - this.pos) / this.floorMs;
    this.run();
  }

  /** With reduced motion, input adds up to a step, and each step crossfades to the next stop. */
  private step(delta: number, now: number) {
    if (this.glide || this.jump) return;
    const dir = Math.sign(delta);
    if (now - this.lastStep > scrollConfig.reduced.quietMs || Math.sign(this.stepSum) !== dir) this.stepSum = 0;
    this.lastStep = now;
    this.stepSum += delta;
    if (Math.abs(this.stepSum) < scrollConfig.reduced.threshold) return;
    this.stepSum = 0;
    const to = this.nextStop(dir, this.pos);
    if (to === null) return;
    this.startGlide(to, scrollConfig.reduced.ms, (x) => x, now);
  }

  private nextStop(dir: number, from: number) {
    const stops = this.reduced ? this.reducedStops : this.stops;
    if (dir > 0) return stops.find((at) => at > from + EPS) ?? null;
    return [...stops].reverse().find((at) => at < from - EPS) ?? null;
  }

  private startGlide(to: number, ms: number, curve: (x: number) => number, now: number) {
    this.glide = { from: this.pos, to, start: now, ms, curve };
    this.target = to;
    this.run();
  }

  private run() {
    if (this.frameId) return;
    this.lastTick = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frameId = 0;
    const dt = clamp(now - this.lastTick, 0, 250);
    this.lastTick = now;
    if (this.jump) {
      const jump = this.jump;
      const x = clamp((now - jump.start) / scrollConfig.jumpMs, 0, 2);
      if (x >= 1 && !jump.swapped) {
        jump.swapped = true;
        this.settle(jump.to);
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
      }
      this.target = this.pos;
      this.render();
    } else if (this.pos !== this.target) {
      const gap = this.target - this.pos;
      const eased = gap * (1 - Math.exp(-dt / scrollConfig.follow.ms));
      const least = Math.min(Math.abs(gap), this.floor * dt);
      this.pos += Math.abs(eased) >= least ? eased : Math.sign(gap) * least;
      if (Math.abs(this.target - this.pos) < 1e-6) this.pos = this.target;
      this.render();
    }
    if (this.jump || this.glide || this.pos !== this.target) this.frameId = requestAnimationFrame(this.tick);
  };

  /** Fades through black straight to a position, however far away it is. */
  private jumpTo(to: number) {
    if (Math.abs(to - this.pos) < EPS && !this.glide) return;
    this.glide = null;
    this.target = this.pos;
    this.jump = { to, start: performance.now(), swapped: false };
    this.cover.classList.add("is-on");
    this.run();
  }

  private onGoto = (event: Event) => {
    const index = frameIndex((event as CustomEvent<FrameId>).detail);
    if (index < 0 || this.overlayOpen()) return;
    // Frame 1 is reached at its start state, so the opening plays again with the scroll.
    this.jumpTo(index === 0 ? 0 : this.frameStops[index]);
  };

  /** True when this wheel event belongs to the fading tail of a flick. */
  private isTail(delta: number, now: number) {
    const wheel = this.wheel;
    const size = Math.abs(delta);
    const dir = Math.sign(delta);
    if (now - wheel.at >= scrollConfig.momentum.pauseMs || dir !== wheel.dir) wheel.fading = false;
    else if (size < wheel.size) wheel.fading = true;
    else if (size > wheel.size) wheel.fading = false;
    wheel.at = now;
    wheel.size = size;
    wheel.dir = dir;
    return wheel.fading;
  }

  private onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= scrollConfig.input.lineHeight;
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    if (Math.abs(event.deltaX) > Math.abs(delta) || delta === 0) return;
    const now = performance.now();
    const tail = this.isTail(delta, now);
    if (this.jump) return;
    const max = scrollConfig.input.maxDelta;
    delta = clamp(delta, -max, max);
    if (this.reduced) this.step(delta, now);
    else this.move((delta * scrollConfig.input.scrollScale) / window.innerHeight, tail);
  };

  private onTouchStart = (event: TouchEvent) => {
    this.touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (this.touchY === null || event.touches.length !== 1) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const delta = (this.touchY - y) * scrollConfig.input.touchScale;
    this.touchY = y;
    if (this.jump) return;
    if (this.reduced) this.step(delta, performance.now());
    else this.move((delta * scrollConfig.input.scrollScale) / window.innerHeight, false);
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
    const from = this.glide && Math.sign(this.glide.to - this.glide.from) === dir ? this.glide.to : this.target;
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
    const tail = this.reduced ? 0 : clamp((pos - this.lastFrame) / scrollConfig.tail);
    if (Math.abs(tail - this.tailSent) > 1e-5) {
      this.tailSent = tail;
      this.stage.style.setProperty(TAIL_VAR, tail.toFixed(5));
    }

    const pair = this.pairAt(pos);
    let active: number | null = null;
    const visible = new Set<number>();
    const revealing = new Set<number>();
    let destStyle: { clip: string | null; opacity: number } | null = null;

    if (pair) {
      if (pair !== this.pairShown) {
        this.pairShown = pair;
        this.scene.set(pair.interlude);
      }
      const view = this.scene.render(pos - pair.start, this.reduced);
      if (view.source) visible.add(pair.from);
      if (view.dest) {
        visible.add(pair.to);
        revealing.add(pair.to);
        destStyle = { clip: view.clip, opacity: view.destOpacity };
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
      const back = revealing.has(index);
      if (back !== this.revealing.has(index)) slot.classList.toggle("is-revealing", back);
      slot.toggleAttribute("inert", index !== active);
      if (back && destStyle) {
        slot.style.clipPath = destStyle.clip ?? "";
        slot.style.opacity = destStyle.opacity < 1 ? destStyle.opacity.toFixed(4) : "";
        this.styled.add(index);
      } else if (this.styled.has(index)) {
        slot.style.clipPath = "";
        slot.style.opacity = "";
        this.styled.delete(index);
      }
    });
    this.visible = visible;
    this.revealing = revealing;

    if (active !== this.active) {
      const was = this.active;
      this.active = active;
      if (active !== null && (was !== null || this.stage.dataset.active !== undefined)) {
        this.slots[active].focus({ preventScroll: true });
      }
    }
    const nearest = active ?? (pair ? (pos - pair.start < (pair.end - pair.start) / 2 ? pair.from : pair.to) : 0);
    this.stage.dataset.active = String(nearest);
    this.stage.dataset.phase = pair ? "move" : "idle";
  }
}
