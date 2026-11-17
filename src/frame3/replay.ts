import type { Cell, RunFrame } from "./data";

export type Pose = {
  a: Cell;
  b: Cell;
  doors: number[];
  opacity: number;
  step: number;
};

function mix(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function cycleSeconds(
  frameCount: number,
  stepsPerSecond: number,
  holdSeconds: number,
  fadeSeconds: number,
) {
  const moving = Math.max(0, frameCount - 1) / stepsPerSecond;
  return moving + holdSeconds + fadeSeconds;
}

/** Pose along the solved run. Time wraps, so a looping clock can keep counting. */
export function poseAt(
  frames: RunFrame[],
  elapsed: number,
  stepsPerSecond: number,
  holdSeconds: number,
  fadeSeconds: number,
): { pose: Pose; finished: boolean } {
  const first = frames[0];
  if (!first) {
    return {
      pose: { a: [0, 0], b: [0, 0], doors: [], opacity: 1, step: 0 },
      finished: true,
    };
  }

  const moving = Math.max(0, frames.length - 1) / stepsPerSecond;
  const cycle = moving + holdSeconds + fadeSeconds;
  const finished = elapsed >= cycle - 1e-4;
  const time = cycle <= 0 ? 0 : ((elapsed % cycle) + cycle) % cycle;
  const last = frames[frames.length - 1];

  if (time >= moving || frames.length < 2) {
    const intoFade = time - moving - holdSeconds;
    const faded = fadeSeconds <= 0 ? 1 : Math.min(1, Math.max(0, intoFade / fadeSeconds));
    const opacity = time < moving + holdSeconds ? 1 : 1 - faded;
    return {
      pose: {
        a: [last.A[0], last.A[1]],
        b: [last.B[0], last.B[1]],
        doors: last.doorsOpenFor.slice(),
        opacity,
        step: frames.length - 1,
      },
      finished,
    };
  }

  const scaled = time * stepsPerSecond;
  const index = Math.min(frames.length - 2, Math.max(0, Math.floor(scaled)));
  const t = scaled - index;
  const from = frames[index];
  const to = frames[index + 1];
  const slide = smooth(t);

  return {
    pose: {
      a: [mix(from.A[0], to.A[0], slide), mix(from.A[1], to.A[1], slide)],
      b: [mix(from.B[0], to.B[0], slide), mix(from.B[1], to.B[1], slide)],
      doors: from.doorsOpenFor.map((value, door) => mix(value, to.doorsOpenFor[door] ?? 0, t)),
      opacity: 1,
      step: index,
    },
    finished,
  };
}
