import { frame1Config } from "../frame1/config";

/**
 * Shared look of the "Why I say this" control and its note panel. The copy
 * lives with its owner: frame1/config.ts for Frame 1, transitions/interludes.ts
 * for the interludes. Each owner also sets the control's color.
 */
export const whyNoteStyle = {
  /** The control: Archivo, small. */
  size: 13,
  weight: 500,
  /** The panel takes Frame 1's research panel style. */
  navy: frame1Config.research.navy,
  border: frame1Config.research.border,
  radius: frame1Config.research.radius,
  maxWidth: 520,
  pad: "16px 18px",
  textSize: 15,
  textLine: 1.55,
  textColor: "rgba(242, 238, 230, 0.92)",
  /** Space between the control and the panel, and the least space kept to the edges, in pixels. */
  gap: 10,
  edge: 16,
  fadeMs: 160,
  /** After the mouse leaves a note opened on hover, it closes after this long. */
  hoverCloseMs: 140,
};
