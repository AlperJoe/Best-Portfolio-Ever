import { memo } from "react";
import type { CSSProperties } from "react";
import { frame3 } from "./config";
import { agentColor, level, type AgentId, type Cell, type Door } from "./data";
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

function DoorShape({ door, open }: { door: Door; open: number }) {
  const xs = door.cells.map((cell) => cell[0]);
  const ys = door.cells.map((cell) => cell[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x + 1;
  const h = Math.max(...ys) - y + 1;
  const pad = frame3.doorPad;
  const color = agentColor(door.openedBy);
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  if (open <= 0.05) {
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
  const horizontal = w >= h;
  const thickness = frame3.doorOpenBar;
  const bar = horizontal ? (
    <rect
      x={innerX}
      y={y + h / 2 - thickness / 2}
      width={innerW * ratio}
      height={thickness}
      fill={color}
    />
  ) : (
    <rect
      x={x + w / 2 - thickness / 2}
      y={innerY}
      width={thickness}
      height={innerH * ratio}
      fill={color}
    />
  );

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        fill="none"
        stroke={color}
        strokeWidth={frame3.doorBar}
      />
      {bar}
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

export function LevelMap({ pose, watch }: { pose: Pose; watch: AgentId | null }) {
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
      <g shapeRendering="geometricPrecision" opacity={pose.opacity}>
        {doors.map((door, index) => (
          <DoorShape key={door.id} door={door} open={pose.doors[index] ?? 0} />
        ))}
      </g>
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
