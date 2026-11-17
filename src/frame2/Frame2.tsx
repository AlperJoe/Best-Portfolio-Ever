import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject, type TransitionEvent } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { frame2Config, type CardPoint, type Frame2Card, type Frame2CardId } from "./config";
import { createEmbers, drawEmbers, stepEmbers, type Ember } from "./embers";
import { placeHero, type HeroPlacement } from "./placeHero";
import "./Frame2.css";

type Pose = "hand" | "mid" | "face" | "shut" | "home";
type OpenCard = { id: Frame2CardId; pose: Pose };

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

function cardBox(points: CardPoint[], image: HeroPlacement): CSSProperties {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.0001, maxX - minX);
  const height = Math.max(0.0001, maxY - minY);
  const polygon = points
    .map(([x, y]) => `${((x - minX) / width) * 100}% ${((y - minY) / height) * 100}%`)
    .join(", ");
  return {
    left: `${image.left + minX * image.width}px`,
    top: `${image.top + minY * image.height}px`,
    width: `${width * image.width}px`,
    height: `${height * image.height}px`,
    clipPath: `polygon(${polygon})`,
  };
}

function cardBounds(points: CardPoint[], image: HeroPlacement) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    left: image.left + minX * image.width,
    top: image.top + minY * image.height,
    width: (maxX - minX) * image.width,
    height: (maxY - minY) * image.height,
  };
}

function backSize(height: number) {
  const aspect = frame2Config.cardBack.width / frame2Config.cardBack.height;
  return { width: height * aspect, height };
}

function hintWasDismissed() {
  try {
    return sessionStorage.getItem("frame2-hint-hidden") === "1";
  } catch {
    return false;
  }
}

