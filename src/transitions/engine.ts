import { transitionConfig, type TransitionVariant, type VariantConfig } from "./config";
import { clamp } from "./math";
import { createMotion, keyRate, type Motion } from "./motion";
import { Scene } from "./scene";

type Phase = "idle" | "push" | "settle" | "fade";

const NEXT_KEYS = new Set(["ArrowDown", "PageDown"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "PageUp"]);
const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
const PRESSABLE = "button, a[href], summary, [role='button'], video, audio";

/**
 * Turns wheel, touch and key input into one push at a time between frames.
 * Every frame is its own full-screen slot. Only the active one is interactive.
 */
export class TransitionEngine {
  private active = 0;
  private phase: Phase = "idle";
  private target = 0;
  private dir = 1;
  private motion: Motion | null = null;
  private readonly scene: Scene;
  private readonly cfg: VariantConfig;
  private reduced: boolean;
  private readonly media = window.matchMedia("(prefers-reduced-motion: reduce)");

  private frameId = 0;
  private last = 0;
  private lastInput = 0;
  private keyDrive = false;
  private touching = false;
  private touchY = 0;
  private touchTime = 0;
  private touchSpeed = 0;
  private fling = 0;
  private settleStart = 0;
  private fadeStart = 0;
  private fadeMs = 0;
  private stepSum = 0;

  private gated = false;
  private gateStart = 0;
  private lastWheel = 0;
  private tail: number[] = [];

  constructor(
    private readonly stage: HTMLElement,
    private readonly slots: HTMLElement[],
    variant: TransitionVariant,
  ) {
    this.cfg = transitionConfig.variants[variant];
    this.reduced = this.media.matches;
    this.scene = new Scene(stage);
    stage.dataset.transition = variant;
    slots.forEach((slot, index) => this.park(slot, index !== 0));
    this.report();
  }

