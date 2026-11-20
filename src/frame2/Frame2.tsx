import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject, type TransitionEvent } from "react";
import { FrameEffects } from "../frame1/effectsCanvas";
import { useScrollLock } from "../transitions/scrollLock";
import { attachWhyNote } from "../whyNote/whyNote";
import { frame2Config, type CardPoint, type Frame2Card, type Frame2CardId } from "./config";
import { createEmbers, drawEmbers, stepEmbers, type Ember } from "./embers";
import { placeHero, placeHeroPhone, type HeroPlacement } from "./placeHero";
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

function usePhone() {
  const query = `(max-width: ${frame2Config.phone.maxWidth - 0.02}px)`;
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPhone(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return phone;
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

type OpenLayout = {
  mode: "wide" | "narrow";
  picW: number;
  picH: number;
  panelW: number;
  panelH: number;
  gap: number;
  layoutW: number;
  layoutH: number;
  originX: number;
  originY: number;
  restDx: number;
  restDy: number;
  frameOuter: number;
  frameGold: number;
  radius: number;
  gem: number;
  gemAt: number;
};

/** Bronze band, gold frame, corners and marks, sized from the card's shorter side. */
function cardFrame(side: number) {
  const frameOuter = Math.max(4, Math.round(side * 0.015));
  const frameGold = Math.max(6, Math.round(side * 0.02));
  const radius = Math.max(12, Math.round(side * 0.038));
  const gem = Math.max(7, Math.round(side * 0.016));
  return {
    frameOuter,
    frameGold,
    radius,
    gem,
    gemAt: frameOuter + frameGold / 2,
  };
}

/**
 * The picture card around a picture in its own aspect ratio, from the card's
 * outer width. The bands depend on the card's height, so it settles in a few steps.
 */
function pictureCard(picW: number) {
  const aspect = frame2Config.open.mediaAspect;
  let frame = cardFrame(Math.min(picW, picW / aspect));
  let picH = picW / aspect;
  for (let step = 0; step < 3; step += 1) {
    const band = 2 * (frame.frameOuter + frame.frameGold);
    picH = Math.round((picW - band) / aspect + band);
    frame = cardFrame(Math.min(picW, picH));
  }
  return { picW: Math.round(picW), picH, frame };
}

/** Widest picture card that is at most `picH` tall. */
function pictureCardForHeight(picH: number) {
  const aspect = frame2Config.open.mediaAspect;
  const band = 2 * (cardFrame(picH).frameOuter + cardFrame(picH).frameGold);
  let card = pictureCard(Math.floor((picH - band) * aspect + band));
  while (card.picH > picH && card.picW > 40) card = pictureCard(card.picW - 2);
  return card;
}

/**
 * The picture card takes the shape of its picture, with the text beside it
 * when the frame is wide and under it when the frame is narrow. The text
 * panel is only as tall as its text. The whole group stays inside the frame.
 */
function layoutOpenCard(frameW: number, frameH: number, textNeed: number): OpenLayout {
  const open = frame2Config.open;
  const need = Math.max(160, textNeed || open.textEstimate);

  const pack = (
    mode: "wide" | "narrow",
    card: ReturnType<typeof pictureCard>,
    panelW: number,
    panelH: number,
    gap: number,
  ): OpenLayout => {
    const { picW, picH } = card;
    const layoutW = mode === "wide" ? picW + gap + panelW : Math.max(picW, panelW);
    const layoutH = mode === "wide" ? Math.max(picH, Math.min(need, panelH)) : picH + gap + Math.min(need, panelH);
    const originX = mode === "wide" ? picW / 2 : (layoutW - picW) / 2 + picW / 2;
    const originY = mode === "wide" ? layoutH / 2 : picH / 2;
    return {
      mode,
      picW,
      picH,
      panelW,
      panelH,
      gap,
      layoutW,
      layoutH,
      originX,
      originY,
      restDx: originX - layoutW / 2,
      restDy: originY - layoutH / 2,
      ...card.frame,
    };
  };

  const margin = open.wideMargin;
  const gap = open.wideGap;
  const availW = frameW - margin * 2;
  const availH = frameH - margin * 2;
  let picW = Math.min(open.pictureMaxWidth, availW - gap - open.panelMax);
  if (picW < open.pictureMinWidth) picW = availW - gap - open.panelMin;
  let card = pictureCard(Math.max(160, picW));
  if (card.picH > availH) card = pictureCardForHeight(availH);
  const panelW = Math.min(open.panelMax, availW - gap - card.picW);
  const wideFits =
    frameW >= open.wideAt &&
    card.picW >= open.pictureMinWidth &&
    panelW >= open.panelMin &&
    card.picW + gap + panelW <= availW + 1;
  if (wideFits) return pack("wide", card, panelW, availH, gap);

  const narrowMargin = open.narrowMargin;
  const narrowGap = open.narrowGap;
  const boxW = Math.max(160, frameW - narrowMargin * 2);
  const boxH = Math.max(200, frameH - narrowMargin * 2);
  const minPic = 150;
  let narrow = pictureCard(Math.min(boxW, open.pictureMaxWidth));
  const room = boxH - narrowGap - need;
  if (narrow.picH > room) narrow = pictureCardForHeight(Math.max(minPic, room));
  return pack("narrow", narrow, boxW, Math.max(120, boxH - narrowGap - narrow.picH), narrowGap);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Gold on the given phrases. Every other word stays as it was written. */
function MarkedCopy({ body, marks }: { body: string; marks: readonly string[] }) {
  if (marks.length === 0) return <p>{body}</p>;
  const source = [...marks].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(source.map(escapeRegExp).join("|"), "g");
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > cursor) parts.push(body.slice(cursor, at));
    parts.push(
      <span key={at} className="frame2-gold">
        {match[0]}
      </span>,
    );
    cursor = at + match[0].length;
  }
  if (cursor < body.length) parts.push(body.slice(cursor));
  return <p>{parts}</p>;
}

function GoldPhrase({ text, gold }: { text: string; gold: string }) {
  const at = text.indexOf(gold);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="frame2-gold">{gold}</span>
      {text.slice(at + gold.length)}
    </>
  );
}

