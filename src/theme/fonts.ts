/**
 * Display and text fonts for the whole site.
 * Swap a name here to change that voice everywhere it is used.
 * The families are loaded in index.html with font-display: swap.
 */
export const fonts = {
  /** Body text, labels, links, buttons, and course lines. */
  text: "Archivo",
  /** Frame 1, the name in the middle. */
  name: "Instrument Serif",
  /** Frame 1, the BUas title. */
  buasTitle: "Pixelify Sans",
  /** Frame 1, the Bilkent title. */
  bilkentTitle: "Big Shoulders Display",
  /** Frame 2 headline and card titles. */
  frame2Display: "Bricolage Grotesque",
  /** Pedro's line in Frame 2. */
  pedroLine: "Instrument Serif",
} as const;

function stack(name: string, fallback: string) {
  return `"${name}", ${fallback}`;
}

/** Apply the shared names as CSS variables before the first paint. */
export function applyFonts() {
  const root = document.documentElement;
  root.style.setProperty("--font-text", stack(fonts.text, "sans-serif"));
  root.style.setProperty("--font-name", stack(fonts.name, "serif"));
  root.style.setProperty("--font-buas", stack(fonts.buasTitle, "sans-serif"));
  root.style.setProperty("--font-bilkent", stack(fonts.bilkentTitle, "sans-serif"));
  root.style.setProperty("--font-frame2", stack(fonts.frame2Display, "sans-serif"));
  root.style.setProperty("--font-pedro", stack(fonts.pedroLine, "serif"));
}
