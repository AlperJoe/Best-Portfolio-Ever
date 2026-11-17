import type { Bezier } from "./math";

export type TransitionVariant = "a" | "b" | "c";

export type PaletteBlob = {
  /** Center as a fraction of the screen. */
  x: number;
  y: number;
  /** Radius as a fraction of the screen. */
  r: number;
  color: string;
};

export type FramePalette = {
  base: string;
  blobs: PaletteBlob[];
};

/**
 * Variants a and b. The progress follows the scroll input through a spring,
 * then rolls on its own once it passes the halfway point.
 */
export type FollowMotion = {
  model: "follow";
  /** Scroll distance, in pixels, that moves the full way once the resistance is gone. */
  pushDistance: number;
  /** How much of the input moves the wagon at standstill. 0.3 means 30 %. */
  startGain: number;
  /** Progress at which the resistance has fully let go. */
  gainRampEnd: number;
  /** Curve of the resistance letting go between 0 and gainRampEnd. Higher holds longer. */
  gainCurve: number;
  /** How tightly the wagon follows the input, per second. Lower feels heavier. */
  stiffness: number;
  /** Seconds to roll from the halfway point to the lock. Scales with the distance left. */
  rollSeconds: number;
  /** Shortest forward roll, in seconds. */
  minRollSeconds: number;
  /** Speed when it reaches the lock, as a multiple of the average roll speed. 0 is soft, 1 is firm. */
  arriveSpeed: number;
  /** Seconds to roll back from the halfway point to standstill. Scales with the distance. */
  backSeconds: number;
  /** Shortest roll back, in seconds. */
  minBackSeconds: number;
  /** Key press: scroll pixels per second fed in until the wagon passes halfway. */
  keyRate: number;
};

/**
 * Variant c. A wagon on a track with a crest at the halfway point. It sticks
 * at standstill until the push breaks it loose, the slope rolls it back if it
 * stops short, and it runs down into the latch once it is over the crest.
 */
export type HillMotion = {
  model: "hill";
  /** Scroll pixels stored as strain before the wagon breaks loose. */
  breakaway: number;
  /** Progress the wagon creeps forward while it is still stuck. */
  creep: number;
  /** Seconds for stored strain to relax once the push stops. */
  strainRelax: number;
  /** Speed it lurches to when it breaks loose, in progress per second. */
  breakSpeed: number;
  /** Speed added per scroll pixel, in progress per second. */
  impulse: number;
  /** Rolling friction before the crest, per second. */
  friction: number;
  /** Slope that pulls it back before the crest, in progress per second squared. */
  slopeBack: number;
  /** Slope that pulls it forward after the crest. Grows with progress. */
  slopeForward: number;
  /** Rolling friction after the crest, per second. */
  rollFriction: number;
  /** Progress where the brake before the latch starts. */
  brakeFrom: number;
  /** Brake strength, per second. */
  brake: number;
  /** Lowest speed over the crest, in progress per second. */
  minSpeed: number;
  /** Lowest speed inside the brake, so it still reaches the latch firmly. */
  latchSpeed: number;
  /** Highest speed, in progress per second. */
  maxSpeed: number;
  /** Impact speed that gives the full lock jolt. */
  impactRef: number;
  /** Key press: scroll pixels per second fed in until the wagon passes the crest. */
  keyRate: number;
};

