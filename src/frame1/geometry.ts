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
 * Each line runs from a top corner to the middle of the bottom edge.
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
  const leftDy = -(width / 2) / length;
  const leftAngle = (Math.atan2(leftDx, -leftDy) * 180) / Math.PI;

  const rightDx = -height / length;
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

  const leftOffset = offset(leftAngle, leftDx, leftDy, 0, 0);
  const rightOffset = offset(rightAngle, rightDx, rightDy, width, 0);
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
}
