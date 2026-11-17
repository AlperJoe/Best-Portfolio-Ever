import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject, type TransitionEvent } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { frame2Config, type CardPoint, type Frame2Card, type Frame2CardId } from "./config";
import { createEmbers, drawEmbers, stepEmbers, type Ember } from "./embers";
import { placeHero, type HeroPlacement } from "./placeHero";
import "./Frame2.css";

type Pose = "from" | "open" | "shut";
type OpenCard = { id: Frame2CardId; pose: Pose };

const heroOptions = {
  imageW: frame2Config.image.width,
  imageH: frame2Config.image.height,
  positionX: frame2Config.image.positionX,
  positionY: frame2Config.image.positionY,
  titleInset: frame2Config.image.titleInset,
  title: frame2Config.regions.title,
  face: frame2Config.regions.face,
};

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

export function Frame2() {
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
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
    placeHero(window.innerWidth, window.innerHeight, frame2Config.image.bottomClear, heroOptions),
  );
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [openCardHeight, setOpenCardHeight] = useState(0);
  const [inView, setInView] = useState(false);
  const [lineHeld, setLineHeld] = useState(false);
  const lineOn = inView && !lineHeld;
  const [introFit, setIntroFit] = useState(1);
  const [lineBox, setLineBox] = useState<{ left: number; top: number } | null>(null);
  placeRef.current = place;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const apply = () => {
      setPlace(
        placeHero(frame.clientWidth, frame.clientHeight, frame2Config.image.bottomClear, heroOptions),
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const intro = introRef.current;
    const line = lineRef.current;
    if (!frame || !intro || !line) return;

    const fitBlock = () => {
      const logoTop = place.top + frame2Config.regions.logo.y * place.height;
      const hairLeft = place.left + frame2Config.regions.hairX * place.width;
      const cardTop = Math.min(
        ...frame2Config.cards.items.slice(0, 2).map((card) => cardBounds(card.points, place).top),
      );
      const leftCard = cardBounds(frame2Config.cards.items[0].points, place);
      const faceLeft = place.left + frame2Config.line.faceX * place.width - frame2Config.line.faceGap;
      const frameRect = frame.getBoundingClientRect();
      let fit = 1;

      for (let step = 0; step < 14; step += 1) {
        intro.style.setProperty("--intro-fit", String(fit));
        const rect = intro.getBoundingClientRect();
        const bottom = rect.bottom - frameRect.top;
        const right = rect.right - frameRect.left;
        const lineHeight = line.offsetHeight || frame2Config.line.size * frame2Config.line.line;
        const limit = Math.min(
          logoTop - frame2Config.intro.logoGap,
          cardTop - lineHeight - frame2Config.line.blockGap - frame2Config.line.cardGap,
        );
        const clear = bottom <= limit + 0.5 && right <= hairLeft - frame2Config.intro.hairGap;
        if (clear) break;
        const next = Math.max(frame2Config.intro.minFit, Math.round((fit - 0.04) * 1000) / 1000);
        if (next === fit) break;
        fit = next;
      }

      const lineWidth = line.offsetWidth;
      const lineHeight = line.offsetHeight;
      const pocketRight = faceLeft;
      const pocketLeft = leftCard.left;
      let left = pocketLeft + Math.max(0, pocketRight - pocketLeft - lineWidth) / 2;
      if (left + lineWidth > pocketRight) left = Math.max(8, pocketRight - lineWidth);
      let top = cardTop - frame2Config.line.cardGap - lineHeight;
      const introBottom = intro.getBoundingClientRect().bottom - frameRect.top;
      const minTop = introBottom + frame2Config.line.blockGap;
      if (top < minTop) top = minTop;

      setIntroFit((current) => (Math.abs(current - fit) < 0.001 ? current : fit));
      setLineBox((current) =>
        current && Math.abs(current.left - left) < 0.5 && Math.abs(current.top - top) < 0.5
          ? current
          : { left, top },
      );
    };

    fitBlock();
    const fonts = document.fonts;
    if (!fonts) return;
    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) fitBlock();
    });
    return () => {
      cancelled = true;
    };
  }, [place]);

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

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (!visible) setLineHeld(false);
      },
      { threshold: frame2Config.line.viewShare },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function dismissLine() {
    setLineHeld(true);
  }

  function requestClose() {
    setOpen((current) => {
      if (!current || current.pose === "shut" || current.pose === "from") return current;
      return { id: current.id, pose: "shut" };
    });
  }

  useEffect(() => {
    if (!open || open.pose !== "from") return;
    const id = window.requestAnimationFrame(() => {
      setOpen((current) => {
        if (!current || current.pose !== "from") return current;
        return { id: current.id, pose: "open" };
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

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
    if (!open) return;
    if (reduced && open.pose === "open") closeRef.current?.focus();
    const closing = open.pose === "shut";
    const wait = (closing ? (reduced ? 0.36 : frame2Config.open.closeTime) : frame2Config.open.openTime) + 0.08;
    if (!closing && reduced) return;
    const timer = window.setTimeout(() => {
      if (closing) {
        setOpen((current) => (current && current.pose === "shut" ? null : current));
        return;
      }
      closeRef.current?.focus();
    }, wait * 1000);
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
  const frameWidth = frameRef.current?.clientWidth || window.innerWidth;
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
  const faceHeight = openCardHeight || openMaxHeight;
  const atHand = !!open && !reduced && (open.pose === "from" || open.pose === "shut");
  const handScale = faceHeight > 0 ? Math.min(1, (buttonRect?.height || frameHeight * 0.18) / faceHeight) : 1;
  const closing = open?.pose === "shut";
  const motion = frame2Config.open;
  const playFile = frame2Config.intro.stores.playFile;
  const storeHeight = frame2Config.intro.stores.height;
  const playImgHeight = storeHeight * (playFile.height / playFile.contentHeight);
  const playPad = storeHeight * (playFile.inset / playFile.contentHeight);
  const playVisibleWidth = storeHeight * (playFile.contentWidth / playFile.contentHeight);
  const headline = frame2Config.intro.headline;
  const lead = frame2Config.intro.lead;

  function onFlightTransition(event: TransitionEvent<HTMLDivElement>) {
    if (reduced || event.propertyName !== "transform") return;
    if (event.target !== flightRef.current) return;
    if (open?.pose === "shut") {
      setOpen((current) => (current && current.pose === "shut" ? null : current));
      return;
    }
    if (open?.pose === "open") closeRef.current?.focus();
  }

  const style = {
    "--gold": motion.gold,
    "--gold-hot": motion.goldHover,
    "--light": frame2Config.light.color,
    "--light-time": `${frame2Config.light.seconds}s`,
    "--card-lift": `${frame2Config.cards.lift}px`,
    "--fill-blur": `${frame2Config.image.fillBlur}px`,
    "--fill-dark": String(frame2Config.image.fillDark),
    "--open-blur": `${frame2Config.image.openBlur}px`,
    "--open-brightness": String(frame2Config.image.openBrightness),
    "--dim-in": `${motion.openTime}s`,
    "--dim-out": `${motion.closeTime}s`,
    "--open-ease": motion.openEase,
    "--close-ease": motion.closeEase,
    "--open-height": `${openMaxHeight}px`,
    "--open-radius": `${motion.radius}px`,
    "--open-navy": motion.navy,
    "--open-title-size": `${motion.titleSize}px`,
    "--open-title-weight": String(motion.titleWeight),
    "--open-title-stretch": `${motion.titleStretch}%`,
    "--open-body-size": `${motion.bodySize}px`,
    "--open-body-weight": String(motion.bodyWeight),
    "--open-body-stretch": `${motion.bodyStretch}%`,
    "--open-body-line": String(motion.bodyLine),
    "--open-body-opacity": String(motion.bodyOpacity),
    "--close-size": `${motion.close}px`,
    "--open-pad": `${motion.pad}px`,
    "--perspective": `${motion.perspective}px`,
    "--fire-core": motion.fireCore,
    "--fire-mid": motion.fire,
    "--hero-position": `${frame2Config.image.positionX * 100}% ${frame2Config.image.positionY * 100}%`,
    "--intro-left": `${frame2Config.intro.left * 100}%`,
    "--intro-top": `${frame2Config.intro.top * 100}%`,
    "--intro-fit": String(introFit),
    "--headline-max": `${frameWidth * headline.maxWidth}px`,
    "--headline-weight": String(headline.weight),
    "--headline-stretch": `${headline.stretch}%`,
    "--headline-size": `clamp(${headline.min}px, ${headline.preferred}vw, ${headline.max}px)`,
    "--headline-line": String(headline.line),
    "--headline-color": headline.color,
    "--lead-max": `${frameWidth * lead.maxWidth}px`,
    "--lead-size": `${lead.size}px`,
    "--lead-weight": String(lead.weight),
    "--lead-line": String(lead.line),
    "--lead-opacity": String(lead.opacity),
    "--lead-gap": `${lead.gap}px`,
    "--store-h": `${storeHeight}px`,
    "--store-gap": `${frame2Config.intro.stores.gap}px`,
    "--store-lift": `${frame2Config.intro.stores.lift}px`,
    "--store-above": `${frame2Config.intro.stores.above}px`,
    "--play-img-h": `${playImgHeight}px`,
    "--play-pad": `${playPad}px`,
    "--play-visible-w": `${playVisibleWidth}px`,
    "--line-size": `${frame2Config.line.size}px`,
    "--line-height": String(frame2Config.line.line),
    "--line-color": frame2Config.line.color,
    "--line-shadow": frame2Config.line.shadow,
    "--line-shine": `${frame2Config.line.shine}s`,
    "--line-fade": `${frame2Config.line.fade}s`,
  } as CSSProperties;

  const dimmed = !!open && (open.pose === "open" || (reduced && open.pose === "shut"));
  const sectionClass = [
    "frame2",
    dimmed ? "is-dim" : "",
    open?.pose === "shut" && !reduced ? "is-closing" : "",
    reduced ? "is-reduced" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={frameRef} className={sectionClass} style={style}>
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
              dismissLine();
              setOpen({ id: card.id, pose: "from" });
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
        <div ref={introRef} className="frame2-intro">
          <h2 className="frame2-headline">{headline.text}</h2>
          <p className="frame2-lead">{lead.text}</p>
          <div className="frame2-stores">
            <a
              className="frame2-store"
              href={frame2Config.intro.stores.appStore}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={frame2Config.assets.appStore} alt="Download on the App Store" draggable={false} />
            </a>
            <a
              className="frame2-store frame2-store-play"
              href={frame2Config.intro.stores.play}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={frame2Config.assets.play} alt="Get it on Google Play" draggable={false} />
            </a>
          </div>
        </div>
      </div>

      <img
        className="frame2-card-back-preload"
        src={frame2Config.assets.cardBack}
        alt=""
        aria-hidden="true"
      />

      <canvas ref={emberRef} className="frame2-embers" aria-hidden="true" />
      <canvas ref={grainRef} className="frame2-grain" aria-hidden="true" />

      <p
        ref={lineRef}
        className={lineOn ? "frame2-line" : "frame2-line is-hidden"}
        aria-hidden={lineOn ? undefined : true}
        style={lineBox ? { left: `${lineBox.left}px`, top: `${lineBox.top}px` } : { visibility: "hidden" }}
      >
        <span className="frame2-line-text">{frame2Config.line.text}</span>
      </p>

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
            spin={atHand ? 0 : 180}
            scale={atHand ? handScale : 1}
            faceOpacity={atHand ? 0 : 1}
            flightOpacity={closing && !reduced ? 0 : 1}
            instant={open.pose === "from"}
            shown={reduced && open.pose === "open"}
            backWidth={openWidth}
            backHeight={faceHeight}
            faceWidth={openWidth}
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
  scale,
  faceOpacity,
  flightOpacity,
  instant,
  shown,
  backWidth,
  backHeight,
  faceWidth,
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
  scale: number;
  faceOpacity: number;
  flightOpacity: number;
  instant: boolean;
  shown: boolean;
  backWidth: number;
  backHeight: number;
  faceWidth: number;
  flightRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onTransition: (event: TransitionEvent<HTMLDivElement>) => void;
}) {
  const closing = flightOpacity === 0;
  const motion = frame2Config.open;
  return (
    <div
      ref={flightRef}
      className={["frame2-flight", instant ? "is-instant" : "", shown ? "is-shown" : ""].filter(Boolean).join(" ")}
      style={
        {
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--scale": String(scale),
          "--spin": `${spin}deg`,
          "--face-opacity": String(faceOpacity),
          "--flight-opacity": String(flightOpacity),
          "--move-time": `${closing ? motion.closeTime : motion.openTime}s`,
          "--move-ease": closing ? motion.closeEase : motion.openEase,
          "--spin-ease": closing ? motion.closeSpinEase : motion.openSpinEase,
          "--face-time": `${closing ? motion.closeFace : motion.openFace}s`,
          "--face-delay": `${closing ? 0 : motion.openFaceDelay}s`,
          "--fade-time": `${closing ? motion.closeFade : 0.01}s`,
          "--fade-delay": `${closing ? motion.closeFadeDelay : 0}s`,
        } as CSSProperties
      }
      onTransitionEnd={onTransition}
    >
      <div className="frame2-flip">
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
          style={{ width: `${faceWidth}px` }}
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