export type VariantConfig = {
  motion: FollowMotion | HillMotion;
  /** Progress past which the wagon no longer rolls back. */
  commitAt: number;
  /** Seconds without input before an unfinished push counts as let go. Touch lets go on lift. */
  releaseMs: number;
  depth: {
    /** Size of the incoming object at the start, as a fraction of its final size. */
    startScale: number;
    /** 1 grows like a real object coming closer at a steady speed. 0 grows evenly. */
    perspective: number;
    /** Point the object comes from, as a fraction of the screen. */
    vanishX: number;
    vanishY: number;
    /** Progress over which the object fades in from the distance. */
    fadeIn: number;
  };
  source: {
    /** Blur on the frame you leave, in pixels, when it is fully covered. */
    blur: number;
    /** Scale of the frame you leave when it is fully covered. Above 1 passes the camera. */
    scale: number;
    /** Downward drift of the frame you leave, as a fraction of the screen height. */
    drift: number;
    /** Progress at which the blurred color field fully covers the frame you leave. */
    coverAt: number;
  };
  field: {
    /** Progress where the destination colors start to mix in, and where they take over. */
    mixFrom: number;
    mixTo: number;
    /** Size of each color blob. Bigger is softer. */
    softness: number;
  };
  lock: {
    /** Length of the lock, in milliseconds. */
    ms: number;
    /** Extra scale the object carries into the latch before it seats. */
    kick: number;
    /** Vertical jolt of the whole view, in pixels. */
    shake: number;
    /** Darkening at the moment of the lock. 0 turns it off. */
    shade: number;
  };
  reveal: {
    /** Milliseconds after the lock starts before the rest of the frame appears. */
    delay: number;
    /** Milliseconds for the rest of the frame to appear. */
    ms: number;
    curve: Bezier;
  };
  print: {
    enabled: boolean;
    /** Paper edge, as a fraction of the short side of the screen at full size. */
    edge: number;
    color: string;
    /** Soft shadow under the print at full size. */
    shadow: string;
  };
};

const followA: FollowMotion = {
  model: "follow",
  pushDistance: 620,
  startGain: 0.22,
  gainRampEnd: 0.32,
  gainCurve: 1.6,
  stiffness: 9,
  rollSeconds: 0.95,
  minRollSeconds: 0.5,
  arriveSpeed: 0.45,
  backSeconds: 0.85,
  minBackSeconds: 0.4,
  keyRate: 1250,
};

const variantA: VariantConfig = {
  motion: followA,
  commitAt: 0.5,
  releaseMs: 240,
  depth: {
    startScale: 0.16,
    perspective: 0.75,
    vanishX: 0.5,
    vanishY: 0.46,
    fadeIn: 0.14,
  },
  source: {
    blur: 18,
    scale: 1.06,
    drift: 0,
    coverAt: 0.55,
  },
  field: {
    mixFrom: 0.1,
    mixTo: 0.9,
    softness: 1,
  },
  lock: {
    ms: 260,
    kick: 0.006,
    shake: 2,
    shade: 0,
  },
  reveal: {
    delay: 180,
    ms: 520,
    curve: [0.3, 0, 0.2, 1],
  },
  print: {
    enabled: false,
    edge: 0.018,
    color: "#F1EBDF",
    shadow: "0 28px 70px rgba(0, 0, 0, 0.55), 0 6px 18px rgba(0, 0, 0, 0.35)",
  },
};

const variantB: VariantConfig = {
  ...variantA,
  lock: {
    ...variantA.lock,
    shake: 0,
  },
  print: {
    ...variantA.print,
    enabled: true,
  },
};

const variantC: VariantConfig = {
  motion: {
    model: "hill",
    breakaway: 260,
    creep: 0.035,
    strainRelax: 0.35,
    breakSpeed: 0.2,
    impulse: 0.0012,
    friction: 1.1,
    slopeBack: 0.55,
    slopeForward: 0.9,
    rollFriction: 0.4,
    brakeFrom: 0.8,
    brake: 5,
    minSpeed: 0.4,
    latchSpeed: 0.3,
    maxSpeed: 1.1,
    impactRef: 0.45,
    keyRate: 2000,
  },
  commitAt: 0.5,
  releaseMs: 240,
  depth: {
    startScale: 0.14,
    perspective: 0.85,
    vanishX: 0.5,
    vanishY: 0.6,
    fadeIn: 0.12,
  },
  source: {
    blur: 22,
    scale: 1.16,
    drift: 0.05,
    coverAt: 0.5,
  },
  field: {
    mixFrom: 0.05,
    mixTo: 0.85,
    softness: 1,
  },
  lock: {
    ms: 320,
    kick: 0.012,
    shake: 5,
    shade: 0.22,
  },
  reveal: {
    delay: 220,
    ms: 480,
    curve: [0.3, 0, 0.2, 1],
  },
  print: {
    ...variantA.print,
    enabled: false,
  },
};

