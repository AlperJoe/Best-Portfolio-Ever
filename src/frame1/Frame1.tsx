import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { OPENING_EVENT, readVariant } from "../transitions/config";
import { attachWhyNote } from "../whyNote/whyNote";
import "./Frame1.css";

type Shown = {
  bilkent: boolean;
  buas: boolean;
  middle: boolean;
  content: boolean;
  name: boolean;
};

type ResearchPose = "from" | "open" | "back";

type Metrics = {
  startH: number;
  startTop: number;
  fullH: number;
  fullTop: number;
};

const ALL_SHOWN: Shown = {
  bilkent: true,
  buas: true,
  middle: true,
  content: true,
  name: true,
};

const NONE_SHOWN: Shown = {
  bilkent: false,
  buas: false,
  middle: false,
  content: false,
  name: false,
};

const OPENING_STEPS: Array<[number, keyof Shown]> = [
  [frame1Config.opening.bilkent, "bilkent"],
  [frame1Config.opening.buas, "buas"],
  [frame1Config.opening.middle, "middle"],
  [frame1Config.opening.sides, "content"],
  [frame1Config.opening.name, "name"],
];

const CREAM = [242, 238, 230] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function fileName(src: string) {
  return src.split("/").pop() ?? src;
}

/** Writes the opening. Progress 0 is the start state and 1 is the full frame. */
function applyProgress(element: HTMLElement, p: number, metrics: Metrics, reduced: boolean) {
  const clamped = Math.min(1, Math.max(0, p));
  const t = reduced ? (clamped >= 0.5 ? 1 : 0) : clamped;
  const world = reduced ? Math.abs(1 - 2 * clamped) : 1;
  const height = metrics.startH + (metrics.fullH - metrics.startH) * t;
  const top = metrics.startTop + (metrics.fullTop - metrics.startTop) * t;
  element.style.setProperty("--op", t.toFixed(4));
  element.style.setProperty("--op-world", world.toFixed(4));
  element.style.setProperty("--portrait-h", `${height.toFixed(2)}px`);
  element.style.setProperty("--portrait-top", `${top.toFixed(2)}px`);
  const hint = Math.min(1, Math.max(0, 1 - t / 0.28));
  const line = Math.min(1, Math.max(0, (t - 0.22) / 0.45));
  element.style.setProperty("--op-hint", hint.toFixed(4));
  element.style.setProperty("--op-line", line.toFixed(4));
  const on = t > 0.004 ? "1" : "0";
  element.dataset.side = on;
  element.dataset.icons = on;
  element.dataset.line = line > 0.004 ? "1" : "0";
  element.dataset.hint = hint > 0.004 ? "1" : "0";
}

function frameMargin(height: number) {
  const layout = frame1Config.layout;
  return Math.round(Math.min(layout.marginMax, Math.max(layout.marginMin, height * layout.margin)));
}

function equalizeTitles(left: HTMLElement | null, right: HTMLElement | null) {
  const titles = [left, right]
    .map((copy) => copy?.querySelector<HTMLElement>(".title"))
    .filter((node): node is HTMLElement => Boolean(node));
  titles.forEach((title) => {
    title.style.minHeight = "";
  });
  const slot = Math.max(0, ...titles.map((title) => title.getBoundingClientRect().height));
  titles.forEach((title) => {
    title.style.minHeight = `${slot}px`;
  });
}

function sizeRule(copy: HTMLElement | null, side: "left" | "right") {
  if (!copy) return;
  const title = copy.querySelector<HTMLElement>(".title");
  const rule = copy.querySelector<HTMLElement>(".rule");
  if (!title || !rule) return;
  rule.style.width = `${Math.max(1, title.getBoundingClientRect().width)}px`;
  rule.style.marginLeft = side === "right" ? "auto" : "0";
}

function copyFits(copy: HTMLElement, card: HTMLElement) {
  const box = card.getBoundingClientRect();
  const body = copy.getBoundingClientRect();
  if (body.bottom > box.bottom - 4) return false;
  const nodes = copy.querySelectorAll<HTMLElement>(".title, .label, .text, .research-open, .course, .rule");
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (rect.left < box.left + 4 || rect.right > box.right - 4) return false;
  }
  return true;
}

