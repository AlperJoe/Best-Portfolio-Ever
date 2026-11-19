import type { FrameId } from "../frameOrder";

/**
 * Text interludes between frames.
 *
 * Each entry is keyed by the frame pair it sits between, in frameOrder order:
 * "frame1>frame2" plays on the way from Frame 1 to Frame 2 and in reverse on
 * the way back. When Frame 4 exists and is added to frameOrder.ts, add
 * "frame3>frame4" and "frame4>frame5" here. A pair without an entry gets a
 * plain dark crossfade. Scroll lengths live in config.ts.
 */

export type InterludeLine = {
  text: string;
  /** Word or words inside text that light up in gold and italic. Must appear in text exactly once. */
  focus: string;
};

export type Interlude = {
  /** One or more lines, shown together and lit word by word. */
  lines: InterludeLine[];
  /** Opens from the info marker centered under the gold line. */
  note?: string;
};

export type FramePair = `${FrameId}>${FrameId}`;

export const interludes: Partial<Record<FramePair, Interlude>> = {
  "frame1>frame2": {
    lines: [
      { text: "I like taking on problems I haven’t solved before.", focus: "problems" },
      { text: "I learn what I need, then work through them piece by piece.", focus: "learn" },
    ],
    note: "I don’t need to know everything about a field to become interested in a problem within it. I enjoy figuring out what I need to learn, breaking the problem into smaller tasks, and working through them. That approach has helped me in different settings, including part-time work as a network engineer and building a system for an industry that was new to me. Being able to find information and put it to use gives me the confidence to get started.",
  },
  "frame2>frame3": {
    lines: [
      { text: "I try to hear feedback without taking it personally.", focus: "feedback" },
      { text: "It helps me see what I can do better.", focus: "better" },
    ],
    note: "Buddhism has influenced how I think about ego, including at work. I try to notice when I’m defending an idea simply because it is mine. That helps me listen to feedback, understand the reasoning behind it, and reconsider my approach. It is something I practise, and it shapes how I work with other people.",
  },
  "frame3>frame5": {
    lines: [
      { text: "My perspective shapes how I experience life.", focus: "perspective" },
      { text: "I make time for things that broaden it.", focus: "broaden" },
    ],
    note: "I once wrote a thesis about how our perspective shapes our happiness, and working on it changed how I live. I try to make room for things that make me happy and help me see things differently. When work gets busy, I plan that time instead of leaving it to whatever is left over. Luckily, I enjoy planning.",
  },
};

/**
 * The info marker centered under the gold line that opens the note. It
 * appears once every word is lit and stays through the hold. Its look is
 * the shared marker in whyNote, so only the label and the gap live here.
 */
export const interludeWhy = {
  label: "Read more",
  /** Space between the gold line and the marker, in pixels. */
  gap: 22,
};

export const interludeStyle = {
  background: "#070708",
  textColor: "#F2EEE6",
  /** Color of the focus word once lit. */
  focusColor: "#EFC785",
  /** Every word starts at this opacity and lights up to 1 with the scroll. */
  dim: 0.15,
  /** Instrument Serif for the large text, the same family as fonts.name. */
  font: "Instrument Serif",
  /** Largest text size, in pixels, and as a share of the screen height. */
  maxSize: 96,
  maxHeightShare: 0.09,
  lineHeight: 1.2,
  /** Least space kept to the screen edges, as a share of the width and of the height. */
  marginX: 0.1,
  marginY: 0.12,
  /** Screens narrower than tall.maxWidth in config.ts. The lines wrap, centered, at a readable size. */
  phone: {
    /** Text size as a share of the screen width, held between these sizes, in pixels. */
    sizeShare: 0.08,
    minSize: 26,
    maxSize: 34,
    /** Side margins, in pixels. */
    marginX: 24,
  },
  /** The gold line under the text. */
  rule: {
    color: "#EFC785",
    /** Thickness, in pixels. */
    width: 1.5,
    /** Space between the last line of text and the gold line, as a share of the text size. */
    gap: 0.55,
    /** Diameter of the glowing point at its tip, in pixels, and its glow. */
    tip: 6,
    glow: "0 0 6px 2px rgba(239, 199, 133, 0.75), 0 0 16px 4px rgba(239, 199, 133, 0.35)",
  },
};
