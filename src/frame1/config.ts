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
  /** How much steam is drawn when STEAM_ENABLED is on. */
  steamAmount: 1,
  links: {
    github: "https://github.com/AlperJoe",
    linkedin: "https://www.linkedin.com/in/alperbozkurt/",
  },
  /** object-position so the face can sit on the middle focal point. */
  portraitPosition: "50% 30%",
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
  logos: {
    buasWidth: 0.24,
    bilkentWidth: 0.28,
    insetX: 0.05,
    insetY: 0.06,
    buasAspect: 2976 / 1028,
    bilkentAspect: 1691 / 363,
    poolTone: 0.16,
    poolBlur: 36,
    poolWidth: 1.75,
    poolHeight: 2.15,
    poolOpacity: 0.96,
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
  buasSun: {
    x: "-4%",
    y: "-8%",
    radius: 0.74,
    core: 0.95,
    mid: 0.46,
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
    height: 0.7,
    maxScale: 1.2,
    naturalWidth: 723,
    naturalHeight: 641,
    faceX: 0.5,
    faceY: 0.46,
    edgeFade: 0.24,
    blur: 40,
    fieldDarkness: 0.46,
  },
  icons: {
    size: 44,
    plate: 72,
    lift: 0.04,
    blur: 16,
    edge: 0.3,
    fill: 0.16,
    hoverFill: 0.34,
  },
  text: {
    gap: 32,
    titleGap: 16,
    labelGap: 6,
    seamInset: 0.04,
    titleStretch: 112,
    titleWeight: 600,
    titleSize: "clamp(22px, 1.9vw, 36px)",
    titleLine: 1.05,
    labelSize: 15,
    labelWeight: 600,
    /** Thesis and Favorite courses. White, so they read on both campus tones. */
    labelOpacity: 0.8,
    /** Same soft shadow the other Frame 1 text uses. */
    labelShadow: "0 1px 2px rgba(0, 0, 0, 0.85), 0 6px 18px rgba(0, 0, 0, 0.45)",
    buasLabel: "#FFD2B0",
    bilkentLabel: "#C9D4FF",
    bodySize: 16,
    bodyWeight: 400,
    bodyLine: 1.45,
    bodyOpacity: 0.9,
    shade: 0.35,
    shadeBlur: 26,
  },
  seams: {
    /** Blend width at the top, as a fraction of the frame width. */
    top: 0.02,
    /** Blend width at the bottom, as a fraction of the frame width. */
    bottom: 0.05,
    campusReach: 0.034,
    /**
     * Share of edgeLimit the noise may use. The seam stays on the true
     * line, with only a little roughness so it is not a ruler line.
     */
    noise: 0.85,
    /** Largest shift of either seam from its true line, as a fraction of frame width. */
    edgeLimit: 0.01,
    columns: 5,
    rows: 4,
    steam: 1.38,
  },
  assets: {
    buasCampus: `${import.meta.env.BASE_URL}assets/buas-campus.jpg`,
    buasLogo: `${import.meta.env.BASE_URL}assets/buas-logo.png`,
    bilkentCampus: `${import.meta.env.BASE_URL}assets/bilkent-campus.jpg`,
    bilkentLogo: `${import.meta.env.BASE_URL}assets/bilkent-logo.png`,
    portrait: `${import.meta.env.BASE_URL}assets/portrait.jpg`,
  },
  effects: {
    STEAM_ENABLED: true,
    PORTRAIT_EDGE_LIGHT: true,
    OPENING_SEQUENCE: true,
    CURSOR_REACTION: true,
    FILM_GRAIN: true,
  },
};
