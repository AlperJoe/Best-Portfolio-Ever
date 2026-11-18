import { frame1Config } from "../frame1/config";
import { frameOrder, type FrameId } from "../frameOrder";
import { OPENING_EVENT, SCROLL_VAR, TAIL_VAR, frameIndex, scrollConfig } from "./config";
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
/** A scroll position by the part it falls in, so it survives a change in frame heights. */
type Spot = { part: "opening" | "frame" | "pair" | "tail"; index: number; offset: number };

/**
 * One scroll position, in screen heights, runs from the Frame 1 start state
 * through every frame and interlude. Input sets where it is heading, and the
 * scene follows with a short ease that comes to rest soon after input stops.
 * A gesture that reaches a frame stops there, and during a gesture the scene
 * never moves faster than the configured rate. Nothing moves on its own,
 * except a key glide or a jump the visitor asked for.
 *
 * On a narrow screen a frame taller than the screen spans a range of the
 * scroll, from its top to its bottom, and its content moves with the scroll
 * inside that range.
 */
export class ScrollEngine {
  /** Where the scene is drawn, and where input has sent it. */
  private pos = 0;
  private target = 0;
  /** Slowest the scene closes the gap to the target, in screen heights per millisecond. */
  private floor = 0;
  private readonly openingEnd = frame1Config.scrollOpening.distance;
  private readonly pairs: Pair[] = [];
  private readonly pairInterludes: (Interlude | null)[] = [];
  /** Height of every frame past one screen, in screen heights. Zero on wide screens. */
  private extras: number[] = [];
  /** Scroll position where each frame's top meets the top of the screen, and where its bottom meets the bottom. */
  private readonly frameTops: number[] = [];
  private readonly frameBottoms: number[] = [];
  /** Every place a key press can stop, with and without reduced motion. Includes each interlude's resting place. */
  private readonly stops: number[] = [];
  private readonly reducedStops: number[] = [];
  private lastFrame = 0;
  private end = 0;
  private screenH = window.innerHeight;
  /** How far each frame's content is moved up now, in pixels. */
  private offsets: number[] = [];
  private readonly frameSizes: ResizeObserver;
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
  /** The gesture now in progress has already been caught by a frame. */
  private caught = false;
  /** Event time of the catch, the largest event since it, and the smallest since the sizes began to fall. */
  private caughtAt = -Infinity;
  private catchPeak = 0;
  private catchLow = Infinity;
  /** Size of the latest wheel or touch event, in pixels. */
  private lastSize = 0;
  /**
   * Timestamp of the last wheel or trackpad event, from the event itself.
   * A quiet gap longer than the config starts a new gesture.
   */
  private gestureAt = -Infinity;
  /** Distance the gesture may still spend, in screen heights, and when it was refilled. */
  private credit = 0;
  private creditAt = -Infinity;
  private touchY: number | null = null;
  /** The next touch move is the first of a new finger gesture. */
  private touchFresh = false;
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

    for (let index = 0; index + 1 < slots.length; index += 1) {
      const key = `${frameOrder[index]}>${frameOrder[index + 1]}` as FramePair;
      this.pairInterludes.push(interludes[key] ?? null);
    }
    this.offsets = slots.map(() => 0);
    this.build(this.measureExtras());
    this.frameSizes = new ResizeObserver(() => {
      if (this.relayout()) this.render();
    });

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

  /** Frame heights past one screen, in screen heights. Only narrow screens let a frame be taller. */
  private measureExtras() {
    const height = window.innerHeight;
    const narrow = window.innerWidth < scrollConfig.tall.maxWidth;
    return this.slots.map((slot) => {
      const frame = slot.firstElementChild;
      if (!narrow || !(frame instanceof HTMLElement) || height <= 0) return 0;
      return Math.max(0, Math.round(frame.offsetHeight) - height) / height;
    });
  }

