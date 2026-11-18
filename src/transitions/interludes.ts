import type { FrameId } from "../frameOrder";

/**
 * Text interludes between frames, used only with ?transition=d.
 *
 * Each entry is keyed by the frame pair it sits between, in frameOrder order:
 * "frame1>frame2" plays on the way from Frame 1 to Frame 2 and in reverse on
 * the way back. When Frame 4 exists and is added to frameOrder.ts, add
 * "frame3>frame4" and "frame4>frame5" here. A pair without an entry gets a
 * plain dark crossfade of the same length as one line.
 */

export type InterludeLine = {
  text: string;
  /** Word or words inside text that the camera zooms into. Must appear in text exactly once. */
  focus: string;
};

export type Interlude = {
  /** True while the copy is a stand-in. */
  placeholder?: boolean;
  /** One or two lines. The next frame shows through the focus word of the last one. */
  lines: InterludeLine[];
  /**
   * Letter of the last focus word to zoom into, counted from 0. Leave it out
   * to pick the letter with the thickest stroke automatically.
   */
  letter?: number;
};

export type FramePair = `${FrameId}>${FrameId}`;

export const interludes: Partial<Record<FramePair, Interlude>> = {
  // PLACEHOLDER: final copy still to be written.
  "frame1>frame2": {
    placeholder: true,
    lines: [
      { text: "I'm really adaptable.", focus: "adaptable" },
      { text: "And open to feedback.", focus: "feedback" },
    ],
  },
  // PLACEHOLDER: final copy still to be written.
  "frame2>frame3": {
    placeholder: true,
    lines: [
      { text: "I work ego-free.", focus: "ego-free" },
      { text: "So I take in what's around me more objectively.", focus: "objectively" },
    ],
  },
  // PLACEHOLDER: final copy still to be written.
  "frame3>frame5": {
    placeholder: true,
    lines: [{ text: "A planner and a solver.", focus: "solver" }],
  },
};

/** Main color of each frame. The interlude background takes on a tint of the next frame's color. */
export const frameColors: Record<FrameId, string> = {
  frame1: "#ED7624",
  frame2: "#8A2416",
  frame3: "#36AA96",
  frame5: "#C9A36A",
};

export const interludeStyle = {
  /** Background at the start of an interlude. */
  base: "#070708",
  /** Share of the next frame's color in the background at the deepest zoom. */
  tint: 0.32,
  textColor: "#F2EEE6",
  /** Instrument Serif for the large text, the same family as fonts.name. Small text would use fonts.text (Archivo). */
  font: "Instrument Serif",
  focusItalic: true,
  /** Largest text size, in pixels. */
  maxSize: 190,
  /** A line is never wider than this share of the screen, or taller than this share of its height. */
  widthShare: 0.84,
  heightShare: 0.24,
  /** How much the camera zooms into a focus word before the next line takes over. */
  zoomPerLine: 9,
  /** Line progress where the next line starts to appear, and where it is fully there. */
  nextIn: [0.45, 0.85] as const,
  /** Line progress where the current line starts to fade, and where it is gone. */
  currentOut: [0.55, 0.92] as const,
  /** Share of the last line over which its focus letters open onto the next frame. */
  holeOpen: 0.22,
  /** Share at the end of the last line over which the interlude hands over to the frame. */
  handOver: 0.08,
  /** Camera scale at the very start of an interlude. It grows to 1 as the scene fades in. */
  enterScale: 0.88,
  /** The frame being left grows by this much as the scene fades in over it. */
  sourceGrow: 0.06,
};
