import { memo } from "react";
import type { CSSProperties } from "react";
import { frame3 } from "./config";
import { agentColor, level, run, type AgentId, type Cell, type Door } from "./data";
import type { Pose } from "./replay";

const doors = [...level.doors].sort((a, b) => a.id - b.id);

function cellKey(cell: Cell) {
  return `${cell[0]},${cell[1]}`;
}

const LevelStatic = memo(function LevelStatic() {
  const { width, height } = level;
  const lines: string[] = [];
  for (let x = 0; x <= width; x += 1) lines.push(`M${x} 0V${height}`);
  for (let y = 0; y <= height; y += 1) lines.push(`M0 ${y}H${width}`);
  const [treasureX, treasureY] = level.treasure;

  return (
    <g>
      <rect width={width} height={height} fill={frame3.mapFloor} />
      {level.goalZone.cells.map((cell) => (
        <rect
          key={cellKey(cell)}
          x={cell[0]}
          y={cell[1]}
          width={1}
          height={1}
          fill={frame3.goal}
        />
      ))}
      <path d={lines.join("")} fill="none" stroke={frame3.grid} strokeWidth={0.035} />
      {level.walls.map((cell) => (
        <g key={cellKey(cell)}>
          <rect x={cell[0]} y={cell[1]} width={1} height={1} fill={frame3.wall} />
          <rect x={cell[0]} y={cell[1]} width={1} height={0.2} fill={frame3.wallTop} />
          <rect x={cell[0]} y={cell[1] + 0.8} width={1} height={0.2} fill={frame3.wallBottom} />
        </g>
      ))}
      {level.plates.map((plate) => {
        const [x, y] = plate.pos;
        const color = agentColor(plate.usedBy);
        return (
          <g key={plate.id}>
            <rect
              x={x + 0.18}
              y={y + 0.18}
              width={0.64}
              height={0.64}
              fill="none"
              stroke={color}
              strokeWidth={0.08}
            />
            <rect x={x + 0.38} y={y + 0.38} width={0.24} height={0.24} fill={color} />
          </g>
        );
      })}
      <g>
        <rect x={treasureX + 0.22} y={treasureY + 0.56} width={0.56} height={0.22} fill={frame3.chestBase} />
        <rect x={treasureX + 0.2} y={treasureY + 0.36} width={0.6} height={0.24} fill={frame3.chestGold} />
        <rect x={treasureX + 0.2} y={treasureY + 0.28} width={0.6} height={0.12} fill={frame3.chestLid} />
        <rect
          x={treasureX + 0.42}
          y={treasureY + 0.4}
          width={0.16}
          height={0.12}
          fill={frame3.chestHighlight}
        />
      </g>
    </g>
  );
});

function doorBox(door: Door) {
  const xs = door.cells.map((cell) => cell[0]);
  const ys = door.cells.map((cell) => cell[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x + 1;
  const h = Math.max(...ys) - y + 1;
  const pad = frame3.doorPad;
  return {
    x,
    y,
    w,
    h,
    innerX: x + pad,
    innerY: y + pad,
    innerW: w - pad * 2,
    innerH: h - pad * 2,
  };
}

function DoorShape({ door, open }: { door: Door; open: number }) {
  const box = doorBox(door);
  const color = agentColor(door.openedBy);
  const { innerX, innerY, innerW, innerH, w } = box;

  if (open <= 0) {
    const count = Math.max(3, Math.round(w * 4));
    const bars = [];
    for (let index = 0; index < count; index += 1) {
      const barX = innerX + ((index + 0.5) * innerW) / count - frame3.doorBar / 2;
      bars.push(
        <rect key={index} x={barX} y={innerY} width={frame3.doorBar} height={innerH} fill={color} />,
      );
    }
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerW} height={innerH} fill={color} opacity={0.2} />
        <rect
          x={innerX}
          y={innerY}
          width={innerW}
          height={innerH}
          fill="none"
          stroke={color}
          strokeWidth={frame3.doorBar}
        />
        {bars}
      </g>
    );
  }

  const ratio = Math.max(0, Math.min(1, open / level.doorOpenSteps));
  const perimeter = 2 * (innerW + innerH);
  const outline = `M ${innerX} ${innerY} H ${innerX + innerW} V ${innerY + innerH} H ${innerX} V ${innerY}`;

  return (
    <path
      d={outline}
      fill="none"
      stroke={color}
      strokeWidth={frame3.doorOutline}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      pathLength={perimeter}
      strokeDasharray={`${perimeter * ratio} ${perimeter}`}
    />
  );
}

function sameCell(a: Cell, b: Cell) {
  return a[0] === b[0] && a[1] === b[1];
}

