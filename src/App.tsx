import { Frame1 } from "./frame1/Frame1";
import { Frame2 } from "./frame2/Frame2";
import { Frame3 } from "./frame3/Frame3";
import { FrameStage } from "./transitions/FrameStage";

export default function App() {
  return (
    <FrameStage>
      <Frame1 />
      <Frame2 />
      <Frame3 />
    </FrameStage>
  );
}
