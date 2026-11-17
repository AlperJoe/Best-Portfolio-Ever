import type { FollowMotion, HillMotion, VariantConfig } from "./config";
import { clamp, hermite, smoothstep } from "./math";

export type MotionEnd = "forward" | "back" | null;

/** Progress of one push from the current frame (0) to the next one (1). */
export interface Motion {
  readonly p: number;
  readonly committed: boolean;
  /** 0 to 1, how hard it hit the lock. */
  readonly impact: number;
  /** Scroll pixels toward the destination. Negative pulls back. */
  input(along: number): void;
  /** The visitor has let go. */
  release(): void;
  step(dt: number): MotionEnd;
}

const SUBSTEP = 1 / 240;

type Curve = ReturnType<typeof hermite>;

class FollowModel implements Motion {
  p = 0;
  committed = false;
  impact = 1;
  private v = 0;
  private target = 0;
  private pulledBack = false;
  private mode: "push" | "roll" | "back" = "push";
  private curve: Curve | null = null;
  private t = 0;
  private seconds = 1;

  constructor(
    private readonly cfg: FollowMotion,
    private readonly commitAt: number,
  ) {}

  private gain(x: number) {
    const t = clamp(x / this.cfg.gainRampEnd);
    return this.cfg.startGain + (1 - this.cfg.startGain) * Math.pow(smoothstep(0, 1, t), this.cfg.gainCurve);
  }

  input(along: number) {
    if (this.committed) return;
    if (this.mode === "back") {
      this.mode = "push";
      this.target = this.p;
      this.v = this.curve ? this.curve.speed(this.t) : 0;
      this.curve = null;
    }
    this.target = clamp(this.target + (this.gain(this.target) * along) / this.cfg.pushDistance);
    if (along < 0 && this.target <= 0) this.pulledBack = true;
  }

  release() {
    if (this.committed || this.mode !== "push") return;
    this.startBack();
  }

  private startRoll() {
    this.committed = true;
    this.mode = "roll";
    const distance = Math.max(0.0001, 1 - this.p);
    let seconds = Math.max(this.cfg.minRollSeconds, (this.cfg.rollSeconds * distance) / (1 - this.commitAt));
    let start = Math.max(0, this.v);
    if (start * seconds > 2 * distance) {
      seconds = Math.max(this.cfg.minRollSeconds, (2 * distance) / start);
    }
    const arrive = this.cfg.arriveSpeed;
    const limit = Math.sqrt(Math.max(0, 9 - arrive * arrive));
    start = Math.min(start, (limit * distance) / seconds);
    this.seconds = seconds;
    this.curve = hermite(this.p, start, 1, (arrive * distance) / seconds, seconds);
    this.t = 0;
  }

  private startBack() {
    this.mode = "back";
    const distance = this.p;
    if (distance < 0.0005) {
      this.curve = null;
      return;
    }
    const seconds = Math.max(
      this.cfg.minBackSeconds,
      this.cfg.backSeconds * Math.sqrt(distance / this.commitAt),
    );
    const carry = clamp((this.v * seconds) / distance, -2, 0.9);
    this.seconds = seconds;
    this.curve = hermite(this.p, (carry * distance) / seconds, 0, 0, seconds);
    this.t = 0;
  }

  step(dt: number): MotionEnd {
    if (this.mode === "push") {
      const k = this.cfg.stiffness;
      let left = dt;
      while (left > 0) {
        const h = Math.min(SUBSTEP, left);
        left -= h;
        const accel = k * k * (this.target - this.p) - 2 * k * this.v;
        this.v += accel * h;
        this.p += this.v * h;
      }
      this.p = clamp(this.p);
      if (this.target >= this.commitAt) this.startRoll();
      else if (this.pulledBack && this.target <= 0 && this.p < 0.002 && Math.abs(this.v) < 0.02) {
        this.p = 0;
        return "back";
      }
      return null;
    }

    if (!this.curve) {
      this.p = this.mode === "roll" ? 1 : 0;
      return this.mode === "roll" ? "forward" : "back";
    }
    this.t += dt / this.seconds;
    if (this.t >= 1) {
      this.p = this.mode === "roll" ? 1 : 0;
      return this.mode === "roll" ? "forward" : "back";
    }
    this.p = clamp(this.curve.at(this.t), 0, 1);
    return null;
  }
}

class HillModel implements Motion {
  p = 0;
  committed = false;
  impact = 0;
  private v = 0;
  private stuck = true;
  private strain = 0;
  private released = false;

  constructor(
    private readonly cfg: HillMotion,
    private readonly commitAt: number,
  ) {}

  input(along: number) {
    if (this.committed) return;
    this.released = false;
    if (this.stuck) {
      this.strain = Math.max(0, this.strain + along);
      if (this.strain >= this.cfg.breakaway) {
        this.stuck = false;
        this.p = this.cfg.creep;
        this.v = this.cfg.breakSpeed + (this.strain - this.cfg.breakaway) * this.cfg.impulse;
        this.strain = 0;
      }
      return;
    }
    this.v = clamp(this.v + along * this.cfg.impulse, -this.cfg.maxSpeed, this.cfg.maxSpeed);
  }

  release() {
    this.released = true;
  }

  step(dt: number): MotionEnd {
    const cfg = this.cfg;
    if (this.stuck) {
      if (this.released) this.strain *= Math.exp(-dt / cfg.strainRelax);
      this.p = cfg.creep * clamp(this.strain / cfg.breakaway);
      if (this.released && this.strain < 0.5) {
        this.p = 0;
        return "back";
      }
      return null;
    }

    let left = dt;
    while (left > 0) {
      const h = Math.min(SUBSTEP, left);
      left -= h;
      let force: number;
      let friction: number;
      if (!this.committed) {
        force = -cfg.slopeBack * smoothstep(0, 0.06, this.p);
        friction = cfg.friction;
      } else {
        force = cfg.slopeForward * (0.5 + this.p);
        friction = cfg.rollFriction + (this.p > cfg.brakeFrom ? cfg.brake : 0);
      }
      this.v += force * h;
      this.v *= Math.exp(-friction * h);
      if (this.committed) {
        const floor = this.p > cfg.brakeFrom ? cfg.latchSpeed : cfg.minSpeed;
        this.v = clamp(this.v, floor, cfg.maxSpeed);
      }
      this.p += this.v * h;

      if (!this.committed && this.p >= this.commitAt) {
        this.committed = true;
        this.v = Math.max(this.v, cfg.minSpeed);
      }
      if (this.committed && this.p >= 1) {
        this.p = 1;
        this.impact = clamp(this.v / cfg.impactRef, 0.35, 1);
        return "forward";
      }
      if (!this.committed && this.p <= 0) {
        this.p = 0;
        this.v = 0;
        this.stuck = true;
        this.strain = 0;
        return "back";
      }
    }

    if (!this.committed && this.released && this.p <= cfg.creep && Math.abs(this.v) < 0.05) {
      this.stuck = true;
      this.strain = (this.p / cfg.creep) * cfg.breakaway * 0.999;
      this.v = 0;
    }
    return null;
  }
}

export function createMotion(variant: VariantConfig): Motion {
  return variant.motion.model === "follow"
    ? new FollowModel(variant.motion, variant.commitAt)
    : new HillModel(variant.motion, variant.commitAt);
}

export function keyRate(variant: VariantConfig) {
  return variant.motion.keyRate;
}
