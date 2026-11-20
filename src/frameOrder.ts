/**
 * The frames in the order the visitor meets them. Reorder or insert here;
 * the pages, the quotes between them and the menu all follow this list.
 * Frame 4 will go between frame3 and frame5.
 */
export const frameOrder = ["frame1", "frame2", "frame3", "frame5"] as const;

export type FrameId = "frame1" | "frame2" | "frame3" | "frame5";
