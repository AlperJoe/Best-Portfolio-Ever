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

/** Gold dash centered on the card's painted top edge, in the card button's box. */
function seenMark(card: Frame2Card, image: HeroPlacement): CSSProperties {
  const xs = card.points.map((point) => point[0]);
  const ys = card.points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const [start, end] = card.topEdge;
  const ax = (start[0] - minX) * image.width;
  const ay = (start[1] - minY) * image.height;
  const bx = (end[0] - minX) * image.width;
  const by = (end[1] - minY) * image.height;
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return {
    left: `${(ax + bx) / 2}px`,
    top: `${(ay + by) / 2}px`,
    width: `${frame2Config.line.mark.length}px`,
    height: `${frame2Config.line.mark.thickness}px`,
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    transformOrigin: "center",
  };
}

type Point = { x: number; y: number };

type LineMode = "above" | "side";

type ArrowDraw = {
  d: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * One quadratic curve, so it has a single bend, then an open V head along its final direction.
 * Above the cards the bend is the small hand-drawn hook. From the left, the curve runs right
 * and then down onto the card.
 */
function arrowDraw(start: Point, tip: Point, mode: LineMode): ArrowDraw {
  const { bend, head } = frame2Config.line.arrow;
  const control =
    mode === "side" ? { x: tip.x, y: start.y } : { x: tip.x + bend, y: (start.y + tip.y) / 2 };
  const ex = tip.x - control.x;
  const ey = tip.y - control.y;
  const end = Math.hypot(ex, ey) || 1;
  const bx = -ex / end;
  const by = -ey / end;
  const turn = (head.angle * Math.PI) / 180;
  const arm = (sign: number) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn) * sign;
    return {
      x: tip.x + (bx * cos - by * sin) * head.length,
      y: tip.y + (bx * sin + by * cos) * head.length,
    };
  };
  const a = arm(1);
  const b = arm(-1);
  const f = (value: number) => value.toFixed(2);
  const d = [
    `M ${f(start.x)} ${f(start.y)}`,
    `Q ${f(control.x)} ${f(control.y)} ${f(tip.x)} ${f(tip.y)}`,
    `L ${f(a.x)} ${f(a.y)}`,
    `M ${f(tip.x)} ${f(tip.y)}`,
    `L ${f(b.x)} ${f(b.y)}`,
  ].join(" ");
  const points = [start, tip, control, a, b];
  const pad = head.length;
  const minX = Math.min(...points.map((point) => point.x)) - pad;
  const minY = Math.min(...points.map((point) => point.y)) - pad;
  const maxX = Math.max(...points.map((point) => point.x)) + pad;
  const maxY = Math.max(...points.map((point) => point.y)) + pad;
  return { d, left: minX, top: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

type Box = { left: number; top: number; right: number; bottom: number };

function boxesOverlap(a: Box, b: Box, pad = 0) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
}

function textBox(left: number, top: number, width: number, height: number): Box {
  return { left, top, right: left + width, bottom: top + height };
}

function hitsCards(left: number, top: number, width: number, height: number, cards: Box[]) {
  const box = textBox(left, top, width, height);
  return cards.some((card) => boxesOverlap(box, card, 1));
}

function sharesX(left: number, width: number, box: Box) {
  return left < box.right && left + width > box.left;
}

/**
 * Keeps today's place when the curve already has room. Otherwise lifts the line.
 * When the intro is in the way, parks the line left of the cards.
 */
