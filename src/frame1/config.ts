export const frame1Config = {
  colors: {
    buasTone: "#ED7624",
    bilkentTone: "#001489",
    middleTone: "#F2EEE6",
  },
  /** Seam blend band as a fraction of the frame width. */
  blendWidth: 0.2,
  /** Side focal lights stay off. The crown glow is the only added light. */
  lightStrength: 0,
  /** Share of the region tone in each side light. The rest is white. */
  lightToneMix: 0.58,
  /** Radius of each focal light as a fraction of the frame width. */
  lightRadius: 0.42,
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
  /** object-position kept for the portrait asset. The face is placed in layout. */
  portraitPosition: "50% 46%",
  colorOverlay: {
    opacity: 0.84,
    blendMode: "multiply" as const,
  },
  /** Darkness under the lights, multiplied by lightStrength. */
  shadeAmount: 0.16,
  /** The portrait is shaded less so the face stays clear. */
  portraitShadeAmount: 0.05,
  /** The seam light band is off. */
  edgeGlowReach: 0.22,
  edgeGlowStrength: 0,
  /** Two-sided edge light on the portrait stays off. */
  portraitEdgeStrength: 0,
  /** Largest shift of the focal lights toward the cursor, as a fraction of frame width. */
  cursorLightShift: 0,
  /** Largest shift of the campus photos away from the cursor, in pixels. */
  cursorPhotoShift: 10,
  /**
   * Black veil over each campus photo. The text sits in the dark top,
   * and the buildings show through the lighter lower half.
   */
  veil: {
    top: 0.9,
    bottom: 0.28,
  },
  badge: {
    plate: "#F2EEE6",
    plateOpacity: 0.92,
    /** Same inner padding on every side, in pixels. */
    pad: 8,
    radius: 8,
    /** Shared plate size, as fractions of the frame. */
    width: 0.12,
    height: 0.055,
    /** Space between a text block and its badge, in pixels. */
    gap: 24,
    /** Lift on hover and keyboard focus, in pixels. */
    lift: 2,
    /** School color mixed into the plate on hover and focus. */
    tint: 0.18,
    buasTint: "#ED7624",
    bilkentTint: "#0053A0",
  },
  duotone: {
    contrast: 1.35,
    buasHighlight: 0.52,
    buasShadow: 0.4,
    bilkentHighlight: 0.3,
    bilkentShadow: 1,
    buasShade: 0.48,
    bilkentShade: 0.8,
  },
  campus: {
    /** Soft fade at the top of each photo, as a fraction of the frame height. */
    fade: 0.1,
    /**
     * Each photo covers its triangle's box: this share of the frame width,
     * and the full frame height. object-fit cover, anchored to the bottom
     * corner so cropping takes sky.
     */
    boxWidth: 0.5,
  },
  /**
   * A small glow centered on the apex, above the crown.
   * Opacity is the center. Reach is how far it travels down the frame,
   * as a fraction of the frame height, and it ends before the crown.
   */
  crownGlow: {
    rgb: "255, 214, 170",
    opacity: 0.16,
    reach: 0.04,
    shift: "-50%",
  },
  portraitLayout: {
    /** Ceiling on enlargement. */
    maxScale: 1.35,
    naturalWidth: 1024,
    naturalHeight: 1026,
    /** Top of the crown, as a fraction of the photo. */
    crownTopY: 0.02,
    /** Where that crown top sits, as a fraction of the frame height. */
    crownFrame: 0.06,
    /** Bottom of the chin and the top of the shoulders, as fractions of the photo. */
    chinY: 0.68,
    shoulderY: 0.8,
    /** The chin and the shoulders stay this many pixels above the name. */
    chinGap: 8,
    shoulderGap: 14,
    /** Where the eyes sit in the photo, as a fraction of its height. */
    eyeY: 0.44,
    /** Sides of the face at eye level, as fractions of the photo width. */
    faceLeft: 0.373,
    faceRight: 0.691,
    /** How far the fade runs after the top of the name, as a fraction of frame height. */
    fadeSpan: 0.07,
    /**
     * Soft oval that holds the crown, face and shoulders, and is fully
     * transparent before the photo's straight edges.
     */
    mask: {
      cx: 0.5,
      cy: 0.46,
      rx: 0.78,
      ry: 0.7,
      /** Opaque inside this share of the oval. Outside it, the edge falls away. */
      solid: 0.78,
      /** Outer share of the photo that stays fully transparent. */
      sideClear: 0.1,
      /** Width of the fade that follows that clear band, as a share of the photo. */
      sideSoft: 0.16,
      /** The strip above the crown fades out before the photo's top edge. */
      topClear: 0,
      topSoft: 0.018,
    },
  },
  middle: {
    /** Bottom of the line under the name, as a fraction of the frame height. */
    bottom: 0.06,
    /** Widest the block may be, as a fraction of the frame width. */
    maxWidth: 0.44,
    /** Clear space kept between this block and each seam. */
    seamGap: 20,
    /** Clear space kept between this block and a side block. */
    blockGap: 16,
    nameSize: "clamp(56px, 5.2vw, 96px)",
    nameLine: 1,
    nameColor: "#F2EEE6",
    nameGap: 10,
    lineSize: 19,
    lineWeight: 400,
    lineLine: 1.45,
    lineOpacity: 0.88,
  },
  icons: {
    size: 48,
    /** Lift on hover and keyboard focus, in pixels. */
    lift: 2,
    /** Space between each mark and the name, in pixels. */
    nameGap: 28,
    /** Clear space kept between a mark and a seam, in pixels. */
    seamGap: 16,
    linkedin: "#0A66C2",
    radius: 8,
    glow: 16,
  },
  text: {
    /** Side blocks sit this far in from the left and right edges. */
    insetX: 0.05,
    /** Both blocks start this far below the top edge. */
    insetY: 0.07,
    /** Shared rhythm: under the title, under the divider, under the label, above the button. */
    spaceDivider: 12,
    spaceLabel: 16,
    spaceBody: 8,
    spaceButton: 24,
    /** Lines stop this far before the seam, as a fraction of the frame width. */
    seamInset: 0.04,
    titleLine: 1.05,
    buasTitleSize: "clamp(32px, 3vw, 56px)",
    buasTitleWeight: 600,
    bilkentTitleSize: "clamp(34px, 3.2vw, 60px)",
    bilkentTitleWeight: 800,
    labelSize: 18,
    labelWeight: 600,
    /** Same soft shadow the other Frame 1 text uses. */
    labelShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 6px 18px rgba(0, 0, 0, 0.45)",
    buasLabel: "#FFC496",
    bilkentLabel: "#BFD0FF",
    ruleOpacity: 0.2,
    bodySize: 20,
    buttonSize: 17,
    buttonPadY: 8,
    buttonPadX: 14,
    buttonRadius: 6,
    buttonBorder: "rgba(255, 255, 255, 0.4)",
    buttonWeight: 600,
    buttonGap: 16,
    /** How far the research arrow travels on hover and focus, in pixels. */
    arrowShift: 4,
    courseSize: 20,
    courseCodeWeight: 600,
    courseCodeOpacity: 0.7,
    courseNameWeight: 400,
    courseNameOpacity: 0.95,
    courseUnderline: 0.35,
    courseGap: 8,
    bodyWeight: 400,
    bodyLine: 1.45,
    bodyOpacity: 0.94,
    shade: 0.35,
    shadeBlur: 26,
  },
  seams: {
    /** Soft blend width at the top, as a fraction of the frame width. */
    top: 0.22,
    /** Soft blend width at the bottom, as a fraction of the frame width. */
    bottom: 0.34,
    campusReach: 0.034,
    /**
     * Share of edgeLimit the noise may use. The seam stays on the true
     * line, with only a little roughness so it is not a ruler line.
     */
    noise: 0,
    /** Largest shift of either seam from its true line, as a fraction of frame width. */
    edgeLimit: 0,
    columns: 5,
    rows: 4,
    steam: 1,
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
    portrait: `${import.meta.env.BASE_URL}assets/frame1/portrait.jpg`,
    research1: `${import.meta.env.BASE_URL}assets/frame1/research-plan-1.webp`,
    research2: `${import.meta.env.BASE_URL}assets/frame1/research-plan-2.webp`,
  },
  opening: {
    bilkent: 160,
    buas: 620,
    middle: 1080,
    sides: 1540,
    name: 2020,
  },
  effects: {
    PORTRAIT_EDGE_LIGHT: false,
    OPENING_SEQUENCE: true,
    CURSOR_REACTION: true,
    FILM_GRAIN: true,
  },
  /** Strength of the film grain over the frame. The portrait keeps only a share of it. */
  grainAlpha: 0.11,
  /** Share of the film grain kept on the portrait. Half strength at most. */
  grainOnPortrait: 0.5,
};
