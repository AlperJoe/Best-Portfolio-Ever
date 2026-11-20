import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { FrameId } from "../frameOrder";
import { frame5 } from "../frame5/config";
import { openingProgress } from "../transitions/pages";
import { travelTo } from "../transitions/snapStop";
import { usePageOnScreen } from "../transitions/usePageOnScreen";
import "./SiteMenu.css";

const menuConfig = {
  /** Each item scrolls to its frame. `phone` items stay on screens narrower than 700px. */
  items: [
    { label: "Pedro", frame: "frame2", phone: false },
    { label: "PressurePlate", frame: "frame3", phone: false },
    { label: "Contact", frame: "frame5", phone: true },
  ] satisfies { label: string; frame: FrameId; phone: boolean }[],
  cv: { label: "CV", href: frame5.endingA.cv },
  /** The menu fades in once the Frame 1 opening passes this progress. */
  showAfter: 0.5,
  gold: "#EFC785",
};

type Pages = Partial<Record<FrameId, RefObject<HTMLElement | null>>>;

function MenuItem({ label, page, phone }: { label: string; page: RefObject<HTMLElement | null>; phone: boolean }) {
  const current = usePageOnScreen(page);
  return (
    <li className={phone ? "site-menu-item" : "site-menu-item is-wide"}>
      <button
        type="button"
        className="site-menu-link"
        aria-current={current ? "true" : undefined}
        onClick={() => {
          const node = page.current;
          if (node) travelTo(node.getBoundingClientRect().top + window.scrollY);
        }}
      >
        {label}
      </button>
    </li>
  );
}

function CvLine() {
  return (
    <svg className="site-menu-cv-line" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
      <path
        vectorEffect="non-scaling-stroke"
        d="M0.4 5.4 C 14 2.1, 24 6.6, 40 3.5 C 54 1.4, 66 6.5, 82 3.3 C 91 2.1, 96 5.6, 99.6 4.1"
      />
    </svg>
  );
}

/**
 * The small menu in the top right corner. It stays hidden through Frame 1's
 * start state and while an overlay holds the scroll. The item of the frame
 * on screen is gold.
 */
export function SiteMenu({ pages, opening }: { pages: Pages; opening: RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const read = () => {
      const page = opening.current;
      setShown(!page || openingProgress(page) > menuConfig.showAfter);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [opening]);

  const style = {
    "--menu-gold": menuConfig.gold,
    "--menu-cta-size": frame5.cta.size,
    "--menu-cta-draw": frame5.cta.draw,
  } as CSSProperties;

  return (
    <nav className={shown ? "site-menu is-shown" : "site-menu"} aria-label="Pages" style={style}>
      <ul className="site-menu-list">
        {menuConfig.items.map((item) => {
          const page = pages[item.frame];
          return page ? <MenuItem key={item.frame} label={item.label} page={page} phone={item.phone} /> : null;
        })}
        <li className="site-menu-item">
          <a className="site-menu-cv" href={menuConfig.cv.href} target="_blank" rel="noopener noreferrer">
            <span className="site-menu-cv-label">
              {menuConfig.cv.label}
              <CvLine />
            </span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
