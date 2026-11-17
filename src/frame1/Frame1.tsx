import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { FrameEffects, type EffectsFrame, type EffectsOptions } from "./effectsCanvas";
import { applySeamVariables, placeCampusPhoto } from "./geometry";
import { buildSeamMasks } from "./seamMask";
import "./Frame1.css";

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
  src,
  alt,
  className,
  labelAt,
}: {
  src: string;
  alt: string;
  className?: string;
  labelAt?: { x: string; y: string };
}) {
  const [missing, setMissing] = useState(false);
  const name = fileName(src);

  if (missing) {
    return (
      <div className={`placeholder ${className ?? ""}`} role="img" aria-label={name}>
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

  const lineWidth = (worldY: number) => {
    const seam = seamAt(side, worldY, width, height);
    if (side === "left") return seam - inset - outer;
    return width - outer - (seam + inset);
  };

  const shape = copy.querySelector<HTMLElement>(".copy-shape");
  if (shape) shape.style.display = "none";
  copy.style.top = `${top}px`;
  copy.style.bottom = "auto";
  if (side === "left") {
    copy.style.left = `${outer}px`;
    copy.style.right = "auto";
  } else {
    copy.style.right = `${outer}px`;
    copy.style.left = "auto";
  }

  let boxHeight = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    const topWidth = Math.max(48, lineWidth(top));
    const bottomWidth = Math.max(32, Math.min(lineWidth(top + boxHeight), topWidth));
    copy.style.width = `${topWidth}px`;
    if (shape) {
      const insetAmount = Math.max(0, topWidth - bottomWidth);
      shape.style.display = "block";
      shape.style.width = `${insetAmount}px`;
      shape.style.height = `${Math.max(boxHeight, 1)}px`;
      shape.style.float = side === "left" ? "right" : "left";
      shape.style.shapeOutside =
        side === "left" ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 0 100%, 100% 100%)";
    }
    const badge = copy.querySelector<HTMLElement>(".badge");
    if (badge) badge.style.maxWidth = `${topWidth}px`;
    const next = copy.offsetHeight;
    if (pass > 0 && Math.abs(next - boxHeight) < 1) break;
    boxHeight = next;
  }
}

function fitPortrait(width: number, height: number) {
  const layout = frame1Config.portraitLayout;
  const aspect = layout.naturalWidth / layout.naturalHeight;
  const cap = layout.naturalHeight * layout.maxScale;
  let portraitH = Math.min(layout.height * height, cap);
  const gap = layout.crownGap * width;
  const fits = (size: number) => {
    const portraitW = size * aspect;
    const top = height - size;
    const left = (width - portraitW) / 2;
    return layout.crown.every((sample) => {
      const y = top + sample.y * size;
      const x0 = left + sample.left * portraitW;
      const x1 = left + sample.right * portraitW;
      const seam = (width / 2) * ((height - y) / height);
      return x0 >= seam + gap && x1 <= width - seam - gap;
    });
  };
  if (!fits(portraitH)) {
    let low = 0;
    let high = portraitH;
    for (let step = 0; step < 18; step += 1) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    portraitH = low;
  }
  return portraitH;
}

function placeIcons(element: HTMLElement, width: number, height: number, portraitH: number) {
  const layout = frame1Config.portraitLayout;
  const icons = frame1Config.icons;
  const aspect = layout.naturalWidth / layout.naturalHeight;
  const portraitW = portraitH * aspect;
  const top = height - portraitH;
  const eyeY = top + layout.eyeY * portraitH;
  const photoLeft = (width - portraitW) / 2;
  const faceLeft = photoLeft + layout.faceLeft * portraitW;
  const faceRight = photoLeft + layout.faceRight * portraitW;
  const seam = (width / 2) * (eyeY / height);
  const center = width / 2;
  const size = icons.size;

  let githubX = faceLeft - icons.faceGap - size;
  const githubMin = center - seam + icons.seamGap;
  if (githubX < githubMin) githubX = githubMin;

  let linkedinX = faceRight + icons.faceGap;
  const linkedinMax = center + seam - icons.seamGap - size;
  if (linkedinX > linkedinMax) linkedinX = linkedinMax;

  element.style.setProperty("--icon-y", `${eyeY - size / 2}px`);
  element.style.setProperty("--icon-github-x", `${githubX}px`);
  element.style.setProperty("--icon-linkedin-x", `${linkedinX}px`);
}

