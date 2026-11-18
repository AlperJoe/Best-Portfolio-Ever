const asset = (name: string) => `${import.meta.env.BASE_URL}assets/frame5/${name}`;

export type Film = {
  id: string;
  title: string;
  year: number;
  videoId: string;
  summary: string;
  description: string;
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
    /** Seconds to draw, once, when the frame locks. */
    drawSeconds: 0.6,
    /** Share of the draw time the line takes before the head appears. */
    lineShare: 0.8,
  },

  /** Area both halves share, between the title and the credits. */
  content: {
    /** Top, as a fraction of the frame height. */
    top: 0.15,
    /** Gap above the credits band, in pixels. */
    bottomGap: 12,
  },

  label: {
    size: "14px",
    weight: 600,
    tracking: "0.04em",
    gap: "12px",
  },

  endingA: {
    label: "Ending A",
    line: "You pushed all the way here. I think we should talk.",
    left: 0.06,
    maxWidth: 0.36,
    lineSize: "clamp(30px, 3vw, 52px)",
    lineHeight: 1.1,
    lineGap: "22px",
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
        description:
          "A friend's relationship with Amsterdam. At first it stays on the surface, then he wants to become part of the city. The film follows that change through the five stages of change from psychology.",
      },
      {
        id: "egg",
        title: "How to Boil an Egg",
        year: 2024,
        videoId: "6B0btHK9d2U",
        summary: "A couple shows how to boil an egg, and the egg stands for a child.",
        description:
          "We asked a couple, Ahmet and Ayşe, how to boil an egg, and they do what they have always seen. The egg stands for a child. Ayşe decides on it in a hurry, half to escape her own darkness, and the egg is boiled until it cracks, then thrown away as if that were normal. It is a film about what one thoughtless decision can cause. Every sound except the doorbell is natural, with no effects and no dubbing.",
      },
    ] satisfies Film[],
    cover: (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embed: (videoId: string) =>
      `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`,
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
    fadeMs: 240,
    fromScale: 0.97,
    /** For this long after opening, focus the player takes on its own goes back to the close button. */
    focusGuardMs: 4000,
  },

  credits: {
    /** Height of the band, clamped in pixels, as a fraction of the frame height. */
    height: 0.22,
    minHeight: 150,
    maxHeight: 230,
    bottom: 0.025,
    /** Share of the band, at each edge, that fades out. */
    fade: 0.24,
    size: "13px",
    tracking: "0.08em",
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 1.85,
    /** Gap between the role and the name, in pixels. */
    gap: 22,
    lines: [
      ["Starring", "Alper Bozkurt"],
      ["Cards dealt by", "Pedro"],
      ["Doors held open by", "Agent A and Agent B"],
      ["Levels tested by", "Behavioural agents"],
      ["Wagon pushed by", "You"],
    ] as const,
    /** Space between the last credit and "End of the line.", in pixels. */
    endGap: 34,
    endLine: "End of the line.",
    endSize: "22px",
    backLabel: "Back to the beginning ↑",
    backSize: "13px",
    /** Roll speed, in pixels per second. */
    speed: 22,
    /** Milliseconds after the lock before the roll starts. */
    delay: 300,
    ease: "cubic-bezier(0.3, 0.1, 0.55, 1)",
    /** Reduced motion: line height of the still list. */
    stillLineHeight: 1.5,
  },

  /** The frame Back to the beginning returns to. */
  backTo: "frame1" as const,
};
