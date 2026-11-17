import { seamBandWidth } from "./geometry";

export type SeamMaskSettings = {
  top: number;
  bottom: number;
  /** Largest share of the frame width the blend may reach into a campus side. */
  campusReach: number;
  /** How far large-scale noise pushes the edge, as a share of the local band. */
  noise: number;
  columns: number;
  rows: number;
};

export type SeamMasks = {
  left: string;
  right: string;
  middle: string;
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
  return { left, right };
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
 * Organic seam masks. Noise is built once per size and painted into a
 * low-resolution canvas, then used as the CSS mask.
 */
export function buildSeamMasks(
  width: number,
  height: number,
  settings: SeamMaskSettings,
): SeamMasks {
  const maskW = Math.max(2, Math.round(width / 3));
  const maskH = Math.max(2, Math.round(height / 3));
  const noise = makeNoise(
    settings.columns,
    settings.rows,
    (20261116 + Math.round(width) * 13 + Math.round(height)) >>> 0,
  );

  const sample = (px: number, py: number) => {
    const x = ((px + 0.5) / maskW) * width;
    const y = ((py + 0.5) / maskH) * height;
    const band = seamBandWidth(y, width, height, settings.top, settings.bottom);
    const campusSide = Math.min(band * 0.5, width * settings.campusReach);
    const middleSide = Math.max(0, band - campusSide);
    const wobble = noise(x / width, y / height) * band * settings.noise;
    const dist = distanceToMiddle(x, y, width, height);
    const leftShifted = dist.left + wobble;
    const rightShifted = dist.right - wobble * 0.85;
    const leftMiddle = smoothstep(-campusSide, middleSide, leftShifted);
    const rightMiddle = smoothstep(-campusSide, middleSide, rightShifted);
    const leftSide = 1 - smoothstep(middleSide + band * 0.03, middleSide + band * 0.14, leftShifted);
    const rightSide = 1 - smoothstep(middleSide + band * 0.03, middleSide + band * 0.14, rightShifted);
    return {
      left: leftSide,
      right: rightSide,
      middle: leftMiddle * rightMiddle,
    };
  };

  const paint = (key: "left" | "right" | "middle") =>
    canvasUrl(maskW, maskH, (data) => {
      for (let py = 0; py < maskH; py += 1) {
        for (let px = 0; px < maskW; px += 1) {
          const alpha = Math.round(sample(px, py)[key] * 255);
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
