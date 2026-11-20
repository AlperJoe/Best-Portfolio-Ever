import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { FrameId } from "../frameOrder";
import { openingProgress, travelTo } from "../transitions/pages";
import { usePageOnScreen } from "../transitions/usePageOnScreen";
import "./SiteMenu.css";

const menuConfig = {
  /** Each item scrolls to its frame. `phone` items stay on screens narrower than 700px. */
  items: [
    { label: "Pedro!", frame: "frame2", phone: false },
    { label: "PressurePlate", frame: "frame3", phone: false },
    { label: "Contact", frame: "frame5", phone: true },
  ] satisfies { label: string; frame: FrameId; phone: boolean }[],
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
  } as CSSProperties;

  return (
    <nav className={shown ? "site-menu is-shown" : "site-menu"} aria-label="Pages" style={style}>
      <ul className="site-menu-list">
        {menuConfig.items.map((item) => {
          const page = pages[item.frame];
          return page ? <MenuItem key={item.frame} label={item.label} page={page} phone={item.phone} /> : null;
        })}
      </ul>
    </nav>
  );
}
