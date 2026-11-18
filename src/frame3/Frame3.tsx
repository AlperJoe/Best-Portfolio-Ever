import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { frame3 } from "./config";
import { level, run, type AgentId } from "./data";
import { LevelMap, noteStyle } from "./LevelMap";
import { poseAt, type Pose } from "./replay";
import "./Frame3.css";

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
} as const;

const REFERENCES = [
  "Course project for CS 449/549 Learning for Robotics, Bilkent University, 2023.",
  "Team: Kaan Ünlü, Mert Kaan Er and Alper Bozkurt.",
  "Built on PressurePlate by Trevor McInroe and Filippos Christianos, Autonomous Agents Research Group, University of Edinburgh.",
  'MADDPG code from "Revisiting the Gumbel-Softmax in MADDPG" by Callum Rhys Tilbury, Filippos Christianos and Stefano V. Albrecht, 2023.',
];

const NOTE =
  "What this agent sees: 7×7 tiles in one layer, its position and how long it can keep a door open. 52 numbers in total.";

const COPY = frame3.copy;

/** Type and gaps of the text column that shrink together when it would not fit. */
const FIT_SIZES: Array<[string, string]> = [
  ["--eyebrow-size", frame3.eyebrowSize],
  ["--eyebrow-gap", frame3.eyebrowGap],
  ["--title-size", frame3.titleSize],
  ["--intro-size", frame3.introSize],
  ["--intro-gap", frame3.introGap],
  ["--label-size", frame3.labelSize],
  ["--section-gap", frame3.sectionGap],
  ["--label-gap", frame3.labelGap],
  ["--body-size", frame3.bodySize],
  ["--item-gap", frame3.itemGap],
  ["--stack-size", frame3.stackSize],
  ["--button-size", frame3.buttonSize],
  ["--link-gap", frame3.linkGap],
];

type PanelPhase = "closed" | "opening" | "open" | "closing";

function restPose(): Pose {
  return poseAt(
    run.frames,
    0,
    frame3.stepsPerSecond,
    frame3.holdSeconds,
    frame3.fadeSeconds,
    frame3.sparkleSeconds,
  ).pose;
}

function AgentGlyph() {
  return (
    <svg viewBox="-4 -4 24 24" aria-hidden="true">
      <rect x="1.4" y="2.2" width="13.2" height="11.6" rx="3" fill={frame3.eye} />
      <rect x="2.4" y="3.2" width="11.2" height="9.6" rx="2.4" fill="currentColor" />
      <rect x="4.3" y="6.1" width="2.2" height="2.2" fill={frame3.eye} />
      <rect x="9.5" y="6.1" width="2.2" height="2.2" fill={frame3.eye} />
    </svg>
  );
}

