export const frame1Config = {
  colors: {
    buasTone: "#ED7624",
    bilkentTone: "#001489",
    middleTone: "#F2EEE6",
  },
  links: {
    github: "https://github.com/AlperJoe",
    linkedin: "https://www.linkedin.com/in/alperbozkurt/",
    buas: "https://www.buas.nl/en",
    bilkent: "https://www.bilkent.edu.tr",
  },
  /** The photo's own contrast, with a little more saturation. */
  portraitGrade: "saturate(1.08)",
  /** Focus ring used by every keyboard-focusable control. */
  focus: "#F2EEE6",
  /**
   * Campus photos stay close to their own color: darker overall, with a light
   * wash of the school color.
   */
  duotone: {
    brightness: 0.9,
    tint: 0.12,
    darken: 0,
  },
  /**
   * Full frame: portrait at the top, a card on each side.
   * The three card margins (top, bottom, outer) are one length.
   * The portrait is placed from the top of the hair, not from the photo edge.
   */
  layout: {
    /** Each card at its bottom edge, as a fraction of the frame width. */
    cardWidth: 0.3,
    /**
     * Portrait photo height in the full frame, as a fraction of the frame height.
     * The visible face and shoulders are about 30% of the frame height.
     * It is smaller where the panels or the text under the name need the room.
     */
    portrait: 0.48,
    /** Largest the portrait gets in the start state, as a fraction of the frame height. */
    portraitStart: 0.62,
    /**
     * Space kept to the top, bottom and outer edges by the panel text, as a
     * fraction of the frame height. The campus photos themselves run to the
     * screen edges in the side-by-side layout.
     */
    margin: 0.056,
    marginMin: 48,
    marginMax: 72,
    /** Rounded corners of the stacked cards. Side-by-side panels meet the screen edges square. */
    radius: 12,
    /** Soft fade at the inner edge, as a fraction of the card's bottom width. */
    edgeFade: 0.15,
    /**
     * The inner edge leans toward the center. At the top it is this much
     * further in than at the bottom, as a fraction of the frame width.
     */
    lean: 0.06,
    /** Gap between the portrait and the name, in pixels. */
    nameGap: 14,
    /** Gap between the name and the line under it, in pixels. */
    lineGap: 10,
    /** Clear space between the center column and each card, in pixels. */
    columnGutter: 16,
    /** School marks, in pixels. They sit in the bottom outer corners, on the photos. */
    mark: 44,
    /** Space between each mark and the screen corner, in pixels. */
    markInset: 20,
    /** Stacked cards when the frame is narrower than this, or taller than it is wide. */
    stackBelow: 1000,
    /**
     * From stackBelow through this width, the name is smaller and the middle
     * column is only the gap between the two panels' text. If the name or its
     * icons still meet that text, the cards use the stacked layout.
     */
    mediumUntil: 1280,
    /** Largest scale of the name in that band, before it shrinks further to stay clear. */
    mediumNameScale: 0.78,
    /** Smallest the name may be in that band, in pixels, before the cards stack. */
    mediumNameMin: 32,
    /** Clear space between the name row and the panel text, in pixels. */
    mediumClearance: 14,
    /** No text on this frame goes below this size, in pixels. */
    minText: 13,
    /** Where the top of the hair sits in the full frame, as a fraction of the frame height. */
    hairFrame: 0.048,
    /** Least space under the middle text in the full frame, in pixels. */
    bottomRoom: 24,
  },
  portraitLayout: {
    naturalWidth: 1254,
    naturalHeight: 1254,
    /**
     * Top of the hair, as a fraction of the photo height.
     * The portrait is anchored on this line.
     */
    hairTopY: 0.2,
    /**
     * Soft oval. The face, hair and shoulders stay solid.
     * The black photo background falls away before the straight edges,
     * so no square edge or black box sits on the panels.
     */
    mask: {
      cx: 0.5,
      cy: 0.55,
      rx: 0.46,
      ry: 0.48,
      /** Opaque through this share of the oval. The rest fades to clear. */
      solid: 0.78,
    },
  },
  /**
   * Campus photos are framed for the sloped panels: sky behind the text,
   * the BUas tower and the Bilkent building whole in the lower part.
   * object-position, as percentages of each photo.
   */
  photos: {
    /** Horizontal anchor. The vertical place follows the text, so the landmark stays below it. */
    buas: "22%",
    bilkent: "82%",
    /** Where the landmark starts in each photo. The photo shifts down if the text would cover it. */
    buasMark: 0.5,
    bilkentMark: 0.58,
  },
  /**
   * Invitations to act. Instrument Serif italic, gold, with a hand-drawn
   * underline that draws on hover and keyboard focus. Nothing moves on its own.
   */
  invite: {
    color: "#EFC785",
    size: 20,
    /** Draw time of the underline, in seconds. */
    draw: 0.2,
  },
  middle: {
    nameSize: "clamp(40px, 4.4vw, 80px)",
    nameLine: 1.05,
    nameColor: "#F2EEE6",
    /** The first sentence under the name. Archivo, light text. */
    leadSize: 20,
    leadWeight: 400,
    leadLine: 1.4,
    leadColor: "#F2EEE6",
    /** The paragraph under it. Archivo, muted. */
    moreSize: 15,
    moreWeight: 400,
    moreLine: 1.55,
    moreColor: "rgba(242, 238, 230, 0.68)",
    /** Widest the paragraph may be, in characters. */
    moreMeasure: 40,
    /** Space between the sentence and the paragraph, in pixels. */
    moreGap: 12,
    /** Scroll hint in the start state. */
    hintSize: 18,
  },
  icons: {
    size: 40,
    /** Lift on hover and keyboard focus, in pixels. */
    lift: 2,
    /** Space between each mark and the name, in pixels. */
    nameGap: 14,
    linkedin: "#0A66C2",
    radius: 8,
  },
  text: {
    spaceDivider: 12,
    spaceLabel: 14,
    spaceBody: 8,
    spaceButton: 20,
    titleLine: 1.12,
    buasTitleSize: "clamp(24px, 2.05vw, 42px)",
    buasTitleWeight: 600,
    bilkentTitleSize: "clamp(26px, 2.2vw, 46px)",
    bilkentTitleWeight: 800,
    labelSize: 16,
    labelWeight: 600,
    labelShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 6px 18px rgba(0, 0, 0, 0.45)",
    buasLabel: "#FFC496",
    bilkentLabel: "#BFD0FF",
    ruleOpacity: 0.2,
    bodySize: 17,
    buttonSize: 16,
    buttonPadY: 8,
    buttonPadX: 14,
    buttonRadius: 6,
    buttonBorder: "rgba(255, 255, 255, 0.4)",
    buttonWeight: 600,
    courseSize: 16,
    courseCodeWeight: 600,
    courseCodeOpacity: 0.7,
    courseNameWeight: 400,
    courseNameOpacity: 0.95,
    courseUnderline: 0.35,
    courseGap: 8,
    bodyWeight: 400,
    bodyLine: 1.45,
    bodyOpacity: 0.94,
  },
  research: {
    /** How long the panel takes to grow out and shrink back, in seconds. */
    duration: 0.45,
    /** Brightness of the frame behind the open panel. */
    dim: 0.3,
    blur: 3,
    maxWidth: 900,
    /** Tallest the panel may be, as a fraction of the frame height. */
    maxHeight: 0.88,
    navy: "#1B2030",
    border: "rgba(255, 255, 255, 0.15)",
    radius: 12,
    close: 48,
    /** Scale of the panel when it is still at the button. */
    fromScale: 0.08,
  },
  /**
   * The research panel. Live text, in place of the school work-plan pages.
   * The strings are the plan as a visitor should read it.
   */
  researchPlan: {
    title: "My research plan",
    intro:
      "I want a tool that builds dungeon levels the way a designer asks for them. Before a level reaches the designer, computer players with different play styles, called behavioural agents, play it to check that it works as asked.",
    steps: [
      {
        title: "Connect the level builder to simple controls",
        text: "I start from an existing dungeon generator, LevelScript by Bojan, and learn how it places rooms, enemies, items and the exit. Then I turn settings like the number of enemies and items into controls I can change on screen.",
        result: "Maps built from the settings on screen",
      },
      {
        title: "Turn the maps into a game",
        text: "The generator only draws maps. I add simple turn-based rules for moving, collecting treasure, fighting monsters and reaching the exit, so the computer players have a game to play.",
        result: "Playable dungeon levels",
      },
      {
        title: "Build the first computer player",
        text: "I design one player with a clear style from research, such as a Treasure Collector or a Monster Killer, and give it a way to choose its moves. I test it until it plays in that style.",
        result: "A computer player that plays as intended",
      },
      {
        title: "Pick one goal and how to check it",
        text: "I choose one goal that describes how a level should play. I decide which computer players test it, and which results indicate that the goal has been met, such as how much treasure they collect and whether they reach the exit.",
        result: "Which players test it, and which results count",
      },
      {
        title: "Find a level that meets the goal",
        text: "The chosen players play many generated levels. The tool returns the level whose results meet the goal, and shows whether each player succeeded or failed.",
        result: "A matching level, with each player's result",
      },
      {
        title: "Grow to three goals",
        text: "I add two more goals, each with its own players and checks, and make all three selectable on screen.",
        result: "Pick a goal, and a matching level comes back",
      },
      {
        title: "Let the tool create the players",
        text: "Until this step I build the players by hand. Now the tool creates the right players by itself from the goal the designer picks, and I compare its results with the hand-made ones.",
        result: "Goal in, players created, level out",
      },
    ],
    footer: "Alper Bozkurt, Master Game Technology, Breda University of Applied Sciences",
  },
  /** Under the name in the full frame: one sentence, then a short paragraph. */
  intro: {
    lead: "I’m a game programmer who enjoys turning ideas into something playable.",
    more: "I like figuring out how things work, then building something of my own. That has taken me from publishing an online card game to researching how AI can help designers create levels.",
  },
  /** First sentence, shown alone on a compact card. The rest follows in the full text. */
  buasLead:
    "In my master’s research, I explore how AI agents can help generate dungeon levels that match a designer’s goals.",
  buasRest:
    "The aim is to use agents with different play styles to evaluate generated levels and find those that meet the selected goal.",
  /** Line between the Bilkent divider and the course label, with its note. */
  bilkentWhy: {
    line: "These courses made me love this work.",
    label: "Read more",
    note: "These courses helped me see the work behind a game as a series of problems I could reason about. Algorithms made me think about how to find a solution efficiently; automata theory, about how to express rules and states precisely; reinforcement learning, about how decisions can improve through experience. I’m drawn to how those ways of thinking become something playable: a card game that follows its rules, agents that learn to cooperate, or a tool that searches for a level a designer wants.",
  },
  courses: [
    {
      code: "EEE 448",
      name: "Reinforcement Learning and Dynamic Programming",
      href: "https://catalog.bilkent.edu.tr/course/c14448.html",
    },
    {
      code: "CS 476",
      name: "Automata Theory and Formal Languages",
      href: "https://www.cs.bilkent.edu.tr/~dibeklioglu/teaching/cs476/",
    },
    {
      code: "CS 473",
      name: "Algorithms I",
      href: "https://www.cs.bilkent.edu.tr/~ugur/teaching/cs473/",
    },
  ],
  assets: {
    buasCampus: `${import.meta.env.BASE_URL}assets/frame1/buas-campus.jpg`,
    buasLogo: `${import.meta.env.BASE_URL}assets/buas-logo.png`,
    bilkentCampus: `${import.meta.env.BASE_URL}assets/frame1/bilkent-campus.jpg`,
    bilkentLogo: `${import.meta.env.BASE_URL}assets/bilkent-logo.png`,
    portrait: `${import.meta.env.BASE_URL}assets/frame1/portrait-nocrown.jpg`,
  },
  scrollCue: {
    text: "Scroll to continue",
    right: 0.04,
    bottom: 0.04,
    size: 13,
    weight: 500,
    opacity: 0.55,
    nudge: 3,
    every: 4,
    fade: 0.6,
  },
  /**
   * Opening driven by the scroll. It replaces the timed opening below and
   * the scroll cue. The window event is 0 at the start state and 1 at the full frame.
   * Every part reads that value directly.
   */
  scrollOpening: {
    hint: "Scroll to explore.",
    /** Scroll distance from the start state to the full frame, in screen heights. */
    distance: 1.2,
  },
  opening: {
    bilkent: 160,
    buas: 620,
    middle: 1080,
    sides: 1540,
    name: 2020,
  },
  effects: {
    OPENING_SEQUENCE: true,
  },
};