  /** Lays every frame, interlude and stop along the scroll for the given frame heights. */
  private build(extras: number[]) {
    this.extras = extras;
    this.screenH = window.innerHeight;
    this.pairs.length = 0;
    this.frameTops.length = 0;
    this.frameBottoms.length = 0;
    this.stops.length = 0;
    this.reducedStops.length = 0;
    this.stops.push(0);
    this.reducedStops.push(0);
    const step = scrollConfig.tall.keyStep;
    let at = this.openingEnd;
    this.slots.forEach((_, index) => {
      const extra = extras[index] ?? 0;
      const frameStops = [at];
      for (let inside = step; inside < extra - 0.1; inside += step) frameStops.push(at + inside);
      if (extra > EPS) frameStops.push(at + extra);
      this.stops.push(...frameStops);
      this.reducedStops.push(...frameStops);
      this.frameTops.push(at);
      at += extra;
      this.frameBottoms.push(at);
      if (index + 1 >= this.slots.length) return;
      const interlude = this.pairInterludes[index];
      const length = InterludeScene.length(interlude);
      this.pairs.push({ from: index, to: index + 1, start: at, end: at + length, interlude });
      for (const stop of InterludeScene.stops(interlude, false)) this.stops.push(at + stop);
      for (const stop of InterludeScene.stops(interlude, true)) this.reducedStops.push(at + stop);
      at += length;
    });
    this.lastFrame = at;
    this.end = at + scrollConfig.tail;
    this.stops.push(this.end);
  }

  private locate(at: number): Spot {
    if (at <= this.openingEnd + EPS) return { part: "opening", index: 0, offset: at };
    for (let index = 0; index < this.frameTops.length; index += 1) {
      if (at >= this.frameTops[index] - EPS && at <= this.frameBottoms[index] + EPS) {
        return { part: "frame", index, offset: at - this.frameTops[index] };
      }
    }
    const pair = this.pairs.findIndex((item) => at > item.start && at < item.end);
    if (pair >= 0) return { part: "pair", index: pair, offset: at - this.pairs[pair].start };
    return { part: "tail", index: 0, offset: at - this.lastFrame };
  }

  private place(spot: Spot) {
    if (spot.part === "opening") return spot.offset;
    if (spot.part === "frame") return this.frameTops[spot.index] + clamp(spot.offset, 0, this.extras[spot.index]);
    if (spot.part === "pair") return this.pairs[spot.index].start + spot.offset;
    return Math.min(this.end, this.lastFrame + spot.offset);
  }

