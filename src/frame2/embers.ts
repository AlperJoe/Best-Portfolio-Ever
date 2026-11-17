export type Ember = {
  x: number;
  y: number;
  vy: number;
  drift: number;
  size: number;
  life: number;
  age: number;
  seed: number;
  rgb: string;
};

export type EmberSettings = {
  count: number;
  band: number;
  riseMin: number;
  riseMax: number;
  lifeMin: number;
  lifeMax: number;
  sizeMin: number;
  sizeMax: number;
};

const COLORS = ["232, 112, 32", "239, 160, 48", "239, 199, 133"];

export function spawnEmber(
  width: number,
  height: number,
  originX: number,
  settings: EmberSettings,
  random: () => number,
  age = 0,
): Ember {
  const spread = (random() - 0.5) * width * settings.band;
  const life = settings.lifeMin + random() * (settings.lifeMax - settings.lifeMin);
  return {
    x: originX + spread,
    y: height + random() * 12,
    vy: -(settings.riseMin + random() * (settings.riseMax - settings.riseMin)),
    drift: (random() - 0.5) * 14,
    size: settings.sizeMin + random() * (settings.sizeMax - settings.sizeMin),
    life,
    age,
    seed: random() * Math.PI * 2,
    rgb: COLORS[Math.floor(random() * COLORS.length)] ?? COLORS[0],
  };
}

export function createEmbers(
  width: number,
  height: number,
  originX: number,
  settings: EmberSettings,
  still: boolean,
): Ember[] {
  const random = Math.random;
  return Array.from({ length: settings.count }, (_, index) => {
    const life = settings.lifeMin + random() * (settings.lifeMax - settings.lifeMin);
    const age = still ? life * ((index + 0.35) / settings.count) : life * random();
    const ember = spawnEmber(width, height, originX, settings, random, age);
    ember.y = height - (age / ember.life) * height * 0.85;
    ember.age = age;
    return ember;
  });
}

export function stepEmbers(
  embers: Ember[],
  dt: number,
  width: number,
  height: number,
  originX: number,
  settings: EmberSettings,
) {
  for (let index = 0; index < embers.length; index += 1) {
    const ember = embers[index];
    ember.age += dt;
    ember.y += ember.vy * dt;
    ember.x += (ember.drift + Math.sin(ember.seed + ember.age * 1.4) * 8) * dt;
    if (ember.age >= ember.life || ember.y < -12) {
      embers[index] = spawnEmber(width, height, originX, settings, Math.random);
    }
  }
}

export function drawEmbers(
  context: CanvasRenderingContext2D,
  embers: Ember[],
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  for (const ember of embers) {
    const progress = ember.age / ember.life;
    const lifeFade = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
    const flicker = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ember.seed * 3 + ember.age * 7));
    const alpha = lifeFade * flicker * 0.72;
    if (alpha < 0.02) continue;
    context.globalAlpha = alpha;
    context.fillStyle = `rgb(${ember.rgb})`;
    context.beginPath();
    context.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}
