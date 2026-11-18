/**
 * The frames in the order the visitor meets them. Reorder or insert here;
 * the stage, the transitions and the track all follow this list.
 * Frame 4 will go between frame3 and frame5.
 */
export const frameOrder = ["frame1", "frame2", "frame3", "frame5"] as const;

export type FrameId = "frame1" | "frame2" | "frame3" | "frame5";

/** Asks the stage to push straight to a frame with the normal transition. */
export function goToFrame(id: FrameId) {
  window.dispatchEvent(new CustomEvent<FrameId>("tx:goto", { detail: id }));
}