  /** Rebuilds the scroll when a frame's height changed, keeping the scene where it is. */
  private relayout() {
    const extras = this.measureExtras();
    const same =
      window.innerHeight === this.screenH && extras.every((extra, index) => Math.abs(extra - this.extras[index]) < 1e-4);
    if (same) return false;
    const pos = this.locate(this.pos);
    this.build(extras);
    this.glide = null;
    this.pos = this.place(pos);
    this.target = this.pos;
    return true;
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
    this.stage.addEventListener("focusin", this.onFocusIn);
    for (const slot of this.slots) {
      slot.addEventListener("scroll", this.onSlotScroll);
      if (slot.firstElementChild) this.frameSizes.observe(slot.firstElementChild);
    }
    const font = `"Instrument Serif"`;
    Promise.all([document.fonts?.load(`400 100px ${font}`), document.fonts?.load(`italic 400 100px ${font}`)])
      .catch(() => undefined)
      .then(() => document.fonts?.ready)
      .then(() => {
        this.scene.measure();
        this.relayout();
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
    this.stage.removeEventListener("focusin", this.onFocusIn);
    for (const slot of this.slots) slot.removeEventListener("scroll", this.onSlotScroll);
    this.frameSizes.disconnect();
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

  /** The engine alone moves a frame. Focus can scroll a clipped slot, so that is undone. */
  private onSlotScroll = (event: Event) => {
    const slot = event.currentTarget as HTMLElement;
    slot.scrollTop = 0;
    slot.scrollLeft = 0;
  };

  /** Focus that lands outside the screen inside a tall frame glides the frame until it shows. */
  private onFocusIn = (event: FocusEvent) => {
    const active = this.active;
    if (active === null || this.extras[active] <= EPS || this.overlayOpen() || this.jump) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target === this.slots[active] || !this.slots[active].contains(target)) return;
    const box = target.getBoundingClientRect();
    const height = this.screenH;
    const margin = Math.min(48, height * 0.1);
    let shift = 0;
    if (box.top < margin) shift = box.top - margin;
    else if (box.bottom > height - margin) shift = Math.min(box.bottom - height + margin, box.top - margin);
    if (Math.abs(shift) < 1) return;
    const top = this.frameTops[active];
    const to = clamp(this.pos + shift / height, top, top + this.extras[active]);
    this.startGlide(to, scrollConfig.keyMs, this.keyCurve, performance.now());
  };

  private onResize = () => {
    this.scene.measure();
    this.relayout();
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
   * The frame a step from `from` to `to` would reach, in either direction:
   * its top on the way down, its bottom on the way up. Interlude resting
   * places and the inside of a tall frame are passed.
   */
  private frameOnWay(from: number, to: number) {
    if (to > from + EPS) return this.frameTops.find((at) => at > from + EPS && at <= to + EPS) ?? null;
    if (to < from - EPS) return [...this.frameBottoms].reverse().find((at) => at < from - EPS && at >= to - EPS) ?? null;
    return null;
  }

  /** Catches the gesture in progress on a frame. */
  private hold() {
    this.caught = true;
    this.caughtAt = this.gestureAt;
    this.catchPeak = this.lastSize;
    this.catchLow = Infinity;
  }

  /**
   * Moves the target by d screen heights. Reaching a frame catches the
   * gesture there, and later input from that gesture is ignored.
   */
  private move(d: number) {
    if (d === 0 || this.caught) return;
    if (this.glide) {
      this.glide = null;
      this.target = this.pos;
    }
    const from = this.target;
    let next = clamp(from + d, 0, this.end);
    const frame = this.frameOnWay(from, next);
    if (frame !== null) {
      next = frame;
      this.hold();
    }
    this.target = next;
    this.floor = Math.abs(this.target - this.pos) / this.floorMs;
    this.run();
  }

  /**
   * How much of `want` this gesture may spend. A new gesture may spend one
   * wheel step at once. After that the spend refills at the configured rate,
   * and it never banks more than one step, so a pause cannot become a leap.
   */
  private spend(now: number, want: number, fresh: boolean) {
    const rate = scrollConfig.gesture.maxPerSecond;
    const burst = scrollConfig.input.maxDelta / Math.max(1, window.innerHeight);
    if (fresh) this.credit = burst;
    else {
      const dt = Math.max(0, now - this.creditAt) / 1000;
      this.credit = Math.min(burst, this.credit + dt * rate);
    }
    this.creditAt = now;
    if (this.caught || want === 0) {
      if (fresh) this.credit = 0;
      return 0;
    }
    const used = Math.min(Math.abs(want), this.credit);
    // A new gesture's extra credit belongs to this event only, not the next one.
    this.credit = fresh ? 0 : this.credit - used;
    return Math.sign(want) * used;
  }

  /**
   * A wheel or trackpad gesture. A quiet gap in event time starts a new one
   * and clears the catch. During a catch, a trackpad keeps sending smaller
   * and smaller events after the finger lifts. An event that rises well
   * above the smallest of those is a new swipe, which also starts a new
   * gesture. A catch older than releaseMs lets go, and the rest of the
   * gesture moves on under the speed cap. `now` is the event's own
   * timestamp: the handler can run much later when a frame is busy drawing,
   * and that delay is not a gap in the gesture. `size` is the event's
   * distance in pixels.
   */
  private noteWheel(now: number, size: number) {
    const gesture = scrollConfig.gesture;
    let fresh = now - this.gestureAt >= gesture.quietMs;
    this.gestureAt = now;
    this.lastSize = size;
    if (fresh) {
      this.caught = false;
      return true;
    }
    if (!this.caught) return false;
    if (size > this.catchPeak) {
      this.catchPeak = size;
      this.catchLow = Infinity;
    } else {
      fresh = size > gesture.swipeRise * this.catchLow && size > gesture.swipeMinPx;
      this.catchLow = Math.min(this.catchLow, size);
    }
    if (fresh || now - this.caughtAt >= gesture.releaseMs) this.caught = false;
    return fresh;
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
      let step = Math.abs(eased) >= least ? eased : Math.sign(gap) * least;
      const cap = (scrollConfig.gesture.maxPerSecond * dt) / 1000;
      if (Math.abs(step) > cap) step = Math.sign(gap) * cap;
      let next = this.pos + step;
      const frame = this.frameOnWay(this.pos, next);
      if (frame !== null) {
        next = frame;
        this.target = frame;
        this.hold();
      }
      this.pos = next;
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
    this.jumpTo(index === 0 ? 0 : this.frameTops[index]);
  };

  private onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= scrollConfig.input.lineHeight;
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    if (Math.abs(event.deltaX) > Math.abs(delta) || delta === 0) return;
    // event.timeStamp is when the wheel moved. performance.now() here is when
    // the handler runs, which falls behind while a frame is painting.
    const now = event.timeStamp || performance.now();
    if (this.jump) return;
    const size = Math.abs(delta);
    const max = scrollConfig.input.maxDelta;
    delta = clamp(delta, -max, max);
    if (this.reduced) {
      this.step(delta, now);
      return;
    }
    const fresh = this.noteWheel(now, size);
    const screens = (delta * scrollConfig.input.scrollScale) / window.innerHeight;
    this.move(this.spend(now, screens, fresh));
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      this.touchY = null;
      return;
    }
    this.touchY = event.touches[0].clientY;
    // A finger down is a new gesture, even a moment after the last one.
    this.caught = false;
    this.touchFresh = true;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (this.touchY === null || event.touches.length !== 1) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const delta = (this.touchY - y) * scrollConfig.input.touchScale;
    this.touchY = y;
    if (this.jump) return;
    const now = performance.now();
    if (this.reduced) {
      this.step(delta, now);
      return;
    }
    const fresh = this.touchFresh;
    this.touchFresh = false;
    this.gestureAt = now;
    this.lastSize = Math.abs(delta);
    const screens = (delta * scrollConfig.input.scrollScale) / window.innerHeight;
    this.move(this.spend(now, screens, fresh));
  };

  private onTouchEnd = () => {
    this.touchY = null;
    this.touchFresh = false;
    this.caught = false;
    this.gestureAt = -Infinity;
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

  /**
   * Moves a tall frame's content up by `px`. The slot carries the same
   * distance in SCROLL_VAR, so a layer inside the frame can stay on screen.
   */
  private offsetFrame(slot: HTMLElement, index: number, px: number) {
    const value = Math.round(px * 100) / 100;
    if (value === this.offsets[index]) return;
    this.offsets[index] = value;
    const frame = slot.firstElementChild;
    if (frame instanceof HTMLElement) frame.style.transform = value ? `translate3d(0, ${-value}px, 0)` : "";
    if (value) slot.style.setProperty(SCROLL_VAR, `${value}px`);
    else slot.style.removeProperty(SCROLL_VAR);
  }

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
      for (let at = 0; at < this.frameTops.length; at += 1) {
        if (pos >= this.frameTops[at] - EPS) index = at;
      }
      active = index;
      visible.add(index);
    }

    this.slots.forEach((slot, index) => {
      // A tall frame shows its bottom while its interlude plays, and its top while it opens.
      let offset = 0;
      if (index === active) offset = clamp(pos - this.frameTops[index], 0, this.extras[index]);
      else if (pair && index === pair.from) offset = this.extras[index];
      this.offsetFrame(slot, index, offset * this.screenH);
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
