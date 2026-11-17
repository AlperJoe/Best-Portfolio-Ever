export type SeamGeometry = {
  band: number;
  leftAngle: number;
  rightAngle: number;
  leftOffset: number;
  rightOffset: number;
  leftSolid: number;
  leftFade0: number;
  rightSolid: number;
  rightFade0: number;
};

function gradientHalfLength(width: number, height: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return (
    0.5 *
    (Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians)))
  );
}

/**
 * Mask stops for the two seam lines.
 * Each line runs from a bottom corner to the middle of the top edge.
 * The blend band is centered on that line and perpendicular to it.
 */
export function computeSeams(
  width: number,
  height: number,
  blendWidth: number,
): SeamGeometry {
  const band = blendWidth * width;
  const length = Math.hypot(height, width / 2);

  const leftDx = height / length;
  const leftDy = (width / 2) / length;
  const leftAngle = (Math.atan2(leftDx, -leftDy) * 180) / Math.PI;

  const rightDx = height / length;
  const rightDy = -(width / 2) / length;
  const rightAngle = (Math.atan2(rightDx, -rightDy) * 180) / Math.PI;

  const offset = (
    angle: number,
    dx: number,
    dy: number,
    sx: number,
    sy: number,
  ) =>
    (sx - width / 2) * dx +
    (sy - height / 2) * dy +
    gradientHalfLength(width, height, angle);

  const leftOffset = offset(leftAngle, leftDx, leftDy, 0, height);
  const rightOffset = offset(rightAngle, rightDx, rightDy, width, height);
  const halfBand = band / 2;

  return {
    band,
    leftAngle,
    rightAngle,
    leftOffset,
    rightOffset,
    leftSolid: leftOffset + halfBand,
    leftFade0: leftOffset - halfBand,
    rightSolid: rightOffset + halfBand,
    rightFade0: rightOffset - halfBand,
  };
}

export function applySeamVariables(
  element: HTMLElement,
  width: number,
  height: number,
  blendWidth: number,
  edgeGlowReach: number,
  lightRadius: number,
) {
  const seams = computeSeams(width, height, blendWidth);
  const set = (name: string, value: string) =>
    element.style.setProperty(name, value);

  set("--frame-w", `${width}px`);
  set("--frame-h", `${height}px`);
  set("--band", `${seams.band}px`);
  set("--left-angle", `${seams.leftAngle}deg`);
  set("--right-angle", `${seams.rightAngle}deg`);
  set("--left-offset", `${seams.leftOffset}px`);
  set("--right-offset", `${seams.rightOffset}px`);
  set("--left-solid", `${seams.leftSolid}px`);
  set("--left-fade-0", `${seams.leftFade0}px`);
  set("--right-solid", `${seams.rightSolid}px`);
  set("--right-fade-0", `${seams.rightFade0}px`);
  set("--edge-reach", `${edgeGlowReach * width}px`);
  set("--light-radius", `${lightRadius * width}px`);
  const seamLength = Math.hypot(width / 2, height);
  const leftAngle = (Math.atan2(-height, width / 2) * 180) / Math.PI;
  const rightAngle = (Math.atan2(-height, -width / 2) * 180) / Math.PI;
  set("--seam-length", `${seamLength}px`);
  set("--seam-left-angle", `${leftAngle}deg`);
  set("--seam-right-angle", `${rightAngle}deg`);
}

/** Blend width at a vertical position. The apex is at the top, so the band is usually narrower there. */
export function seamBandWidth(
  y: number,
  width: number,
  height: number,
  top: number,
  bottom: number,
) {
  const t = height <= 0 ? 0 : Math.min(1, Math.max(0, y / height));
  return width * (top + (bottom - top) * t);
}

/** Distance to the nearest seam line, in pixels. */
export function distanceToSeam(x: number, y: number, width: number, height: number) {
  const half = width / 2;
  const length = Math.hypot(half, height);
  if (length === 0) return 0;
  const left = Math.abs(half * (y - height) + height * x) / length;
  const right = Math.abs(half * (y - height) - height * (x - width)) / length;
  return Math.min(left, right);
}

export type PhotoFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Place a campus photo so the anchor point in the image lands on the
 * place point in the frame, and the triangle stays covered.
 * `scale` zooms in past the smallest covering size.
 */
export function placeCampusPhoto(input: {
  frameW: number;
  frameH: number;
  aspect: number;
  anchorX: number;
  anchorY: number;
  placeX: number;
  placeY: number;
  scale: number;
  side: "left" | "right";
  pad: number;
  /** When false, the photo may start below the top so a landmark can sit low. */
  coverTop?: boolean;
}): PhotoFrame {
  const { frameW, frameH, aspect, anchorX, anchorY, placeX, placeY, scale, side, pad, coverTop = true } = input;
  const bounds: number[] = [1];
  const leftNeed = side === "left" ? -pad : frameW / 2 - pad;
  const rightNeed = (side === "left" ? frameW / 2 : frameW) + pad;

  if (anchorX > 0.001) {
    const coverLeft = (placeX * frameW - leftNeed) / anchorX;
    if (coverLeft > 0) bounds.push(coverLeft);
  }
  if (coverTop && anchorY > 0.001) {
    bounds.push((aspect * (placeY * frameH + pad)) / anchorY);
  }
  if (anchorX < 0.999) {
    const coverRight = (rightNeed - placeX * frameW) / (1 - anchorX);
    if (coverRight > 0) bounds.push(coverRight);
  }
  if (anchorY < 0.999) {
    bounds.push((aspect * (frameH + pad - placeY * frameH)) / (1 - anchorY));
  }

  const width = Math.max(...bounds) * Math.max(scale, 1);
  const height = width / aspect;
  return {
    width,
    height,
    left: placeX * frameW - anchorX * width,
    top: placeY * frameH - anchorY * height,
  };
}