export function Frame2() {
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const emberRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const buttonRefs = useRef<Partial<Record<Frame2CardId, HTMLButtonElement>>>({});
  const placeRef = useRef<HeroPlacement | null>(null);
  const hadOpen = useRef(false);

  const [place, setPlace] = useState<HeroPlacement>(() =>
    placeHero(window.innerWidth, window.innerHeight, window.innerHeight * frame2Config.caption.gradient, {
      imageW: frame2Config.image.width,
      imageH: frame2Config.image.height,
      positionX: frame2Config.image.positionX,
      positionY: frame2Config.image.positionY,
      titleInset: frame2Config.image.titleInset,
      title: frame2Config.regions.title,
      face: frame2Config.regions.face,
    }),
  );
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [openCardHeight, setOpenCardHeight] = useState(0);
  const [hintOn, setHintOn] = useState(() => !hintWasDismissed());
  placeRef.current = place;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const apply = () => {
      const row = rowRef.current;
      const height = frame.clientHeight;
      const frameRect = frame.getBoundingClientRect();
      const rowTop = row ? row.getBoundingClientRect().top - frameRect.top : height * (1 - frame2Config.caption.gradient);
      const clear = height - rowTop + frame2Config.caption.safeGap;
      setPlace(
        placeHero(frame.clientWidth, height, clear, {
          imageW: frame2Config.image.width,
          imageH: frame2Config.image.height,
          positionX: frame2Config.image.positionX,
          positionY: frame2Config.image.positionY,
          titleInset: frame2Config.image.titleInset,
          title: frame2Config.regions.title,
          face: frame2Config.regions.face,
        }),
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    if (rowRef.current) observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const grainCanvas = grainRef.current;
    const emberCanvas = emberRef.current;
    if (!frame || !grainCanvas || !emberCanvas) return;

    const context = emberCanvas.getContext("2d");
    const effects = new FrameEffects(grainCanvas, {
      steam: false,
      grain: true,
      steamAmount: 0,
      cursorReaction: false,
      buasTone: "#ED7624",
      bilkentTone: "#001489",
      seamTop: 0.02,
      seamBottom: 0.05,
      seamSteam: 1,
    });

    let embers: Ember[] = [];
    let frameId = 0;
    let stopped = false;
    let onScreen = true;
    let width = 0;
    let height = 0;
    let last = performance.now();

    const originX = () => {
      const current = placeRef.current;
      if (!current) return width * 0.62;
      return current.left + current.width * 0.62;
    };

    const resize = () => {
      const rect = frame.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      effects.resize(width, height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelW = Math.max(1, Math.round(width * ratio));
      const pixelH = Math.max(1, Math.round(height * ratio));
      if (emberCanvas.width !== pixelW || emberCanvas.height !== pixelH) {
        emberCanvas.width = pixelW;
        emberCanvas.height = pixelH;
      }
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (embers.length === 0 && width > 0) {
        embers = createEmbers(width, height, originX(), frame2Config.embers, reduced);
      }
    };

    const paint = (dt: number, still: boolean) => {
      if (!context || width <= 0) return;
      if (frame2Config.effects.EMBERS_ENABLED) {
        if (!still) stepEmbers(embers, dt, width, height, originX(), frame2Config.embers);
        drawEmbers(context, embers, width, height);
      } else {
        context.clearRect(0, 0, width, height);
      }
      const snapshot = {
        width,
        height,
        cursorX: 0,
        cursorY: 0,
        cursorInside: false,
      };
      effects.setOptions({
        steam: false,
        grain: true,
        steamAmount: 0,
        cursorReaction: false,
        buasTone: "#ED7624",
        bilkentTone: "#001489",
        seamTop: 0.02,
        seamBottom: 0.05,
        seamSteam: 1,
      });
      if (still || reduced) effects.renderStill(snapshot);
      else effects.render(dt, snapshot);
    };

    const tick = (now: number) => {
      if (stopped) return;
      if (document.hidden || !onScreen || reduced) {
        frameId = 0;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(dt, false);
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (stopped || document.hidden || !onScreen) return;
      resize();
      if (reduced || !frame2Config.effects.EMBERS_ENABLED) {
        paint(0, true);
        return;
      }
      if (frameId) return;
      last = performance.now();
      frameId = window.requestAnimationFrame(tick);
    };

    resize();
    start();

    const onVisibility = () => {
      if (document.hidden) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        return;
      }
      start();
    };

    const intersection = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        if (!onScreen) {
          if (frameId) cancelAnimationFrame(frameId);
          frameId = 0;
          return;
        }
        start();
      },
      { threshold: 0.01 },
    );
    intersection.observe(frame);
    document.addEventListener("visibilitychange", onVisibility);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced || !onScreen || document.hidden) paint(0, true);
    });
    resizeObserver.observe(frame);

    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  useEffect(() => {
    const img = new Image();
    img.src = frame2Config.assets.cardBack;
  }, []);

  function dismissHint() {
    setHintOn(false);
    try {
      sessionStorage.setItem("frame2-hint-hidden", "1");
    } catch {
      /* The hint still stays hidden for this visit. */
    }
  }

  function requestClose() {
    setOpen((current) => {
      if (!current || current.pose === "shut" || current.pose === "home") return current;
      if (reduced || current.pose !== "face") return { id: current.id, pose: "home" };
      return { id: current.id, pose: "shut" };
    });
  }

  useEffect(() => {
    if (!open) return;
    if (open.pose === "hand") {
      const id = window.requestAnimationFrame(() => {
        setOpen((current) => {
          if (!current || current.id !== open.id || current.pose !== "hand") return current;
          return { id: current.id, pose: reduced ? "face" : "mid" };
        });
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (open.pose === "face") closeRef.current?.focus();
  }, [open, reduced]);

  useEffect(() => {
    if (!open) {
      if (hadOpen.current) openerRef.current?.focus();
      return;
    }
    hadOpen.current = true;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], video"),
      ].filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reduced]);

  useEffect(() => {
    if (open?.pose !== "home") return;
    const timer = window.setTimeout(
      () => setOpen(null),
      (reduced ? 0.36 : frame2Config.open.travel + 0.12) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [open, reduced]);

  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (!open || !node) {
      setOpenCardHeight((current) => (current === 0 ? current : 0));
      return;
    }
    const next = node.offsetHeight;
    setOpenCardHeight((current) => (Math.abs(current - next) < 0.5 ? current : next));
  }, [open]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const pending = video.play();
    if (pending) pending.catch(() => undefined);
    return () => {
      video.pause();
    };
  }, [open?.id]);

  const active = open ? frame2Config.cards.items.find((card) => card.id === open.id) : undefined;
  const frameHeight = frameRef.current?.clientHeight || window.innerHeight;
  const openMaxHeight = frameHeight * frame2Config.open.height;
  const openWidth = openMaxHeight * frame2Config.open.aspect;
  const boxes = frame2Config.cards.items.map((card) => cardBounds(card.points, place));
  const middle = boxes[1];
  const handSpan = boxes.reduce(
    (span, box) => ({
      left: Math.min(span.left, box.left),
      right: Math.max(span.right, box.left + box.width),
    }),
    { left: Number.POSITIVE_INFINITY, right: 0 },
  );
  const lightSize = middle ? (handSpan.right - handSpan.left) * frame2Config.light.cover : 0;
  const buttonRect =
    open && buttonRefs.current[open.id]
      ? buttonRefs.current[open.id]?.getBoundingClientRect()
      : undefined;
  const frameRect = frameRef.current?.getBoundingClientRect();
  const handOffset =
    buttonRect && frameRect
      ? {
          dx:
            buttonRect.left +
            buttonRect.width / 2 -
            (frameRect.left + frameRect.width / 2),
          dy:
            buttonRect.top +
            buttonRect.height / 2 -
            (frameRect.top + frameRect.height / 2),
        }
      : { dx: 0, dy: 0 };
  const atHand = !reduced && !!open && (open.pose === "hand" || open.pose === "home");
  const back = backSize(
    atHand ? buttonRect?.height || frameHeight * 0.18 : frameHeight * frame2Config.cardBack.midHeight,
  );
  const faceHeight = openCardHeight || openMaxHeight;
  const faceScale = !open || reduced || open.pose === "face" ? 1 : Math.min(1, back.height / faceHeight);
  const turned = !!open && (reduced || open.pose === "face");
  const flightDuration = !open || reduced || open.pose === "hand"
    ? 0
    : open.pose === "face" || open.pose === "shut"
      ? frame2Config.open.turn
      : frame2Config.open.travel;

  function onFlightTransition(event: TransitionEvent<HTMLDivElement>) {
    if (reduced) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains("frame2-back") && event.propertyName === "width") {
      setOpen((current) => {
        if (!current) return current;
        if (current.pose === "mid") return { id: current.id, pose: "face" };
        if (current.pose === "home") return null;
        return current;
      });
    }
    if (target.classList.contains("frame2-flip") && event.propertyName === "transform") {
      setOpen((current) =>
        current && current.pose === "shut" ? { id: current.id, pose: "home" } : current,
      );
    }
  }

  const style = {
    "--caption-inset": `${frame2Config.caption.insetX * 100}%`,
    "--caption-max": `${frame2Config.caption.maxWidth}px`,
    "--caption-size": `${frame2Config.caption.size}px`,
    "--caption-weight": String(frame2Config.caption.weight),
    "--caption-stretch": `${frame2Config.caption.stretch}%`,
    "--caption-line": String(frame2Config.caption.line),
    "--caption-opacity": String(frame2Config.caption.textOpacity),
    "--caption-pad": `${frame2Config.caption.padBottom}px`,
    "--caption-gradient": `${frame2Config.caption.gradient * 100}%`,
    "--gradient-color": frame2Config.caption.color,
    "--gradient-opacity": String(frame2Config.caption.opacity),
    "--plate": frame2Config.buttons.plate,
    "--gold": frame2Config.buttons.gold,
    "--gold-hot": frame2Config.buttons.goldHover,
    "--cut": `${frame2Config.buttons.cut}px`,
    "--button-size": `${frame2Config.buttons.size}px`,
    "--button-weight": String(frame2Config.buttons.weight),
    "--button-gap": `${frame2Config.buttons.gap}px`,
    "--button-pad-x": `${frame2Config.buttons.padX}px`,
    "--button-pad-y": `${frame2Config.buttons.padY}px`,
    "--hint-size": `${frame2Config.hint.size}px`,
    "--hint-weight": String(frame2Config.hint.weight),
    "--hint-stretch": `${frame2Config.hint.stretch}%`,
    "--hint-color": frame2Config.hint.color,
    "--light": frame2Config.light.color,
    "--light-time": `${frame2Config.light.seconds}s`,
    "--card-lift": `${frame2Config.cards.lift}px`,
    "--fill-blur": `${frame2Config.image.fillBlur}px`,
    "--fill-dark": String(frame2Config.image.fillDark),
    "--open-blur": `${frame2Config.image.openBlur}px`,
    "--open-brightness": String(frame2Config.image.openBrightness),
    "--open-height": `${openMaxHeight}px`,
    "--open-radius": `${frame2Config.open.radius}px`,
    "--open-navy": frame2Config.open.navy,
    "--open-title-size": `${frame2Config.open.titleSize}px`,
    "--open-title-weight": String(frame2Config.open.titleWeight),
    "--open-title-stretch": `${frame2Config.open.titleStretch}%`,
    "--open-body-size": `${frame2Config.open.bodySize}px`,
    "--open-body-weight": String(frame2Config.open.bodyWeight),
    "--open-body-stretch": `${frame2Config.open.bodyStretch}%`,
    "--open-body-line": String(frame2Config.open.bodyLine),
    "--open-body-opacity": String(frame2Config.open.bodyOpacity),
    "--close-size": `${frame2Config.open.close}px`,
    "--open-pad": `${frame2Config.open.pad}px`,
    "--perspective": `${frame2Config.open.perspective}px`,
    "--fire-core": frame2Config.open.fireCore,
    "--fire-mid": frame2Config.open.fire,
    "--hero-position": `${frame2Config.image.positionX * 100}% ${frame2Config.image.positionY * 100}%`,
  } as CSSProperties;

  return (
    <section
      ref={frameRef}
      className={open ? (reduced ? "frame2 is-open is-reduced" : "frame2 is-open") : reduced ? "frame2 is-reduced" : "frame2"}
      style={style}
    >
      <div className="frame2-scene">
        <img className="frame2-fill" src={frame2Config.assets.hero} alt="" aria-hidden="true" />
        <div className="frame2-fill-shade" />
        <img
          id="frame2-main-image"
          className="frame2-hero"
          src={frame2Config.assets.hero}
          alt="Pedro holding three cards"
          draggable={false}
          style={{
            left: `${place.left}px`,
            top: `${place.top}px`,
            width: `${place.width}px`,
            height: `${place.height}px`,
          }}
        />
        {frame2Config.cards.items.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={`frame2-card frame2-card-${index + 1}`}
            style={cardBox(card.points, place)}
            aria-label={card.title}
            ref={(node) => {
              if (node) buttonRefs.current[card.id] = node;
              else delete buttonRefs.current[card.id];
            }}
            onClick={(event) => {
              openerRef.current = event.currentTarget;
              dismissHint();
              setOpen({ id: card.id, pose: "hand" });
            }}
          />
        ))}
        {middle ? (
          <div
            className="frame2-hand-light"
            style={{
              left: `${middle.left + middle.width / 2}px`,
              top: `${middle.top + middle.height / 2}px`,
              width: `${lightSize}px`,
              height: `${lightSize}px`,
            }}
          />
        ) : null}
        <p
          className={hintOn ? "frame2-hint" : "frame2-hint is-hidden"}
          aria-hidden={hintOn ? undefined : true}
          style={
            middle
              ? {
                  left: `${middle.left + middle.width / 2}px`,
                  top: `${middle.top - frame2Config.hint.gap}px`,
                }
              : undefined
          }
        >
          {frame2Config.hint.text}
        </p>
      </div>

      <img
        className="frame2-card-back-preload"
        src={frame2Config.assets.cardBack}
        alt=""
        aria-hidden="true"
      />

      <canvas ref={emberRef} className="frame2-embers" aria-hidden="true" />
      <canvas ref={grainRef} className="frame2-grain" aria-hidden="true" />

      <div className="frame2-caption">
        <div className="frame2-caption-fade" />
        <div ref={rowRef} className="frame2-caption-row">
          <p className="frame2-caption-text">{frame2Config.caption.text}</p>
          <div className="frame2-actions">
            <a className="frame2-plate" href={frame2Config.buttons.appStore} target="_blank" rel="noopener noreferrer">
              Play on the App Store
            </a>
            <a className="frame2-plate" href={frame2Config.buttons.code} target="_blank" rel="noopener noreferrer">
              View the code
            </a>
          </div>
        </div>
      </div>

      {open && active ? (
        <div
          className="frame2-open"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div className="frame2-fire" />
          <OpenCardView
            card={active}
            dx={atHand ? handOffset.dx : 0}
            dy={atHand ? handOffset.dy : 0}
            spin={turned ? 180 : 0}
            backWidth={back.width}
            backHeight={back.height}
            faceScale={faceScale}
            faceWidth={openWidth}
            duration={flightDuration}
            shown={!reduced || open.pose === "face"}
            flightRef={flightRef}
            dialogRef={dialogRef}
            closeRef={closeRef}
            videoRef={videoRef}
            onClose={requestClose}
            onTransition={onFlightTransition}
          />
        </div>
      ) : null}
    </section>
  );
}

