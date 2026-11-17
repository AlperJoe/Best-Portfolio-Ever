import levelJson from "../../public/assets/frame3/level.json";
import runJson from "../../public/assets/frame3/run.json";
import { frame3 } from "./config";

export type AgentId = "A" | "B";
export type Cell = [number, number];

export type Door = {
  id: number;
  cells: Cell[];
  openedBy: AgentId;
};

export type Plate = {
  id: number;
  pos: Cell;
  usedBy: AgentId;
  opensDoor: number;
};

export type Level = {
  width: number;
  height: number;
  sensorRange: number;
  doorOpenSteps: number;
  walls: Cell[];
  doors: Door[];
  plates: Plate[];
  treasure: Cell;
  goalZone: { cells: Cell[] };
  agents: { id: AgentId; start: Cell }[];
};

export type RunFrame = {
  A: Cell;
  B: Cell;
  doorsOpenFor: number[];
};

export type Run = {
  steps: number;
  frames: RunFrame[];
};

export const level = levelJson as unknown as Level;
export const run = runJson as unknown as Run;

export function agentColor(id: AgentId) {
  return id === "A" ? frame3.agentA : frame3.agentB;
}
