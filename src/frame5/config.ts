const asset = (name: string) => `${import.meta.env.BASE_URL}assets/frame5/${name}`;

export type HobbyIcon = "piano" | "ticket" | "ball" | "mat" | "piece" | "pan";

export type Film = {
  id: string;
  title: string;
  year: number;
  videoId: string;
  /** Shown once, on the film's cover in Frame 5, with the warning mark above it. */
  warning?: string;
  /** The line under the title on the card. */
  summary: string;
  /** Short note beside the video when the film opens, one string per paragraph. */
  personal: readonly string[];
  /** Longer note. It takes the place of the personal note, one string per paragraph. */
  long: readonly string[];
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
    /**
     * Least space between the title row and the Ending A and Ending B
     * labels, in pixels. On short screens the endings move down to keep it.
     */
    clearance: 16,
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

  /** Small label above each ending. */
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
   * The egg film's content warning, shown once, on its cover in Frame 5:
   * the warning mark in a calm muted red, centered on the darkened cover,
   * with the sentence under it. The open film has no warning screen.
   */
  warning: {
    color: "#C17B74",
    /** Warning mark, in pixels. */
    markSize: 40,
    /** Dark veil over the cover image. */
    veil: "rgba(8, 6, 8, 0.7)",
    textSize: "13px",
    textColor: "#F2EEE6",
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
    /** Short label on the button that sits with GitHub and LinkedIn. */
    cvLabel: "CV",
    /** Accessible name. The button itself only says "CV". */
    cvName: "Download my CV",
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
      heading: "A little more about me.",
      line: "Outside work, you’ll usually find me doing one of these.",
      items: [
        { id: "piano", label: "Piano and bass at jam sessions" },
        { id: "ticket", label: "Cinema, up to three times a week" },
        { id: "ball", label: "Basketball", detail: "but I’m up for almost any sport" },
        { id: "mat", label: "Yoga" },
        { id: "piece", label: "Board games" },
        { id: "pan", label: "Cooking for myself, every day" },
      ] satisfies { id: HobbyIcon; label: string; detail?: string }[],
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
          pan: { band: "#C46A3A", tilt: 2, lift: -2 },
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
    line: "Or stay for two short films I made when I wanted to become a filmmaker. Both grew out of personal stories I wanted to tell through images and sound.",
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
        summary: "His first love was a city. A journey through Amsterdam, from being a tourist to feeling at home, and leaving after falling in love.",
        personal: [
          "My friend’s first love was a city: Amsterdam. I wanted to tell the story of how that experience changed him, little by little.",
          "At first, he encounters the city as a tourist. Over time, he begins to feel that he belongs there, and being a visitor is no longer enough. By the time he leaves, he has fallen in love with the city and has to face losing that closeness. He returns home changed by both experiences.",
          "I used the Kübler-Ross Change Curve as a narrative framework to trace his changing relationship with Amsterdam. Its stages helped me structure the gradual change within him as he experienced the city. I had no script or production team, so I filmed during the trip, looking for moments that could carry that story through mise-en-scène and cinematography. The film took the form of a travel journal, with his changing sense of belonging running through it.",
        ],
        long: [
          "When I say that Amsterdam was my friend’s first love, I mean it quite literally. His attachment to the city became something more than enjoying a place he was visiting. I wanted to make a film about how that relationship developed and how it changed him.",
          "At the beginning, he is a tourist. His relationship with Amsterdam stays on the surface: he is visiting somewhere that exists outside his own everyday life. As he spends time there, that distance begins to disappear. He starts to feel that he belongs.",
          "That feeling changes what it means to be there. He can no longer experience the city as an ordinary tourist, because he has become personally attached to it. Visiting is temporary, but what he feels is no longer something he can leave behind as easily as a trip.",
          "I used the stages of the Kübler-Ross Change Curve to structure this progression. I wanted to follow the experience piece by piece, showing how each part changes his relationship with the city and leads him into the next. The movement from visitor to belonging gives the journey its emotional direction.",
          "Leaving carries the loss of that relationship as he experienced it there. He returns having fallen in love and having had to leave that love behind. The journey ends, but he returns as someone who has been changed by it.",
          "I made the film without a script, a production team, or time to prepare the shoot. That shaped the way I worked. I filmed it as a travel vlog, capturing scenes myself when I felt they belonged to the story, then bringing those moments together in the edit.",
          "Mise-en-scène and cinematography were how I tried to make his internal change visible. The city and his presence within it had to carry the progression. I wanted the footage of a trip to also hold something personal: the experience of arriving somewhere as a visitor, beginning to feel at home, and then having to leave.",
        ],
      },
      {
        id: "egg",
        title: "How to Boil an Egg",
        year: 2024,
        videoId: "6B0btHK9d2U",
        warning: "Content warning: this film contains violence.",
        summary: "A couple shows how to boil an egg, and the egg stands for a child.",
        personal: [
          "This film began with someone I love very much. I wanted to make something dedicated to her, shaped by what she had lived through. Her identity remains private, and she has given her consent to this dedication.",
          "But I knew that many people lived through the same thing. To me, the problem was in the system, and I wanted the film to keep that in view. As personal as its starting point was, I did not want the viewer’s connection to one character to become the centre of the film. That was a difficult choice for me, but it led me to tell the story through a metaphor and a separate narrative: a couple boiling an egg. Through them, I wanted to show how people repeat what they have seen and treat decisions whose consequences shape another person’s life as ordinary, everyday acts.",
          "The suddenness and impulsiveness mattered to me too. In the reality behind the film, the violence had become part of ordinary life. There was no dramatic build-up, no pause to acknowledge the weight of what was happening. That normality made it more disturbing for me to film, and it is part of what makes it difficult to watch.",
          "I wanted to show this without adding effects to make it more disturbing or softening it to make it easier to watch. Apart from the doorbell, all sound was recorded naturally, with no dubbing. Finding something difficult to watch does not change the fact that someone endured this violence regularly, while a child grew up exposed to it for years. That thought stayed with me throughout the film.",
        ],
        long: [
          "The film began as a dedication to someone I love very much. For me, it also has the value of preserving a memory: acknowledging what she lived through without revealing her identity. She has given her consent to that dedication. I wanted that personal connection to remain part of how I speak about the film, because it is the reason I made it.",
          "Her mother was eight years younger than the actress playing Ayşe when she was regularly experiencing this violence. I know that makes an already difficult story harder to sit with, but it was part of the reality behind it. I play the father myself. I kept him unseen and made my voice as deep as I could, because the real father was twice my age when these events took place.",
          "That personal connection made it difficult for me to step back. But I knew that many people lived through situations like this. I did not want to build the film around one person’s suffering and lead the viewer towards taking sides. I decided to build its structure around the system these people were part of: what they had learned to accept, what they repeated without questioning, and what happened to a child growing up within it. Although that distance was difficult for me, I felt it would preserve what I wanted the film to express.",
          "The whole project is subjective. I think of its premise as asking Ahmet and Ayşe, “How do you boil an egg?” Their answer is to do what they have always seen. This is their version of an ordinary act, shaped by the world they know.",
          "The egg stands for a child, but the central question is the decision that comes before it: what can follow when someone acts on a momentary impulse, perhaps to escape their own reality, without considering what that action will mean. The film is about this particular couple and the consequences of their decisions. Ayşe knows how to boil an egg. What she has not thought through is why she is doing it, or what she is bringing it into.",
          "She enters quickly from the darkness into a brightly lit space. I wanted the contrast to be conspicuous. The thought of having a child offers her somewhere brighter to go, but the decision itself comes out of the darkness she is trying to escape. She wants to stay in that light, to embrace the idea. On both levels—boiling an egg and having a child—the action begins with a sudden desire whose consequences become clear later.",
          "At this point, I deliberately break the camera axis. I wanted a visible inconsistency beneath the apparent brightness of the decision: something feels wrong, but she carries on. The rightward pan that follows is smooth. Once she has decided, the practical actions come easily to her. She knows the process, and I stop disrupting its visual continuity. The question of whether to begin has already been passed over.",
          "She leaves the egg to boil, exposing it to its surroundings as a child is exposed to the world it enters. At first, she stays with it. Then a rack focus shifts our attention to her, following the way her own attention turns inward. She is trying to survive herself. We see her tension before we understand its cause, and the egg is no longer her focus.",
          "When the doorbell rings, two leftward pans take her towards the door. Within this film, I use those movements to bring back a sense of danger and unease. She knows who is there and what is coming. Her opening the door belongs to an established pattern; we are seeing one occurrence in an ongoing cycle.",
          "While the egg boils, the violence around it becomes the environment in which it develops. It is enclosed, unable to move away or intervene. A small crack appears as the boiling becomes more violent, but the egg remains where it is. It has nowhere else to go. The disturbance continues inside it.",
          "By the end, a long time has passed. Ayşe switches off the timer and the stove as though nothing unusual has happened. The egg and the environment it has remained in have deteriorated. We hear her throw it into the rubbish with the same ordinary familiarity.",
          "For me, that final gesture carries the way the child is treated: damaged within this environment, then discarded as though the damage were simply normal. The egg is treated as rubbish, just as the person it represents is treated as disposable. For Ayşe, this outcome is familiar because it is what she has seen herself. The ending returns to the same learned normality with which the film began.",
          "I wanted the film to retain the directness of what was performed and recorded. Apart from the doorbell, the sounds are natural, with no added sound effects or dubbing. I avoided effects and tricks intended to heighten the violence. My intention was to show the situation as it was, even when it became uncomfortable to watch. The fact that we struggle to watch it does not change the fact that someone endured it regularly, while a child remained exposed to it for years. Nor does keeping violence outside the image make it absent from the lives being represented.",
          "Some images I considered did not make it into the film. I had imagined two eggs positioned end to end in the refrigerator as a reference to the womb, and Ayşe carrying the egg towards the stove at the height of her abdomen to suggest pregnancy. I left them out because they did not fit with the other scenes.",
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
    moreLabel: "The story behind the film",
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
   * the Ending A line and the tickets in three rows of two.
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
