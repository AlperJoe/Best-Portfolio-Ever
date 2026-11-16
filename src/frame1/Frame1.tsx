import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { frame1Config } from "./config";
import { FrameEffects, type EffectsFrame, type EffectsOptions } from "./effectsCanvas";
import { applySeamVariables } from "./geometry";
import "./Frame1.css";

type Shown = {
  bilkent: boolean;
  buas: boolean;
  middle: boolean;
  steam: boolean;
  content: boolean;
};

const ALL_SHOWN: Shown = {
  bilkent: true,
  buas: true,
  middle: true,
  steam: true,
  content: true,
};

const NONE_SHOWN: Shown = {
  bilkent: false,
  buas: false,
  middle: false,
  steam: false,
  content: false,
};

const OPENING_STEPS: Array<[number, keyof Shown]> = [
  [160, "bilkent"],
  [620, "buas"],
  [1080, "middle"],
  [1540, "steam"],
  [1960, "content"],
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
  element.style.setProperty("--left-light-y", `${(2 * height) / 3 + shiftY}px`);
  element.style.setProperty("--right-light-x", `${(5 * width) / 6 + shiftX}px`);
  element.style.setProperty("--right-light-y", `${(2 * height) / 3 + shiftY}px`);
  element.style.setProperty("--mid-light-x", `${width / 2 + shiftX}px`);
  element.style.setProperty("--mid-light-y", `${height / 3 + shiftY}px`);
  element.style.setProperty("--photo-shift-x", `${photoX}px`);
  element.style.setProperty("--photo-shift-y", `${photoY}px`);
}

