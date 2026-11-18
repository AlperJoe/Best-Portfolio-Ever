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
  /** Camera distance for every tilt, as a multiple of the screen height. Smaller is stronger. */
  lens: number;
  /**
   * The incoming object. Scrolling down it enters from below the bottom edge,
   * scrolling up from above the top edge, and it travels on an S-shaped track
   * to its place, rising like a card that stands up on rails.
   */
  path: {
    /** Size at the start, as a fraction of its final size. */
    startScale: number;
    /** 1 grows like a real object coming closer at a steady speed. 0 grows evenly. */
    perspective: number;
    /** Gap between the screen edge and the object at the start, as a fraction of the screen height. */
    startGap: number;
    /** How far the start is pulled toward the horizontal center. 0 enters straight under its place. */
    startToCenter: number;
    /** Sideways bow of the track, as a fraction of the screen width. */
    bow: number;
    /** How long the track runs straight out of the edge and into its place. 0 to 1. */
    straight: number;
    /** Tilt back at the start, in degrees. It straightens on the way. */
    tilt: number;
    /** Curve of the straightening. Higher stays tilted longer. */
    tiltCurve: number;
    /** Progress over which the object fades in at the edge. */
    fadeIn: number;
  };
  /** Soft shadow on the ground under the incoming object. */
  shadow: {
    /** Darkness when the object arrives. */
    opacity: number;
    /** Width, as a fraction of the object width. */
    width: number;
    /** Height, as a fraction of the object width. */
    height: number;
  };
  /** Blur along the direction of travel while the speed is high. */
  motionBlur: {
    /** Strongest blur, in pixels. */
    max: number;
    /** Screen heights per second where it starts and where it is strongest. */
    from: number;
    to: number;
    /** Number of blur levels. Fewer is cheaper. */
    steps: number;
    /** Seconds the blur takes to follow the speed. */
    smoothing: number;
  };
  /** Two faint rails that show the track of the incoming object. */
  rails: {
    color: string;
    /** Opacity at full strength. */
    opacity: number;
    /** Line width, in pixels. */
    width: number;
    /** Gap between the rails, as a fraction of the object width. */
    gauge: number;
    /** Progress over which they appear. They fade out through the lock. */
    fadeIn: number;
  };
  /** The frame you leave is pushed away the other way and sinks into the background. */
  source: {
    /** Travel, as a fraction of the screen height, when the push is complete. */
    travel: number;
    /** Scale when the push is complete. */
    scale: number;
    /** Tilt back, in degrees, when the push is complete. */
    tilt: number;
    /** Darkening when the push is complete. 1 is black. */
    darken: number;
    /** Blur, in pixels, when the push is complete. */
    blur: number;
    /** Progress where it starts to fade into the background, and where it is gone. */
    fadeFrom: number;
    fadeTo: number;
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
    /** Jolt of the whole view along the direction of travel, in pixels. */
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
  lens: 1.6,
  path: {
    startScale: 0.42,
    perspective: 0.6,
    startGap: 0.03,
    startToCenter: 0.55,
    bow: 0.035,
    straight: 0.45,
    tilt: 34,
    tiltCurve: 1.4,
    fadeIn: 0.05,
  },
  shadow: {
    opacity: 0.55,
    width: 0.9,
    height: 0.09,
  },
  motionBlur: {
    max: 7,
    from: 0.45,
    to: 1.1,
    steps: 6,
    smoothing: 0.06,
  },
  rails: {
    color: "#ffffff",
    opacity: 0.16,
    width: 1,
    gauge: 0.72,
    fadeIn: 0.12,
  },
  source: {
    travel: 0.42,
    scale: 0.8,
    tilt: 16,
    darken: 0.65,
    blur: 8,
    fadeFrom: 0.5,
    fadeTo: 0.95,
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
  lens: 1.4,
  path: {
    startScale: 0.36,
    perspective: 0.75,
    startGap: 0.03,
    startToCenter: 0.6,
    bow: 0.05,
    straight: 0.5,
    tilt: 42,
    tiltCurve: 1.7,
    fadeIn: 0.05,
  },
  shadow: {
    opacity: 0.7,
    width: 0.95,
    height: 0.11,
  },
  motionBlur: {
    max: 9,
    from: 0.25,
    to: 0.75,
    steps: 6,
    smoothing: 0.06,
  },
  rails: {
    color: "#ffffff",
    opacity: 0.2,
    width: 1,
    gauge: 0.72,
    fadeIn: 0.1,
  },
  source: {
    travel: 0.48,
    scale: 0.74,
    tilt: 22,
    darken: 0.75,
    blur: 10,
    fadeFrom: 0.45,
    fadeTo: 0.92,
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

  /**
   * The slim track at the right edge. Its carriage runs on the same progress
   * as the push, so it shows every bit of resistance, roll-back and lock.
   */
  track: {
    /** Gap to the right edge of the screen, in pixels. */
    right: 16,
    /** Length, as a fraction of the screen height. It is vertically centered. */
    length: 0.3,
    color: "#ffffff",
    /** Opacity at rest, and while a push is happening. */
    idleOpacity: 0.4,
    busyOpacity: 0.75,
    /** Milliseconds to brighten or dim. */
    fadeMs: 280,
    /** Opacity of the line itself. */
    lineOpacity: 0.35,
    /** Diameter of a station, in pixels. */
    station: 5,
    /** Clickable area around each station, in pixels. */
    hitArea: 24,
    /** Carriage size, in pixels. */
    carriageWidth: 3,
    carriageLength: 14,
    /** How far the carriage seats into the station at the lock, in pixels. */
    latchNudge: 2.5,
    /** Pause between pushes when a station two frames away is clicked, in milliseconds. */
    chainPauseMs: 120,
  },
};

export function readVariant(search = window.location.search): TransitionVariant {
  const value = new URLSearchParams(search).get("transition")?.toLowerCase();
  if (value === "a" || value === "b" || value === "c") return value;
  return transitionConfig.defaultVariant;
}