export function Frame3() {
  const frameRef = useRef<HTMLElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refsButtonRef = useRef<HTMLButtonElement>(null);
  const elapsedRef = useRef(0);
  const onceRef = useRef(false);
  const touchRef = useRef(false);
  const pointerFocus = useRef(false);
  const keyboardRef = useRef(false);
  const ignoreMouseUntil = useRef(0);

  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [onScreen, setOnScreen] = useState(false);
  const [pose, setPose] = useState<Pose>(restPose);
  const [watch, setWatch] = useState<AgentId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<PanelPhase>("closed");

  const onScreenRef = useRef(onScreen);
  const reducedRef = useRef(reduced);
  onScreenRef.current = onScreen;
  reducedRef.current = reduced;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = grainRef.current;
    if (!frame || !canvas) return;

    const effects = new FrameEffects(canvas, GRAIN);
    let raf = 0;
    let stopped = false;
    let last = performance.now();
    let drewStill = false;

    const snapshot = () => {
      const rect = frame.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        cursorX: 0,
        cursorY: 0,
        cursorInside: false,
      };
    };

    const placeCaption = () => {
      const map = mapRef.current;
      if (!map) return;
      const frameRect = frame.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      frame.style.setProperty("--caption-top", `${mapRect.bottom - frameRect.top + frame3.captionOffset}px`);
    };

    const fitCopy = (height: number) => {
      const copy = textRef.current;
      if (!copy) return;
      const room = height * (1 - 2 * frame3.copyMargin);
      const scale = (fit: number) => {
        for (const [name, value] of FIT_SIZES) {
          if (fit >= 1) copy.style.removeProperty(name);
          else copy.style.setProperty(name, `calc(${value} * ${fit.toFixed(3)})`);
        }
      };
      let fit = 1;
      scale(fit);
      while (copy.offsetHeight > room && fit > frame3.copyMinFit) {
        fit = Math.max(frame3.copyMinFit, fit - 0.02);
        scale(fit);
      }
    };

    const placeMap = () => {
      const rect = frame.getBoundingClientRect();
      const columnW = rect.width * (frame3.mapEnd - frame3.mapStart);
      const mapW = Math.min(columnW, rect.height * frame3.mapHeight * 2);
      const mapH = mapW / 2;
      const right = rect.width * (1 - frame3.mapEnd);
      const x = rect.width - right - mapW;
      frame.style.setProperty("--text-width", `${rect.width * (frame3.textEnd - frame3.textStart)}px`);
      frame.style.setProperty("--map-w", `${mapW}px`);
      fitCopy(rect.height);
      const textH = textRef.current?.offsetHeight ?? mapH;
      const top = Math.max(0, (rect.height - Math.max(textH, mapH)) / 2);
      const y = top;
      const cell = mapW / level.width;
      frame.style.setProperty("--group-top", `${top}px`);
      frame.style.setProperty("--caption-top", `${top + mapH + frame3.captionOffset}px`);
      frame.style.setProperty("--map-w", `${mapW}px`);
      frame.style.setProperty("--cell", `${cell}px`);
      frame.style.setProperty("--grid-x", `${x}px`);
      frame.style.setProperty("--grid-y", `${y}px`);
      const fade = frame3.edgeFade;
      const topPct = (y / rect.height) * 100;
      const botPct = ((y + mapH) / rect.height) * 100;
      const leftPct = (x / rect.width) * 100;
      const rightPct = ((x + mapW) / rect.width) * 100;
      frame.style.setProperty("--band-top", `${topPct}%`);
      frame.style.setProperty("--band-top-fade", `${topPct * fade}%`);
      frame.style.setProperty("--band-bot", `${botPct}%`);
      frame.style.setProperty("--band-bot-fade", `${100 - (100 - botPct) * fade}%`);
      frame.style.setProperty("--band-left", `${leftPct}%`);
      frame.style.setProperty("--band-left-fade", `${leftPct * fade}%`);
      frame.style.setProperty("--band-right", `${rightPct}%`);
      frame.style.setProperty("--band-right-fade", `${100 - (100 - rightPct) * fade}%`);
    };

    const resize = () => {
      const rect = frame.getBoundingClientRect();
      effects.resize(rect.width, rect.height);
      placeMap();
      placeCaption();
      drewStill = false;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    if (mapRef.current) observer.observe(mapRef.current);
    document.fonts?.ready.then(() => {
      if (!stopped) resize();
    });

    const tick = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const still = reducedRef.current || document.hidden || !onScreenRef.current;
      if (still) {
        if (!drewStill) {
          effects.renderStill(snapshot());
          drewStill = true;
        }
        return;
      }
      drewStill = false;
      effects.render(dt, snapshot());
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reducedNow = reducedRef.current;
      const active = onScreenRef.current && !document.hidden && (!reducedNow || onceRef.current);
      if (!active) return;

      elapsedRef.current += dt;
      const next = poseAt(
        run.frames,
        elapsedRef.current,
        frame3.stepsPerSecond,
        frame3.holdSeconds,
        frame3.fadeSeconds,
        frame3.sparkleSeconds,
      );
      if (reducedNow && onceRef.current && next.finished) {
        onceRef.current = false;
        elapsedRef.current = 0;
        setPlaying(false);
        setPose(restPose());
        return;
      }
      setPose(next.pose);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (panel !== "opening") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPanel("open"));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [panel]);

  useEffect(() => {
    if (panel !== "closing") return;
    const id = window.setTimeout(() => setPanel("closed"), frame3.panelFadeMs);
    return () => window.clearTimeout(id);
  }, [panel]);

  useEffect(() => {
    if (panel === "closed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel("closing");
      if (event.key === "Tab") touchRef.current = false;
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (refsButtonRef.current?.contains(target)) return;
      setPanel("closing");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [panel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") touchRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playOnce = () => {
    elapsedRef.current = 0;
    onceRef.current = true;
    setPlaying(true);
    setPose(restPose());
  };

  const togglePanel = () => {
    setPanel((current) => (current === "open" || current === "opening" ? "closing" : "opening"));
  };

  const showAgent = (id: AgentId) => setWatch(id);
  const hideAgent = () => setWatch(null);
  const toggleAgent = (id: AgentId) => setWatch((current) => (current === id ? null : id));

  const onAgentPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    touchRef.current = event.pointerType === "touch";
    pointerFocus.current = true;
    if (event.pointerType === "touch") ignoreMouseUntil.current = performance.now() + 700;
    requestAnimationFrame(() => {
      pointerFocus.current = false;
    });
  };

  const onAgentPointerEnter = (id: AgentId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") return;
    if (performance.now() < ignoreMouseUntil.current) return;
    showAgent(id);
  };

  const onAgentPointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") return;
    if (performance.now() < ignoreMouseUntil.current) return;
    if (keyboardRef.current && event.currentTarget === document.activeElement) return;
    hideAgent();
  };

  const onAgentFocus = (id: AgentId) => {
    if (touchRef.current) return;
    if (pointerFocus.current) return;
    keyboardRef.current = true;
    showAgent(id);
  };

  const onAgentBlur = () => {
    keyboardRef.current = false;
    if (touchRef.current) return;
    hideAgent();
  };

  const onAgentClick = (id: AgentId) => {
    if (!touchRef.current) return;
    toggleAgent(id);
  };

  const watchedPoint = watch === "A" ? pose.a : watch === "B" ? pose.b : null;
  const style = {
    "--frame3-bg": frame3.background,
    "--floor": frame3.floor,
    "--warm-white": frame3.warmWhite,
    "--agent-a": frame3.agentA,
    "--text-left": `${frame3.textStart * 100}%`,
    "--map-right": `${(1 - frame3.mapEnd) * 100}%`,
    "--map-floor": frame3.mapFloor,
    "--map-border": frame3.mapBorder,
    "--focus": frame3.focus,
    "--button-size": frame3.buttonSize,
    "--button-weight": String(frame3.buttonWeight),
    "--button-pad-y": frame3.buttonPadY,
    "--button-pad-x": frame3.buttonPadX,
    "--button-radius": frame3.buttonRadius,
    "--button-border": frame3.buttonBorder,
    "--arrow-shift": frame3.arrowShift,
    "--grid": frame3.grid,
    "--outside-mix": String(frame3.outsideMix),
    "--outside-grid": frame3.outsideGrid,
    "--column-gap": frame3.columnGap,
    "--refs-right": frame3.refsRight,
    "--refs-bottom": frame3.refsBottom,
    "--eyebrow-size": frame3.eyebrowSize,
    "--eyebrow-weight": String(frame3.eyebrowWeight),
    "--eyebrow-gap": frame3.eyebrowGap,
    "--title-size": frame3.titleSize,
    "--title-weight": String(frame3.titleWeight),
    "--title-line": String(frame3.titleLine),
    "--intro-size": frame3.introSize,
    "--intro-weight": String(frame3.introWeight),
    "--intro-line": String(frame3.introLine),
    "--intro-gap": frame3.introGap,
    "--label-size": frame3.labelSize,
    "--label-weight": String(frame3.labelWeight),
    "--section-gap": frame3.sectionGap,
    "--label-gap": frame3.labelGap,
    "--body-size": frame3.bodySize,
    "--body-weight": String(frame3.bodyWeight),
    "--body-line": String(frame3.bodyLine),
    "--item-gap": frame3.itemGap,
    "--bullet": frame3.bullet,
    "--stack-size": frame3.stackSize,
    "--stack-weight": String(frame3.stackWeight),
    "--link-size": frame3.linkSize,
    "--link-weight": String(frame3.linkWeight),
    "--link-gap": frame3.linkGap,
    "--caption-size": frame3.captionSize,
    "--note-size": frame3.noteSize,
    "--note-line": String(frame3.noteLine),
    "--note-color": frame3.noteColor,
    "--note-plate": frame3.notePlate,
    "--note-plate-opacity": String(frame3.notePlateOpacity),
    "--note-border": String(frame3.noteBorder),
    "--note-radius": frame3.noteRadius,
    "--note-pad-y": frame3.notePadY,
    "--note-pad-x": frame3.notePadX,
    "--refs-size": frame3.refsSize,
    "--refs-weight": String(frame3.refsWeight),
    "--panel-width": frame3.panelWidth,
    "--panel-pad": frame3.panelPad,
    "--panel-radius": frame3.panelRadius,
    "--panel-text": frame3.panelTextSize,
    "--panel-line": String(frame3.panelLine),
    "--panel-fade": `${frame3.panelFadeMs}ms`,
    "--panel": frame3.panel,
    "--white-90": frame3.white90,
    "--white-60": frame3.white60,
    "--white-55": frame3.white55,
    "--white-88": frame3.white88,
    "--white-15": frame3.white15,
    "--cols": String(level.width),
    "--rows": String(level.height),
  } as CSSProperties;

  return (
    <section
      className="frame3"
      ref={frameRef}
      style={style}
      data-step={pose.step}
      data-vision={watch ?? ""}
      aria-label={COPY.title}
    >
      <div className="frame3-world" aria-hidden="true" />

      <div className="frame3-stage">
        <div className="frame3-map" id="frame3-main-image" ref={mapRef}>
          <LevelMap pose={pose} watch={watch} motion={!reduced} />
          <AgentButton
            id="A"
            label="Agent A"
            color={frame3.agentA}
            x={pose.a[0]}
            y={pose.a[1]}
            opacity={pose.opacity}
            noted={watch === "A"}
            onPointerDown={onAgentPointerDown}
            onPointerEnter={onAgentPointerEnter}
            onPointerLeave={onAgentPointerLeave}
            onFocus={onAgentFocus}
            onBlur={onAgentBlur}
            onClick={onAgentClick}
          />
          <AgentButton
            id="B"
            label="Agent B"
            color={frame3.agentB}
            x={pose.b[0]}
            y={pose.b[1]}
            opacity={pose.opacity}
            noted={watch === "B"}
            onPointerDown={onAgentPointerDown}
            onPointerEnter={onAgentPointerEnter}
            onPointerLeave={onAgentPointerLeave}
            onFocus={onAgentFocus}
            onBlur={onAgentBlur}
            onClick={onAgentClick}
          />
          {watchedPoint && (
            <p
              className="frame3-note"
              id="frame3-vision-note"
              style={noteStyle(watchedPoint[0], watchedPoint[1], watch === "B" ? frame3.agentB : frame3.agentA)}
            >
              {NOTE}
            </p>
          )}
        </div>
      </div>

      <canvas className="frame3-grain" ref={grainRef} aria-hidden="true" />

      <div className="frame3-below">
        <p className="frame3-caption">{COPY.caption}</p>
        {reduced && (
          <button className="frame3-play" type="button" onClick={playOnce} disabled={playing}>
            Play
          </button>
        )}
      </div>

      <div className="frame3-copy" ref={textRef}>
        <p className="frame3-eyebrow">{COPY.eyebrow}</p>
        <h2 className="frame3-title">{COPY.title}</h2>
        <p className="frame3-intro">{COPY.intro}</p>
        <p className="frame3-label">{COPY.didLabel}</p>
        <ul className="frame3-list">
          {COPY.did.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="frame3-label">{COPY.trainedLabel}</p>
        <p className="frame3-result">{COPY.trained}</p>
        <p className="frame3-label">{COPY.resultLabel}</p>
        <p className="frame3-result">{COPY.result}</p>
        <p className="frame3-stack">{COPY.stack}</p>
        <a className="frame3-project" href={frame3.projectUrl} target="_blank" rel="noreferrer">
          {COPY.project} <span className="frame3-arrow">→</span>
        </a>
      </div>

      <div className="frame3-refs">
        <button
          className="frame3-refs-button"
          type="button"
          ref={refsButtonRef}
          aria-expanded={panel === "open" || panel === "opening"}
          onClick={togglePanel}
        >
          References
        </button>
        {panel !== "closed" && (
          <div
            className="frame3-panel"
            ref={panelRef}
            role="dialog"
            aria-label="References"
            data-open={panel === "open" ? "1" : "0"}
          >
            {REFERENCES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AgentButton({
  id,
  label,
  color,
  x,
  y,
  opacity,
  noted,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onClick,
}: {
  id: AgentId;
  label: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
  noted: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerEnter: (id: AgentId, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onFocus: (id: AgentId) => void;
  onBlur: () => void;
  onClick: (id: AgentId) => void;
}) {
  return (
    <button
      type="button"
      className="frame3-agent"
      aria-label={label}
      aria-describedby={noted ? "frame3-vision-note" : undefined}
      style={
        {
          "--x": x,
          "--y": y,
          "--agent": color,
          opacity,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerEnter={(event) => onPointerEnter(id, event)}
      onPointerLeave={onPointerLeave}
      onFocus={() => onFocus(id)}
      onBlur={onBlur}
      onClick={() => onClick(id)}
    >
      <AgentGlyph />
    </button>
  );
}
