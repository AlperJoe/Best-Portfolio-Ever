import { phoneWidth } from "./pages";

/**
 * Chrome lets a quick run of wheel notches carry the page past a snap point
 * with scroll-snap-stop: always, because it snaps only once the run ends.
 * This holds one scroll, from rest to rest, to the next snap point in either
 * direction, the way scroll-snap-stop: always describes. It only reads the
 * scroll position and never listens to wheel, touch or key events.
 *
 * A scroll that jumps a screen or more at once (focus, find in page) is left
 * alone, and so is travel started with travelTo.
 */

let travelling = false;

/** Scrolls to `top` without being held to the next snap point. */
export function travelTo(top: number) {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  travelling = true;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

function snapTops() {
  return [...document.querySelectorAll<HTMLElement>(".opening-stop, .page:not(.page-opening)")]
    .map((node) => node.getBoundingClientRect().top + window.scrollY)
    .sort((a, b) => a - b);
}

/** Starts holding scrolls to the next snap point. Returns the function that stops it. */
export function holdSnapStops() {
  const wide = window.matchMedia(`(min-width: ${phoneWidth}px)`);
  const hasScrollEnd = "onscrollend" in window;
  /** Quiet time that ends a scroll where scrollend cannot be trusted, in milliseconds. */
  const quietMs = 200;
  /**
   * Chrome snaps once more about half a second after the last notch of a run.
   * For this long after a hold the page keeps its old rest, so that snap is held too.
   */
  const holdMs = 900;
  let rest = window.scrollY;
  let last = rest;
  let heldAt = -Infinity;
  let quiet = 0;

  const settle = () => {
    window.clearTimeout(quiet);
    const holding = heldAt + holdMs - performance.now();
    if (holding > 0) {
      quiet = window.setTimeout(settle, holding);
      return;
    }
    travelling = false;
    rest = window.scrollY;
    last = rest;
  };
  const settleSoon = () => {
    window.clearTimeout(quiet);
    quiet = window.setTimeout(settle, quietMs);
  };

  const onScroll = () => {
    const y = window.scrollY;
    const jump = Math.abs(y - last) >= window.innerHeight * 0.9 && performance.now() - heldAt > holdMs;
    last = y;
    if (!hasScrollEnd || performance.now() - heldAt < quietMs) settleSoon();
    if (!wide.matches || travelling) return;
    if (jump) {
      travelling = true;
      return;
    }
    const tops = snapTops();
    const below = tops.find((top) => top > rest + 1);
    const above = [...tops].reverse().find((top) => top < rest - 1);
    let hold: number | null = null;
    if (below !== undefined && y > below + 1) hold = below;
    else if (above !== undefined && y < above - 1) hold = above;
    if (hold === null) return;
    heldAt = performance.now();
    last = hold;
    settleSoon();
    window.scrollTo({ top: hold, behavior: "instant" });
  };

  // The scroll this holds back also ends with a scrollend, while the rest of the run is still coming.
  const onScrollEnd = () => {
    if (performance.now() - heldAt < quietMs) settleSoon();
    else settle();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", onScrollEnd);
  return () => {
    window.clearTimeout(quiet);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", onScrollEnd);
  };
}
