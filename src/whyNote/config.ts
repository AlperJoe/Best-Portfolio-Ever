/**
 * Shared look of the info marker on every button attachWhyNote is attached
 * to, and of the paper note it opens. The copy lives with its owner:
 * frame1/config.ts for Frame 1, transitions/interludes.ts for the quotes between frames.
 */
export const whyNoteStyle = {
  font: "Instrument Serif",
  gold: "#EFC785",
  /** The marker and the open note are the same cream paper, with dark ink. */
  paper: "#F3EBDD",
  ink: "#2A2520",
  /**
   * The marker: the corner of a small paper note peeking out. Its top-right
   * corner is folded. It straightens and lifts on hover and keyboard focus,
   * and nothing about it moves on its own.
   */
  marker: {
    height: 30,
    radius: 6,
    /** Resting rotation, in degrees. Hover and focus bring it to 0. */
    tilt: -2,
    /** Hover and focus lift, in pixels. */
    lift: 2,
    hoverMs: 150,
    /** Instrument Serif italic. */
    labelSize: 16,
    /** The gold "i" sits in a circle of this diameter, in pixels. */
    icon: 18,
    /** Side of the folded corner, in pixels. */
    fold: 10,
    /** The folded corner, a darker cream. It turns gold once the note has been opened. */
    foldColor: "#D9C9AE",
    shadow: "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.32)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.22))",
    shadowHover: "drop-shadow(0 6px 9px rgba(0, 0, 0, 0.38)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.24))",
  },
  textSize: 20,
  textLine: 1.45,
  /** Widest the note may be, in pixels. */
  maxWidth: 460,
  /** Resting rotation of the open note, in degrees. */
  tilt: -1,
  /** Unfold from the marker, and the same fold shut, in milliseconds. */
  unfoldMs: 180,
  /** Soft shadow, close to the polaroid's. */
  shadow: "0 14px 30px rgba(0, 0, 0, 0.45), 0 3px 8px rgba(0, 0, 0, 0.28)",
  /** Size of the gold opening quote, in pixels. */
  quote: 54,
  /** Space between the marker and the note, and the least space kept inside the frame, in pixels. */
  gap: 10,
  edge: 16,
};
