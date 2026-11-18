import type { ComponentType } from "react";
import { Frame1 } from "./frame1/Frame1";
import { Frame2 } from "./frame2/Frame2";
import { Frame3 } from "./frame3/Frame3";
import { Frame5 } from "./frame5/Frame5";
import { frameOrder, type FrameId } from "./frameOrder";
import { FrameStage } from "./transitions/FrameStage";

const FRAMES: Record<FrameId, ComponentType> = {
  frame1: Frame1,
  frame2: Frame2,
  frame3: Frame3,
  frame5: Frame5,
};

export default function App() {
  return (
    <FrameStage>
      {frameOrder.map((id) => {
        const Frame = FRAMES[id];
        return <Frame key={id} />;
      })}
    </FrameStage>
  );
}
