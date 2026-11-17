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

/**
 * Largest scale at or below cover. The painted title stays inset from the
 * left, and both the title and the face stay above clearBottom.
 * Position stays as close as possible to object-position.
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
  const cover = Math.max(frameW / imageW, frameH / imageH);

  const fits = (scale: number, left: number, top: number) => {
    const titleLeft = left + title.x * imageW * scale;
    const titleRight = left + (title.x + title.w) * imageW * scale;
    const titleTop = top + title.y * imageH * scale;
    const titleBottom = top + (title.y + title.h) * imageH * scale;
    const faceLeft = left + face.x * imageW * scale;
    const faceRight = left + (face.x + face.w) * imageW * scale;
    const faceTop = top + face.y * imageH * scale;
    const faceBottom = top + (face.y + face.h) * imageH * scale;
    return (
      titleLeft >= titleInset &&
      titleRight <= frameW &&
      titleTop >= -0.5 &&
      titleBottom <= safeBottom + 0.5 &&
      faceLeft >= -0.5 &&
      faceRight <= frameW &&
      faceTop >= -0.5 &&
      faceBottom <= safeBottom + 0.5
    );
  };

  const placeAt = (scale: number) => {
    const renderedW = imageW * scale;
    const renderedH = imageH * scale;
    const preferredLeft = (frameW - renderedW) * positionX;
    const preferredTop = (frameH - renderedH) * positionY;
    const minLeft = Math.max(
      titleInset - title.x * renderedW,
      -face.x * renderedW,
      -title.x * renderedW,
    );
    const maxLeft = Math.min(
      frameW - (title.x + title.w) * renderedW,
      frameW - (face.x + face.w) * renderedW,
    );
    const minTop = Math.max(-title.y * renderedH, -face.y * renderedH);
    const maxTop = Math.min(
      safeBottom - (title.y + title.h) * renderedH,
      safeBottom - (face.y + face.h) * renderedH,
    );
    if (minLeft > maxLeft || minTop > maxTop + 0.5) return null;
    const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));
    let top = Math.min(maxTop, Math.max(minTop, preferredTop));
    // A centered short image leaves a dark band above the art. Pull it up
    // to the top of the frame when the title and face still fit.
    if (top > 0 && minTop <= 0) top = 0;
    if (!fits(scale, left, top)) return null;
    return { left, top };
  };

  let scale = cover;
  let placed = placeAt(scale);
  if (!placed) {
    let low = 0.15;
    let high = cover;
    for (let step = 0; step < 22; step += 1) {
      const mid = (low + high) / 2;
      if (placeAt(mid)) low = mid;
      else high = mid;
    }
    scale = low;
    placed = placeAt(scale);
  }

  const left = placed?.left ?? 0;
  const top = placed?.top ?? 0;
  return {
    left,
    top,
    width: imageW * scale,
    height: imageH * scale,
    scale,
  };
}
