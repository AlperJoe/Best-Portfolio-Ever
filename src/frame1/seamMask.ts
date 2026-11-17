import { seamBandWidth } from "./geometry";

export type SeamMaskSettings = {
  top: number;
  bottom: number;
  /** Share of `edgeLimit` the noise may use. Clamped to 1. */
  noise: number;
  /** Largest horizontal shift from the true seam, as a fraction of frame width. */
  edgeLimit: number;
  columns: number;
  rows: number;
};

export type SeamMasks = {
  left: string;
  right: string;
  middle: string;
};

export type SeamSample = {
  left: number;
  right: number;
  middle: number;
};

function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge1 === edge0) return value >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeNoise(columns: number, rows: number, seed: number) {
  const random = hash(seed);
  const grid = new Float32Array((columns + 1) * (rows + 1));
  for (let index = 0; index < grid.length; index += 1) {
    grid[index] = random() * 2 - 1;
  }
  const at = (x: number, y: number) => grid[y * (columns + 1) + x];
  return (x: number, y: number) => {
    const gx = Math.min(columns - 0.0001, Math.max(0, x * columns));
    const gy = Math.min(rows - 0.0001, Math.max(0, y * rows));
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = gx - x0;
    const ty = gy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** Signed distance. Positive values are inside the middle triangle. */
function distanceToMiddle(x: number, y: number, width: number, height: number) {
  const half = width / 2;
  const length = Math.hypot(half, height) || 1;
  const left = -(half * y - height * x) / length;
  const right = (-half * y - height * (x - width)) / length;
  return { left, right, length };
}

/**
 * Sample the three region masks.
 * The blend is centered on the straight seam. Noise may slide that edge,
 * but only within `edgeLimit` of the frame width, measured horizontally.
 * Left stays on x <= width/2 and right stays on x >= width/2, so the
 * three regions meet at the middle of the bottom edge.
 */
export function createSeamSampler(width: number, height: number, settings: SeamMaskSettings) {
  const seed = (20261116 + Math.round(width) * 13 + Math.round(height)) >>> 0;
  const noiseLeft = makeNoise(settings.columns, settings.rows, seed);
  const noiseRight = makeNoise(settings.columns, settings.rows, seed ^ 0x9e3779b9);
  const { length } = distanceToMiddle(0, 0, width, height);
  const across = height / length;
  const strength = Math.min(1, Math.max(0, settings.noise));
  const maxPerp = width * settings.edgeLimit * strength * across;

  return (x: number, y: number): SeamSample => {
    const band = seamBandWidth(y, width, height, settings.top, settings.bottom);
    const half = band * 0.5;
    const u = width <= 0 ? 0 : x / width;
    const v = height <= 0 ? 0 : y / height;
    const dist = distanceToMiddle(x, y, width, height);
    const leftShifted = dist.left + noiseLeft(u, v) * maxPerp;
    const rightShifted = dist.right + noiseRight(u, v) * maxPerp;
    const leftMiddle = smoothstep(-half, half, leftShifted);
    const rightMiddle = smoothstep(-half, half, rightShifted);
    const feather = Math.max(0.75, half * 0.12);
    let left = 1 - smoothstep(half, half + feather, leftShifted);
    let right = 1 - smoothstep(half, half + feather, rightShifted);
    if (x > width / 2) left = 0;
    if (x < width / 2) right = 0;
    return {
      left,
      right,
      middle: leftMiddle * rightMiddle,
    };
  };
}

function canvasUrl(width: number, height: number, paint: (data: Uint8ClampedArray) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(width, height);
  paint(image.data);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Seam masks at the frame's own pixel size, so a narrow blend is not
 * stretched into a curve.
 */
export function buildSeamMasks(
  width: number,
  height: number,
  settings: SeamMaskSettings,
): SeamMasks {
  const maskW = Math.max(2, Math.round(width));
  const maskH = Math.max(2, Math.round(height));
  const sample = createSeamSampler(width, height, settings);

  const paint = (key: keyof SeamSample) =>
    canvasUrl(maskW, maskH, (data) => {
      for (let py = 0; py < maskH; py += 1) {
        const y = ((py + 0.5) / maskH) * height;
        for (let px = 0; px < maskW; px += 1) {
          const x = ((px + 0.5) / maskW) * width;
          const alpha = Math.round(sample(x, y)[key] * 255);
          const index = (py * maskW + px) * 4;
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = alpha;
        }
      }
    });

  return {
    left: paint("left"),
    right: paint("right"),
    middle: paint("middle"),
  };
}
