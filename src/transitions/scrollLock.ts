import { useEffect } from "react";

/** Set on the document while any overlay holds the scroll. */
const SCROLL_LOCKED = "data-scroll-locked";

let holds = 0;
let saved = "";

/**
 * Stops the document from scrolling until the returned release is called.
 * Overlays can nest: the scroll returns when the last of them lets go.
 * Calling a release more than once has no further effect.
 */
export function lockScroll() {
  const root = document.documentElement;
  if (holds === 0) {
    saved = root.style.overflow;
    root.style.overflow = "hidden";
    root.setAttribute(SCROLL_LOCKED, "");
  }
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    if (holds > 0) return;
    root.style.overflow = saved;
    root.removeAttribute(SCROLL_LOCKED);
  };
}

/** Holds the scroll while `on` is true. */
export function useScrollLock(on: boolean) {
  useEffect(() => (on ? lockScroll() : undefined), [on]);
}
