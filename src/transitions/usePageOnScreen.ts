import { useEffect, useState, type RefObject } from "react";

/** Share of the page, or of the screen for a page taller than the screen, that must be on screen. */
const SHARE = 0.6;
const STEPS = Array.from({ length: 41 }, (_, index) => index / 40);

/**
 * True while at least 60% of the page is on screen. A page taller than the
 * screen counts once it covers 60% of the screen.
 */
export function usePageOnScreen(ref: RefObject<Element | null>) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const page = ref.current;
    if (!page) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const screen = entry.rootBounds?.height ?? window.innerHeight;
        const need = SHARE * Math.min(entry.boundingClientRect.height, screen);
        setOnScreen(entry.isIntersecting && entry.intersectionRect.height >= need - 0.5);
      },
      { threshold: STEPS },
    );
    observer.observe(page);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}
