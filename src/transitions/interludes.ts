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
  /** Opens from the "Why I say this" control under the gold line. */
  note?: string;
};

export type FramePair = `${FrameId}>${FrameId}`;

export const interludes: Partial<Record<FramePair, Interlude>> = {
  "frame1>frame2": {
    lines: [
      { text: "I love problems I have never seen before.", focus: "problems" },
      { text: "I break them into the right parts, then I act.", focus: "parts" },
    ],
    note: "Information is easy to reach today. That lets me jump into a problem I know nothing about, commit to it and learn on the way. I felt this when I worked part time as a network engineer, and again when I built a system in a low-level language for an industry that was new to me. To me, a problem is now a task. I split it into the right parts, and then I act on each part. My passion for this work comes from that. I am someone who loves solving problems.",
  },
  "frame2>frame3": {
    lines: [
      { text: "I work ego-free.", focus: "ego-free" },
      { text: "I take feedback as it is, and I use it.", focus: "feedback" },
    ],
    note: "Group projects only work when people work together, and I believe communication matters a lot. Working ego-free is a state I try to reach through Buddhism. At work, it lets me hear feedback as it is. I do not take it personally, so I can use it in the best way.",
  },
  "frame3>frame5": {
    lines: [
      { text: "Happiness comes from perspective.", focus: "perspective" },
      { text: "So I plan time to grow it.", focus: "plan" },
    ],
    note: "I wrote a thesis on the idea that a person's happiness comes from their perspective, and it changed my life. I believe in self-confidence and self-actualization, so I spend time on things that make me happy and widen my perspective. With a busy work schedule, that only happens with a plan. Luckily, I love planning.",
  },
};

/** The control under the gold line that opens the note. It appears once every word is lit. */
export const interludeWhy = {
  label: "Why I say this",
  color: "rgba(242, 238, 230, 0.85)",
  /** Archivo, underlined. */
  size: 14,
  weight: 500,
  /** Space between the gold line and the control, in pixels. */
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
