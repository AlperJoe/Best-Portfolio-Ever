import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { FrameEffects, type EffectsFrame, type EffectsOptions } from "./effectsCanvas";
import { applySeamVariables } from "./geometry";
import { buildSeamMasks, paintPortraitMask } from "./seamMask";
import { OPENING_EVENT } from "../transitions/config";
import { attachWhyNote } from "../whyNote/whyNote";
import "./Frame1.css";

type OpeningPart = (typeof frame1Config.scrollOpening.order)[number]["part"];

type OpeningState = {
  /** Scroll progress from the start state, 0, to the full frame, 1. */
  p: number;
  /** Portrait scale in the start state. */
  startScale: number;
  /** Portrait shift in the start state, in pixels. Negative is up. */
  startShift: number;
  /** Distance from the top of the crown down to the top of the name, in the full frame. */
  nameSpan: number;
};

function smooth(from: number, to: number, x: number) {
  if (to <= from) return x >= to ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** Writes the scroll opening onto the frame. With reduced motion it fades through black instead of zooming. */
function paintOpening(element: HTMLElement, state: OpeningState, reduced: boolean) {
  const order = frame1Config.scrollOpening.order;
  let world = 1;
  let amount = (part: OpeningPart) => {
    const window = order.find((entry) => entry.part === part);
    return window ? smooth(window.from, window.to, state.p) : 1;
  };
  if (reduced) {
    const full = state.p >= 0.5 ? 1 : 0;
    world = Math.abs(1 - 2 * state.p);
    amount = () => full;
  }
  const portrait = amount("portrait");
  const scale = state.startScale + (1 - state.startScale) * portrait;
  const shift = state.startShift * (1 - portrait);
  const parts: Record<string, number> = {
    hint: 1 - amount("hint"),
    sides: amount("sides"),
    tagline: amount("tagline"),
    icons: amount("icons"),
    research: amount("research"),
  };
  element.style.setProperty("--op-scale", scale.toFixed(5));
  element.style.setProperty("--op-shift", `${shift.toFixed(2)}px`);
  element.style.setProperty("--op-name-y", `${(shift + (scale - 1) * state.nameSpan).toFixed(2)}px`);
  element.style.setProperty("--op-world", world.toFixed(4));
  for (const [name, value] of Object.entries(parts)) {
    element.style.setProperty(`--op-${name}`, value.toFixed(4));
    element.dataset[`op${name[0].toUpperCase()}${name.slice(1)}`] = value > 0.001 ? "1" : "0";
  }
}

type Shown = {
  bilkent: boolean;
  buas: boolean;
  middle: boolean;
  content: boolean;
  name: boolean;
};

type ResearchPose = "from" | "open" | "back";

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

function Asset({
  id,
  src,
  alt,
  className,
  labelAt,
}: {
  id?: string;
  src: string;
  alt: string;
  className?: string;
  labelAt?: { x: string; y: string };
}) {
  const [missing, setMissing] = useState(false);
  const name = fileName(src);

  if (missing) {
    return (
      <div id={id} className={`placeholder ${className ?? ""}`} role="img" aria-label={name}>
        {labelAt ? (
          <span className="placeholder-label" style={{ left: labelAt.x, top: labelAt.y }}>
            {name}
          </span>
        ) : (
          name
        )}
      </div>
    );
  }

  return (
    <img
      id={id}
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setMissing(true)}
    />
  );
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

function seamAt(side: "left" | "right", y: number, width: number, height: number) {
  const along = height <= 0 ? 0 : Math.min(1, Math.max(0, y / height));
  const leftSeam = (width / 2) * (1 - along);
  return side === "left" ? leftSeam : width - leftSeam;
}

function layoutCopy(copy: HTMLElement, side: "left" | "right", width: number, height: number) {
  const text = frame1Config.text;
  const top = text.insetY * height;
  const inset = text.seamInset * width;
  const outer = text.insetX * width;
  const frameTop = copy.closest(".frame")?.getBoundingClientRect().top ?? 0;

  const lineWidth = (worldY: number) => {
    const seam = seamAt(side, worldY, width, height);
    if (side === "left") return seam - inset - outer;
    return width - outer - (seam + inset);
  };

  const shape = copy.querySelector<HTMLElement>(".copy-shape");
  if (shape) shape.style.display = "none";
  copy.style.top = `${top}px`;
  copy.style.bottom = "auto";
  copy.style.width = `${Math.max(48, lineWidth(top))}px`;
  if (side === "left") {
    copy.style.left = `${outer}px`;
    copy.style.right = "auto";
  } else {
    copy.style.right = `${outer}px`;
    copy.style.left = "auto";
  }

  const blocks = [...copy.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !el.classList.contains("copy-shape"),
  );
  for (const block of blocks) {
    if (block.classList.contains("rule") || block.classList.contains("badge")) {
      block.style.maxWidth = "none";
      continue;
    }
    block.style.maxWidth = "none";
  }

  for (const block of blocks) {
    if (block.classList.contains("rule") || block.classList.contains("badge")) {
      block.style.marginLeft = side === "right" ? "auto" : "0";
      continue;
    }
    const rect = block.getBoundingClientRect();
    const sampleY = rect.top === 0 && rect.bottom === 0 ? top : rect.top - frameTop;
    const available = Math.max(48, Math.min(lineWidth(top), lineWidth(sampleY)));
    block.style.maxWidth = `${available}px`;
    block.style.marginLeft = side === "right" ? "auto" : "0";
  }

  for (const course of copy.querySelectorAll<HTMLElement>(".course")) {
    const rect = course.getBoundingClientRect();
    const sampleY = rect.top === 0 && rect.bottom === 0 ? top : rect.top - frameTop;
    const available = Math.max(48, Math.min(lineWidth(top), lineWidth(sampleY)));
    course.style.maxWidth = `${available}px`;
    course.style.marginLeft = side === "right" ? "auto" : "0";
  }

  const title = copy.querySelector<HTMLElement>(".title");
  const rule = copy.querySelector<HTMLElement>(".rule");
  if (title && rule) {
    rule.style.width = `${Math.max(1, title.getBoundingClientRect().width)}px`;
    rule.style.maxWidth = "none";
    rule.style.marginLeft = side === "right" ? "auto" : "0";
  }
}

function fitPortrait(_width: number, height: number, nameTop: number) {
  const layout = frame1Config.portraitLayout;
  const cap = layout.naturalHeight * layout.maxScale;
  const target = layout.crownFrame * height;
  const shoulderLimit = nameTop - layout.shoulderGap;
  const chinLimit = nameTop - layout.chinGap;

  const topFor = (size: number) => target - layout.crownTopY * size;

  const fits = (size: number) => {
    const top = topFor(size);
    if (top < 0) return false;
    const shoulders = top + layout.shoulderY * size;
    const chin = top + layout.chinY * size;
    return shoulders <= shoulderLimit && chin <= chinLimit;
  };

  let low = 0;
  let high = cap;
  let size = 0;
  for (let step = 0; step < 22; step += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) {
      size = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  return { size, top: topFor(size) };
}

function placeIcons(element: HTMLElement, width: number, height: number) {
  const name = element.querySelector(".middle-name");
  if (!name) return;
  const range = document.createRange();
  range.selectNodeContents(name);
  const text = range.getBoundingClientRect();
  const frame = element.getBoundingClientRect();
  const icons = frame1Config.icons;
  const size = icons.size;
  const midY = text.top - frame.top + text.height / 2;
  const seam = (width / 2) * (1 - midY / height);
  let githubX = text.left - frame.left - icons.nameGap - size;
  let linkedinX = text.right - frame.left + icons.nameGap;
  const minX = seam + icons.seamGap;
  const maxX = width - seam - icons.seamGap - size;
  if (githubX < minX) githubX = minX;
  if (linkedinX > maxX) linkedinX = maxX;
  element.style.setProperty("--icon-y", `${midY - size / 2}px`);
  element.style.setProperty("--icon-github-x", `${githubX}px`);
  element.style.setProperty("--icon-linkedin-x", `${linkedinX}px`);
}

function placeBadges(element: HTMLElement, width: number, height: number) {
  const badge = frame1Config.badge;
  element.style.setProperty("--badge-w", `${badge.width * width}px`);
  element.style.setProperty("--badge-h", `${badge.height * height}px`);
  element.style.setProperty("--badge-gap", `${badge.gap}px`);
}

function paintMotion(
  element: HTMLElement,
  width: number,
  height: number,
  shiftX: number,
  shiftY: number,
  photoX: number,
  photoY: number,
) {
  element.style.setProperty("--left-light-x", `${width / 6 + shiftX}px`);
  element.style.setProperty("--left-light-y", `${height / 3 + shiftY}px`);
  element.style.setProperty("--right-light-x", `${(5 * width) / 6 + shiftX}px`);
  element.style.setProperty("--right-light-y", `${height / 3 + shiftY}px`);
  element.style.setProperty("--mid-light-x", `${width / 2 + shiftX}px`);
  element.style.setProperty("--mid-light-y", `${(2 * height) / 3 + shiftY}px`);
  element.style.setProperty("--photo-shift-x", `${photoX}px`);
  element.style.setProperty("--photo-shift-y", `${photoY}px`);
}

export function Frame1() {
  const reduced = usePrefersReducedMotion();
  const scrollOpening = true;
  const playOpening = !scrollOpening && frame1Config.effects.OPENING_SEQUENCE && !reduced;
  const openingRef = useRef<OpeningState>({ p: 0, startScale: 1, startShift: 0, nameSpan: 0 });
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [shown, setShown] = useState<Shown>(playOpening ? NONE_SHOWN : ALL_SHOWN);

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftCopyRef = useRef<HTMLDivElement>(null);
  const rightCopyRef = useRef<HTMLDivElement>(null);
  const researchButtonRef = useRef<HTMLButtonElement>(null);
  const researchCloseRef = useRef<HTMLButtonElement>(null);
  const whyButtonRef = useRef<HTMLButtonElement>(null);
  const effectsRef = useRef<FrameEffects | null>(null);
  const [research, setResearch] = useState<ResearchPose | null>(null);
  const [cueOn, setCueOn] = useState(true);
  const researchWasOpen = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const redrawRef = useRef<() => void>(() => {});
  const layoutRef = useRef({ w: 0, h: 0 });
  const portraitMaskRef = useRef<HTMLCanvasElement | null>(null);
  const portraitCutRef = useRef<EffectsOptions["portraitCut"]>(null);
  const shiftRef = useRef({ x: 0, y: 0, photoX: 0, photoY: 0 });
  const cursorRef = useRef({ x: 0, y: 0, inside: false });
  const runtimeRef = useRef({
    reduced,
    grain: frame1Config.effects.FILM_GRAIN,
    cursor: false,
    buasTone: frame1Config.colors.buasTone,
    bilkentTone: frame1Config.colors.bilkentTone,
  });

  runtimeRef.current = {
    reduced,
    grain: frame1Config.effects.FILM_GRAIN,
    cursor: frame1Config.effects.CURSOR_REACTION && !reduced,
    buasTone: frame1Config.colors.buasTone,
    bilkentTone: frame1Config.colors.bilkentTone,
  };

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

    const apply = () => {
      if (scrollOpening) element.style.setProperty("--op-name-y", "0px");
      const rect = element.getBoundingClientRect();
      layoutRef.current.w = rect.width;
      layoutRef.current.h = rect.height;
      applySeamVariables(
        element,
        rect.width,
        rect.height,
        frame1Config.blendWidth,
        frame1Config.edgeGlowReach,
        frame1Config.lightRadius,
      );
      const shift = shiftRef.current;
      paintMotion(element, rect.width, rect.height, shift.x, shift.y, shift.photoX, shift.photoY);
      element.style.setProperty("--campus-fade", `${frame1Config.campus.fade * rect.height}px`);
      element.style.setProperty("--campus-box", `${frame1Config.campus.boxWidth * 100}%`);
      placeBadges(element, rect.width, rect.height);
      element.style.setProperty("--middle-width", `${frame1Config.middle.maxWidth * rect.width}px`);
      element.style.setProperty("--name-bottom", `${frame1Config.middle.bottom * rect.height}px`);
      element.style.setProperty("--glow-size", `${frame1Config.crownGlow.reach * 2 * rect.height}px`);
      const masks = buildSeamMasks(rect.width, rect.height, frame1Config.seams);
      element.style.setProperty("--mask-left", `url("${masks.left}")`);
      element.style.setProperty("--mask-right", `url("${masks.right}")`);
      element.style.setProperty("--mask-middle", `url("${masks.middle}")`);
      const layCopies = () => {
        if (leftCopyRef.current) layoutCopy(leftCopyRef.current, "left", rect.width, rect.height);
        if (rightCopyRef.current) layoutCopy(rightCopyRef.current, "right", rect.width, rect.height);
      };
      const equalizeTitles = () => {
        const titles = [leftCopyRef.current, rightCopyRef.current]
          .map((copy) => copy?.querySelector<HTMLElement>(".title"))
          .filter((node): node is HTMLElement => Boolean(node));
        titles.forEach((title) => {
          title.style.minHeight = "";
        });
        const titleSlot = Math.max(0, ...titles.map((title) => title.getBoundingClientRect().height));
        titles.forEach((title) => {
          title.style.minHeight = `${titleSlot}px`;
        });
      };
      layCopies();
      equalizeTitles();
      layCopies();
      equalizeTitles();
      layCopies();
      const name = element.querySelector(".middle-name");
      const nameTop = name
        ? name.getBoundingClientRect().top - element.getBoundingClientRect().top
        : rect.height * 0.78;
      const portrait = fitPortrait(rect.width, rect.height, nameTop);
      element.style.setProperty("--portrait-h", `${portrait.size}px`);
      element.style.setProperty("--portrait-top", `${portrait.top}px`);
      const fadeEnd = nameTop + frame1Config.portraitLayout.fadeSpan * rect.height;
      const maskShape = frame1Config.portraitLayout.mask;
      const maskCanvas = portraitMaskRef.current ?? document.createElement("canvas");
      portraitMaskRef.current = maskCanvas;
      const maskInput = {
        top: portrait.top,
        height: portrait.size,
        fadeStart: nameTop,
        fadeEnd,
        cx: maskShape.cx,
        cy: maskShape.cy,
        rx: maskShape.rx,
        ry: maskShape.ry,
        solid: maskShape.solid,
        sideClear: maskShape.sideClear,
        sideSoft: maskShape.sideSoft,
        topClear: maskShape.topClear,
        topSoft: maskShape.topSoft,
      };
      paintPortraitMask(maskCanvas, maskInput);
      if (maskCanvas.width >= 2) {
        element.style.setProperty("--portrait-mask", `url("${maskCanvas.toDataURL("image/png")}")`);
      }
      const aspect =
        frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight;
      const portraitW = portrait.size * aspect;
      portraitCutRef.current = {
        canvas: maskCanvas,
        x: (rect.width - portraitW) / 2,
        y: portrait.top,
        w: portraitW,
        h: portrait.size,
        keep: frame1Config.grainOnPortrait,
      };
      placeIcons(element, rect.width, rect.height);
      if (scrollOpening && name instanceof HTMLElement) {
        const setup = frame1Config.scrollOpening;
        const hint = element.querySelector<HTMLElement>(".middle-hint");
        const crownY = frame1Config.portraitLayout.crownFrame * rect.height;
        const nameSpan = Math.max(1, nameTop - crownY);
        const hintH = hint?.offsetHeight ?? 0;
        const floor = rect.height * (1 - frame1Config.middle.bottom);
        const nameMax = floor - name.offsetHeight - setup.hintGap - hintH;
        const topMin = setup.startTopMin * rect.height;
        const startScale = Math.max(1, Math.min(setup.portraitStart, (nameMax - Math.min(topMin, crownY)) / nameSpan));
        openingRef.current.startScale = startScale;
        openingRef.current.startShift = Math.min(0, nameMax - crownY - startScale * nameSpan);
        openingRef.current.nameSpan = nameSpan;
        element.style.setProperty("--hint-top", `${name.offsetTop + name.offsetHeight + setup.hintGap}px`);
        element.style.setProperty("--crown-origin", `${frame1Config.portraitLayout.crownTopY * 100}%`);
        paintOpening(element, openingRef.current, reducedRef.current);
      }
      effectsRef.current?.resize(rect.width, rect.height);
      redrawRef.current();
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) apply();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = frameRef.current;
    if (!canvas || !element) return;

    const initial = runtimeRef.current;
    const effects = new FrameEffects(canvas, {
      steam: false,
      grain: initial.grain,
      steamAmount: 0,
      cursorReaction: initial.cursor,
      buasTone: initial.buasTone,
      bilkentTone: initial.bilkentTone,
      seamTop: frame1Config.seams.top,
      seamBottom: frame1Config.seams.bottom,
      seamSteam: frame1Config.seams.steam,
      haze: false,
      dust: false,
      grainAlpha: frame1Config.grainAlpha,
      portraitCut: portraitCutRef.current,
    });
    effectsRef.current = effects;

    let frameId = 0;
    let stopped = false;
    let last = performance.now();
    const target = { x: 0, y: 0, photoX: 0, photoY: 0 };

    const snapshot = (): EffectsFrame => {
      const cursor = cursorRef.current;
      const { w, h } = layoutRef.current;
      const shift = shiftRef.current;
      return {
        width: w,
        height: h,
        cursorX: cursor.x,
        cursorY: cursor.y,
        cursorInside: cursor.inside,
        lights: {
          left: [w / 6 + shift.x, h / 3 + shift.y],
          right: [(5 * w) / 6 + shift.x, h / 3 + shift.y],
          mid: [w / 2 + shift.x, (2 * h) / 3 + shift.y],
        },
      };
    };

    const options = (): EffectsOptions => {
      const runtime = runtimeRef.current;
      return {
        steam: false,
        grain: runtime.grain,
        steamAmount: 0,
        cursorReaction: runtime.cursor,
        buasTone: runtime.buasTone,
        bilkentTone: runtime.bilkentTone,
        seamTop: frame1Config.seams.top,
        seamBottom: frame1Config.seams.bottom,
        seamSteam: frame1Config.seams.steam,
        haze: false,
        dust: false,
        grainAlpha: frame1Config.grainAlpha,
        portraitCut: portraitCutRef.current,
      };
    };

    const renderStill = () => {
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return;
      effects.resize(w, h);
      effects.setOptions({
        ...options(),
        steam: false,
        haze: false,
        dust: false,
        cursorReaction: false,
      });
      shiftRef.current = { x: 0, y: 0, photoX: 0, photoY: 0 };
      target.x = 0;
      target.y = 0;
      target.photoX = 0;
      target.photoY = 0;
      paintMotion(element, w, h, 0, 0, 0, 0);
      effects.renderStill(snapshot());
    };

    const tick = (now: number) => {
      if (stopped) return;
      if (document.hidden) {
        frameId = 0;
        return;
      }

      const runtime = runtimeRef.current;
      if (runtime.reduced) {
        renderStill();
        frameId = 0;
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w, h } = layoutRef.current;
      effects.resize(w, h);
      effects.setOptions(options());

      if (runtime.cursor) {
        const ease = 1 - Math.exp(-dt / 0.55);
        const shift = shiftRef.current;
        shift.x += (target.x - shift.x) * ease;
        shift.y += (target.y - shift.y) * ease;
        shift.photoX += (target.photoX - shift.photoX) * ease;
        shift.photoY += (target.photoY - shift.photoY) * ease;
        paintMotion(element, w, h, shift.x, shift.y, shift.photoX, shift.photoY);
      } else if (
        shiftRef.current.x !== 0 ||
        shiftRef.current.y !== 0 ||
        shiftRef.current.photoX !== 0 ||
        shiftRef.current.photoY !== 0
      ) {
        shiftRef.current = { x: 0, y: 0, photoX: 0, photoY: 0 };
        target.x = 0;
        target.y = 0;
        target.photoX = 0;
        target.photoY = 0;
        paintMotion(element, w, h, 0, 0, 0, 0);
      }

      effects.render(dt, snapshot());

      const shift = shiftRef.current;
      const settled =
        Math.abs(shift.x - target.x) < 0.08 &&
        Math.abs(shift.y - target.y) < 0.08 &&
        Math.abs(shift.photoX - target.photoX) < 0.08 &&
        Math.abs(shift.photoY - target.photoY) < 0.08;
      const keepGoing = runtime.grain || !settled;
      if (!keepGoing) {
        frameId = 0;
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (stopped || document.hidden) return;
      if (runtimeRef.current.reduced) {
        renderStill();
        return;
      }
      if (frameId) return;
      const { w, h } = layoutRef.current;
      if (w > 0) effects.resize(w, h);
      last = performance.now();
      frameId = window.requestAnimationFrame(tick);
    };
    startRef.current = start;
    redrawRef.current = () => {
      if (runtimeRef.current.reduced) {
        renderStill();
        return;
      }
      const { w, h } = layoutRef.current;
      if (w <= 0) return;
      effects.resize(w, h);
      effects.setOptions(options());
      effects.render(0, snapshot());
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const cursor = cursorRef.current;
      cursor.x = event.clientX - rect.left;
      cursor.y = event.clientY - rect.top;
      cursor.inside = true;
      if (!runtimeRef.current.cursor || rect.width === 0 || rect.height === 0) return;

      const nx = cursor.x / rect.width - 0.5;
      const ny = cursor.y / rect.height - 0.5;
      const maxPhoto = frame1Config.cursorPhotoShift;
      let photoX = -nx * 2 * maxPhoto;
      let photoY = -ny * 2 * maxPhoto;
      const photoDistance = Math.hypot(photoX, photoY);
      if (photoDistance > maxPhoto && photoDistance > 0) {
        photoX *= maxPhoto / photoDistance;
        photoY *= maxPhoto / photoDistance;
      }

      target.x = 0;
      target.y = 0;
      target.photoX = photoX;
      target.photoY = photoY;
      start();
    };

    const onLeave = () => {
      cursorRef.current.inside = false;
      target.x = 0;
      target.y = 0;
      target.photoX = 0;
      target.photoY = 0;
      start();
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }
      start();
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stopped = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      effectsRef.current = null;
      startRef.current = () => {};
      redrawRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    startRef.current();
  }, [shown.content, reduced]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!scrollOpening || !element) return;
    paintOpening(element, openingRef.current, reduced);
    const onOpening = (event: Event) => {
      openingRef.current.p = (event as CustomEvent<number>).detail;
      paintOpening(element, openingRef.current, reducedRef.current);
    };
    window.addEventListener(OPENING_EVENT, onOpening);
    return () => window.removeEventListener(OPENING_EVENT, onOpening);
  }, [scrollOpening, reduced]);

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
    "--portrait-position": frame1Config.portraitPosition,
    "--light-strength": String(frame1Config.lightStrength),
    "--light-tone-mix": `${frame1Config.lightToneMix * 100}%`,
    "--shade-amount": String(frame1Config.shadeAmount),
    "--portrait-shade": String(frame1Config.portraitShadeAmount),
    "--edge-strength": String(frame1Config.portraitEdgeStrength),
    "--overlay-opacity": String(frame1Config.colorOverlay.opacity),
    "--overlay-blend": frame1Config.colorOverlay.blendMode,
    "--buas-highlight": `${frame1Config.duotone.buasHighlight * 100}%`,
    "--buas-shadow": `${frame1Config.duotone.buasShadow * 100}%`,
    "--bilkent-highlight": `${frame1Config.duotone.bilkentHighlight * 100}%`,
    "--bilkent-shadow": `${frame1Config.duotone.bilkentShadow * 100}%`,
    "--photo-contrast": String(frame1Config.duotone.contrast),
    "--buas-shade": `${frame1Config.duotone.buasShade * 100}%`,
    "--bilkent-shade": `${frame1Config.duotone.bilkentShade * 100}%`,
    "--veil-top": String(frame1Config.veil.top),
    "--veil-bottom": String(frame1Config.veil.bottom),
    "--badge-plate": frame1Config.badge.plate,
    "--badge-opacity": String(frame1Config.badge.plateOpacity),
    "--badge-pad": `${frame1Config.badge.pad}px`,
    "--badge-radius": `${frame1Config.badge.radius}px`,
    "--badge-lift": `${frame1Config.badge.lift}px`,
    "--badge-tint-mix": String(frame1Config.badge.tint),
    "--badge-buas": frame1Config.badge.buasTint,
    "--badge-bilkent": frame1Config.badge.bilkentTint,
    "--portrait-grade": frame1Config.portraitGrade,
    "--focus": frame1Config.focus,
    "--glow-rgb": frame1Config.crownGlow.rgb,
    "--glow-opacity": String(frame1Config.crownGlow.opacity),
    "--glow-shift": frame1Config.crownGlow.shift,
    "--space-divider": `${frame1Config.text.spaceDivider}px`,
    "--space-label": `${frame1Config.text.spaceLabel}px`,
    "--space-body": `${frame1Config.text.spaceBody}px`,
    "--space-button": `${frame1Config.text.spaceButton}px`,
    "--rule-opacity": String(frame1Config.text.ruleOpacity),
    "--button-pad-y": `${frame1Config.text.buttonPadY}px`,
    "--button-pad-x": `${frame1Config.text.buttonPadX}px`,
    "--button-radius": `${frame1Config.text.buttonRadius}px`,
    "--button-border": frame1Config.text.buttonBorder,
    "--portrait-aspect": String(
      frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight,
    ),
    "--icon-size": `${frame1Config.icons.size}px`,
    "--icon-lift": `${frame1Config.icons.lift}px`,
    "--icon-linkedin": frame1Config.icons.linkedin,
    "--icon-radius": `${frame1Config.icons.radius}px`,
    "--icon-glow": `${frame1Config.icons.glow}px`,
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
    "--text-shade": String(frame1Config.text.shade),
    "--text-shade-blur": `${frame1Config.text.shadeBlur}px`,
    "--button-size": `${frame1Config.text.buttonSize}px`,
    "--button-weight": String(frame1Config.text.buttonWeight),
    "--button-gap": `${frame1Config.text.buttonGap}px`,
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
    "--name-gap": `${frame1Config.middle.nameGap}px`,
    "--middle-line-size": `${frame1Config.middle.lineSize}px`,
    "--middle-line-weight": String(frame1Config.middle.lineWeight),
    "--middle-line-height": String(frame1Config.middle.lineLine),
    "--middle-line-opacity": String(frame1Config.middle.lineOpacity),
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
      <section className="region region-left mask-left fill" aria-label="Breda University of Applied Sciences">
        <div className="duotone">
          <Asset
            src={frame1Config.assets.buasCampus}
            alt=""
            className="campus campus-buas"
            labelAt={{ x: "calc(100% / 6)", y: "calc(100% / 3)" }}
          />
          <div className="tone-hue fill" />
          <div className="tone-lift fill" />
        </div>
        <div className="region-veil fill" />
      </section>

      <section className="region region-right mask-right fill" aria-label="Bilkent University">
        <div className="duotone">
          <Asset
            src={frame1Config.assets.bilkentCampus}
            alt=""
            className="campus campus-bilkent"
            labelAt={{ x: "calc(500% / 6)", y: "calc(100% / 3)" }}
          />
          <div className="tone-hue fill" />
          <div className="tone-lift fill" />
        </div>
        <div className="region-veil fill" />
      </section>

      <section className="region region-middle mask-middle fill" aria-hidden="true" />

      <Asset
        id="frame1-main-image"
        src={frame1Config.assets.portrait}
        alt="Portrait of Alper Bozkurt"
        className="portrait-sharp portrait-layer"
      />
      <div className="crown-glow portrait-layer" aria-hidden="true" />

      {frame1Config.effects.PORTRAIT_EDGE_LIGHT ? (
        <div className="edge mask-middle fill">
          <div className="edge-left" />
          <div className="edge-right" />
        </div>
      ) : null}

      <canvas ref={canvasRef} className="fx fill" aria-hidden="true" />

      <a
        className="icon-link icon-github hud"
        href={frame1Config.links.github}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="GitHub"
      >
        <GitHubIcon />
      </a>
      <a
        className="icon-link icon-linkedin hud"
        href={frame1Config.links.linkedin}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="LinkedIn"
      >
        <LinkedInIcon />
      </a>

      <div className="copy copy-left hud" ref={leftCopyRef}>
        <div className="copy-shape" />
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
        <a
          className="badge badge-buas"
          href={frame1Config.links.buas}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Breda University of Applied Sciences website"
        >
          <Asset src={frame1Config.assets.buasLogo} alt="" className="badge-logo" />
        </a>
      </div>

      <div className="copy copy-right hud" ref={rightCopyRef}>
        <div className="copy-shape" />
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
        <a
          className="badge badge-bilkent"
          href={frame1Config.links.bilkent}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Bilkent University website"
        >
          <Asset src={frame1Config.assets.bilkentLogo} alt="" className="badge-logo" />
        </a>
      </div>

      <div className="middle-copy hud">
        <p className="middle-name">Alper Bozkurt</p>
        <p className="middle-line">{frame1Config.tagline}</p>
        {scrollOpening ? <p className="middle-hint">{frame1Config.scrollOpening.hint}</p> : null}
      </div>
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