function fitCopies(frame: HTMLElement) {
  const left = frame.querySelector<HTMLElement>(".card-left .card-copy");
  const right = frame.querySelector<HTMLElement>(".card-right .card-copy");
  const leftCard = frame.querySelector<HTMLElement>(".card-left");
  const rightCard = frame.querySelector<HTMLElement>(".card-right");
  if (!left || !right || !leftCard || !rightCard) return;
  const apply = (fit: number) => {
    frame.style.setProperty("--copy-fit", fit.toFixed(3));
    equalizeTitles(left, right);
    sizeRule(left, "left");
    sizeRule(right, "right");
    return copyFits(left, leftCard) && copyFits(right, rightCard);
  };
  if (apply(1)) return;
  let low = 0.62;
  let high = 1;
  let best = 0.62;
  for (let step = 0; step < 10; step += 1) {
    const mid = (low + high) / 2;
    if (apply(mid)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  apply(best);
}

function fitCenter(frame: HTMLElement, width: number, column: number) {
  const name = frame.querySelector<HTMLElement>(".middle-name");
  if (!name) return;
  const apply = (fit: number) => {
    frame.style.setProperty("--name-fit", fit.toFixed(3));
    const icon = Math.max(26, Math.round(frame1Config.icons.size * fit));
    const gap = Math.max(8, Math.round(frame1Config.icons.nameGap * fit));
    frame.style.setProperty("--icon-size", `${icon}px`);
    const nameW = name.getBoundingClientRect().width;
    const rowLeft = width / 2 - nameW / 2 - gap - icon;
    const rowRight = width / 2 + nameW / 2 + gap + icon;
    const columnLeft = (width - column) / 2;
    const inside = rowLeft >= columnLeft - 0.5 && rowRight <= columnLeft + column + 0.5;
    return { inside, icon, gap, nameW };
  };
  let fit = 1;
  if (!apply(1).inside) {
    let low = 0.45;
    let high = 1;
    fit = 0.45;
    for (let step = 0; step < 12; step += 1) {
      const mid = (low + high) / 2;
      if (apply(mid).inside) {
        fit = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
  }
  const placed = apply(fit);
  const icon = Math.min(placed.icon, Math.max(22, name.offsetHeight));
  const nameW = name.getBoundingClientRect().width;
  frame.style.setProperty("--icon-size", `${icon}px`);
  frame.style.setProperty("--name-h", `${name.offsetHeight}px`);
  frame.style.setProperty("--icon-github-x", `${width / 2 - nameW / 2 - placed.gap - icon}px`);
  frame.style.setProperty("--icon-linkedin-x", `${width / 2 + nameW / 2 + placed.gap}px`);
}

function Asset({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className={`placeholder ${className ?? ""}`} role="img" aria-label={fileName(src)}>
        {fileName(src)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setMissing(true)}
    />
  );
}

/** School marks as one light color. Light parts of the artwork drop out, so the drawing stays. */
function PlainLogo({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    const image = new Image();
    image.onload = () => {
      if (cancel) return;
      const scale = Math.min(1, 720 / Math.max(1, image.naturalWidth));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha < 12) {
          data[index + 3] = 0;
          continue;
        }
        const lum = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        data[index] = CREAM[0];
        data[index + 1] = CREAM[1];
        data[index + 2] = CREAM[2];
        if (lum > 188) data[index + 3] = 0;
        else if (lum > 150) data[index + 3] = Math.round(alpha * ((188 - lum) / 38));
      }
      context.putImageData(pixels, 0, 0);
      setUrl(canvas.toDataURL("image/png"));
    };
    image.src = src;
    return () => {
      cancel = true;
    };
  }, [src]);
  return <img src={url ?? src} alt="" className={url ? "is-plain" : undefined} draggable={false} />;
}

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

function CampusPhoto({ src }: { src: string }) {
  return (
    <div className="duotone">
      <Asset src={src} alt="" className="campus" />
      <div className="tone-hue fill" />
      <div className="tone-lift fill" />
    </div>
  );
}

function Campus({ src }: { src: string }) {
  return (
    <>
      <div className="card-face">
        <CampusPhoto src={src} />
        <div className="card-shade fill" />
      </div>
      <div className="card-spill" aria-hidden="true">
        <CampusPhoto src={src} />
      </div>
    </>
  );
}

export function Frame1() {
  const reduced = usePrefersReducedMotion();
  const [scrollOpening] = useState(() => readVariant() === "d");
  const playOpening = !scrollOpening && frame1Config.effects.OPENING_SEQUENCE && !reduced;
  const progressRef = useRef(0);
  const metricsRef = useRef<Metrics>({ startH: 0, startTop: 0, fullH: 0, fullTop: 0 });
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [shown, setShown] = useState<Shown>(playOpening ? NONE_SHOWN : ALL_SHOWN);

  const frameRef = useRef<HTMLDivElement>(null);
  const researchButtonRef = useRef<HTMLButtonElement>(null);
  const researchCloseRef = useRef<HTMLButtonElement>(null);
  const whyButtonRef = useRef<HTMLButtonElement>(null);
  const [research, setResearch] = useState<ResearchPose | null>(null);
  const [cueOn, setCueOn] = useState(true);
  const researchWasOpen = useRef(false);

  useEffect(() => {
    if (!playOpening) {
      setShown(ALL_SHOWN);
      return;
    }
    setShown(NONE_SHOWN);
    const timers = OPENING_STEPS.map(([at, key]) =>
      window.setTimeout(() => {
        setShown((current) => ({ ...current, [key]: true }));
      }, at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [playOpening]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const measure = () => {
      const layout = frame1Config.layout;
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width < 2 || height < 2) return;
      const margin = frameMargin(height);
      const cardW = width * layout.cardWidth;
      const spill = Math.round(cardW * layout.spill);
      const column = Math.max(160, width - 2 * (margin + cardW) - 2 * layout.columnGutter);
      const fullH = height * layout.portrait;
      const fullTop = margin;
      element.style.setProperty("--margin", `${margin}px`);
      element.style.setProperty("--card-w", `${cardW}px`);
      element.style.setProperty("--spill", `${spill}px`);
      element.style.setProperty("--column", `${column}px`);
      element.style.setProperty("--portrait-h", `${fullH}px`);
      element.style.setProperty("--portrait-top", `${fullTop}px`);
      fitCopies(element);
      fitCenter(element, width, column);

      const identity = element.querySelector<HTMLElement>(".identity");
      const block = identity?.offsetHeight ?? 80;
      const chrome = layout.nameGap + block;
      const pad = 28;
      const available = height - pad * 2 - chrome;
      const startH = Math.min(height * layout.portraitStart, Math.max(fullH, available));
      const stack = startH + chrome;
      const startTop = Math.max(pad, (height - stack) / 2);
      const metrics = { startH, startTop, fullH, fullTop };
      metricsRef.current = metrics;
      const progress = scrollOpening ? progressRef.current : 1;
      applyProgress(element, progress, metrics, scrollOpening && reducedRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [scrollOpening]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!scrollOpening || !element) return;
    applyProgress(element, progressRef.current, metricsRef.current, reduced);
    const onOpening = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (typeof value !== "number") return;
      progressRef.current = value;
      applyProgress(element, value, metricsRef.current, reducedRef.current);
    };
    window.addEventListener(OPENING_EVENT, onOpening);
    return () => window.removeEventListener(OPENING_EVENT, onOpening);
  }, [scrollOpening, reduced]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fitPanel = () => {
      const panel = frame.querySelector<HTMLElement>(".why-panel");
      if (!panel) return;
      const edge = 16;
      const maxW = Math.min(520, Math.max(160, frame.clientWidth - edge * 2));
      const maxH = Math.max(80, frame.clientHeight - edge * 2);
      panel.style.maxWidth = `${maxW}px`;
      panel.style.maxHeight = `${maxH}px`;
      const box = frame.getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      let left = panel.offsetLeft;
      let top = panel.offsetTop;
      if (rect.right > box.right - edge) left -= rect.right - (box.right - edge);
      if (rect.left < box.left + edge) left += box.left + edge - rect.left;
      if (rect.bottom > box.bottom - edge) top -= rect.bottom - (box.bottom - edge);
      if (rect.top < box.top + edge) top += box.top + edge - rect.top;
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      left = Math.max(edge, Math.min(left, frame.clientWidth - edge - width));
      top = Math.max(edge, Math.min(top, frame.clientHeight - edge - height));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };
    const observer = new MutationObserver(fitPanel);
    observer.observe(frame, { childList: true, subtree: true });
    window.addEventListener("resize", fitPanel);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitPanel);
    };
  }, []);

  useEffect(() => {
    const stage = frameRef.current?.closest(".tx-stage");
    if (!stage) return;
    const hide = () => setCueOn(false);
    const check = () => {
      const active = stage.getAttribute("data-active");
      const phase = stage.getAttribute("data-phase");
      if ((active && active !== "0") || (phase && phase !== "idle")) hide();
    };
    const observer = new MutationObserver(check);
    observer.observe(stage, { attributes: true, attributeFilter: ["data-active", "data-phase"] });
    check();
    return () => observer.disconnect();
  }, []);

  const style = {
    "--buas-tone": frame1Config.colors.buasTone,
    "--bilkent-tone": frame1Config.colors.bilkentTone,
    "--middle-tone": frame1Config.colors.middleTone,
    "--photo-contrast": String(frame1Config.duotone.contrast),
    "--buas-highlight": `${frame1Config.duotone.buasHighlight * 100}%`,
    "--buas-shadow": `${frame1Config.duotone.buasShadow * 100}%`,
    "--bilkent-highlight": `${frame1Config.duotone.bilkentHighlight * 100}%`,
    "--bilkent-shadow": `${frame1Config.duotone.bilkentShadow * 100}%`,
    "--portrait-grade": frame1Config.portraitGrade,
    "--focus": frame1Config.focus,
    "--radius": `${frame1Config.layout.radius}px`,
    "--edge-fade": `${frame1Config.layout.edgeFade}px`,
    "--name-gap": `${frame1Config.layout.nameGap}px`,
    "--line-gap": `${frame1Config.layout.lineGap}px`,
    "--mark-h": `${frame1Config.layout.mark}px`,
    "--portrait-aspect": String(
      frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight,
    ),
    "--space-divider": `${frame1Config.text.spaceDivider}px`,
    "--space-label": `${frame1Config.text.spaceLabel}px`,
    "--space-body": `${frame1Config.text.spaceBody}px`,
    "--space-button": `${frame1Config.text.spaceButton}px`,
    "--rule-opacity": String(frame1Config.text.ruleOpacity),
    "--button-pad-y": `${frame1Config.text.buttonPadY}px`,
    "--button-pad-x": `${frame1Config.text.buttonPadX}px`,
    "--button-radius": `${frame1Config.text.buttonRadius}px`,
    "--button-border": frame1Config.text.buttonBorder,
    "--title-line": String(frame1Config.text.titleLine),
    "--buas-title-size": frame1Config.text.buasTitleSize,
    "--buas-title-weight": String(frame1Config.text.buasTitleWeight),
    "--bilkent-title-size": frame1Config.text.bilkentTitleSize,
    "--bilkent-title-weight": String(frame1Config.text.bilkentTitleWeight),
    "--label-size": `${frame1Config.text.labelSize}px`,
    "--label-weight": String(frame1Config.text.labelWeight),
    "--label-shadow": frame1Config.text.labelShadow,
    "--buas-label": frame1Config.text.buasLabel,
    "--bilkent-label": frame1Config.text.bilkentLabel,
    "--body-size": `${frame1Config.text.bodySize}px`,
    "--body-weight": String(frame1Config.text.bodyWeight),
    "--body-line": String(frame1Config.text.bodyLine),
    "--body-opacity": String(frame1Config.text.bodyOpacity),
    "--button-size": `${frame1Config.text.buttonSize}px`,
    "--button-weight": String(frame1Config.text.buttonWeight),
    "--arrow-shift": `${frame1Config.text.arrowShift}px`,
    "--course-size": `${frame1Config.text.courseSize}px`,
    "--course-code-weight": String(frame1Config.text.courseCodeWeight),
    "--course-code-opacity": String(frame1Config.text.courseCodeOpacity),
    "--course-name-weight": String(frame1Config.text.courseNameWeight),
    "--course-name-opacity": String(frame1Config.text.courseNameOpacity),
    "--course-underline": String(frame1Config.text.courseUnderline),
    "--course-gap": `${frame1Config.text.courseGap}px`,
    "--name-size": frame1Config.middle.nameSize,
    "--name-line": String(frame1Config.middle.nameLine),
    "--name-color": frame1Config.middle.nameColor,
    "--middle-line-size": `${frame1Config.middle.lineSize}px`,
    "--middle-line-weight": String(frame1Config.middle.lineWeight),
    "--middle-line-height": String(frame1Config.middle.lineLine),
    "--middle-line-opacity": String(frame1Config.middle.lineOpacity),
    "--icon-lift": `${frame1Config.icons.lift}px`,
    "--icon-linkedin": frame1Config.icons.linkedin,
    "--icon-radius": `${frame1Config.icons.radius}px`,
    "--research-time": `${frame1Config.research.duration}s`,
    "--research-dim": String(frame1Config.research.dim),
    "--research-blur": `${frame1Config.research.blur}px`,
    "--research-max": `${frame1Config.research.maxWidth}px`,
    "--research-height": `${frame1Config.research.maxHeight * 100}%`,
    "--research-navy": frame1Config.research.navy,
    "--research-border": frame1Config.research.border,
    "--research-radius": `${frame1Config.research.radius}px`,
    "--research-close": `${frame1Config.research.close}px`,
    "--cue-right": `${frame1Config.scrollCue.right * 100}%`,
    "--cue-bottom": `${frame1Config.scrollCue.bottom * 100}%`,
    "--cue-size": `${frame1Config.scrollCue.size}px`,
    "--cue-weight": String(frame1Config.scrollCue.weight),
    "--cue-opacity": String(frame1Config.scrollCue.opacity),
    "--cue-nudge": `${frame1Config.scrollCue.nudge}px`,
    "--cue-every": `${frame1Config.scrollCue.every}s`,
    "--cue-fade": `${frame1Config.scrollCue.fade}s`,
    "--why-color": frame1Config.why.color,
  } as React.CSSProperties;

  useEffect(() => {
    if (!research) {
      if (researchWasOpen.current) researchButtonRef.current?.focus();
      return;
    }
    researchWasOpen.current = true;
    if (research === "from") {
      const id = window.requestAnimationFrame(() => {
        setResearch((current) => (current === "from" ? "open" : current));
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (research === "open") researchCloseRef.current?.focus();
    if (research !== "back") return;
    const timer = window.setTimeout(
      () => setResearch(null),
      (reduced ? 0.32 : frame1Config.research.duration + 0.08) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [research, reduced]);

  useEffect(() => {
    const button = whyButtonRef.current;
    const frame = frameRef.current;
    if (!button || !frame) return;
    const why = frame1Config.bilkentWhy;
    const note = attachWhyNote(button, frame, { note: why.note, label: why.label, hover: true });
    return () => note.destroy();
  }, []);

  useEffect(() => {
    if (!research) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setResearch((current) => (current && current !== "back" ? "back" : current));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [research]);

  const researchShift = (() => {
    const button = researchButtonRef.current?.getBoundingClientRect();
    const frame = frameRef.current?.getBoundingClientRect();
    if (!button || !frame) return { x: 0, y: 0 };
    return {
      x: button.left + button.width / 2 - (frame.left + frame.width / 2),
      y: button.top + button.height / 2 - (frame.top + frame.height / 2),
    };
  })();

  return (
    <main
      ref={frameRef}
      className={[
        "frame",
        playOpening ? "is-opening" : "",
        scrollOpening ? "is-scroll-opening" : "",
        reduced ? "is-reduced" : "",
        research ? "is-research" : "",
      ].filter(Boolean).join(" ")}
      style={style}
      data-bilkent={shown.bilkent ? "1" : "0"}
      data-buas={shown.buas ? "1" : "0"}
      data-middle={shown.middle ? "1" : "0"}
      data-content={shown.content ? "1" : "0"}
      data-name={shown.name ? "1" : "0"}
    >
      <div className="frame-world">
        <section className="card card-left" aria-label="Breda University of Applied Sciences">
          <Campus src={frame1Config.assets.buasCampus} />
          <div className="card-copy">
            <p className="title title-buas">Master Game Technology</p>
            <div className="rule" />
            <p className="label">AI & Procedural Generation</p>
            <p className="text">{frame1Config.buasText}</p>
            <button
              ref={researchButtonRef}
              type="button"
              className="research-open"
              onClick={() => setResearch("from")}
            >
              Explore my research <span className="research-arrow">→</span>
            </button>
          </div>
        </section>

        <section className="card card-right" aria-label="Bilkent University">
          <Campus src={frame1Config.assets.bilkentCampus} />
          <div className="card-copy">
            <p className="title title-bilkent">BSc Computer Engineering</p>
            <div className="rule" />
            <p className="text why-line">
              {frame1Config.bilkentWhy.line}{" "}
              <button ref={whyButtonRef} type="button" className="why-button">
                {frame1Config.bilkentWhy.label}
              </button>
            </p>
            <p className="label">Favorite courses</p>
            <div className="courses">
              {frame1Config.courses.map((course) => (
                <a
                  key={course.href}
                  className="course"
                  href={course.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="course-code">{course.code}</span>{" "}
                  <span className="course-name">{course.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <img
          id="frame1-main-image"
          className="portrait-sharp"
          src={frame1Config.assets.portrait}
          alt="Portrait of Alper Bozkurt"
          draggable={false}
        />

        <div className="identity">
          <p className="middle-name">Alper Bozkurt</p>
          <div className="under-name">
            <p className="middle-line">{frame1Config.tagline}</p>
            {scrollOpening ? <p className="middle-hint">{frame1Config.scrollOpening.hint}</p> : null}
          </div>
        </div>

        <a
          className="icon-link icon-github"
          href={frame1Config.links.github}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub"
        >
          <GitHubIcon />
        </a>
        <a
          className="icon-link icon-linkedin"
          href={frame1Config.links.linkedin}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="LinkedIn"
        >
          <LinkedInIcon />
        </a>

        <a
          className="mark mark-buas"
          href={frame1Config.links.buas}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Breda University of Applied Sciences website"
        >
          <PlainLogo src={frame1Config.assets.buasLogo} />
        </a>
        <a
          className="mark mark-bilkent"
          href={frame1Config.links.bilkent}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Bilkent University website"
        >
          <PlainLogo src={frame1Config.assets.bilkentLogo} />
        </a>

        {scrollOpening ? null : (
          <p className={cueOn ? "scroll-cue" : "scroll-cue is-gone"} aria-hidden={cueOn ? undefined : true}>
            <span>{frame1Config.scrollCue.text}</span>
            <svg className="scroll-cue-arrow" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.2 4.4 L6 8.1 L9.8 4.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </p>
        )}
      </div>

      {research ? (
        <div
          className="research-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setResearch((current) => (current && current !== "back" ? "back" : current));
            }
          }}
        >
          <div
            className={reduced ? (research === "open" ? "research-panel is-shown" : "research-panel") : "research-panel"}
            role="dialog"
            aria-modal="true"
            aria-label="Research plan"
            style={
              reduced
                ? undefined
                : {
                    transform:
                      research === "open"
                        ? "translate(-50%, -50%)"
                        : `translate(-50%, -50%) translate(${researchShift.x}px, ${researchShift.y}px) scale(${frame1Config.research.fromScale})`,
                  }
            }
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={researchCloseRef}
              type="button"
              className="research-close"
              aria-label="Close"
              onClick={() => setResearch("back")}
            >
              ×
            </button>
            <div className="research-scroll">
              <img src={frame1Config.assets.research1} alt="Page 1 of the research plan" />
              <img src={frame1Config.assets.research2} alt="Page 2 of the research plan" />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
