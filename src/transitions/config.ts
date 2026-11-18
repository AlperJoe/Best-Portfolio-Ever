import { frameOrder, type FrameId } from "../frameOrder";
import type { Bezier } from "./math";

/**
 * One scroll position, in screen heights, runs from the start of Frame 1 to
 * Frame 5, through the Frame 1 opening and the text interludes. Input moves
 * it and nothing else does. The interlude copy lives in interludes.ts, the
 * Frame 1 opening in frame1/config.ts.
 */
export const scrollConfig = {
  /** While any of these is open, scrolling stays inside the frame. */
  overlays: ".research-layer, .frame2-open, .frame3-panel, .frame5-overlay, .why-layer",

  input: {
    /** Pixels per line when a wheel reports lines (Firefox with a mouse). */
    lineHeight: 16,
    /** Largest single wheel step, in pixels. */
    maxDelta: 140,
    /** Touch distance multiplier. */
    touchScale: 1.3,
    /** Screen heights moved per pixel of wheel or touch input. 1 means one screen per screen of scroll. */
    scrollScale: 1,
  },

  /** How the scene follows the input. */
  follow: {
    /** Time constant of the ease toward the input, in milliseconds. */
    ms: 90,
    /** Once input stops, the scene comes to rest within this long plus the next frame, in milliseconds. */
    settleMs: 135,
  },

  /**
   * Catching a frame. A wheel, trackpad or touch gesture that reaches a frame,
   * in either direction, stops on it and the rest of that gesture is ignored.
   * The next gesture moves on from there. A touch gesture ends when the finger
   * lifts. A wheel or trackpad catch lets go at the first of: quietMs without
   * input, measured with each event's own timestamp; a new swipe, seen when
   * the event size rises again after falling; or releaseMs after the catch.
   * The speed cap holds after a release.
   * Keys are not gestures, and an interlude's resting place is not a frame,
   * so neither of those catches.
   */
  gesture: {
    /** No wheel or trackpad input for this long ends the gesture, in milliseconds. */
    quietMs: 200,
    /**
     * A new swipe during a catch: an event larger than swipeRise times the
     * smallest event since the sizes began to fall, and larger than swipeMinPx.
     */
    swipeRise: 1.5,
    swipeMinPx: 8,
    /** A catch lets go this long after it happened, in milliseconds of event time. */
    releaseMs: 600,
    /** Most the scene moves during a gesture, in screen heights per second. */
    maxPerSecond: 2.5,
  },

  /**
   * Phones. Below this screen width a frame may be taller than the screen.
   * It then gets extra scroll length equal to its extra height, and its
   * content moves up with the scroll until its bottom meets the bottom of
   * the screen. Going down, the catch is at the top of the frame. Going up,
   * it is at the bottom.
   */
  tall: {
    /** Screens narrower than this, in pixels. */
    maxWidth: 700,
    /** A key press inside a tall frame moves this many screen heights. */
    keyStep: 0.85,
  },

  /** Scroll lengths of an interlude, in screen heights. */
  interlude: {
    /** Lighting the words of each line. */
    perLine: 1,
    /**
     * After the last word is lit and the gold line is complete, the scene
     * holds still for this many screen heights. The note control stays
     * visible and clickable, the glowing point rests at the end of the line,
     * and a key press stops here. Then the next frame starts to open.
     */
    hold: 0.4,
    /** Opening the next frame from the gold line. */
    open: 0.6,
    /** Share of the opening over which the text, the gold line and the note control fade out. Scrolling back fades them in again. */
    fadeShare: 0.3,
    /** Start of the first line over which the frame being left fades to dark. */
    darken: 0.22,
    /** Then the words appear at their dim level over this much. */
    appear: 0.06,
    /** Share of each line's length over which its words light. The rest lets the gold line finish. */
    lightShare: 0.85,
  },
  /** Scroll length of a pair without an interlude, which crossfades through the dark. */
  plain: 1,
  /** Scroll past the last frame. The last frame reads its progress, 0 to 1, from TAIL_VAR. */
  tail: 1,

  /** Space, Page Down and Arrow Down glide to the next stop over this long. */
  keyMs: 300,
  keyCurve: [0.33, 0, 0.2, 1] as Bezier,
  /** Back to the beginning fades through black over this long, each way. */
  jumpMs: 260,

  /** With reduced motion, input adds up to a step, and each step crossfades to the next stop. */
  reduced: {
    ms: 320,
    /** Scroll pixels that count as one step. */
    threshold: 24,
    /** A step starts counting again after this long without input. */
    quietMs: 220,
  },
};

/** Tells Frame 1 its opening progress with this window event: 0 is the start state, 1 the full frame. */
export const OPENING_EVENT = "tx:opening";

/** CSS variable on the stage with the progress past the last frame, from 0 to 1. */
export const TAIL_VAR = "--tx-tail";

/**
 * CSS variable on a frame's slot with how far a tall frame's content is moved
 * up, in pixels. A layer at `top: var(--tx-scroll, 0px)` with the screen's
 * height covers the screen.
 */
export const SCROLL_VAR = "--tx-scroll";

export function frameIndex(id: FrameId) {
  return frameOrder.indexOf(id as (typeof frameOrder)[number]);
}