/** One line per entry. The last word of the last line keeps the trailing marker beside it. */
function Headline({ lines, gold, trailing }: { lines: readonly string[]; gold: string; trailing?: ReactNode }) {
  return (
    <>
      {lines.map((line, index) => {
        const last = index === lines.length - 1;
        const cut = last ? line.lastIndexOf(" ") + 1 : line.length;
        return (
          <span key={line} className="frame2-headline-line">
            <GoldPhrase text={line.slice(0, cut)} gold={gold} />
            {last ? (
              <span className="frame2-love-keep">
                {line.slice(cut)} {trailing}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}

/** The info marker after the headline. Its look comes from whyNote. */
function LoveInfo({ buttonRef }: { buttonRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <button ref={buttonRef} type="button" className="frame2-info">
      {frame2Config.intro.love.label}
    </button>
  );
}

function LeadCopy() {
  return (
    <div className="frame2-lead">
      {frame2Config.intro.lead.paragraphs.map((paragraph) => (
        <p key={paragraph.map((part) => part.text).join("")}>
          {paragraph.map((part, index) => {
            const key = `${index}-${part.text}`;
            if (part.gold) {
              return (
                <span key={key} className="frame2-gold">
                  {part.text}
                </span>
              );
            }
            if (part.bold) {
              return (
                <strong key={key} className="is-bold">
                  {part.text}
                </strong>
              );
            }
            if (part.emphasis) return <strong key={key}>{part.text}</strong>;
            return <span key={key}>{part.text}</span>;
          })}
        </p>
      ))}
    </div>
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
  const phone = usePhone();
  const frameRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);
  const emberRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loveRef = useRef<HTMLButtonElement>(null);
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
  /** Phones: the painting's stage under the intro, in frame pixels. */
  const [stage, setStage] = useState<{ top: number; height: number } | null>(null);
  const [open, setOpen] = useState<OpenCard | null>(null);
  const [copyNeed, setCopyNeed] = useState(0);
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
    const intro = introRef.current;
    if (!frame) return;

    const apply = () => {
      if (!phone || !intro) {
        frame.style.height = "";
        setStage(null);
        setPlace(
          placeHero(frame.clientWidth, frame.clientHeight, frame2Config.image.bottomClear, heroOptions),
        );
        return;
      }
      // The intro sits in one column on top, and the painting fills the rest of the screen under it.
      const settings = frame2Config.phone;
      const width = frame.clientWidth;
      const top = Math.round(intro.offsetTop + intro.offsetHeight + settings.stageGap);
      const { crop } = settings;
      const cropH = (width / (crop.w * frame2Config.image.width)) * crop.h * frame2Config.image.height;
      const height = Math.round(Math.max(window.innerHeight - top, cropH));
      frame.style.height = `${top + height}px`;
      setStage((current) => (current && current.top === top && current.height === height ? current : { top, height }));
      setPlace(
        placeHeroPhone(width, top, height, frame2Config.image.width, frame2Config.image.height, crop),
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    if (intro) observer.observe(intro);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      frame.style.height = "";
    };
  }, [phone]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const intro = introRef.current;
    const line = lineRef.current;
    if (!frame || !intro || !line) return;

    /**
     * Phones: the line sits at the top of the stage, left of Pedro's hair, and
     * its curve drops onto the middle card.
     */
    const placePhoneLine = () => {
      const settings = frame2Config.phone;
      const frameRect = frame.getBoundingClientRect();
      const middleCard = frame2Config.cards.items[1];
      const middleNode = buttonRefs.current[middleCard.id];
      const cardMid = middleNode ? liveTopMid(middleCard, middleNode, frameRect) : cardTopMid(middleCard.points, place);
      const lastText = line.querySelector<HTMLElement>(".frame2-line-text");
      const textBottom = lastText ? lastText.offsetTop + lastText.offsetHeight : 0;
      const lineWidth = line.offsetWidth;
      const { min, startGap, cardGap } = frame2Config.line.arrow;
      const top = Math.min((stage?.top ?? 0) + settings.lineTop, cardMid.y - cardGap - min - startGap - textBottom);
      const left = settings.lineLeft;
      setIntroFit(1);
      setLineBox((current) =>
        current &&
        current.mode === "above" &&
        Math.abs(current.left - left) < 0.5 &&
        Math.abs(current.top - top) < 0.5 &&
        Math.abs(current.width - lineWidth) < 0.5 &&
        Math.abs(current.textBottom - textBottom) < 0.5 &&
        Math.abs(current.tipX - cardMid.x) < 0.5 &&
        Math.abs(current.tipY - cardMid.y) < 0.5
          ? current
          : { left, top, width: lineWidth, textBottom, mode: "above", tipX: cardMid.x, tipY: cardMid.y },
      );
    };

    const fitBlock = () => {
      if (phone) {
        intro.style.setProperty("--intro-fit", "1");
        placePhoneLine();
        return;
      }
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
      const lastText = line.querySelector<HTMLElement>(".frame2-line-text");
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
  }, [place, seen.length, phone, stage]);

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
    const button = loveRef.current;
    const host = frameRef.current;
    if (!button || !host) return;
    const { note, label } = frame2Config.intro.love;
    const attached = attachWhyNote(button, host, { note, label });
    return () => attached.destroy();
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

  useScrollLock(Boolean(open));

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
    const sheet = dialogRef.current;
    if (!open || !sheet) {
      setCopyNeed((current) => (current === 0 ? current : 0));
      return;
    }
    let cancelled = false;
    const measure = () => {
      const node = dialogRef.current;
      if (cancelled || !node) return;
      const title = node.querySelector<HTMLElement>("#frame2-card-title");
      const copy = node.querySelector<HTMLElement>(".frame2-copy");
      const para = node.querySelector<HTMLElement>(".frame2-copy-main p");
      const chips = node.querySelector<HTMLElement>(".frame2-card-links");
      if (!title || !copy || !para) return;
      const style = getComputedStyle(copy);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const need = Math.ceil(title.offsetHeight + para.scrollHeight + (chips?.offsetHeight ?? 0) + pad + 32);
      setCopyNeed((current) => (Math.abs(current - need) < 2 ? current : need));
    };
    measure();
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
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
  const layout = layoutOpenCard(frameWidth, frameHeight, copyNeed);
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
  const atHand = !!open && !reduced && (open.pose === "from" || open.pose === "shut");
  const handScale = Math.min(1, (buttonRect?.height || frameHeight * 0.18) / Math.max(1, layout.picH));
  const closing = open?.pose === "shut";
  const motion = frame2Config.open;
  const playFile = frame2Config.intro.stores.playFile;
  const storeHeight = phone ? frame2Config.phone.storeHeight : frame2Config.intro.stores.height;
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
    "--open-panel": motion.panel,
    "--open-bronze": motion.bronze,
    "--open-well-top": motion.wellTop,
    "--open-well-bottom": motion.wellBottom,
    "--open-title-size": `${motion.titleSize}px`,
    "--open-title-weight": String(motion.titleWeight),
    "--open-title-stretch": `${motion.titleStretch}%`,
    "--open-body-size": `${motion.bodySize}px`,
    "--open-body-weight": String(motion.bodyWeight),
    "--open-body-stretch": `${motion.bodyStretch}%`,
    "--open-body-line": String(motion.bodyLine),
    "--open-body-opacity": String(motion.bodyOpacity),
    "--close-size": `${motion.close}px`,
    "--media-aspect": String(motion.mediaAspect),
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
    "--lead-bold": String(lead.bold),
    "--lead-line": String(lead.line),
    "--lead-opacity": String(lead.opacity),
    "--lead-gap": `${lead.gap}px`,
    "--lead-paragraph-gap": `${lead.paragraphGap}px`,
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
    "--invite-draw": `${frame2Config.line.inviteDraw}s`,
    "--arrow-room": `${frame2Config.line.arrow.room}px`,
    "--arrow-stroke": `${frame2Config.line.arrow.stroke}px`,
    "--phone-margin": `${frame2Config.phone.margin}px`,
    "--phone-top": `${frame2Config.phone.top}px`,
    "--phone-headline": `${frame2Config.phone.headlineSize}px`,
    "--phone-lead": `${frame2Config.phone.leadSize}px`,
    "--sheet-bg": frame2Config.phone.sheet.background,
    "--sheet-title": `${frame2Config.phone.sheet.titleSize}px`,
    "--sheet-body": `${frame2Config.phone.sheet.bodySize}px`,
    "--sheet-pad": `${frame2Config.phone.sheet.pad}px`,
  } as CSSProperties;

  // On a phone the sheet covers the whole screen, so the scene behind it is left as it is.
  const dimmed = !phone && !!open && (open.pose === "open" || (reduced && open.pose === "shut"));
  const heroFade = stage
    ? `linear-gradient(to bottom, transparent ${(stage.top - place.top).toFixed(1)}px, #000 ${(stage.top - place.top + frame2Config.phone.fade).toFixed(1)}px)`
    : undefined;
  const lineCopy =
    seen.length === 0
      ? frame2Config.line.before
      : seen.length < frame2Config.cards.items.length
        ? frame2Config.line.again
        : frame2Config.line.done;
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
    phone ? "is-phone" : "",
    dimmed ? "is-dim" : "",
    open?.pose === "shut" && !reduced ? "is-closing" : "",
    reduced ? "is-reduced" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section ref={frameRef} className={sectionClass} style={style}>
      <div className="frame2-scene">
        <div className="frame2-fill-move depth-back">
          <img className="frame2-fill" src={frame2Config.assets.hero} alt="" aria-hidden="true" />
        </div>
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
            maskImage: heroFade,
            WebkitMaskImage: heroFade,
          }}
        />
        {phone ? null : <TitleDepth place={place} />}
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
            <Headline lines={headline.lines} gold={headline.gold} trailing={<LoveInfo buttonRef={loveRef} />} />
          </h2>
          <LeadCopy />
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

      {open && active && phone ? (
        <div className={open.pose === "open" ? "frame2-open is-sheet is-shown" : "frame2-open is-sheet"}>
          <PhoneSheet card={active} dialogRef={dialogRef} closeRef={closeRef} videoRef={videoRef} onClose={requestClose} />
        </div>
      ) : open && active ? (
        <div
          className="frame2-open"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <OpenCardView
            card={active}
            dx={atHand ? handOffset.dx : layout.restDx}
            dy={atHand ? handOffset.dy : layout.restDy}
            spin={atHand ? 0 : 180}
            scale={atHand ? handScale : 1}
            faceOpacity={atHand ? 0 : 1}
            flightOpacity={closing && !reduced ? 0 : 1}
            instant={open.pose === "from"}
            shown={reduced && open.pose === "open"}
            layout={layout}
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

/**
 * The painted "Pedro!" title, cut from the same picture and laid exactly over
 * it, so it can trail the page a little while the page moves. The cut reaches
 * past the title by the most it moves, so the title under it never shows.
 */
function TitleDepth({ place }: { place: HeroPlacement }) {
  const { title } = frame2Config.regions;
  const { shift, feather } = frame2Config.titleDepth;
  const reach = shift * window.innerHeight + feather;
  const left = Math.max(0, Math.floor(title.x * place.width - feather));
  const top = Math.max(0, Math.floor(title.y * place.height - reach));
  const right = Math.min(place.width, Math.ceil((title.x + title.w) * place.width + feather));
  const bottom = Math.min(place.height, Math.ceil((title.y + title.h) * place.height + reach));
  const fade = `${feather}px`;
  const mask = [
    `linear-gradient(to right, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
    `linear-gradient(to bottom, transparent, #000 ${fade}, #000 calc(100% - ${fade}), transparent)`,
  ].join(", ");
  return (
    <div
      className="frame2-title-depth depth-title"
      aria-hidden="true"
      style={
        {
          left: `${place.left + left}px`,
          top: `${place.top + top}px`,
          width: `${right - left}px`,
          height: `${bottom - top}px`,
          maskImage: mask,
          WebkitMaskImage: mask,
          "--depth": `${shift * 100}svh`,
        } as CSSProperties
      }
    >
      <img
        src={frame2Config.assets.hero}
        alt=""
        draggable={false}
        style={{ left: `${-left}px`, top: `${-top}px`, width: `${place.width}px`, height: `${place.height}px` }}
      />
    </div>
  );
}

function CardMedia({
  card,
  videoRef,
}: {
  card: Frame2Card;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (card.video) {
    return (
      <video
        ref={videoRef}
        className="frame2-picture"
        src={frame2Config.assets.gameplay}
        poster={frame2Config.assets.poster}
        preload="none"
        playsInline
        controls
      />
    );
  }
  if (card.image) return <img className="frame2-picture" src={card.image.src} alt={card.image.alt} />;
  return null;
}

function CardLinks({ card }: { card: Frame2Card }) {
  if (card.links.length === 0) return null;
  return (
    <div className="frame2-card-links">
      {card.links.map((link) => (
        <a key={link.href} className="frame2-file" href={link.href} target="_blank" rel="noopener noreferrer">
          <FileIcon />
          {link.label}
        </a>
      ))}
    </div>
  );
}

/** Phones: an open card fills the screen. The picture or video on top, the text under it, and the close button at the top right. */
function PhoneSheet({
  card,
  dialogRef,
  closeRef,
  videoRef,
  onClose,
}: {
  card: Frame2Card;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
}) {
  return (
    <div ref={dialogRef} className="frame2-phone-sheet" role="dialog" aria-modal="true" aria-labelledby="frame2-card-title">
      <button ref={closeRef} type="button" className="frame2-close frame2-phone-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="frame2-phone-scroll">
        <div className="frame2-phone-media">
          <CardMedia card={card} videoRef={videoRef} />
        </div>
        <div className="frame2-phone-copy">
          <h2 id="frame2-card-title">{card.title}</h2>
          <MarkedCopy body={card.body} marks={card.marks} />
          <CardLinks card={card} />
        </div>
      </div>
    </div>
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
  layout,
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
  layout: OpenLayout;
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
          "--layout-w": `${layout.layoutW}px`,
          "--layout-h": `${layout.layoutH}px`,
          "--origin-x": `${layout.originX}px`,
          "--origin-y": `${layout.originY}px`,
          "--pic-w": `${layout.picW}px`,
          "--pic-h": `${layout.picH}px`,
          "--panel-w": `${layout.panelW}px`,
          "--panel-h": `${layout.panelH}px`,
          "--sheet-gap": `${layout.gap}px`,
          "--frame-outer": `${layout.frameOuter}px`,
          "--frame-gold": `${layout.frameGold}px`,
          "--card-radius": `${layout.radius}px`,
          "--gem": `${layout.gem}px`,
          "--gem-at": `${layout.gemAt}px`,
        } as CSSProperties
      }
      onTransitionEnd={onTransition}
    >
      <div
        ref={dialogRef}
        className={layout.mode === "narrow" ? "frame2-sheet is-narrow" : "frame2-sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame2-card-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="frame2-flip">
          <img
            className="frame2-back"
            src={frame2Config.assets.cardBack}
            alt=""
            width={frame2Config.cardBack.width}
            height={frame2Config.cardBack.height}
            draggable={false}
          />
          <div className="frame2-picture-card">
            <div className="frame2-picture-gold">
              <div className="frame2-picture-well">
                <CardMedia card={card} videoRef={videoRef} />
              </div>
            </div>
            <span className="frame2-gem frame2-gem-tl" />
            <span className="frame2-gem frame2-gem-tr" />
            <span className="frame2-gem frame2-gem-bl" />
            <span className="frame2-gem frame2-gem-br" />
          </div>
        </div>
        <div className="frame2-copy">
          <button ref={closeRef} type="button" className="frame2-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <h2 id="frame2-card-title">{card.title}</h2>
          <div className="frame2-copy-main">
            <MarkedCopy body={card.body} marks={card.marks} />
          </div>
          <CardLinks card={card} />
        </div>
      </div>
    </div>
  );
}