  attach() {
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);
    window.addEventListener("resize", this.onResize);
    this.media.addEventListener("change", this.onMotionPreference);
  }

  detach() {
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchcancel", this.onTouchEnd);
    window.removeEventListener("resize", this.onResize);
    this.media.removeEventListener("change", this.onMotionPreference);
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.scene.end();
    this.scene.destroy();
  }

  private park(slot: HTMLElement, parked: boolean) {
    slot.classList.toggle("is-parked", parked);
    slot.toggleAttribute("inert", parked);
    if (parked) slot.setAttribute("aria-hidden", "true");
    else slot.removeAttribute("aria-hidden");
  }

  private report() {
    this.stage.dataset.active = String(this.active);
    this.stage.dataset.phase = this.phase;
  }

  private overlayOpen() {
    return Boolean(this.slots[this.active]?.querySelector(transitionConfig.overlays));
  }

  /** A crossfade instead of a push: reduced motion, and Frame 3 until its push is built. */
  private fadeFor(to: number) {
    if (this.reduced) return transitionConfig.reduced;
    if (this.active === 2 || to === 2) return transitionConfig.placeholder;
    return null;
  }

  private onMotionPreference = () => {
    this.reduced = this.media.matches;
  };

  private onResize = () => {
    if (this.phase === "push" || this.phase === "settle") this.scene.measure();
  };

  private onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= transitionConfig.input.lineHeight;
    else if (event.deltaMode === 2) delta *= window.innerHeight;
    if (Math.abs(event.deltaX) > Math.abs(delta)) return;
    const max = transitionConfig.input.maxDelta;
    delta = clamp(delta, -max, max);
    const now = performance.now();
    if (this.passesGate(delta, now)) this.feed(delta, now);
  };

  /**
   * After a push commits, scroll is ignored until the wheel goes quiet or a
   * clearly new swipe arrives, so trackpad momentum never pushes twice.
   */
  private passesGate(delta: number, now: number) {
    const input = transitionConfig.input;
    const gap = now - this.lastWheel;
    this.lastWheel = now;
    const size = Math.abs(delta);
    const tail = this.tail.length
      ? this.tail.reduce((sum, value) => sum + value, 0) / this.tail.length
      : 0;
    if (gap > input.quietMs) this.tail = [];
    this.tail.push(size);
    if (this.tail.length > 5) this.tail.shift();

    if (!this.gated) return true;
    if (this.phase !== "idle") return false;
    const quiet = gap > input.quietMs;
    const spike =
      now - this.gateStart > input.holdMs &&
      size >= input.spikeMin &&
      size > tail * input.spikeRatio;
    if (!quiet && !spike) return false;
    this.gated = false;
    return true;
  }

  private gate(now: number) {
    this.gated = true;
    this.gateStart = now;
  }

  private feed(delta: number, now: number) {
    if (this.phase === "settle" || this.phase === "fade") return;

    if (this.phase === "idle") {
      if (Math.abs(delta) < 0.5) return;
      const dir = delta > 0 ? 1 : -1;
      const to = this.active + dir;
      if (to < 0 || to >= this.slots.length) return;
      const fade = this.fadeFor(to);
      if (fade) {
        if (now - this.lastInput > transitionConfig.input.quietMs || Math.sign(this.stepSum) !== dir) {
          this.stepSum = 0;
        }
        this.lastInput = now;
        this.stepSum += delta;
        if (Math.abs(this.stepSum) < fade.threshold) return;
        this.stepSum = 0;
        this.startFade(to, fade.ms, now);
        return;
      }
      this.startPush(dir, now);
    }

    if (this.phase === "push" && this.motion) {
      this.lastInput = now;
      this.motion.input(delta * this.dir);
    }
  }

  private startPush(dir: number, now: number) {
    this.dir = dir;
    this.target = this.active + dir;
    this.motion = createMotion(this.cfg);
    this.keyDrive = false;
    this.phase = "push";
    this.slots[this.active].toggleAttribute("inert", true);
    this.scene.begin(this.slots[this.active], this.slots[this.target], this.active, this.target, this.cfg);
    this.lastInput = now;
    this.report();
    this.run();
  }

  private startFade(to: number, ms: number, now: number) {
    this.target = to;
    this.phase = "fade";
    this.fadeStart = now;
    this.fadeMs = ms;
    this.gate(now);
    const dest = this.slots[to];
    this.slots[this.active].toggleAttribute("inert", true);
    dest.classList.remove("is-parked");
    dest.classList.add("is-fading");
    dest.style.opacity = "0";
    this.report();
    this.run();
  }

  private run() {
    if (this.frameId) return;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frameId = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;

    if (this.phase === "push" && this.motion) this.stepPush(dt, now);
    else if (this.phase === "settle") this.stepSettle(now);
    else if (this.phase === "fade") this.stepFade(now);

    if (this.phase !== "idle") this.frameId = requestAnimationFrame(this.tick);
  };

  private stepPush(dt: number, now: number) {
    const motion = this.motion!;
    if (this.fling) {
      const input = transitionConfig.input;
      motion.input(this.fling * dt * this.dir);
      this.fling *= Math.exp(-dt / input.flingDecay);
      if (Math.abs(this.fling) < input.flingStop || motion.committed) {
        this.fling = 0;
        this.lastInput = -Infinity;
      }
    }
    if (this.keyDrive && !motion.committed) {
      motion.input(keyRate(this.cfg) * dt);
      this.lastInput = now;
    } else if (!this.touching && !this.fling && now - this.lastInput > this.cfg.releaseMs) {
      motion.release();
    }

    const wasCommitted = motion.committed;
    const end = motion.step(dt);
    if (motion.committed && !wasCommitted) this.gate(now);

    if (end === "back") {
      this.scene.render(0);
      this.scene.end();
      this.slots[this.active].toggleAttribute("inert", false);
      this.motion = null;
      this.fling = 0;
      this.phase = "idle";
      this.report();
      return;
    }
    if (end === "forward") {
      this.phase = "settle";
      this.settleStart = now;
      this.scene.render(1, 0, motion.impact);
      this.report();
      return;
    }
    this.scene.render(motion.p);
  }

  private stepSettle(now: number) {
    const elapsed = now - this.settleStart;
    const lock = this.cfg.lock;
    const reveal = this.cfg.reveal;
    this.scene.render(1, clamp(elapsed / lock.ms), this.motion?.impact ?? 1);
    if (elapsed >= reveal.delay) this.scene.reveal((elapsed - reveal.delay) / reveal.ms);
    if (elapsed >= Math.max(lock.ms, reveal.delay + reveal.ms)) this.finish();
  }

  private stepFade(now: number) {
    const x = clamp((now - this.fadeStart) / this.fadeMs);
    const dest = this.slots[this.target];
    dest.style.opacity = (x * x * (3 - 2 * x)).toFixed(4);
    if (x < 1) return;
    dest.classList.remove("is-fading");
    dest.style.opacity = "";
    this.finish();
  }

  private finish() {
    const from = this.slots[this.active];
    const to = this.slots[this.target];
    this.scene.end();
    this.park(from, true);
    this.park(to, false);
    this.active = this.target;
    this.motion = null;
    this.keyDrive = false;
    this.fling = 0;
    this.phase = "idle";
    to.focus({ preventScroll: true });
    this.report();
  }

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
    if (event.repeat) return;
    const now = performance.now();

    if (this.phase === "idle") {
      const to = this.active + dir;
      if (to < 0 || to >= this.slots.length) return;
      const fade = this.fadeFor(to);
      if (fade) {
        this.startFade(to, fade.ms, now);
        return;
      }
      this.startPush(dir, now);
      this.keyDrive = true;
      return;
    }
    if (this.phase === "push" && dir === this.dir && this.motion && !this.motion.committed) {
      this.keyDrive = true;
    }
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    this.touching = true;
    this.touchY = event.touches[0].clientY;
    this.touchTime = performance.now();
    this.touchSpeed = 0;
    this.fling = 0;
    if (this.phase === "idle") this.gated = false;
  };

  private onTouchMove = (event: TouchEvent) => {
    if (!this.touching || event.touches.length !== 1) return;
    if (this.overlayOpen()) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    const delta = (this.touchY - y) * transitionConfig.input.touchScale;
    this.touchY = y;
    const now = performance.now();
    const elapsed = now - this.touchTime;
    if (elapsed > 0) this.touchSpeed = 0.6 * ((delta * 1000) / elapsed) + 0.4 * this.touchSpeed;
    this.touchTime = now;
    if (this.gated) return;
    this.feed(delta, now);
  };

  private onTouchEnd = () => {
    if (!this.touching) return;
    this.touching = false;
    const recent = performance.now() - this.touchTime < 80;
    const along = this.touchSpeed * this.dir;
    if (this.phase === "push" && recent && along > 0 && !this.motion?.committed) {
      this.fling = this.touchSpeed;
      this.lastInput = performance.now();
    } else {
      this.lastInput = -Infinity;
    }
  };
}
