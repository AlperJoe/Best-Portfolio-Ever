import { Children, useLayoutEffect, useRef, type ReactNode } from "react";
import { ScrollEngine } from "./scrollEngine";
import "./transitions.css";

export function FrameStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frames = Children.toArray(children);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const slots = [...stage.querySelectorAll<HTMLElement>(":scope > .tx-slot")];
    const engine = new ScrollEngine(stage, slots);
    engine.attach();
    return () => engine.detach();
  }, []);

  return (
    <div className="tx-stage" ref={stageRef}>
      {frames.map((frame, index) => (
        <div className="tx-slot" key={index} tabIndex={-1}>
          {frame}
        </div>
      ))}
    </div>
  );
}
