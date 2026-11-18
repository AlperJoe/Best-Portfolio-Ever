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
    /** Blur on the scene while a card is open. Same timing as the card. */
    openBlur: 4,
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
      text: "Pedro is an online card game. I programmed all of it on a framework with no game tools.",
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
      text: "Pedro runs on LÖVE, the small Lua framework that Balatro was made with. LÖVE only draws, plays sound and reads input. I wrote everything else myself in about 18,000 lines of Lua, including card motion and layout, the rules, the bots and an online server. Pedro is live on iOS and Android.",
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
    before: "Pick a card.",
    /** After one or two cards have been opened. */
    again: "Pick another card.",
    /** After all three cards have been opened. */
    done: "That's my whole hand.",
    /** Shown under the line until the first card opens. */
    helper: "Each card opens a part I built.",
    helperSize: 13,
    helperWeight: 400,
    helperOpacity: 0.7,
    helperGap: 6,
    size: 30,
    line: 1.1,
    color: "#EFC785",
    shadow: "drop-shadow(0 2px 12px rgba(0, 0, 0, 0.82))",
    /** Share of Frame 2 that must be visible before the line appears. */
    viewShare: 0.5,
    /** How often the shine travels across the line. The first pass starts as the line fades in. */
    shine: 6,
    /** How long that shine itself takes, inside each cycle. */
    shineTravel: 2.2,
    cardGap: 16,
    /** Gap kept between the line and the cards when the line sits to their left. */
    sideGap: 20,
    blockGap: 14,
    faceGap: 18,
    /** Image fraction where Pedro's face begins beside the line. */
    faceX: 0.63,
    fade: 0.3,
    /** Gold curve from the line down to the middle card. Its length comes from the layout. */
    arrow: {
      draw: 0.3,
      /** Room kept under the text inside the line block, which sets where the text sits. */
      room: 58,
      stroke: 2.5,
      /** Space between the last line of text and the start of the curve. */
      startGap: 6,
      /** Space between the tip and the top edge of the middle card. */
      cardGap: 14,
      /** Shortest curve kept between the text and the middle card, in px. */
      min: 48,
      /**
       * Sideways pull on the curve's control point, past the tip, in px. Positive pulls right.
       * Near 0 the curve lands straight down; larger values swing the end in at more of an angle.
       */
      bend: 6,
      head: {
        length: 11,
        /** Angle between each arm and the shaft, in degrees. */
        angle: 35,
      },
    },
    /**
     * Short gold dash centered on the painted top edge of a card that has been opened.
     * `topEdge` on each card is that edge, in image fractions, left point then right point.
     */
    mark: {
      length: 16,
      thickness: 2,
    },
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
        title: "Card motion and layout",
        points: [
          [0.4977, 0.6439],
          [0.5518, 0.6101],
          [0.578, 0.8537],
          [0.5224, 0.8906],
        ] satisfies CardPoint[],
        topEdge: [
          [0.5063, 0.6699],
          [0.5297, 0.6429],
        ] satisfies CardPoint[],
        video: true,
        image: null,
        body: "LÖVE has no cards, no tables and no animations. I wrote my own animation system for dealing, dragging and flipping cards, a layout service that places the whole table from one set of coordinates on any screen size, and an input manager that sends every tap to the right layer.",
        links: [
          {
            label: "Read ui/CardAnimator.lua",
            href: "https://github.com/AlperJoe/Pedro/blob/main/ui/CardAnimator.lua",
          },
        ],
      },
      {
        id: "multiplayer" as const,
        title: "The online server",
        points: [
          [0.5349, 0.5909],
          [0.631, 0.5682],
          [0.6619, 0.8623],
          [0.5586, 0.8853],
        ] satisfies CardPoint[],
        topEdge: [
          [0.5367, 0.6062],
          [0.6188, 0.5941],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-multiplayer.jpg`,
          alt: "Pedro's Join Room screen",
        },
        body: "I wrote the multiplayer server myself, in Lua on plain TCP. It runs the rooms, keeps the only true copy of each game and checks every move. A player who drops can reconnect to their own seat, and bots take over the seats nobody is using. Offline games run the same game controller inside the app, so single player and online play follow exactly the same rules.",
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
        topEdge: [
          [0.6516, 0.6054],
          [0.7031, 0.6504],
        ] satisfies CardPoint[],
        video: false,
        image: {
          src: `${base}assets/frame2/pedro-rules.jpg`,
          alt: "Pedro's special cards rule book",
        },
        body: "All the rules live in one pure Lua module with no LÖVE code in it, so the same rules run on the phone and on the server. My bots play by those rules. Each bot keeps three memories, its own hand, the cards it has seen in other hands and the cards already thrown, and decides its moves from them, with no machine learning.",
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
    height: 0.9,
    /** Width divided by the height cap. */
    aspect: 5 / 7,
    /** Flight, turn and growth together, from the hand to the open card. */
    openTime: 0.45,
    /** Return to the hand. The face fades out across this, and the card fades in the last third. */
    closeTime: 0.4,
    /** Soft ease-out. The card, the veil and the blur share it. */
    openEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    /** Soft ease-in-out. The card, the veil and the blur share it. */
    closeEase: "cubic-bezier(0.45, 0.05, 0.55, 0.95)",
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
    titleSize: 24,
    titleWeight: 700,
    titleStretch: 100,
    bodySize: 15,
    bodyWeight: 400,
    bodyStretch: 100,
    bodyLine: 1.5,
    bodyOpacity: 0.88,
    close: 40,
    pad: 20,
    /** Space between the title, picture, text and links. */
    gap: 10,
    /** Picture height as a fraction of the frame, so the copy still fits at 1280×720. */
    picture: 0.2,
    perspective: 1400,
    /** Warm dark veil behind an open card. */
    veil: "rgba(20, 6, 4, 0.72)",
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