function Footprints({ pose }: { pose: Pose }) {
  const frames = run.frames;
  const marks: { key: string; x: number; y: number; age: number; color: string }[] = [];
  for (const agent of ["A", "B"] as const) {
    const color = agentColor(agent);
    const placed = new Map<string, number>();
    const remember = (cell: Cell, age: number) => {
      if (age <= 0 || age >= frame3.footprintSteps) return;
      const key = `${agent}:${cell[0]},${cell[1]}`;
      const prev = placed.get(key);
      if (prev !== undefined && prev <= age) return;
      placed.set(key, age);
    };
    const from = frames[pose.step]?.[agent];
    const to = frames[pose.step + 1]?.[agent];
    if (from && to && !sameCell(from, to)) remember(from, pose.along);
    for (let back = 1; back <= frame3.footprintSteps; back += 1) {
      const index = pose.step - back;
      if (index < 0) break;
      const cell = frames[index][agent];
      const next = frames[index + 1]?.[agent];
      if (!next || sameCell(cell, next)) continue;
      remember(cell, back + pose.along);
    }
    for (const [key, age] of placed) {
      const [, coords] = key.split(":");
      const [x, y] = coords.split(",").map(Number);
      marks.push({ key, x, y, age, color });
    }
  }

  return (
    <g>
      {marks.map((mark) => {
        const fade = (1 - mark.age / frame3.footprintSteps) * frame3.footprintAlpha * pose.opacity;
        return (
          <g key={mark.key} fill={mark.color} opacity={fade}>
            <ellipse cx={mark.x + 0.38} cy={mark.y + 0.58} rx={0.1} ry={0.065} />
            <ellipse cx={mark.x + 0.62} cy={mark.y + 0.68} rx={0.1} ry={0.065} />
          </g>
        );
      })}
    </g>
  );
}

function PlateLinks({ pose }: { pose: Pose }) {
  const frames = run.frames;
  const now = pose.step + pose.along;
  const links: { key: string; x1: number; y1: number; x2: number; y2: number; color: string; opacity: number }[] = [];
  for (const plate of level.plates) {
    const agent = plate.usedBy;
    let newest = -1;
    for (let index = 1; index < frames.length; index += 1) {
      const cell = frames[index][agent];
      const prev = frames[index - 1][agent];
      if (sameCell(cell, plate.pos) && !sameCell(prev, plate.pos)) newest = index;
      const age = now - index;
      if (newest === index && age >= 0 && age <= frame3.plateLinkSteps) {
        const door = level.doors.find((item) => item.id === plate.opensDoor);
        if (!door) continue;
        const box = doorBox(door);
        links.push({
          key: `${plate.id}-${index}`,
          x1: plate.pos[0] + 0.5,
          y1: plate.pos[1] + 0.5,
          x2: box.x + box.w / 2,
          y2: box.y + box.h / 2,
          color: agentColor(agent),
          opacity: (1 - age / frame3.plateLinkSteps) * pose.opacity,
        });
      }
    }
  }

  return (
    <g fill="none" strokeLinecap="round">
      {links.map((link) => (
        <line
          key={link.key}
          x1={link.x1}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
          stroke={link.color}
          strokeWidth={frame3.plateLink}
          vectorEffect="non-scaling-stroke"
          opacity={link.opacity}
        />
      ))}
    </g>
  );
}

function ChestSparkle({ pose }: { pose: Pose }) {
  if (pose.sparkle < 0) return null;
  const [x, y] = level.treasure;
  const alpha = Math.sin(pose.sparkle * Math.PI) * pose.opacity;
  const scale = 0.85 + pose.sparkle * 0.2;
  return (
    <g opacity={alpha} transform={`translate(${x + 0.5} ${y + 0.36}) scale(${scale})`}>
      <path
        d="M0 -0.22 L0.05 -0.05 L0.22 0 L0.05 0.05 L0 0.22 L-0.05 0.05 L-0.22 0 L-0.05 -0.05 Z"
        fill={frame3.chestHighlight}
      />
    </g>
  );
}

export function visionOrigin(x: number, y: number, range: number) {
  const inset = (range - 1) / 2;
  return { x: x - inset, y: y - inset, size: range };
}

export function noteStyle(x: number, y: number, color: string): CSSProperties {
  const { width, height } = level;
  const gap = frame3.noteGap;
  const inset = frame3.noteInset;
  const cellLeft = (x / width) * 100;
  const cellRight = ((x + 1) / width) * 100;
  const top = (y / height) * 100;
  const roomRight = 100 - cellRight;
  const roomLeft = cellLeft;
  const placeRight = roomRight >= roomLeft;
  const room = placeRight ? roomRight : roomLeft;
  const shared = {
    top: `clamp(${inset}px, ${top}%, calc(100% - ${frame3.noteMaxHeight}px))`,
    maxWidth: `min(${frame3.noteMax}px, calc(${room}% - ${gap + inset}px))`,
    "--agent": color,
  } as CSSProperties;
  if (placeRight) {
    return { ...shared, left: `calc(${cellRight}% + ${gap}px)`, right: "auto" };
  }
  return {
    ...shared,
    left: "auto",
    right: `calc(${100 - cellLeft}% + ${gap}px)`,
  };
}

export function LevelMap({
  pose,
  watch,
  motion,
}: {
  pose: Pose;
  watch: AgentId | null;
  motion: boolean;
}) {
  const watched = watch === "A" ? pose.a : watch === "B" ? pose.b : null;
  const box = watched ? visionOrigin(watched[0], watched[1], level.sensorRange) : null;
  const color = watch ? agentColor(watch) : frame3.agentA;

  return (
    <svg
      className="frame3-level"
      viewBox={`0 0 ${level.width} ${level.height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <LevelStatic />
      {motion ? <Footprints pose={pose} /> : null}
      <g shapeRendering="geometricPrecision" opacity={pose.opacity}>
        {doors.map((door, index) => (
          <DoorShape key={door.id} door={door} open={pose.doors[index] ?? 0} />
        ))}
      </g>
      {motion ? <PlateLinks pose={pose} /> : null}
      {motion ? <ChestSparkle pose={pose} /> : null}
      {box && (
        <rect
          x={box.x}
          y={box.y}
          width={box.size}
          height={box.size}
          fill={color}
          fillOpacity={frame3.visionOpacity}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={frame3.visionStroke}
          shapeRendering="geometricPrecision"
        />
      )}
    </svg>
  );
}