export function Frame1() {
  const reduced = usePrefersReducedMotion();
  const playOpening = frame1Config.effects.OPENING_SEQUENCE && !reduced;
  const [shown, setShown] = useState<Shown>(playOpening ? NONE_SHOWN : ALL_SHOWN);

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectsRef = useRef<FrameEffects | null>(null);
  const startRef = useRef<() => void>(() => {});
  const redrawRef = useRef<() => void>(() => {});
  const layoutRef = useRef({ w: 0, h: 0 });
  const shiftRef = useRef({ x: 0, y: 0, photoX: 0, photoY: 0 });
  const cursorRef = useRef({ x: 0, y: 0, inside: false });
  const runtimeRef = useRef({
    reduced,
    steam: false,
    grain: frame1Config.effects.FILM_GRAIN,
    cursor: false,
    steamAmount: frame1Config.steamAmount,
    buasTone: frame1Config.colors.buasTone,
    bilkentTone: frame1Config.colors.bilkentTone,
  });

  runtimeRef.current = {
    reduced,
    steam: frame1Config.effects.STEAM_ENABLED && shown.steam,
    grain: frame1Config.effects.FILM_GRAIN,
    cursor: frame1Config.effects.CURSOR_REACTION && !reduced,
    steamAmount: frame1Config.steamAmount,
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
      effectsRef.current?.resize(rect.width, rect.height);
      redrawRef.current();
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = frameRef.current;
    if (!canvas || !element) return;

    const initial = runtimeRef.current;
    const effects = new FrameEffects(canvas, {
      steam: initial.steam,
      grain: initial.grain,
      steamAmount: initial.steamAmount,
      cursorReaction: initial.cursor,
      buasTone: initial.buasTone,
      bilkentTone: initial.bilkentTone,
    });
    effectsRef.current = effects;

    let frameId = 0;
    let stopped = false;
    let last = performance.now();
    const target = { x: 0, y: 0, photoX: 0, photoY: 0 };

    const snapshot = (): EffectsFrame => {
      const cursor = cursorRef.current;
      return {
        width: layoutRef.current.w,
        height: layoutRef.current.h,
        cursorX: cursor.x,
        cursorY: cursor.y,
        cursorInside: cursor.inside,
      };
    };

    const options = (): EffectsOptions => {
      const runtime = runtimeRef.current;
      return {
        steam: runtime.steam && !runtime.reduced,
        grain: runtime.grain,
        steamAmount: runtime.steamAmount,
        cursorReaction: runtime.cursor,
        buasTone: runtime.buasTone,
        bilkentTone: runtime.bilkentTone,
      };
    };

    const renderStill = () => {
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return;
      effects.resize(w, h);
      effects.setOptions({
        ...options(),
        steam: runtimeRef.current.steam,
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
      const keepGoing = runtime.steam || runtime.grain || !settled;
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
      const maxLight = frame1Config.cursorLightShift * rect.width;
      let lightX = nx * 2 * maxLight;
      let lightY = ny * 2 * maxLight;
      const lightDistance = Math.hypot(lightX, lightY);
      if (lightDistance > maxLight && lightDistance > 0) {
        lightX *= maxLight / lightDistance;
        lightY *= maxLight / lightDistance;
      }

      const maxPhoto = frame1Config.cursorPhotoShift;
      let photoX = -nx * 2 * maxPhoto;
      let photoY = -ny * 2 * maxPhoto;
      const photoDistance = Math.hypot(photoX, photoY);
      if (photoDistance > maxPhoto && photoDistance > 0) {
        photoX *= maxPhoto / photoDistance;
        photoY *= maxPhoto / photoDistance;
      }

      target.x = lightX;
      target.y = lightY;
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
  }, [shown.steam, shown.content, reduced]);

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
  } as React.CSSProperties;

  return (
    <main
      ref={frameRef}
      className={playOpening ? "frame is-opening" : "frame"}
      style={style}
      data-bilkent={shown.bilkent ? "1" : "0"}
      data-buas={shown.buas ? "1" : "0"}
      data-middle={shown.middle ? "1" : "0"}
      data-steam={shown.steam ? "1" : "0"}
      data-content={shown.content ? "1" : "0"}
    >
      <section className="region region-left mask-left fill" aria-label="Breda University of Applied Sciences">
        <Asset
          src={frame1Config.assets.buasCampus}
          alt=""
          className="campus"
          labelAt={{ x: "calc(100% / 6)", y: "calc(200% / 3)" }}
        />
        <div className="tone fill" style={{ background: "var(--buas-tone)" }} />
        <div className="shade fill" />
      </section>

      <section className="region region-right mask-right fill" aria-label="Bilkent University">
        <Asset
          src={frame1Config.assets.bilkentCampus}
          alt=""
          className="campus"
          labelAt={{ x: "calc(500% / 6)", y: "calc(200% / 3)" }}
        />
        <div className="tone fill" style={{ background: "var(--bilkent-tone)" }} />
        <div className="shade fill" />
      </section>

      <section className="region region-middle mask-middle fill" aria-label="Portrait">
        <Asset
          src={frame1Config.assets.portrait}
          alt="Portrait"
          className="portrait"
          labelAt={{ x: "50%", y: "calc(100% / 3)" }}
        />
        <div className="shade shade-portrait fill" />
      </section>

      <div className="light light-left mask-left fill" />
      <div className="light light-right mask-right fill" />
      <div className="light light-middle mask-middle fill" />

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

      <div className="stack stack-buas hud">
        <Asset
          src={frame1Config.assets.buasLogo}
          alt="Breda University of Applied Sciences"
          className="logo"
        />
        <p className="title">Master Game Technology</p>
        <p className="body">
          generate dungeon levels that match a designer’s selected parameter.
        </p>
      </div>

      <div className="stack stack-bilkent hud">
        <Asset
          src={frame1Config.assets.bilkentLogo}
          alt="Bilkent University"
          className="logo"
        />
        <p className="title">Bachelor, Computer Engineering</p>
        <p className="body">
          Favorite courses: Algorithms, Automata Theory, Reinforcement Learning
        </p>
      </div>
    </main>
  );
}
