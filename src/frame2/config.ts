const base = import.meta.env.BASE_URL;

export type ImageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CardPoint = [number, number];

export const frame2Config = {
  image: {
    width: 2560,
    height: 1333,
    /** object-position, used when the sharp image can keep it. */
    positionX: 0.3,
    positionY: 0.5,
    /** Painted title stays at least this far from the left edge, in pixels. */
    titleInset: 32,
    fillBlur: 40,
    fillDark: 0.46,
    openBlur: 4,
    openBrightness: 0.35,
  },
  /** Fractions of pedro-hero.jpg that must stay fully on screen. */
  regions: {
    title: { x: 0.046, y: 0.09, w: 0.45, h: 0.845 } satisfies ImageBox,
    face: { x: 0.63, y: 0.05, w: 0.3, h: 0.58 } satisfies ImageBox,
  },
  caption: {
    gradient: 0.22,
    color: "#1A0806",
    opacity: 0.9,
    insetX: 0.05,
    maxWidth: 640,
    size: 17,
    weight: 400,
    stretch: 100,
    line: 1.45,
    textOpacity: 0.92,
    padBottom: 28,
    /** Extra space kept between the title and the caption row. */
    safeGap: 12,
    text: "An online multiplayer card game, published on the App Store. I built the programming side from scratch in pure Lua and LÖVE2D, working with a designer.",
  },
  buttons: {
    plate: "#111F2C",
    gold: "#EFC785",
    goldHover: "#FFE7B5",
    cut: 8,
    size: 15,
    weight: 500,
    stretch: 100,
    gap: 10,
    padX: 16,
    padY: 10,
    appStore: "https://apps.apple.com/tr/app/pedro/id6757151351?l=tr",
    code: "https://github.com/AlperJoe/Pedro",
  },
  hint: {
    /** Center of the hint, as a fraction of the hero image. */
    x: 0.56,
    y: 0.46,
    size: 15,
    weight: 500,
    stretch: 100,
    color: "#EFC785",
    text: "Pick a card",
  },
  cards: {
    glowSeconds: 3,
    lift: 6,
    gold: "#EFC785",
    items: [
      {
        id: "play" as const,
        title: "How it plays",
        points: [
          [0.4977, 0.6439],
          [0.5518, 0.6101],
          [0.578, 0.8537],
          [0.5224, 0.8906],
        ] satisfies CardPoint[],
        video: true,
        image: null,
        body: "Everyone tries to keep their score low, because only the lowest survives. You bluff, discard and use special cards to swap hands, steal cards and reveal hidden values. You can play online with friends in rooms, or offline against bots.",
        links: [] as { label: string; href: string }[],
      },
      {
        id: "multiplayer" as const,
        title: "Multiplayer",
        points: [
          [0.5349, 0.5909],
          [0.631, 0.5682],
          [0.6619, 0.8623],
          [0.5586, 0.8853],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-multiplayer.jpg`,
          alt: "Pedro's Join Room screen",
        },
        body: "I wrote a custom TCP server for real-time play. Players create and join rooms. The server holds the true game state and checks every move, and clients stay in sync through state snapshots. Keeping every rule check on the server side is how I cut down desync errors.",
        links: [
          {
            label: "Read server/TcpServer.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/server/TcpServer.lua",
          },
        ],
      },
      {
        id: "rules" as const,
        title: "Rules and bots",
        points: [
          [0.6139, 0.5909],
          [0.6964, 0.6107],
          [0.7068, 0.942],
          [0.6302, 0.9155],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-rules.jpg`,
          alt: "Pedro's special cards rule book",
        },
        body: "The code has three layers: client, server and core. All rules, phases and card effects live in plain Lua logic, separate from the rendering. The bots make rule-based decisions with memory and targeting, with no AI or machine learning. I also prepared the iOS release and kept it stable on different screen sizes.",
        links: [
          {
            label: "Read core/Rules.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/core/Rules.lua",
          },
          {
            label: "Read core/Agent.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/core/Agent.lua",
          },
        ],
      },
    ],
  },
  open: {
    /** Cap for the open card, as a fraction of the frame. Its width stays 5/7 of this height. */
    height: 0.78,
    /** Width divided by the height cap. */
    aspect: 5 / 7,
    duration: 0.6,
    radius: 14,
    navy: "#111F2C",
    gold: "#EFC785",
    titleSize: 28,
    titleWeight: 600,
    titleStretch: 112,
    bodySize: 17,
    bodyWeight: 400,
    bodyStretch: 100,
    bodyLine: 1.5,
    bodyOpacity: 0.88,
    close: 44,
    pad: 28,
    perspective: 1400,
    fire: "rgba(255, 132, 42, 0.55)",
    fireCore: "rgba(255, 196, 110, 0.72)",
  },
  embers: {
    count: 16,
    band: 0.28,
    riseMin: 16,
    riseMax: 36,
    lifeMin: 5,
    lifeMax: 8.5,
    sizeMin: 1.4,
    sizeMax: 3.1,
  },
  effects: {
    EMBERS_ENABLED: true,
  },
  assets: {
    hero: `${base}assets/frame2/pedro-hero.jpg`,
    gameplay: `${base}assets/frame2/pedro-gameplay.mp4`,
    poster: `${base}assets/frame2/pedro-gameplay-poster.jpg`,
  },
};

export type Frame2Card = (typeof frame2Config.cards.items)[number];
export type Frame2CardId = Frame2Card["id"];
