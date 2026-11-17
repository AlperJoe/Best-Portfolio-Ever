export type Bezier = readonly [number, number, number, number];

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Same curve as CSS cubic-bezier(x1, y1, x2, y2). */
export function cubicBezier([x1, y1, x2, y2]: Bezier) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < 24; i += 1) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-6) break;
      if (value < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };
}

/**
 * Cubic Hermite from (p0, v0) to (p1, v1) over `seconds`. Velocities are in
 * progress per second, so a roll can start at the speed the push left it.
 */
export function hermite(p0: number, v0: number, p1: number, v1: number, seconds: number) {
  const m0 = v0 * seconds;
  const m1 = v1 * seconds;
  return {
    at(t: number) {
      const u = clamp(t);
      const u2 = u * u;
      const u3 = u2 * u;
      return (
        (2 * u3 - 3 * u2 + 1) * p0 +
        (u3 - 2 * u2 + u) * m0 +
        (-2 * u3 + 3 * u2) * p1 +
        (u3 - u2) * m1
      );
    },
    speed(t: number) {
      const u = clamp(t);
      const u2 = u * u;
      return (
        ((6 * u2 - 6 * u) * p0 +
          (3 * u2 - 4 * u + 1) * m0 +
          (-6 * u2 + 6 * u) * p1 +
          (3 * u2 - 2 * u) * m1) /
        seconds
      );
    },
  };
}

/**
 * One hump that rises and returns to zero without swinging past it:
 * the response of a critically damped latch. Peaks at 1 when t = 1 / 3.
 */
export function latchHump(t: number) {
  if (t <= 0 || t >= 1) return 0;
  const x = t * 3;
  return x * Math.exp(1 - x) * (1 - smoothstep(0.7, 1, t));
}
