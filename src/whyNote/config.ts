/**
 * Shared look of every invitation to act, and of the paper note it opens.
 * The copy lives with its owner: frame1/config.ts for Frame 1,
 * transitions/interludes.ts for the interludes.
 */
export const whyNoteStyle = {
  /** Instrument Serif italic, in gold. */
  font: "Instrument Serif",
  size: 20,
  gold: "#EFC785",
  /** The underline draws on hover and on keyboard focus, in milliseconds. Nothing draws on its own. */
  drawMs: 200,
  /** The note is a cream paper card with dark ink, in the family of the polaroid and the hobby tickets. */
  paper: "#F3EBDD",
  ink: "#2A2520",
  textSize: 20,
  textLine: 1.45,
  /** Widest the card may be, in pixels. */
  maxWidth: 460,
  /** Resting rotation of the card, in degrees. */
  tilt: -1,
  /** Unfold from the control, and the same fold shut, in milliseconds. */
  unfoldMs: 180,
  /** Soft shadow, close to the polaroid's. */
  shadow: "0 14px 30px rgba(0, 0, 0, 0.45), 0 3px 8px rgba(0, 0, 0, 0.28)",
  /** Size of the gold opening quote, in pixels. */
  quote: 54,
  /** Space between the control and the card, and the least space kept inside the frame, in pixels. */
  gap: 10,
  edge: 16,
  /** After the mouse leaves a note opened on hover, it closes after this long. */
  hoverCloseMs: 140,
};
