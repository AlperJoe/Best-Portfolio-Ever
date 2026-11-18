/**
 * Every tunable for Frame 3. Layout, color, type, and playback live here.
 * The text column ends at 31% and the map column starts at 34%.
 */
export const frame3 = {
  background: "#12151A",
  floor: "#181C22",
  grid: "#20252D",
  wall: "#39414D",
  wallTop: "#4B5462",
  wallBottom: "#2A3039",
  goal: "#1E241C",
  chestLid: "#965C24",
  chestGold: "#F2C14E",
  chestHighlight: "#FFE08A",
  chestBase: "#7A4A1E",
  agentA: "#3CC8B4",
  agentB: "#FF7B67",
  eye: "#12151A",
  warmWhite: "#F2EEE6",
  panel: "#1B2030",

  /** Text column, as fractions of the frame width. */
  textStart: 0.05,
  textEnd: 0.31,
  /** Map column. The map sits on the column's right edge. */
  mapStart: 0.34,
  mapEnd: 0.95,
  /**
   * Map width is the smaller of the column and twice this share of the
   * frame height, so the map stays 2:1.
   */
  mapHeight: 0.78,
  mapFloor: "#222833",
  mapBorder: "rgba(255, 255, 255, 0.08)",
  /** How much of the floor color shows in the tiles outside the map. */
  outsideMix: 0.62,
  /** Share of each outer margin that fades away. The rest stays dim. */
  edgeFade: 0.42,
  /** Grid line on the dim tiles outside the playable map. */
  outsideGrid: "rgba(255, 255, 255, 0.055)",
  columnGap: "3%",
  refsRight: "5%",
  /** Focus ring for keyboard controls. */
  focus: "#3CC8B4",
  buttonSize: "17px",
  buttonWeight: 600,
  buttonPadY: "8px",
  buttonPadX: "14px",
  buttonRadius: "6px",
  buttonBorder: "rgba(255, 255, 255, 0.4)",
  arrowShift: "4px",
  refsBottom: "4%",

  /**
   * When the text column is taller than the frame minus this share at the top
   * and the bottom, its type and gaps shrink together, down to copyMinFit.
   */
  copyMargin: 0.04,
  copyMinFit: 0.72,
  /** Small label above the title. */
  eyebrowSize: "14px",
  eyebrowWeight: 500,
  eyebrowGap: "8px",
  titleSize: "clamp(28px, 2.6vw, 44px)",
  titleWeight: 700,
  titleLine: 1.15,
  introSize: "18px",
  introWeight: 400,
  introLine: 1.45,
  introGap: "10px",
  labelSize: "15px",
  labelWeight: 600,
  sectionGap: "22px",
  labelGap: "8px",
  bodySize: "17px",
  bodyWeight: 400,
  bodyLine: 1.45,
  itemGap: "10px",
  bullet: "6px",
  stackSize: "14px",
  stackWeight: 500,
  linkSize: "17px",
  linkWeight: 600,
  linkGap: "18px",
  captionSize: "13px",
  captionOffset: 12,
  noteSize: "13px",
  noteLine: 1.4,
  notePlate: "#0E1116",
  notePlateOpacity: 0.92,
  noteBorder: 0.4,
  noteRadius: "6px",
  notePadY: "8px",
  notePadX: "10px",
  noteGap: 6,
  noteInset: 8,
  noteMax: 220,
  noteMaxHeight: 96,
  refsSize: "14px",
  refsWeight: 600,
  panelTextSize: "14px",
  panelLine: 1.5,
  panelRadius: "10px",
  panelWidth: "380px",
  panelPad: "16px 18px",
  panelFadeMs: 200,

  stepsPerSecond: 4,
  holdSeconds: 1.5,
  fadeSeconds: 0.45,
  visionOpacity: 0.16,
  visionStroke: 0.065,
  doorPad: 0.08,
  doorBar: 0.07,
  /** Open door outline, in screen pixels. It drains as the open steps run out. */
  doorOutline: 2,
  /** Footprints fade across this many steps after an agent leaves a tile. */
  footprintSteps: 6,
  footprintAlpha: 0.32,
  /** How long the plate-to-door line stays up, in steps. */
  plateLinkSteps: 1.5,
  /** Plate-to-door line thickness, in screen pixels. */
  plateLink: 1.5,
  /** One chest sparkle at the start of the hold, before the run fades. */
  sparkleSeconds: 0.7,

  white90: "rgba(255, 255, 255, 0.9)",
  white60: "rgba(255, 255, 255, 0.6)",
  white55: "rgba(255, 255, 255, 0.55)",
  white88: "rgba(255, 255, 255, 0.88)",
  white15: "rgba(255, 255, 255, 0.15)",
  noteColor: "rgba(255, 255, 255, 0.92)",

  projectUrl: "https://github.com/AlperJoe/Reinforcement_Learning",

  copy: {
    eyebrow: "PressurePlate · Bilkent course project, 2023",
    title: "Teaching two AI agents to work together",
    intro:
      "In this puzzle, a door opens only while an agent stands on its pressure plate. One agent has to hold the door so the other can pass, and neither can reach the treasure alone.",
    didLabel: "What I did",
    did: [
      "I rebuilt what each agent sees. Five map layers became one small grid around the agent, plus its position and how long it can still hold a door open.",
      "I redesigned the level to make it harder than the original, with a 28×14 map and five doors.",
    ],
    trainedLabel: "How we trained",
    trained:
      "We trained both agents with MADDPG. Each agent acts only on what it sees, but during training it learns from what both agents see.",
    resultLabel: "Result",
    result:
      "After training, the two agents finished the evaluation run in about 25 steps instead of hitting the 100-step limit.",
    stack: "Python, PyTorch, MADDPG",
    project: "View the project",
    caption: "Illustration: a solved run of the level, played back with the level's own rules.",
  },
} as const;
