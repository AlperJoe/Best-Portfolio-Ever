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
    /** Painted logo stays at least this far from the left edge, in pixels. */
    titleInset: 8,
    /** Space kept clear along the bottom. The caption strip no longer reserves any. */
    bottomClear: 0,
    fillBlur: 40,
    fillDark: 0.46,
    openBlur: 4,
    openBrightness: 0.35,
  },
  /** Fractions of the hero that must stay fully on screen. */
  regions: {
    title: { x: 0.074, y: 0.66, w: 0.4, h: 0.25 } satisfies ImageBox,
    face: { x: 0.6, y: 0.05, w: 0.29, h: 0.58 } satisfies ImageBox,
    /** Pedro! logo on the clean hero, used to keep the headline off it. */
    logo: { x: 0.074, y: 0.675, w: 0.4, h: 0.23 } satisfies ImageBox,
    /** Leftmost hair in the headline's vertical band, as a fraction of the image. */
    hairX: 0.59,
  },
  intro: {
    left: 0.05,
    top: 0.12,
    /** Lowest scale applied to the headline size and the gaps when the block would collide. */
    minFit: 0.62,
    logoGap: 18,
    hairGap: 16,
    headline: {
      text: "I programmed Pedro from scratch, without a game engine.",
      color: "#F5EEE4",
      weight: 800,
      stretch: 80,
      min: 34,
      preferred: 3.6,
      max: 64,
      line: 1.05,
      maxWidth: 0.46,
    },
    lead: {
      text: "I wrote its game AI, its rules and its multiplayer server in pure Lua, and shipped it on iOS and Android.",
      size: 19,
      weight: 400,
      line: 1.5,
      opacity: 0.88,
      maxWidth: 0.4,
      gap: 18,
    },
    stores: {
      height: 52,
      gap: 12,
      lift: 2,
      above: 28,
      appStore: "https://apps.apple.com/tr/app/pedro/id6757151351?l=tr",
      play: "https://play.google.com/store/apps/details?id=com.alperjoe.pedro&hl=tr",
      /**
       * The official Google Play badge PNG includes transparent clear space.
       * These are the file's own pixels, used only to show the badge at the
       * requested height without editing the artwork.
       */
      playFile: { width: 646, height: 250, inset: 41, contentWidth: 564, contentHeight: 168 },
    },
  },
  line: {
    text: "Pick a card.",
    size: 30,
    line: 1.1,
    color: "#EFC785",
    shadow: "drop-shadow(0 2px 12px rgba(0, 0, 0, 0.82))",
    /** How often the shine travels across the line. */
    shine: 6,
    /** How long that shine itself takes, inside each cycle. */
    shineTravel: 2.2,
    cardGap: 16,
    blockGap: 14,
    faceGap: 18,
    /** Image fraction where Pedro's face begins beside the line. */
    faceX: 0.63,
    fade: 0.45,
  },
  light: {
    color: "#FFD9A0",
    /** How long one brighten-and-dim cycle takes. */
    seconds: 4,
    /** Diameter of the light compared with the span of the three cards. */
    cover: 1.45,
  },
  cardBack: {
    width: 608,
    height: 818,
  },
  cards: {
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
        body: "The code has three layers: client, server and core. All rules, phases and card effects live in plain Lua logic, separate from the rendering. The bots make rule-based decisions with memory and targeting, with no machine learning. I also prepared the iOS release and kept it stable on different screen sizes.",
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
    /** Flight, turn and growth together, from the hand to the open card. */
    openTime: 0.45,
    /** Return to the hand. The face fades out across this, and the card fades in the last third. */
    closeTime: 0.4,
    openEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    closeEase: "cubic-bezier(0.33, 0, 0.2, 1)",
    /** Keeps the back toward the camera until the face fades in. */
    openSpinEase: "cubic-bezier(0.45, 0, 0.2, 0.15)",
    closeSpinEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Face fade during the last third of the open. */
    openFace: 0.15,
    openFaceDelay: 0.3,
    /** Face fades into the back across the first part of the close. */
    closeFace: 0.26,
    /** Card fade during the last third of the close. */
    closeFade: 0.133,
    closeFadeDelay: 0.267,
    radius: 14,
    navy: "#111F2C",
    gold: "#EFC785",
    goldHover: "#FFE7B5",
    titleSize: 28,
    titleWeight: 700,
    titleStretch: 100,
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
    hero: `${base}assets/frame2/pedro-hero-clean.jpg`,
    gameplay: `${base}assets/frame2/pedro-gameplay.mp4`,
    poster: `${base}assets/frame2/pedro-gameplay-poster.jpg`,
    cardBack: `${base}assets/frame2/card-back.webp`,
    appStore: `${base}assets/frame2/app-store-badge.svg`,
    play: `${base}assets/frame2/google-play-badge.png`,
  },
};

export type Frame2Card = (typeof frame2Config.cards.items)[number];
export type Frame2CardId = Frame2Card["id"];
