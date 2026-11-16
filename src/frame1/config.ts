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
  assets: {
    buasCampus: "/assets/buas-campus.jpg",
    buasLogo: "/assets/buas-logo.png",
    bilkentCampus: "/assets/bilkent-campus.jpg",
    bilkentLogo: "/assets/bilkent-logo.png",
    portrait: "/assets/portrait.jpg",
  },
  effects: {
    STEAM_ENABLED: true,
    PORTRAIT_EDGE_LIGHT: true,
    OPENING_SEQUENCE: true,
    CURSOR_REACTION: true,
    FILM_GRAIN: true,
  },
};