function placeLine(input: {
  intro: Box;
  textWidth: number;
  textHeight: number;
  lineHeight: number;
  cards: Box[];
  cardMidY: number;
  faceLeft: number;
}): { left: number; top: number; mode: LineMode } {
  const { intro, textWidth, textHeight, lineHeight, cards, cardMidY, faceLeft } = input;
  const { min, startGap, cardGap } = frame2Config.line.arrow;
  const { blockGap, sideGap, cardGap: belowCards } = frame2Config.line;
  const margin = 8;
  const cardTop = Math.min(cards[0].top, cards[1].top);
  const pocketRight = faceLeft;
  const pocketLeft = cards[0].left;
  let left = pocketLeft + Math.max(0, pocketRight - pocketLeft - textWidth) / 2;
  if (left + textWidth > pocketRight) left = Math.max(margin, pocketRight - textWidth);

  const spanAt = (top: number) => cardMidY - cardGap - (top + textHeight) - startGap;
  let top = cardTop - belowCards - lineHeight;
  const belowIntro = intro.bottom + blockGap;
  if (top < belowIntro) top = belowIntro;

  const ceiling = sharesX(left, textWidth, intro) ? belowIntro : margin;
  const needsMove = spanAt(top) < min || hitsCards(left, top, textWidth, textHeight, cards);
  if (!needsMove) return { left, top, mode: "above" };

  let next = cardMidY - cardGap - textHeight - startGap - min;
  for (const card of cards) {
    if (sharesX(left, textWidth, card)) next = Math.min(next, card.top - 2 - textHeight);
  }
  if (next >= ceiling - 0.5 && !hitsCards(left, Math.max(next, ceiling), textWidth, textHeight, cards)) {
    return { left, top: Math.max(next, ceiling), mode: "above" };
  }
  if (
    spanAt(ceiling) >= min &&
    !hitsCards(left, ceiling, textWidth, textHeight, cards)
  ) {
    return { left, top: ceiling, mode: "above" };
  }

  const cardsLeft = Math.min(...cards.map((card) => card.left));
  const sideLeft = Math.max(margin, cardsLeft - sideGap - textWidth);
  const sideCeiling = sharesX(sideLeft, textWidth, intro) ? belowIntro : margin;
  let sideTop = cardMidY - cardGap - textHeight - startGap - min;
  for (const card of cards) {
    if (sharesX(sideLeft, textWidth, card)) sideTop = Math.min(sideTop, card.top - 2 - textHeight);
  }
  if (sideTop < sideCeiling) sideTop = sideCeiling;
  if (hitsCards(sideLeft, sideTop, textWidth, textHeight, cards)) {
    sideTop = Math.max(margin, Math.min(...cards.map((card) => card.top)) - sideGap - textHeight);
    if (boxesOverlap(textBox(sideLeft, sideTop, textWidth, textHeight), intro, 0)) {
      sideTop = belowIntro;
    }
  }
  return { left: sideLeft, top: Math.max(margin, sideTop), mode: "side" };
}

/** Top-edge midpoint of a card button, measured from its live box. */
function liveTopMid(card: Frame2Card, node: HTMLElement, frameRect: DOMRect): Point {
  const rect = node.getBoundingClientRect();
  const xs = card.points.map((point) => point[0]);
  const ys = card.points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.0001, maxX - minX);
  const height = Math.max(0.0001, maxY - minY);
  const local = card.points.map(([x, y]) => ({
    x: (x - minX) / width,
    y: (y - minY) / height,
  }));
  let edge = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < local.length; index += 1) {
    const y = (local[index].y + local[(index + 1) % local.length].y) / 2;
    if (y < best) {
      best = y;
      edge = index;
    }
  }
  const a = local[edge];
  const b = local[(edge + 1) % local.length];
  return {
    x: rect.left - frameRect.left + ((a.x + b.x) / 2) * rect.width,
    y: rect.top - frameRect.top + ((a.y + b.y) / 2) * rect.height,
  };
}

/** Midpoint of a card's top edge, in frame pixels. */
function cardTopMid(points: CardPoint[], image: HeroPlacement): Point {
  const local = points.map(([x, y]) => ({
    x: image.left + x * image.width,
    y: image.top + y * image.height,
  }));
  let edge = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < local.length; index += 1) {
    const y = (local[index].y + local[(index + 1) % local.length].y) / 2;
    if (y < best) {
      best = y;
      edge = index;
    }
  }
  const a = local[edge];
  const b = local[(edge + 1) % local.length];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

type OpenBox = {
  width: number;
  height: number;
  pictureHeight: number | null;
};

function sameBox(current: OpenBox | null, next: OpenBox) {
  return (
    !!current &&
    current.width === next.width &&
    current.height === next.height &&
    current.pictureHeight === next.pictureHeight
  );
}

