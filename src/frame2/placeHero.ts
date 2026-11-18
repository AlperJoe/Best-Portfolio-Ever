import type { ImageBox } from "./config";

export type HeroPlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

export type PlaceHeroOptions = {
  imageW: number;
  imageH: number;
  positionX: number;
  positionY: number;
  titleInset: number;
  title: ImageBox;
  face: ImageBox;
};

function pick(
  preferred: number,
  regionMin: number,
  regionMax: number,
  coverMin: number,
  coverMax: number,
) {
  if (regionMin <= regionMax) {
    const min = Math.max(coverMin, regionMin);
    const max = Math.min(coverMax, regionMax);
    if (min <= max) return Math.min(max, Math.max(min, preferred));
  }
  return Math.min(coverMax, Math.max(coverMin, preferred));
}

/**
 * Cover scale, so the painting always fills the frame. The title and the face
 * stay on screen when that still covers. Position stays as close as possible
 * to object-position.
 */
export function placeHero(
  frameW: number,
  frameH: number,
  clearBottom: number,
  options: PlaceHeroOptions,
): HeroPlacement {
  const { imageW, imageH, positionX, positionY, titleInset, title, face } = options;
  if (frameW <= 0 || frameH <= 0 || imageW <= 0 || imageH <= 0) {
    return { left: 0, top: 0, width: 0, height: 0, scale: 0 };
  }

  const safeBottom = Math.max(0, frameH - clearBottom);
  const scale = Math.max(frameW / imageW, frameH / imageH);
  const renderedW = imageW * scale;
  const renderedH = imageH * scale;
  const preferredLeft = (frameW - renderedW) * positionX;
  const preferredTop = (frameH - renderedH) * positionY;

  const coverMinLeft = Math.min(0, frameW - renderedW);
  const coverMaxLeft = 0;
  const coverMinTop = Math.min(0, frameH - renderedH);
  const coverMaxTop = 0;

  const regionMinLeft = Math.max(titleInset - title.x * renderedW, -face.x * renderedW);
  const regionMaxLeft = Math.min(
    frameW - (title.x + title.w) * renderedW,
    frameW - (face.x + face.w) * renderedW,
  );
  const regionMinTop = Math.max(-title.y * renderedH, -face.y * renderedH);
  const regionMaxTop = Math.min(
    safeBottom - (title.y + title.h) * renderedH,
    safeBottom - (face.y + face.h) * renderedH,
  );

  const left = pick(preferredLeft, regionMinLeft, regionMaxLeft, coverMinLeft, coverMaxLeft);
  const top = pick(preferredTop, regionMinTop, regionMaxTop, coverMinTop, coverMaxTop);

  return {
    left,
    top,
    width: renderedW,
    height: renderedH,
    scale,
  };
}