function placePhoto(
  element: HTMLElement,
  prefix: "buas" | "bilkent",
  width: number,
  height: number,
) {
  const photo = frame1Config.campus[prefix];
  const placed = placeCampusPhoto({
    frameW: width,
    frameH: height,
    aspect: photo.aspect,
    anchorX: photo.anchorX,
    anchorY: photo.anchorY,
    placeX: photo.placeX,
    placeY: photo.placeY,
    scale: photo.scale,
    side: prefix === "buas" ? "left" : "right",
    pad: frame1Config.campus.pad,
    coverTop: frame1Config.campus.coverTop,
  });
  element.style.setProperty(`--${prefix}-photo-left`, `${placed.left}px`);
  element.style.setProperty(`--${prefix}-photo-top`, `${placed.top}px`);
  element.style.setProperty(`--${prefix}-photo-w`, `${placed.width}px`);
  element.style.setProperty(`--${prefix}-photo-h`, `${placed.height}px`);
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
  const playOpening = frame1Config.effects.OPENING_SEQUENCE && !reduced;
  const [shown, setShown] = useState<Shown>(playOpening ? NONE_SHOWN : ALL_SHOWN);

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftCopyRef = useRef<HTMLDivElement>(null);
  const rightCopyRef = useRef<HTMLDivElement>(null);
  const researchButtonRef = useRef<HTMLButtonElement>(null);
  const researchCloseRef = useRef<HTMLButtonElement>(null);
  const effectsRef = useRef<FrameEffects | null>(null);
  const [research, setResearch] = useState<ResearchPose | null>(null);
  const researchWasOpen = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const redrawRef = useRef<() => void>(() => {});
  const layoutRef = useRef({ w: 0, h: 0 });
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
      placePhoto(element, "buas", rect.width, rect.height);
      placePhoto(element, "bilkent", rect.width, rect.height);
      const portraitH = fitPortrait(rect.width, rect.height);
      element.style.setProperty("--portrait-h", `${portraitH}px`);
      placeIcons(element, rect.width, rect.height, portraitH);
      element.style.setProperty("--middle-width", `${frame1Config.middle.maxWidth * rect.width}px`);
      element.style.setProperty("--name-bottom", `${frame1Config.middle.bottom * rect.height}px`);
      const masks = buildSeamMasks(rect.width, rect.height, frame1Config.seams);
      element.style.setProperty("--mask-left", `url("${masks.left}")`);
      element.style.setProperty("--mask-right", `url("${masks.right}")`);
      element.style.setProperty("--mask-middle", `url("${masks.middle}")`);
      const layCopies = () => {
        if (leftCopyRef.current) layoutCopy(leftCopyRef.current, "left", rect.width, rect.height);
        if (rightCopyRef.current) layoutCopy(rightCopyRef.current, "right", rect.width, rect.height);
      };
      layCopies();
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
      layCopies();
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

  const style = {
    "--buas-tone": frame1Config.colors.buasTone,
    "--bilkent-tone": frame1Config.colors.bilkentTone,
    "--middle-tone": frame1Config.colors.middleTone,
    "--portrait-position": frame1Config.portraitPosition,
    "--light-strength": String(frame1Config.lightStrength),
    "--light-tone-mix": `${frame1Config.lightToneMix * 100}%`,
    "--shade-amount": String(frame1Config.shadeAmount),
    "--portrait-shade": String(frame1Config.portraitShadeAmount),
    "--edge-strength": String(frame1Config.edgeGlowStrength),
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
    "--badge-pad-y": `${frame1Config.badge.padY}px`,
    "--badge-pad-x": `${frame1Config.badge.padX}px`,
    "--badge-radius": `${frame1Config.badge.radius}px`,
    "--badge-gap": `${frame1Config.badge.gap}px`,
    "--badge-buas": `${frame1Config.badge.buasHeight}px`,
    "--badge-bilkent": `${frame1Config.badge.bilkentHeight}px`,
    "--badge-slot": `${frame1Config.badge.slot}px`,
    "--space-title": `${frame1Config.text.spaceTitle}px`,
    "--space-label": `${frame1Config.text.spaceLabel}px`,
    "--space-body": `${frame1Config.text.spaceBody}px`,
    "--space-button": `${frame1Config.text.spaceButton}px`,
    "--portrait-aspect": String(
      frame1Config.portraitLayout.naturalWidth / frame1Config.portraitLayout.naturalHeight,
    ),
    "--portrait-fade": `${frame1Config.portraitLayout.bottomFade * 100}%`,
    "--portrait-fade-dark": `${frame1Config.portraitLayout.fadeDark * 100}%`,
    "--icon-size": `${frame1Config.icons.size}px`,
    "--icon-lift": `${frame1Config.icons.lift}px`,
    "--icon-linkedin": frame1Config.icons.linkedin,
    "--icon-radius": `${frame1Config.icons.radius}px`,
    "--icon-glow": `${frame1Config.icons.glow}px`,
    "--title-gap": `${frame1Config.text.titleGap}px`,
    "--label-gap": `${frame1Config.text.labelGap}px`,
    "--title-line": String(frame1Config.text.titleLine),
    "--buas-title-size": frame1Config.text.buasTitleSize,
    "--buas-title-weight": String(frame1Config.text.buasTitleWeight),
    "--bilkent-title-size": frame1Config.text.bilkentTitleSize,
    "--bilkent-title-weight": String(frame1Config.text.bilkentTitleWeight),
    "--label-size": `${frame1Config.text.labelSize}px`,
    "--label-weight": String(frame1Config.text.labelWeight),
    "--label-opacity": String(frame1Config.text.labelOpacity),
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

      <section className="region region-middle mask-middle fill" aria-label="Portrait">
        <Asset
          src={frame1Config.assets.portrait}
          alt="Portrait of Alper Bozkurt"
          className="portrait-sharp"
        />
      </section>

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
        <div className="badge">
          <Asset
            src={frame1Config.assets.buasLogo}
            alt="Breda University of Applied Sciences"
            className="badge-logo badge-logo-buas"
          />
        </div>
        <p className="title title-buas">Master Game Technology</p>
        <p className="label">AI & Procedural Generation</p>
        <p className="text">
          Exploring how AI agents can help generate dungeon levels that match a designer's goals.
        </p>
        <button
          ref={researchButtonRef}
          type="button"
          className="research-open"
          onClick={() => setResearch("from")}
        >
          Explore my research →
        </button>
      </div>

      <div className="copy copy-right hud" ref={rightCopyRef}>
        <div className="copy-shape" />
        <div className="badge">
          <Asset
            src={frame1Config.assets.bilkentLogo}
            alt="Bilkent University"
            className="badge-logo badge-logo-bilkent"
          />
        </div>
        <p className="title title-bilkent">BSc Computer Engineering</p>
        <p className="label">Favorite courses</p>
        <div className="courses">
          {frame1Config.courses.map((course) => (
            <a
              key={course.href}
              className="course"
              href={course.href}
              target="_blank"
              rel="noreferrer noopener"
              title={course.fullName}
              aria-label={course.fullName}
            >
              <span className="course-code">{course.code}</span>
              <span className="course-name">{course.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="middle-copy hud">
        <p className="middle-name">Alper Bozkurt</p>
        <p className="middle-line">
          Game programmer building gameplay systems, game AI and multiplayer servers.
        </p>
      </div>
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

