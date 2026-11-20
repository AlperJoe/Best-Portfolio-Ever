import { frameOrder, type FrameId } from "../frameOrder";
import { interludes, type FramePair, type Interlude } from "./interludes";

/**
 * Below this screen width, in pixels, pages do not snap. They sit one under
 * another, each at least one screen tall. pages.css uses the same width.
 */
export const phoneWidth = 700;

type Page =
  | { kind: "frame"; id: FrameId }
  | { kind: "quote"; pair: FramePair; interlude: Interlude };

/** Every page in reading order: each frame from frameOrder.ts, with its quote from interludes.ts after it. */
export const pages: Page[] = frameOrder.flatMap((id, index): Page[] => {
  const next = frameOrder[index + 1];
  if (!next) return [{ kind: "frame", id }];
  const pair = `${id}>${next}` as FramePair;
  const interlude = interludes[pair];
  return interlude ? [{ kind: "frame", id }, { kind: "quote", pair, interlude }] : [{ kind: "frame", id }];
});

/**
 * How far the scroll has come through the Frame 1 opening page, from 0 at
 * its start state to 1 at its full frame, the second snap point, one screen
 * lower.
 */
export function openingProgress(page: HTMLElement) {
  const top = page.getBoundingClientRect().top;
  const full = page.querySelector<HTMLElement>(".opening-stop + .opening-stop");
  const span = full ? full.getBoundingClientRect().top - top : page.offsetHeight - window.innerHeight;
  // Scroll offsets land on device pixels, so the last half pixel at either end counts as the end.
  const scrolled = -top;
  if (span <= 0 || scrolled >= span - 0.5) return 1;
  if (scrolled <= 0.5) return 0;
  return scrolled / span;
}

/** Scrolls smoothly to `top`, or jumps there when the visitor prefers reduced motion. */
export function travelTo(top: number) {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}
