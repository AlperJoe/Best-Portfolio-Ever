const asset = (name: string) => `${import.meta.env.BASE_URL}assets/frame5/${name}`;

export type HobbyIcon = "piano" | "ticket" | "ball" | "mat" | "piece";

/** One block of the longer note. A heading is the small label above its paragraphs. */
export type FilmPart = {
  heading?: string;
  paragraphs: readonly string[];
};

export type Film = {
  id: string;
  title: string;
  year: number;
  videoId: string;
  /**
   * Small line on the card. When set, the same sentence covers the video
   * until the visitor chooses to watch.
   */
  warning?: string;
  /** The line under the title on the card. */
  summary: string;
  /** Short note beside the video when the film opens. */
  personal: string;
  /** Longer note, opened in place from "Want to understand it better?". */
  long: readonly FilmPart[];
};

/**
 * Every tunable for Frame 5. Layout, color, type, motion and copy live here.
 * Fractions are of the frame width or height unless a unit is given.
 */
export const frame5 = {
  /** Main object for the transition: the row of film covers. */
  mainId: "frame5-main-image",
  /** Blurred colors the transition mixes when it enters or leaves this frame. */
  palette: {
    base: "#0b0b0d",
    blobs: [
      { x: 0.12, y: 0.55, r: 0.6, color: "rgba(237, 118, 36, 0.12)" },
      { x: 0.88, y: 0.5, r: 0.6, color: "rgba(40, 70, 190, 0.16)" },
      { x: 0.5, y: 0.5, r: 0.35, color: "rgba(4, 4, 6, 0.6)" },
    ],
  },

  background: "#0B0B0D",
  /** Very faint tints on each half, after the orange and blue sides of Frame 1. */
  warmTint: "rgba(237, 118, 36, 0.06)",
  coolTint: "rgba(40, 72, 200, 0.075)",
  /** Width of the soft blend between the halves, centered on the middle. */
  blendWidth: 0.3,
  /** Tints fade toward the top and bottom so the corners stay near black. */
  tintFadeTop: 0.04,
  tintFadeBottom: 0.82,
  warmWhite: "#F2EEE6",
  white55: "rgba(255, 255, 255, 0.55)",
  white70: "rgba(255, 255, 255, 0.7)",
  focus: "#F2EEE6",
  grainAlpha: 0.05,

  title: {
    text: "Pick your ending.",
    top: 0.07,
    size: "clamp(28px, 2.6vw, 44px)",
    line: 1.1,
  },
  /** The two lines beside the title that point to Ending A and Ending B. */
  arrows: {
    /** Gap between the title and the start of a line, in pixels. */
    gap: 18,
    /** Length of each line, as a fraction of the frame width, clamped in pixels. */
    length: 0.12,
    minLength: 90,
    maxLength: 240,
    /** How far each line bends down toward its half, in pixels. */
    drop: 16,
    /** Arrowhead size, in pixels, and its half angle, in degrees. */
    head: 7,
    headAngle: 30,
    stroke: 1.25,
    color: "rgba(242, 238, 230, 0.55)",
    /** Seconds to draw, once, when the frame arrives. */
    drawSeconds: 0.3,
    /** Share of the draw time the line takes before the head appears. */
    lineShare: 0.8,
  },

  /** Area both halves share, between the title and the back link. */
  content: {
    /** Top, as a fraction of the frame height. */
    top: 0.125,
  },

  /**
   * Small label above each ending, and the subheads inside a film note.
   * Same size, weight and letter spacing so the hierarchy matches.
   */
  label: {
    size: "14px",
    weight: 600,
    tracking: "0.12em",
    gap: "10px",
  },

  /** Invitations to act. The underline draws only on hover or keyboard focus. */
  cta: {
    color: "#EFC785",
    size: "20px",
    draw: "0.2s",
  },

  /**
   * The egg film. The small line stays on the card. The same sentence,
   * a mark, and the invitation to watch cover the video until it starts.
   */
  warning: {
    size: "13px",
    color: "#C17B74",
    gate: {
      watchLabel: "Watch the film",
      /** Warning mark, in pixels. */
      markSize: 48,
      /** Dark veil over the cover image. */
      veil: "rgba(8, 6, 8, 0.72)",
      /** Softer dark pool behind the mark, the sentence and the button. */
      pool: "radial-gradient(ellipse at center, rgba(6, 5, 8, 0.94) 0%, rgba(6, 5, 8, 0.86) 42%, rgba(6, 5, 8, 0.4) 68%, rgba(6, 5, 8, 0) 82%)",
      textSize: "16px",
      textColor: "#F2EEE6",
    },
  },

  endingA: {
    label: "Ending A",
    line: "You scrolled all the way here. I think we should talk.",
    left: 0.06,
    maxWidth: 0.36,
    /**
     * Narrowest width for this half, in pixels. On a short screen the column
     * is too slim for the photo to sit beside the lines, and the stacked
     * photo leaves no room under the contact details.
     */
    minWidth: 560,
    lineSize: "clamp(30px, 3vw, 52px)",
    lineHeight: 1.1,
    lineGap: "12px",
    /** Photo beside the contact lines, or above them. "auto" picks what fits. */
    photoPlacement: "auto" as "auto" | "right" | "above",
    photo: asset("contact-photo.webp"),
    photoWidth: 120,
    photoBorder: 6,
    photoBorderColor: "#F4EFE6",
    photoRotate: -2,
    photoShadow: "0 14px 30px rgba(0, 0, 0, 0.5), 0 3px 8px rgba(0, 0, 0, 0.35)",
    /** Gap between the photo and the contact lines, in pixels. */
    photoGap: 28,
    contactSize: "18px",
    contactGap: "12px",
    iconSize: "18px",
    iconColor: "rgba(242, 238, 230, 0.6)",
    linkHover: "#FFFFFF",
    writeLabel: "Write",
    copiedLabel: "Copied",
    copiedMs: 1500,
    cvLabel: "Download my CV",
    cv: asset("alper-bozkurt-cv.pdf"),
    /**
     * Built in the browser so the address and number never sit in the
     * markup as plain text.
     */
    email: { name: ["alperjoe", "bozkurt"], domain: ["gmail", "com"] },
    phone: { country: "31", groups: ["6", "8558", "5100"] },
    socialSize: 32,
    socialGap: "14px",
    github: "https://github.com/AlperJoe",
    linkedin: "https://www.linkedin.com/in/alperbozkurt/",
    githubBackground: "#FFFFFF",
    githubColor: "#181717",
    linkedinBackground: "#0A66C2",
    linkedinColor: "#FFFFFF",
    /** Block under the contact details and the photo, across this half. */
    hobbies: {
      heading: "Know me better.",
      line: "Let's talk about hobbies. This is what I do every week.",
      items: [
        { id: "piano", label: "Piano and bass in a jam session" },
        { id: "ticket", label: "Cinema, up to three times a week" },
        { id: "ball", label: "Basketball and volleyball" },
        { id: "mat", label: "Yoga" },
        { id: "piece", label: "Board games" },
      ] satisfies { id: HobbyIcon; label: string }[],
      /** Display face, about 30px, under the ending line. */
      headingSize: "30px",
      /** Archivo, on its own line under the heading. */
      textSize: "13px",
      /** Clear space between the contact block and this heading, in pixels. */
      topGap: "22px",
      iconSize: "32px",
      /** Each hobby is a ticket stub, pinned under the contact details. */
      ticket: {
        paper: "#F3EADB",
        ink: "#2B211A",
        /** At least 13px, and about 30% above the previous 11.5px stubs. */
        textSize: "15px",
        band: "6.5px",
        /** Radius of the half circles along the torn edge, and their spacing, in pixels. */
        tearRadius: 3.4,
        tearStep: 10,
        gap: "12px",
        shadow: "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))",
        /** Band color, tilt in degrees and a small vertical nudge in pixels, per hobby. */
        look: {
          piano: { band: "#ED7624", tilt: -3, lift: 2 },
          ticket: { band: "#C8452E", tilt: 2.5, lift: -2 },
          ball: { band: "#E3A23B", tilt: -1.5, lift: 3 },
          mat: { band: "#B9704A", tilt: 3.5, lift: -1 },
          piece: { band: "#D9622B", tilt: -2.5, lift: 1 },
        } satisfies Record<HobbyIcon, { band: string; tilt: number; lift: number }>,
        stamp: {
          on: "ticket" as HobbyIcon,
          text: "up to 3×",
          color: "#B23A26",
          size: 44,
          fontSize: "11px",
          tilt: -14,
        },
      },
    },
  },

  endingB: {
    label: "Ending B",
    line: "Or watch the no-script short films I shot when I wanted to be a filmmaker. They have a bit of an art-house mood.",
    left: 0.54,
    right: 0.05,
    lineSize: "clamp(22px, 2vw, 34px)",
    lineHeight: 1.2,
    lineGap: "22px",
    cardGap: "22px",
    cardTextSize: "14px",
    cardTextLine: 1.45,
    cardTitleWeight: 600,
    cardTextGap: "10px",
    coverRadius: "4px",
    coverHoverScale: 1.03,
    coverMs: 220,
    playSize: 46,
    playBackground: "rgba(0, 0, 0, 0.45)",
    playBackgroundHot: "rgba(0, 0, 0, 0.65)",
    playOpacity: 0.82,
    films: [
      {
        id: "change",
        title: "Change: An Amsterdam Journal",
        year: 2023,
        videoId: "Eu5t1X9Fnzc",
        summary:
          "A friend's relationship with Amsterdam, from the surface to belonging, told through the five stages of change.",
        personal:
          "Amsterdam was the first love of a friend of mine. At first his bond with the city stayed on the surface. Over time he fell in love with it and began to feel like a part of it. The film tells that change with no script, only through mise-en-scène and cinematography.",
        long: [
          {
            paragraphs: [
              "I had no production team and no time to prepare the shoot, so I made the film in the form of a travel vlog. I caught each scene myself when it matched the story, and then I put the scenes together. The film follows the change through the five stages of change from psychology.",
            ],
          },
        ],
      },
      {
        id: "egg",
        title: "How to Boil an Egg",
        year: 2024,
        videoId: "6B0btHK9d2U",
        warning: "Content warning: this film contains violence.",
        summary: "A couple shows how to boil an egg, and the egg stands for a child.",
        personal:
          "This film is personal. It comes from the life of a person I love very much, and I did not want to hide that. The whole project began as a film I wanted to dedicate to this person, and in a way it is also a memorial. Their identity stays private, and they agreed to it. It tells a story about a woman and a child that exists even when we do not see it. It can be hard to watch, but that does not make it less real, so I used no effects and no tricks.",
        long: [
          {
            heading: "What really happened",
            paragraphs: [
              "The woman in the film is young, and in real life she was even younger. When these things happened to her, she was eight years younger than the actress who plays her. I know this makes the film more disturbing, but this is what happened. I play the father. I made my voice as deep as I could and never show myself, because in real life he was twice my age when these things happened.",
            ],
          },
          {
            heading: "Why a system",
            paragraphs: [
              "My aim was to show it as it is. I did not try to make it disturbing. However hard the story is, I did not want the film to ask for pity for one person. Many people inside this system became like this without being aware of it. So I built a wider narrative and tied it to one theme, a cycle that repeats itself. The film is about that system.",
            ],
          },
          {
            heading: "Reading the film",
            paragraphs: [
              "We asked a couple, Ahmet and Ayşe, how to boil an egg, and they do what they have always seen. The egg stands for a child.",
              "Ayşe comes quickly out of the dark into a room with very bright light. The contrast shows that her decision was born in the dark. She wants to be in the light, which means she wants to take on the idea of having a child, but all of it is an attempt to escape the dark. Both decisions, boiling the egg and having a child, come from a sudden urge.",
              "The axis is broken on purpose, so we sense that something does not fit. She goes on anyway. She already knows how to make the egg. The hard part is why she makes it, and that question is already behind her. The pan to the right shows how smooth the action is for her, and with no technical mistake she leaves the egg to boil, the way a child is left open to the world.",
              "At first she watches over it. Then a rack focus shows that her attention moves to herself, because she is the one trying to survive. She is tense, and we do not know why yet.",
              "Then the doorbell rings, as it does again and again. This visit is part of a cycle. Two pans to the left take her to the door and tell us that something dangerous and wrong is coming. She knows who it is and what will happen, and she opens the door anyway. While the egg boils, we see what the child is exposed to. Surrounded and unable to move, it takes it all without a reaction.",
              "The egg boils hard, and a small crack appears. It has to stay where it is, so it only keeps bubbling inside.",
              "In the end, the mother turns off the timer and the stove as if nothing happened. A lot of time has passed, and the egg and the place it grew up in are broken. We hear her throw the egg into the trash as if that were normal. To her, a broken person is normal, because she grew up seeing the same thing.",
              "Every sound except the doorbell is natural. There are no effects and no dubbing.",
            ],
          },
        ],
      },
    ] satisfies Film[],
    cover: (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embed: (videoId: string) =>
      `https://www.youtube-nocookie.com/embed/${videoId}?start=0&autoplay=1&rel=0&playsinline=1`,
    watch: (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`,
  },

  overlay: {
    backdrop: "rgba(4, 4, 6, 0.78)",
    panel: "#141418",
    border: "rgba(255, 255, 255, 0.12)",
    radius: "12px",
    /** Panel width, as a fraction of the frame width, capped in pixels. */
    width: 0.9,
    maxWidth: 1180,
    /** Highest share of the frame height the panel may use. */
    maxHeight: 0.88,
    /** Share of the panel width the video takes when the text sits beside it. */
    videoShare: 0.66,
    pad: "22px",
    gap: "24px",
    titleSize: "clamp(26px, 2.2vw, 36px)",
    bodySize: "15px",
    bodyLine: 1.55,
    closeSize: 40,
    watchLabel: "Watch on YouTube",
    moreLabel: "Want to understand it better?",
    lessLabel: "Show less",
    fadeMs: 240,
    fromScale: 0.97,
    /** For this long after opening, focus the player takes on its own goes back to the close button. */
    focusGuardMs: 4000,
  },

  /** "Back to the beginning", centered near the bottom of the frame. */
  back: {
    label: "Back to the beginning",
    /** Distance from the bottom edge, in pixels. */
    bottom: 18,
    /**
     * Room kept above the link so the endings never sit on it.
     * Counts the link itself plus a gap, in pixels.
     */
    clearance: 54,
  },

  /**
   * Screens narrower than 700px: one column, with the photo smaller beside
   * the Ending A line and the tickets two to a row.
   */
  phone: {
    /** Side margins, in pixels. */
    margin: 24,
    lineSize: "28px",
    photoWidth: 84,
    contactSize: "16px",
    ticketSize: "14px",
  },

  /** The frame Back to the beginning returns to. */
  backTo: "frame1" as const,
};