export const transitionConfig = {
  defaultVariant: "a" as TransitionVariant,
  variants: { a: variantA, b: variantB, c: variantC } satisfies Record<TransitionVariant, VariantConfig>,

  /** Main object of each frame, in frame order. */
  mainObjects: ["#frame1-main-image", "#frame2-main-image", "#frame3-main-image"],
  /** While any of these is open, scrolling stays inside the frame. */
  overlays: ".research-layer, .frame2-open, .frame3-panel",

  /** Blurred color of each frame, in frame order. The transition mixes two of them. */
  palettes: [
    {
      base: "#0b0a0f",
      blobs: [
        { x: 0.5, y: 0.42, r: 0.4, color: "rgba(4, 4, 6, 0.95)" },
        { x: 0.04, y: 0.62, r: 0.6, color: "rgba(237, 118, 36, 0.6)" },
        { x: 0.96, y: 0.58, r: 0.6, color: "rgba(0, 20, 137, 0.85)" },
        { x: 0.5, y: 0.12, r: 0.22, color: "rgba(196, 64, 48, 0.22)" },
      ],
    },
    {
      base: "#220806",
      blobs: [
        { x: 0.3, y: 0.3, r: 0.7, color: "rgba(112, 26, 18, 0.75)" },
        { x: 0.78, y: 0.36, r: 0.42, color: "rgba(176, 120, 78, 0.55)" },
        { x: 0.2, y: 0.82, r: 0.45, color: "rgba(196, 146, 66, 0.42)" },
        { x: 0.88, y: 0.9, r: 0.35, color: "rgba(36, 52, 92, 0.6)" },
      ],
    },
    {
      base: "#12151a",
      blobs: [
        { x: 0.66, y: 0.46, r: 0.55, color: "rgba(52, 60, 74, 0.8)" },
        { x: 0.22, y: 0.4, r: 0.4, color: "rgba(28, 34, 44, 0.7)" },
        { x: 0.6, y: 0.62, r: 0.3, color: "rgba(54, 170, 150, 0.16)" },
      ],
    },
  ] satisfies FramePalette[],

  input: {
    /** Pixels per line when a wheel reports lines (Firefox with a mouse). */
    lineHeight: 16,
    /** Largest single wheel step, in pixels. Stops one hard flick from jumping. */
    maxDelta: 140,
    /** Touch distance multiplier. */
    touchScale: 1.3,
    /** After a touch lifts, its speed keeps pushing and fades over this many seconds. */
    flingDecay: 0.33,
    /** Fling speed, in pixels per second, below which it stops. */
    flingStop: 60,
    /** After a lock, scroll is ignored until it has been quiet this long... */
    quietMs: 220,
    /** ...or, after holdMs, a step this many times larger than the fading tail arrives. */
    spikeRatio: 2.5,
    /** The smallest step that can count as a new swipe. */
    spikeMin: 30,
    holdMs: 350,
  },

  /** With reduced motion, a scroll step crossfades instead. */
  reduced: {
    ms: 320,
    /** Scroll pixels that count as one step. */
    threshold: 24,
  },

  /** Frame 3 is not part of the push yet. It crossfades until a variant is chosen. */
  placeholder: {
    ms: 420,
    threshold: 40,
  },
};

export function readVariant(search = window.location.search): TransitionVariant {
  const value = new URLSearchParams(search).get("transition")?.toLowerCase();
  if (value === "a" || value === "b" || value === "c") return value;
  return transitionConfig.defaultVariant;
}
