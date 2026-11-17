export const frame1Config = {
  colors: {
    buasTone: "#ED7624",
    bilkentTone: "#001489",
    middleTone: "#F2EEE6",
  },
  /** Seam blend band as a fraction of the frame width. */
  blendWidth: 0.08,
  /**
   * Focal-light intensity. 0 removes the lights and the darkening
   * that makes the frame fall off away from the focal points.
   */
  lightStrength: 0.9,
  /** Share of the region tone in each side light. The rest is white. */
  lightToneMix: 0.58,
  /** Radius of each focal light as a fraction of the frame width. */
  lightRadius: 0.42,
  links: {
    github: "https://github.com/AlperJoe",
    linkedin: "https://www.linkedin.com/in/alperbozkurt/",
  },
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
  /** How far the portrait edge glow reaches, as a fraction of frame width. */
  edgeGlowReach: 0.11,
  edgeGlowStrength: 0.5,
  /** Largest shift of the focal lights toward the cursor, as a fraction of frame width. */
  cursorLightShift: 0.02,
  /** Largest shift of the campus photos away from the cursor, in pixels. */
  cursorPhotoShift: 10,
  /**
   * Black veil over each campus photo. Buildings stay visible up high,
   * and the text sits on the darker ground below.
   */
  veil: {
    top: 0.35,
    bottom: 0.75,
  },
  badge: {
    plate: "#F2EEE6",
    plateOpacity: 0.92,
    padY: 8,
    padX: 12,
    radius: 8,
    /** Space between the badge and the title. */
    gap: 16,
    buasHeight: 44,
    bilkentHeight: 36,
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
    pad: 28,
    buas: {
      scale: 1.02,
      anchorX: 0.57,
      anchorY: 0.2,
      placeX: 0.09,
      placeY: 0.33,
      aspect: 480 / 480,
    },
    bilkent: {
      scale: 1.03,
      anchorX: 0.88,
      anchorY: 0.42,
      placeX: 0.9,
      placeY: 0.42,
      aspect: 689 / 445,
    },
  },
  portraitLayout: {
    /** Height of the portrait as a fraction of the frame height. */
    height: 0.66,
    maxScale: 1.2,
    naturalWidth: 1024,
    naturalHeight: 1026,
    /** Point in the photo that lands on the middle focal point. */
    faceX: 0.5,
    faceY: 0.46,
    /** Where the bottom fade into black begins, as a fraction of the photo height. */
    bottomFade: 0.72,
  },
  middle: {
    /** Top of the name block, as a fraction of the frame height. */
    top: 0.7,
    /** Widest the block may be, as a fraction of the frame width. */
    maxWidth: 0.3,
    /** Clear space kept between this block and each seam. */
    seamGap: 20,
    /** Clear space kept between this block and a side block. */
    blockGap: 16,
    nameSize: "clamp(48px, 4.4vw, 80px)",
    nameLine: 1,
    nameColor: "#F2EEE6",
    nameGap: 10,
    lineSize: 17,
    lineWeight: 400,
    lineLine: 1.45,
    lineOpacity: 0.85,
  },
  icons: {
    size: 64,
    /** Lift on hover and keyboard focus, in pixels. */
    lift: 2,
    /** Distance from the frame center to an icon's center, as a fraction of width. */
    offset: 0.17,
    linkedin: "#0A66C2",
    radius: 8,
    glow: 16,
  },
  text: {
    /** Side blocks sit this far in from the left and right edges. */
    insetX: 0.05,
    /** Side blocks sit this far above the bottom edge. */
    insetY: 0.06,
    titleGap: 12,
    labelGap: 6,
    /** Lines stop this far before the seam, as a fraction of the frame width. */
    seamInset: 0.04,
    titleLine: 1.05,
    buasTitleSize: "clamp(26px, 2.4vw, 40px)",
    buasTitleWeight: 600,
    bilkentTitleSize: "clamp(28px, 2.6vw, 44px)",
    bilkentTitleWeight: 800,
    labelSize: 16,
    labelWeight: 600,
    labelOpacity: 0.85,
    /** Same soft shadow the other Frame 1 text uses. */
    labelShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 6px 18px rgba(0, 0, 0, 0.45)",
    buasLabel: "#FFD2B0",
    bilkentLabel: "#C9D4FF",
    bodySize: 18,
    buttonSize: 17,
    buttonWeight: 600,
    buttonGap: 14,
    courseSize: 18,
    courseCodeWeight: 600,
    courseCodeOpacity: 0.7,
    courseNameWeight: 400,
    courseNameOpacity: 0.95,
    courseUnderline: 0.35,
    courseGap: 8,
    bodyWeight: 400,
    bodyLine: 1.45,
    bodyOpacity: 0.92,
    shade: 0.35,
    shadeBlur: 26,
  },
  seams: {
    /** Soft blend width at the top, as a fraction of the frame width. */
    top: 0.08,
    /** Soft blend width at the bottom, as a fraction of the frame width. */
    bottom: 0.18,
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
      code: "CS 473",
      name: "Algorithms I",
      fullName: "Algorithms I",
      href: "https://www.cs.bilkent.edu.tr/~ugur/teaching/cs473/",
    },
    {
      code: "CS 476",
      name: "Automata Theory",
      fullName: "Automata Theory and Formal Languages",
      href: "https://www.cs.bilkent.edu.tr/~dibeklioglu/teaching/cs476/",
    },
    {
      code: "EEE 448",
      name: "Reinforcement Learning",
      fullName: "Reinforcement Learning and Dynamic Programming",
      href: "https://catalog.bilkent.edu.tr/course/c14448.html",
    },
  ],
  assets: {
    buasCampus: `${import.meta.env.BASE_URL}assets/buas-campus.jpg`,
    buasLogo: `${import.meta.env.BASE_URL}assets/buas-logo.png`,
    bilkentCampus: `${import.meta.env.BASE_URL}assets/bilkent-campus.jpg`,
    bilkentLogo: `${import.meta.env.BASE_URL}assets/bilkent-logo.png`,
    portrait: `${import.meta.env.BASE_URL}assets/frame1/portrait.jpg`,
    research1: `${import.meta.env.BASE_URL}assets/frame1/research-plan-1.webp`,
    research2: `${import.meta.env.BASE_URL}assets/frame1/research-plan-2.webp`,
  },
  effects: {
    PORTRAIT_EDGE_LIGHT: true,
    OPENING_SEQUENCE: true,
    CURSOR_REACTION: true,
    FILM_GRAIN: true,
  },
};
