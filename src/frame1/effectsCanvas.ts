import { distanceToSeam, seamBandWidth } from "./geometry";

export type EffectsOptions = {
  steam: boolean;
  grain: boolean;
  steamAmount: number;
  cursorReaction: boolean;
  buasTone: string;
  bilkentTone: string;
  seamTop: number;
  seamBottom: number;
  seamSteam: number;
};

export type EffectsFrame = {
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
  cursorInside: boolean;
};

type Puff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pushX: number;
  pushY: number;
  age: number;
  life: number;
  size: number;
  growth: number;
  seed: number;
  side: 0 | 1;
};

const BASE_COUNT = 26;

function mixWithWhite(hex: string, tone: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const channel = (color: number) =>
    Math.round(255 * (1 - tone) + color * tone);
  return `${channel(red)},${channel(green)},${channel(blue)}`;
}

function makeSprite(rgb: string) {
  const sprite = new OffscreenCanvas(64, 64);
  const context = sprite.getContext("2d");
  if (!context) return sprite;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(${rgb},0.85)`);
  gradient.addColorStop(0.42, `rgba(${rgb},0.28)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return sprite;
}

export class FrameEffects {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private options: EffectsOptions;
  private readonly puffs: Puff[] = [];
  private readonly sprites: [OffscreenCanvas, OffscreenCanvas];
  private readonly noise = new OffscreenCanvas(160, 160);
  private readonly noiseContext: OffscreenCanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement, options: EffectsOptions) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("2D canvas is unavailable");
    }
    this.context = context;
    this.options = options;
    this.sprites = [
      makeSprite(mixWithWhite(options.buasTone, 0.22)),
      makeSprite(mixWithWhite(options.bilkentTone, 0.2)),
    ];
    this.noiseContext = this.noise.getContext("2d");
  }

  setOptions(options: EffectsOptions) {
    const toneChanged =
      options.buasTone !== this.options.buasTone ||
      options.bilkentTone !== this.options.bilkentTone;
    this.options = options;
    if (toneChanged) {
      this.sprites[0] = makeSprite(mixWithWhite(options.buasTone, 0.22));
      this.sprites[1] = makeSprite(mixWithWhite(options.bilkentTone, 0.2));
    }
    if (!options.steam) this.puffs.length = 0;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(width * this.pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * this.pixelRatio));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  render(dt: number, frame: EffectsFrame) {
    this.stepSteam(dt, frame);
    this.draw(frame, false);
  }

  renderStill(frame: EffectsFrame) {
    this.puffs.length = 0;
    if (this.options.steam && this.options.steamAmount > 0) {
      const count = Math.max(0, Math.round(BASE_COUNT * this.options.steamAmount));
      for (const side of [0, 1] as const) {
        for (let index = 0; index < count; index += 1) {
          const puff = this.spawn(side, index / count);
          puff.age = puff.life * (index / count);
          const risen = puff.age;
          puff.y += puff.vy * risen;
          puff.x += puff.vx * risen;
          this.puffs.push(puff);
        }
      }
    }
    this.draw(frame, true);
  }

  private stepSteam(dt: number, frame: EffectsFrame) {
    const { steam, steamAmount, cursorReaction } = this.options;
    if (!steam || steamAmount <= 0 || frame.width <= 0) {
      this.puffs.length = 0;
      return;
    }

    const count = Math.max(0, Math.round(BASE_COUNT * steamAmount));
    for (const side of [0, 1] as const) {
      const alive = this.puffs.filter((puff) => puff.side === side).length;
      const missing = count - alive;
      const births = Math.min(missing, 2);
      for (let index = 0; index < births; index += 1) {
        this.puffs.push(this.spawn(side, Math.random()));
      }
    }

    const radius = 150;
    for (let index = this.puffs.length - 1; index >= 0; index -= 1) {
      const puff = this.puffs[index];
      puff.age += dt;
      if (puff.age >= puff.life || puff.y < -120) {
        this.puffs.splice(index, 1);
        continue;
      }

      if (cursorReaction && frame.cursorInside) {
        const dx = puff.x - frame.cursorX;
        const dy = puff.y - frame.cursorY;
        const distance = Math.hypot(dx, dy);
        if (distance < radius && distance > 0.5) {
          const strength = (1 - distance / radius) * 70;
          puff.pushX += (dx / distance) * strength;
          puff.pushY += (dy / distance) * strength;
        }
      }

      const decay = Math.exp(-dt * 1.6);
      puff.pushX *= decay;
      puff.pushY *= decay;
      const drift = Math.sin(puff.seed + puff.age * 0.4) * 16;
      puff.x += (puff.vx + drift + puff.pushX) * dt;
      puff.y += (puff.vy + puff.pushY) * dt;
    }
  }

  private spawn(side: 0 | 1, spread: number): Puff {
    const originX = side === 0 ? this.width / 6 : (5 * this.width) / 6;
    const originY = (2 * this.height) / 3;
    const angle = spread * Math.PI * 2;
    return {
      x: originX + Math.cos(angle) * 18 * (0.4 + spread),
      y: originY + (spread - 0.5) * 14,
      vx: (spread - 0.5) * 22,
      vy: -(52 + spread * 36),
      pushX: 0,
      pushY: 0,
      age: 0,
      life: 5.4 + spread * 2.2,
      size: 16 + spread * 14,
      growth: 48 + spread * 56,
      seed: angle,
      side,
    };
  }

  private draw(frame: EffectsFrame, still: boolean) {
    const { width, height } = frame;
    if (width <= 0 || height <= 0) return;
    const context = this.context;
    context.clearRect(0, 0, width, height);

    if (this.options.steam && this.puffs.length > 0) {
      for (const puff of this.puffs) {
        const progress = puff.age / puff.life;
        const fade = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
        const alpha = fade * 0.34 * Math.min(1.15, 0.45 + this.options.steamAmount * 0.55);
        if (alpha <= 0.004) continue;
        const band = seamBandWidth(
          puff.y,
          width,
          height,
          this.options.seamTop,
          this.options.seamBottom,
        );
        const reach = Math.max(1, band * 0.9);
        const proximity = Math.max(0, 1 - distanceToSeam(puff.x, puff.y, width, height) / reach);
        const boost = 1 + (this.options.seamSteam - 1) * proximity;
        const size = (puff.size + puff.growth * progress) * (1 + (boost - 1) * 0.85);
        context.globalAlpha = Math.min(0.85, alpha * boost);
        context.drawImage(
          this.sprites[puff.side],
          puff.x - size / 2,
          puff.y - size / 2,
          size,
          size,
        );
      }
      context.globalAlpha = 1;
    }

    if (this.options.grain) {
      this.drawGrain(context, width, height, still);
      this.drawVignette(context, width, height);
    }
  }

  private drawGrain(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    still: boolean,
  ) {
    const noiseContext = this.noiseContext;
    if (!noiseContext) return;
    const image = noiseContext.createImageData(160, 160);
    const data = image.data;
    let seed = still ? 20261116 : (Math.random() * 0xffffffff) >>> 0;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    };
    for (let index = 0; index < data.length; index += 4) {
      const value = next() & 255;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
    noiseContext.putImageData(image, 0, 0);

    context.save();
    context.globalAlpha = 0.05;
    const offsetX = still ? 0 : next() % 160;
    const offsetY = still ? 0 : next() % 160;
    context.translate(offsetX, offsetY);
    const pattern = context.createPattern(this.noise, "repeat");
    if (pattern) {
      context.fillStyle = pattern;
      context.fillRect(-offsetX, -offsetY, width, height);
    }
    context.restore();
  }

  private drawVignette(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    context.save();
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.28,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.7, "rgba(0,0,0,0.02)");
    gradient.addColorStop(1, "rgba(0,0,0,0.2)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const edge = Math.max(width, height) * 0.16;
    const edges: Array<[number, number, number, number, number, number, number, number]> = [
      [0, 0, edge, 0, 0, 0, edge, height],
      [width, 0, width - edge, 0, width - edge, 0, edge, height],
      [0, 0, 0, edge, 0, 0, width, edge],
      [0, height, 0, height - edge, 0, height - edge, width, edge],
    ];
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
      const shade = context.createLinearGradient(x0, y0, x1, y1);
      shade.addColorStop(0, "rgba(0,0,0,0.12)");
      shade.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = shade;
      context.fillRect(rx, ry, rw, rh);
    }
    context.restore();
  }
}