/** Largest card that stays within the frame, with the picture shown at its own aspect ratio. */
function measureOpenCard(face: HTMLElement, frameW: number, frameH: number): OpenBox {
  const { height, sideInset, widthCap, minWidth, mediaAspect } = frame2Config.open;
  const maxH = Math.max(120, Math.floor(frameH * height) - 2);
  const maxW = Math.max(280, Math.min(Math.floor(frameW - sideInset * 2), widthCap));
  const floorW = Math.min(maxW, minWidth);
  const picture = face.querySelector<HTMLElement>(".frame2-picture");

  const read = (width: number, pictureHeight: number | null) => {
    face.style.width = `${width}px`;
    face.style.maxHeight = "none";
    if (!picture) return face.offsetHeight;
    if (pictureHeight == null) {
      picture.style.height = "";
      picture.style.width = "";
      picture.style.maxWidth = "";
      picture.style.alignSelf = "";
    } else {
      const style = getComputedStyle(face);
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const available = Math.max(80, face.clientWidth - padX);
      let nextH = pictureHeight;
      let nextW = pictureHeight * mediaAspect;
      if (nextW > available) {
        nextW = available;
        nextH = nextW / mediaAspect;
      }
      picture.style.height = `${nextH}px`;
      picture.style.width = `${nextW}px`;
      picture.style.maxWidth = "100%";
      picture.style.alignSelf = "center";
    }
    return face.offsetHeight;
  };

  let pictureHeight: number | null = null;
  let width = maxW;
  let measured = read(width, null);
  if (measured > maxH) {
    let lo = floorW;
    let hi = maxW;
    width = floorW;
    for (let step = 0; step < 14; step += 1) {
      const mid = Math.round((lo + hi) / 2);
      const next = read(mid, null);
      if (next <= maxH) {
        width = mid;
        measured = next;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    measured = read(width, null);
    if (measured > maxH && picture) {
      const overflow = measured - maxH;
      pictureHeight = Math.max(72, Math.round(picture.offsetHeight - overflow));
      measured = read(width, pictureHeight);
      let guard = 0;
      while (measured > maxH && width > floorW && guard < 8) {
        width = Math.max(floorW, width - 24);
        pictureHeight = null;
        measured = read(width, null);
        if (measured > maxH) {
          pictureHeight = Math.max(72, Math.round(picture.offsetHeight - (measured - maxH)));
          measured = read(width, pictureHeight);
        }
        guard += 1;
      }
    }
  }

  return { width, height: measured, pictureHeight };
}

function Headline({ text, gold }: { text: string; gold: string }) {
  const at = text.indexOf(gold);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="frame2-gold">{gold}</span>
      {text.slice(at + gold.length)}
    </>
  );
}

function InviteRule() {
  return (
    <svg className="frame2-invite-rule" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0.8 3.7 C 10 2.2, 16 4.6, 28 3.4 C 40 2.1, 48 4.7, 60 3.3 C 72 2, 82 4.5, 92 3.2 C 95.5 2.7, 98 3.6, 99.3 2.9"
        pathLength={1}
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="frame2-file-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.3 1.6h5.8l3.6 3.5v9.3H3.3z" />
      <path d="M9 1.8v3.4h3.5" />
    </svg>
  );
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
  const lineRef = useRef<HTMLDivElement>(null);
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
  const [openBox, setOpenBox] = useState<OpenBox | null>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState<Frame2CardId[]>([]);
  const lineOn = inView && !open;
  const [introFit, setIntroFit] = useState(1);
  const [lineBox, setLineBox] = useState<{
    left: number;
    top: number;
    width: number;
    textBottom: number;
    mode: LineMode;
    tipX: number;
    tipY: number;
  } | null>(null);
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
      const faceLeft = place.left + frame2Config.line.faceX * place.width - frame2Config.line.faceGap;
      const frameRect = frame.getBoundingClientRect();
      let fit = 1;

      for (let step = 0; step < 14; step += 1) {
        intro.style.setProperty("--intro-fit", String(fit));
        const rect = intro.getBoundingClientRect();
        const bottom = rect.bottom - frameRect.top;
        const right = rect.right - frameRect.left;
        // The body stays 17px. The invitation finds its own place beside or above the cards.
        const limit = Math.min(
          logoTop - frame2Config.intro.logoGap,
          cardTop - frame2Config.line.blockGap,
        );
        const clear = bottom <= limit + 0.5 && right <= hairLeft - frame2Config.intro.hairGap;
        if (clear) break;
        const next = Math.max(frame2Config.intro.minFit, Math.round((fit - 0.04) * 1000) / 1000);
        if (next === fit) break;
        fit = next;
      }

      const lineWidth = line.offsetWidth;
      const lineHeight = line.offsetHeight;
      const introRect = intro.getBoundingClientRect();
      const introBox = {
        left: introRect.left - frameRect.left,
        top: introRect.top - frameRect.top,
        right: introRect.right - frameRect.left,
        bottom: introRect.bottom - frameRect.top,
      };
      const cardBoxes = frame2Config.cards.items.map((card) => {
        const node = buttonRefs.current[card.id];
        if (!node) {
          const box = cardBounds(card.points, place);
          return { left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height };
        }
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left - frameRect.left,
          top: rect.top - frameRect.top,
          right: rect.right - frameRect.left,
          bottom: rect.bottom - frameRect.top,
        };
      });
      const middleCard = frame2Config.cards.items[1];
      const middleNode = buttonRefs.current[middleCard.id];
      const cardMid = middleNode
        ? liveTopMid(middleCard, middleNode, frameRect)
        : cardTopMid(middleCard.points, place);
      const lastText =
        line.querySelector<HTMLElement>(".frame2-line-help") ??
        line.querySelector<HTMLElement>(".frame2-line-text");
      const textBottom = lastText ? lastText.offsetTop + lastText.offsetHeight : 0;
      const placed = placeLine({
        intro: introBox,
        textWidth: lineWidth,
        textHeight: textBottom,
        lineHeight,
        cards: cardBoxes,
        cardMidY: cardMid.y,
        faceLeft,
      });

      setIntroFit((current) => (Math.abs(current - fit) < 0.001 ? current : fit));
      setLineBox((current) =>
        current &&
        current.mode === placed.mode &&
        Math.abs(current.left - placed.left) < 0.5 &&
        Math.abs(current.top - placed.top) < 0.5 &&
        Math.abs(current.width - lineWidth) < 0.5 &&
        Math.abs(current.textBottom - textBottom) < 0.5 &&
        Math.abs(current.tipX - cardMid.x) < 0.5 &&
        Math.abs(current.tipY - cardMid.y) < 0.5
          ? current
          : {
              left: placed.left,
              top: placed.top,
              width: lineWidth,
              textBottom,
              mode: placed.mode,
              tipX: cardMid.x,
              tipY: cardMid.y,
            },
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
  }, [place, seen.length]);

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
        setInView(Boolean(entry?.isIntersecting));
      },
      { threshold: frame2Config.line.viewShare },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

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
    const face = dialogRef.current;
    const frame = frameRef.current;
    if (!open || !face || !frame) {
      setOpenBox((current) => (current == null ? current : null));
      return;
    }
    let cancelled = false;
    const apply = () => {
      const node = dialogRef.current;
      const box = frameRef.current;
      if (cancelled || !node || !box) return;
      const next = measureOpenCard(node, box.clientWidth, box.clientHeight);
      setOpenBox((current) => (sameBox(current, next) ? current : next));
    };
    apply();
    document.fonts?.ready.then(() => {
      if (!cancelled) apply();
    });
    return () => {
      cancelled = true;
    };
  }, [open?.id, place]);

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
  const openWidth = openBox?.width ?? Math.min(frameWidth - frame2Config.open.sideInset * 2, frame2Config.open.widthCap);
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
  const faceHeight = openBox?.height || openMaxHeight;
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
    "--open-veil": motion.veil,
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
    "--open-gap": `${motion.gap}px`,
    "--perspective": `${motion.perspective}px`,
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
    "--lead-size": `${lead.size}px`,
    "--lead-weight": String(lead.weight),
    "--lead-strong": String(lead.emphasis),
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
    "--line-fade": `${frame2Config.line.fade}s`,
    "--line-help-size": `${frame2Config.line.helperSize}px`,
    "--line-help-weight": String(frame2Config.line.helperWeight),
    "--line-help-color": frame2Config.line.helperColor,
    "--line-help-gap": `${frame2Config.line.helperGap}px`,
    "--invite-draw": `${frame2Config.line.inviteDraw}s`,
    "--arrow-room": `${frame2Config.line.arrow.room}px`,
    "--arrow-stroke": `${frame2Config.line.arrow.stroke}px`,
  } as CSSProperties;

  const dimmed = !!open && (open.pose === "open" || (reduced && open.pose === "shut"));
  const lineCopy =
    seen.length === 0
      ? frame2Config.line.before
      : seen.length < frame2Config.cards.items.length
        ? frame2Config.line.again
        : frame2Config.line.done;
  const showHelper = seen.length === 0;
  const arrow = (() => {
    if (!lineBox || lineBox.width <= 0 || lineBox.textBottom <= 0) return null;
    const { startGap, cardGap } = frame2Config.line.arrow;
    const edgeY = lineBox.tipY - lineBox.top;
    if (lineBox.mode === "above") {
      return arrowDraw(
        { x: lineBox.width / 2, y: lineBox.textBottom + startGap },
        { x: lineBox.tipX - lineBox.left, y: edgeY - cardGap },
        "above",
      );
    }
    // Leave from under the words when that still sits above the card.
    // On a short frame the words sit beside the cards, so the curve leaves
    // from their top-right and still turns down onto the middle card.
    const under = lineBox.textBottom + startGap;
    const landed = edgeY - cardGap;
    const aboveCard = under + 12 <= landed;
    const start = aboveCard
      ? { x: lineBox.width, y: under }
      : { x: lineBox.width + startGap, y: Math.min(startGap, edgeY - 10) };
    const tipY = aboveCard ? landed : Math.min(edgeY - 2, start.y + 12);
    return arrowDraw(
      start,
      { x: lineBox.tipX - lineBox.left, y: tipY > start.y ? tipY : edgeY - 2 },
      "side",
    );
  })();
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
              setSeen((current) => (current.includes(card.id) ? current : [...current, card.id]));
              setOpen({ id: card.id, pose: "from" });
            }}
          >
            {seen.includes(card.id) ? <span className="frame2-seen" style={seenMark(card, place)} /> : null}
          </button>
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
          <h2 className="frame2-headline">
            <Headline text={headline.text} gold={headline.gold} />
          </h2>
          <p className="frame2-lead">
            {lead.parts.map((part) =>
              part.emphasis ? <strong key={part.text}>{part.text}</strong> : <span key={part.text}>{part.text}</span>,
            )}
          </p>
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
      <div className="frame2-veil" aria-hidden="true" />

      <div
        ref={lineRef}
        className={lineOn ? "frame2-line" : "frame2-line is-hidden"}
        aria-hidden={lineOn ? undefined : true}
        style={lineBox ? { left: `${lineBox.left}px`, top: `${lineBox.top}px` } : { visibility: "hidden" }}
      >
        <p className="frame2-line-text" tabIndex={lineOn ? 0 : -1}>
          {lineCopy}
          <InviteRule />
        </p>
        {showHelper ? <p className="frame2-line-help">{frame2Config.line.helper}</p> : null}
        <div className="frame2-arrow-space" />
        {lineBox && arrow ? (
          <svg
            className="frame2-arrow"
            width={arrow.width}
            height={arrow.height}
            viewBox={`${arrow.left} ${arrow.top} ${arrow.width} ${arrow.height}`}
            style={{ left: arrow.left, top: arrow.top }}
            aria-hidden="true"
          >
            <path d={arrow.d} pathLength={1} />
          </svg>
        ) : null}
      </div>

      {open && active ? (
        <div
          className="frame2-open"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
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
            pictureHeight={openBox?.pictureHeight ?? null}
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
  pictureHeight,
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
  pictureHeight: number | null;
  flightRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onTransition: (event: TransitionEvent<HTMLDivElement>) => void;
}) {
  const closing = flightOpacity === 0;
  const motion = frame2Config.open;
  const pictureStyle: CSSProperties | undefined =
    pictureHeight == null
      ? undefined
      : {
          height: `${pictureHeight}px`,
          width: `${pictureHeight * motion.mediaAspect}px`,
          maxWidth: "100%",
          alignSelf: "center",
        };
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
              style={pictureStyle}
              src={frame2Config.assets.gameplay}
              poster={frame2Config.assets.poster}
              preload="none"
              playsInline
              controls
            />
          ) : card.image ? (
            <img className="frame2-picture" style={pictureStyle} src={card.image.src} alt={card.image.alt} />
          ) : null}
          <p>{card.body}</p>
          {card.links.length > 0 ? (
            <div className="frame2-card-links">
              {card.links.map((link) => (
                <a key={link.href} className="frame2-file" href={link.href} target="_blank" rel="noopener noreferrer">
                  <FileIcon />
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
