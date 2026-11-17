export const frame1Config = {
  colors: {
    buasTone: "#ED7624",
    bilkentTone: "#001489",
    middleTone: "#F2EEE6",
  },
  /** Seam blend band as a fraction of the frame width. */
  blendWidth: 0.08,
  /** Side focal lights stay off. The crown glow is the only added light. */
  lightStrength: 0,
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
  /** The seam light band is off. */
  edgeGlowReach: 0.11,
  edgeGlowStrength: 0,
  /** Largest shift of the focal lights toward the cursor, as a fraction of frame width. */
  cursorLightShift: 0,
  /** Largest shift of the campus photos away from the cursor, in pixels. */
  cursorPhotoShift: 10,
  /**
   * Black veil over each campus photo. The text sits in the dark top,
   * and the buildings show through the lighter lower half.
   */
  veil: {
    top: 0.78,
    bottom: 0.3,
  },
  badge: {
    plate: "#F2EEE6",
    plateOpacity: 0.92,
    /** Same inner padding on every side, in pixels. */
    pad: 8,
    radius: 8,
    /** Distance from the top edge, as a fraction of the frame height. */
    top: 0.025,
    /** Shared plate size. */
    width: 0.13,
    height: 0.055,
    /** Clear space between a plate and its seam, as a fraction of the frame width. */
    seamGap: 0.012,
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
    /** The roof may sit below the top edge so the landmarks land under the text. */
    coverTop: false,
    /** Soft fade at the top of each photo, as a fraction of the frame height. */
    fade: 0.1,
    buas: {
      scale: 1,
      maxZoom: 2.3,
      naturalWidth: 480,
      anchorX: 0.52,
      anchorY: 0.18,
      placeX: 0.1,
      placeY: 0.7,
      aspect: 480 / 480,
    },
    bilkent: {
      scale: 1.05,
      maxZoom: 2.5,
      naturalWidth: 689,
      anchorX: 0.88,
      anchorY: 0.42,
      placeX: 0.88,
      placeY: 0.66,
      aspect: 689 / 445,
    },
  },
  /**
   * One warm spotlight at the apex, falling onto the crown.
   * Opacity is the center of the falloff. Size is a fraction of the frame width.
   */
  crownGlow: {
    rgb: "255, 214, 170",
    opacity: 0.4,
    size: 0.92,
    shift: "-20%",
  },
  portraitLayout: {
    /** Ceiling on enlargement. The fit uses the largest size that still sits high. */
    maxScale: 1.2,
    naturalWidth: 1024,
    naturalHeight: 1026,
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
    /** The fade lives in about the lowest share of the frame, under the name. */
    fadeBand: 0.22,
    /**
     * Crown samples, as fractions of the photo. The fit keeps each one
     * inside the middle triangle.
     */
    crown: [
      { y: 0.03, left: 0.43, right: 0.57 },
      { y: 0.15, left: 0.37, right: 0.63 },
      { y: 0.26, left: 0.342, right: 0.667 },
    ],
    /** Clear space between the crown and each seam, as a fraction of the frame width. */
    crownGap: 0.03,
  },
  middle: {
    /** Bottom of the line under the name, as a fraction of the frame height. */
    bottom: 0.06,
    /** Widest the block may be, as a fraction of the frame width. */
    maxWidth: 0.4,
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
    /** Side blocks start this far below the top edge, under the badges. */
    insetY: 0.1,
    /** Shared rhythm: after the badge, after the title, after the label, before the button. */
    spaceTitle: 20,
    spaceLabel: 14,
    spaceBody: 8,
    spaceButton: 16,
    titleGap: 14,
    labelGap: 8,
    /** Lines stop this far before the seam, as a fraction of the frame width. */
    seamInset: 0.04,
    titleLine: 1.05,
    buasTitleSize: "clamp(30px, 2.8vw, 48px)",
    buasTitleWeight: 600,
    bilkentTitleSize: "clamp(32px, 3vw, 52px)",
    bilkentTitleWeight: 800,
    labelSize: 17,
    labelWeight: 600,
    labelOpacity: 0.88,
    /** Same soft shadow the other Frame 1 text uses. */
    labelShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 6px 18px rgba(0, 0, 0, 0.45)",
    buasLabel: "#FFD2B0",
    bilkentLabel: "#C9D4FF",
    bodySize: 19,
    buttonSize: 18,
    buttonWeight: 600,
    buttonGap: 16,
    /** How far the research arrow travels on hover and focus, in pixels. */
    arrowShift: 4,
    courseSize: 19,
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
};
