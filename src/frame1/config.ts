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
    /** Portrait height in the full frame, as a fraction of the frame height. */
    portrait: 0.48,
    /** Largest the portrait gets in the start state, as a fraction of the frame height. */
    portraitStart: 0.62,
    /** Top, bottom and outer margins, as a fraction of the frame height. */
    margin: 0.056,
    marginMin: 48,
    marginMax: 72,
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
    /** School marks, in pixels. They sit in the bottom margin. */
    mark: 22,
    /** Stacked cards when the frame is narrower than this, or taller than it is wide. */
    stackBelow: 1000,
    /** No text on this frame goes below this size, in pixels. */
    minText: 13,
    /** Where the top of the hair sits in the full frame, as a fraction of the frame height. */
    hairFrame: 0.048,
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
    lineSize: 18,
    lineWeight: 400,
    lineLine: 1.45,
    lineOpacity: 0.88,
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
  /** Line under the name in the full frame. */
  tagline: "I'm a game programmer. I build gameplay systems and game AI.",
  /** First sentence, shown alone on a compact card. The rest follows in the full text. */
  buasLead:
    "In my master's research, I explore how AI agents can help generate dungeon levels that match a designer's goals.",
  buasRest:
    "Agents with different play styles play every new level, so each level is already playtested when the designer sees it.",
  /** Line between the Bilkent divider and the course label, with its "Why I say this" note. */
  bilkentWhy: {
    line: "These courses made me love this work.",
    label: "Why I say this",
    note: "Every system runs on algorithms. At the low level, small blocks each do one exact job, and you engineer them together into something new. Underneath it all is one skill, designing algorithms at both the high and the low level and adapting them to the problem. These courses taught me that skill.",
  },
  /** The "Why I say this" control: same color as the course codes nearby. */
  why: {
    color: "rgba(255, 255, 255, 0.7)",
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
    research1: `${import.meta.env.BASE_URL}assets/frame1/research-plan-1.webp`,
    research2: `${import.meta.env.BASE_URL}assets/frame1/research-plan-2.webp`,
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
    hint: "Scroll me to know me better.",
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
