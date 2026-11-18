import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { goToFrame } from "../frameOrder";
import { frame5, type Film } from "./config";
import "./Frame5.css";

const A = frame5.endingA;
const B = frame5.endingB;
const CREDITS = frame5.credits;
const OVERLAY = frame5.overlay;
const ARROWS = frame5.arrows;

const GRAIN = {
  steam: false,
  grain: true,
  steamAmount: 0,
  cursorReaction: false,
  buasTone: "#ED7624",
  bilkentTone: "#001489",
  seamTop: 0.02,
  seamBottom: 0.05,
  seamSteam: 1,
  grainAlpha: frame5.grainAlpha,
} as const;

type OverlayPhase = "opening" | "open" | "closing";
type OverlayState = { film: Film; phase: OverlayPhase } | null;
type Contact = { email: string; phoneText: string; phoneHref: string };

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/**
 * Follows the stage slot around this frame. `shown` is true while the frame
 * is on screen at all; `locked` once the push has fully seated it.
 */
function useSlotState(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ shown: false, locked: false });
  useEffect(() => {
    const slot = ref.current?.closest<HTMLElement>(".tx-slot");
    if (!slot) {
      setState({ shown: true, locked: true });
      return;
    }
    const read = () => {
      const classes = slot.classList;
      const shown = !classes.contains("is-parked");
      const locked = shown && !classes.contains("is-revealing") && !classes.contains("is-fading");
      setState((current) =>
        current.shown === shown && current.locked === locked ? current : { shown, locked },
      );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(slot, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [ref]);
  return state;
}

function buildContact(): Contact {
  const email = `${A.email.name.join("")}@${A.email.domain.join(".")}`;
  const [first, ...rest] = A.phone.groups;
  const phoneText = `+${A.phone.country} ${first} ${rest.join("")}`;
  const phoneHref = `tel:+${A.phone.country}${A.phone.groups.join("")}`;
  return { email, phoneText, phoneHref };
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function arrowGeometry(length: number) {
  const { drop, head, headAngle } = ARROWS;
  const height = Math.ceil(2 * (drop + head + 2));
  const mid = height / 2;
  const control = { x: length * 0.62, y: mid };
  const end = { x: length - 1, y: mid + drop };
  const angle = Math.atan2(end.y - control.y, end.x - control.x);
  const spread = (headAngle * Math.PI) / 180;
  const wing = (side: number) => {
    const a = angle + Math.PI + side * spread;
    return `${(end.x + Math.cos(a) * head).toFixed(2)} ${(end.y + Math.sin(a) * head).toFixed(2)}`;
  };
  return {
    width: length,
    height,
    line: `M 0 ${mid} Q ${control.x.toFixed(2)} ${control.y} ${end.x.toFixed(2)} ${end.y}`,
    head: `M ${wing(-1)} L ${end.x.toFixed(2)} ${end.y} L ${wing(1)}`,
  };
}

function Arrow({ length, side }: { length: number; side: "left" | "right" }) {
  const shape = arrowGeometry(length);
  return (
    <svg
      className={`frame5-arrow frame5-arrow-${side}`}
      width={shape.width}
      height={shape.height}
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      aria-hidden="true"
    >
      <path className="frame5-arrow-line" d={shape.line} pathLength={1} />
      <path className="frame5-arrow-head" d={shape.head} />
    </svg>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="frame5-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const MailIcon = () => (
  <Icon>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.8 7 8.2 6 8.2-6" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M6.6 3.5h2.7l1.4 4.1-2 1.4a12 12 0 0 0 6.3 6.3l1.4-2 4.1 1.4v2.7a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </Icon>
);

const DocumentIcon = () => (
  <Icon>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" />
  </Icon>
);

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.43 7.86 10.96.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.84v2.11h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.71c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <span className="frame5-play" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M9 6.5v11l9-5.5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Frame5() {
  const frameRef = useRef<HTMLElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<HTMLUListElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const coverRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const reduced = useReducedMotion();
  const { shown, locked } = useSlotState(frameRef);
  const [contact, setContact] = useState<Contact | null>(null);
  const [copied, setCopied] = useState(false);
  const [arrowLength, setArrowLength] = useState(ARROWS.minLength);
  const [photoRight, setPhotoRight] = useState(A.photoPlacement === "right");
  const [rolled, setRolled] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [hot, setHot] = useState<string | null>(null);

  const shownRef = useRef(shown);
  const reducedRef = useRef(reduced);
  shownRef.current = shown;
  reducedRef.current = reduced;

  useEffect(() => setContact(buildContact()), []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), A.copiedMs);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!shown) setRolled(false);
  }, [shown]);

  const layout = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const width = frame.clientWidth;
    const height = frame.clientHeight;

    setArrowLength(Math.round(Math.min(ARROWS.maxLength, Math.max(ARROWS.minLength, width * ARROWS.length))));

    const band = Math.min(CREDITS.maxHeight, Math.max(CREDITS.minHeight, height * CREDITS.height));
    frame.style.setProperty("--band-h", `${band}px`);

    if (A.photoPlacement === "auto") {
      const lines = linesRef.current?.offsetWidth ?? 0;
      const photo = A.photoWidth + 2 * A.photoBorder + 8;
      setPhotoRight(lines + A.photoGap + photo <= width * A.maxWidth);
    }

    const roll = rollRef.current;
    const end = endRef.current;
    if (roll && end) {
      const to = (band - end.offsetHeight) / 2 - end.offsetTop;
      frame.style.setProperty("--roll-from", `${band}px`);
      frame.style.setProperty("--roll-to", `${to}px`);
      frame.style.setProperty("--roll-ms", `${Math.round(((band - to) / CREDITS.speed) * 1000)}ms`);
    }
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(frame);
    if (linesRef.current) observer.observe(linesRef.current);
    if (rollRef.current) observer.observe(rollRef.current);
    document.fonts?.ready.then(layout);
    return () => observer.disconnect();
  }, [layout, contact]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = grainRef.current;
    if (!frame || !canvas) return;
    const effects = new FrameEffects(canvas, GRAIN);
    let raf = 0;
    let last = performance.now();
    let drewStill = false;
    const snapshot = () => ({
      width: frame.clientWidth,
      height: frame.clientHeight,
      cursorX: 0,
      cursorY: 0,
      cursorInside: false,
    });
    const resize = () => {
      effects.resize(frame.clientWidth, frame.clientHeight);
      drewStill = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!shownRef.current || document.hidden) return;
      if (reducedRef.current) {
        if (!drewStill) effects.renderStill(snapshot());
        drewStill = true;
        return;
      }
      drewStill = false;
      effects.render(dt, snapshot());
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const openFilm = (film: Film, opener: HTMLElement | null) => {
    openerRef.current = opener;
    setOverlay({ film, phase: "opening" });
  };

  const closeFilm = useCallback(() => {
    setOverlay((current) => (current && current.phase !== "closing" ? { ...current, phase: "closing" } : current));
  }, []);

  useEffect(() => {
    if (overlay?.phase !== "opening") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        setOverlay((current) => (current ? { ...current, phase: "open" } : current)),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [overlay?.phase]);

  useEffect(() => {
    if (overlay?.phase === "open") closeRef.current?.focus({ preventScroll: true });
    if (overlay?.phase !== "closing") return;
    const id = window.setTimeout(() => {
      setOverlay(null);
      openerRef.current?.focus({ preventScroll: true });
    }, reduced ? 0 : OVERLAY.fadeMs);
    return () => window.clearTimeout(id);
  }, [overlay?.phase, reduced]);

  const overlayOpen = Boolean(overlay);
  useEffect(() => {
    if (!overlayOpen) return;
    // The player focuses itself when it autoplays, which would swallow Escape.
    const guardUntil = performance.now() + OVERLAY.focusGuardMs;
    const onBlur = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof HTMLIFrameElement && dialogRef.current?.contains(active) && performance.now() < guardUntil) {
          closeRef.current?.focus({ preventScroll: true });
        }
      }, 0);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFilm();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], iframe")];
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (active === lastItem || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, closeFilm]);

  const onCopy = async () => {
    if (!contact) return;
    if (await copyText(contact.email)) setCopied(true);
  };

  const style = {
    "--f5-bg": frame5.background,
    "--f5-warm": frame5.warmTint,
    "--f5-cool": frame5.coolTint,
    "--f5-blend": `${frame5.blendWidth * 100}%`,
    "--f5-tint-top": `${frame5.tintFadeTop * 100}%`,
    "--f5-tint-bottom": `${frame5.tintFadeBottom * 100}%`,
    "--f5-white": frame5.warmWhite,
    "--f5-white-55": frame5.white55,
    "--f5-white-70": frame5.white70,
    "--f5-focus": frame5.focus,
    "--f5-title-top": `${frame5.title.top * 100}%`,
    "--f5-title-size": frame5.title.size,
    "--f5-title-line": String(frame5.title.line),
    "--f5-arrow-gap": `${ARROWS.gap}px`,
    "--f5-arrow-color": ARROWS.color,
    "--f5-arrow-stroke": String(ARROWS.stroke),
    "--f5-arrow-line-ms": `${Math.round(ARROWS.drawSeconds * ARROWS.lineShare * 1000)}ms`,
    "--f5-arrow-head-ms": `${Math.round(ARROWS.drawSeconds * (1 - ARROWS.lineShare) * 1000)}ms`,
    "--f5-content-top": `${frame5.content.top * 100}%`,
    "--f5-content-gap": `${frame5.content.bottomGap}px`,
    "--f5-label-size": frame5.label.size,
    "--f5-label-weight": String(frame5.label.weight),
    "--f5-label-tracking": frame5.label.tracking,
    "--f5-label-gap": frame5.label.gap,
    "--f5-a-left": `${A.left * 100}%`,
    "--f5-a-max": `${A.maxWidth * 100}%`,
    "--f5-a-size": A.lineSize,
    "--f5-a-line": String(A.lineHeight),
    "--f5-a-gap": A.lineGap,
    "--f5-photo-w": `${A.photoWidth}px`,
    "--f5-photo-border": `${A.photoBorder}px`,
    "--f5-photo-border-color": A.photoBorderColor,
    "--f5-photo-rotate": `${A.photoRotate}deg`,
    "--f5-photo-shadow": A.photoShadow,
    "--f5-photo-gap": `${A.photoGap}px`,
    "--f5-contact-size": A.contactSize,
    "--f5-contact-gap": A.contactGap,
    "--f5-icon-size": A.iconSize,
    "--f5-icon-color": A.iconColor,
    "--f5-link-hover": A.linkHover,
    "--f5-social-size": `${A.socialSize}px`,
    "--f5-social-gap": A.socialGap,
    "--f5-github-bg": A.githubBackground,
    "--f5-github-color": A.githubColor,
    "--f5-linkedin-bg": A.linkedinBackground,
    "--f5-linkedin-color": A.linkedinColor,
    "--f5-b-left": `${B.left * 100}%`,
    "--f5-b-right": `${B.right * 100}%`,
    "--f5-b-size": B.lineSize,
    "--f5-b-line": String(B.lineHeight),
    "--f5-b-gap": B.lineGap,
    "--f5-card-gap": B.cardGap,
    "--f5-card-size": B.cardTextSize,
    "--f5-card-line": String(B.cardTextLine),
    "--f5-card-title-weight": String(B.cardTitleWeight),
    "--f5-card-text-gap": B.cardTextGap,
    "--f5-cover-radius": B.coverRadius,
    "--f5-cover-scale": String(B.coverHoverScale),
    "--f5-cover-ms": `${B.coverMs}ms`,
    "--f5-play-size": `${B.playSize}px`,
    "--f5-play-bg": B.playBackground,
    "--f5-play-bg-hot": B.playBackgroundHot,
    "--f5-play-opacity": String(B.playOpacity),
    "--f5-ov-backdrop": OVERLAY.backdrop,
    "--f5-ov-panel": OVERLAY.panel,
    "--f5-ov-border": OVERLAY.border,
    "--f5-ov-radius": OVERLAY.radius,
    "--f5-ov-width": `${OVERLAY.width * 100}%`,
    "--f5-ov-max-width": `${OVERLAY.maxWidth}px`,
    "--f5-ov-max-height": `${OVERLAY.maxHeight * 100}%`,
    "--f5-ov-video": `${OVERLAY.videoShare * 100}%`,
    "--f5-ov-pad": OVERLAY.pad,
    "--f5-ov-gap": OVERLAY.gap,
    "--f5-ov-title": OVERLAY.titleSize,
    "--f5-ov-body": OVERLAY.bodySize,
    "--f5-ov-line": String(OVERLAY.bodyLine),
    "--f5-ov-close": `${OVERLAY.closeSize}px`,
    "--f5-ov-fade": `${OVERLAY.fadeMs}ms`,
    "--f5-ov-from": String(OVERLAY.fromScale),
    "--f5-band-bottom": `${CREDITS.bottom * 100}%`,
    "--f5-band-fade": `${CREDITS.fade * 100}%`,
    "--f5-credit-size": CREDITS.size,
    "--f5-credit-tracking": CREDITS.tracking,
    "--f5-credit-color": CREDITS.color,
    "--f5-credit-line": String(CREDITS.lineHeight),
    "--f5-credit-still-line": String(CREDITS.stillLineHeight),
    "--f5-credit-gap": `${CREDITS.gap}px`,
    "--f5-end-gap": `${CREDITS.endGap}px`,
    "--f5-end-size": CREDITS.endSize,
    "--f5-back-size": CREDITS.backSize,
    "--f5-roll-delay": `${CREDITS.delay}ms`,
    "--f5-roll-ease": CREDITS.ease,
  } as CSSProperties;

  const classes = [
    "frame5",
    locked ? "is-locked" : "",
    reduced ? "is-reduced" : "",
    rolled ? "is-rolled" : "",
    photoRight ? "is-photo-right" : "is-photo-above",
  ]
    .filter(Boolean)
    .join(" ");

  const activeFilm = overlay?.film;

  return (
    <section className={classes} ref={frameRef} style={style} aria-label="Pick your ending">
      <div className="frame5-tint" aria-hidden="true" />

      <header className="frame5-head">
        <Arrow length={arrowLength} side="left" />
        <h2 className="frame5-title">{frame5.title.text}</h2>
        <Arrow length={arrowLength} side="right" />
      </header>

      <div className="frame5-content">
        <div className="frame5-ending frame5-ending-a">
          <p className="frame5-label">{A.label}</p>
          <p className="frame5-line-a">{A.line}</p>
          <div className="frame5-contact">
            <figure className="frame5-photo">
              <img src={A.photo} alt="Alper Bozkurt" width={A.photoWidth} height={A.photoWidth} />
            </figure>
            <ul className="frame5-lines" ref={linesRef}>
              <li>
                <MailIcon />
                <button
                  type="button"
                  className="frame5-email"
                  onClick={onCopy}
                  aria-label={contact ? `Copy email address ${contact.email}` : "Copy email address"}
                >
                  {contact?.email}
                </button>
                <a className="frame5-write" href={contact ? `mailto:${contact.email}` : undefined}>
                  {A.writeLabel}
                </a>
                <span className="frame5-copied">
                  <span className="frame5-copied-room" aria-hidden="true">
                    {A.copiedLabel}
                  </span>
                  <span className="frame5-copied-text" role="status">
                    {copied ? A.copiedLabel : ""}
                  </span>
                </span>
              </li>
              <li>
                <PhoneIcon />
                <a className="frame5-link" href={contact?.phoneHref}>
                  {contact?.phoneText}
                </a>
              </li>
              <li>
                <DocumentIcon />
                <a className="frame5-link" href={A.cv} target="_blank" rel="noopener noreferrer">
                  {A.cvLabel}
                </a>
              </li>
              <li className="frame5-social">
                <a
                  className="frame5-brand frame5-github"
                  href={A.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <GitHubIcon />
                </a>
                <a
                  className="frame5-brand frame5-linkedin"
                  href={A.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="frame5-ending frame5-ending-b">
          <p className="frame5-label">{B.label}</p>
          <p className="frame5-line-b">{B.line}</p>
          <div className="frame5-covers" id={frame5.mainId}>
            {B.films.map((film) => (
              <button
                key={film.id}
                ref={(node) => {
                  coverRefs.current[film.id] = node;
                }}
                type="button"
                className={hot === film.id ? "frame5-cover is-hot" : "frame5-cover"}
                aria-label={`Play ${film.title} (${film.year})`}
                aria-haspopup="dialog"
                onClick={(event) => openFilm(film, event.currentTarget)}
                onPointerEnter={() => setHot(film.id)}
                onPointerLeave={() => setHot(null)}
              >
                <img src={B.cover(film.videoId)} alt="" draggable={false} />
                <PlayMark />
              </button>
            ))}
          </div>
          <div className="frame5-film-texts">
            {B.films.map((film) => (
              <div
                key={film.id}
                className="frame5-film-text"
                onClick={() => openFilm(film, coverRefs.current[film.id] ?? null)}
                onPointerEnter={() => setHot(film.id)}
                onPointerLeave={() => setHot(null)}
              >
                <p className="frame5-film-title">
                  {film.title} <span className="frame5-film-year">{film.year}</span>
                </p>
                <p className="frame5-film-summary">{film.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="frame5-band">
        <div className="frame5-roll" ref={rollRef}>
          <dl className="frame5-credits">
            {CREDITS.lines.map(([role, name]) => (
              <div className="frame5-credit" key={role}>
                <dt>{role}</dt>
                <dd>{name}</dd>
              </div>
            ))}
          </dl>
          <div className="frame5-end" ref={endRef}>
            <p className="frame5-end-line">{CREDITS.endLine}</p>
            <button
              type="button"
              className="frame5-back"
              onFocus={() => setRolled(true)}
              onClick={() => goToFrame(frame5.backTo)}
            >
              {CREDITS.backLabel}
            </button>
          </div>
        </div>
      </div>

      <canvas className="frame5-grain" ref={grainRef} aria-hidden="true" />

      {overlay && activeFilm ? (
        <div
          className="frame5-overlay"
          data-open={overlay.phase === "open" ? "1" : "0"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFilm();
          }}
        >
          <div
            className="frame5-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="frame5-dialog-title"
          >
            <button ref={closeRef} type="button" className="frame5-close" aria-label="Close" onClick={closeFilm}>
              ×
            </button>
            <div className="frame5-video">
              {overlay.phase !== "closing" ? (
                <iframe
                  src={B.embed(activeFilm.videoId)}
                  title={activeFilm.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : null}
            </div>
            <div className="frame5-dialog-text">
              <h3 id="frame5-dialog-title">{activeFilm.title}</h3>
              <p className="frame5-dialog-year">{activeFilm.year}</p>
              <p className="frame5-dialog-body">{activeFilm.description}</p>
              <a
                className="frame5-watch"
                href={B.watch(activeFilm.videoId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {OVERLAY.watchLabel} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