function OpenCardView({
  card,
  dx,
  dy,
  spin,
  backWidth,
  backHeight,
  faceScale,
  faceWidth,
  duration,
  shown,
  flightRef,
  dialogRef,
  closeRef,
  videoRef,
  onClose,
  onTransition,
}: {
  card: Frame2Card;
  dx: number;
  dy: number;
  spin: number;
  backWidth: number;
  backHeight: number;
  faceScale: number;
  faceWidth: number;
  duration: number;
  shown: boolean;
  flightRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onTransition: (event: TransitionEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      ref={flightRef}
      className={shown ? "frame2-flight is-shown" : "frame2-flight"}
      style={
        {
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--flight-duration": `${duration}s`,
        } as CSSProperties
      }
      onTransitionEnd={onTransition}
    >
      <div
        className="frame2-flip"
        style={{ "--spin": `${spin}deg` } as CSSProperties}
      >
      <img
        className="frame2-back"
        src={frame2Config.assets.cardBack}
        alt=""
        width={frame2Config.cardBack.width}
        height={frame2Config.cardBack.height}
        style={{ width: `${backWidth}px`, height: `${backHeight}px` }}
        draggable={false}
      />
      <div
        ref={dialogRef}
        className="frame2-face"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame2-card-title"
        style={{ width: `${faceWidth}px`, "--face-scale": String(faceScale) } as CSSProperties}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="frame2-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="frame2-card-title">{card.title}</h2>
        {card.video ? (
          <video
            ref={videoRef}
            className="frame2-picture"
            src={frame2Config.assets.gameplay}
            poster={frame2Config.assets.poster}
            preload="none"
            playsInline
            controls
          />
        ) : card.image ? (
          <img className="frame2-picture" src={card.image.src} alt={card.image.alt} />
        ) : null}
        <p>{card.body}</p>
        {card.links.length > 0 ? (
          <div className="frame2-card-links">
            {card.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        <span className="frame2-gem frame2-gem-tl" />
        <span className="frame2-gem frame2-gem-tr" />
        <span className="frame2-gem frame2-gem-bl" />
        <span className="frame2-gem frame2-gem-br" />
      </div>
      </div>
    </div>
  );
}
