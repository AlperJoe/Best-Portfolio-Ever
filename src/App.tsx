import { createRef, useEffect, useState, type ComponentType, type RefObject } from "react";
import { Frame1 } from "./frame1/Frame1";
import { Frame2 } from "./frame2/Frame2";
import { Frame3 } from "./frame3/Frame3";
import { Frame5 } from "./frame5/Frame5";
import { frameOrder, type FrameId } from "./frameOrder";
import { SiteMenu } from "./menu/SiteMenu";
import { pages } from "./transitions/pages";
import { QuotePage } from "./transitions/QuotePage";
import { holdSnapStops } from "./transitions/snapStop";
import "./transitions/pages.css";

const FRAMES: Record<FrameId, ComponentType> = {
  frame1: Frame1,
  frame2: Frame2,
  frame3: Frame3,
  frame5: Frame5,
};

/** This frame is two screens tall and plays its opening with the scroll. */
const OPENING: FrameId = "frame1";

type PageRefs = Record<FrameId, RefObject<HTMLDivElement | null>>;

export default function App() {
  const [refs] = useState(
    () => Object.fromEntries(frameOrder.map((id) => [id, createRef<HTMLDivElement>()])) as PageRefs,
  );

  useEffect(() => holdSnapStops(), []);

  return (
    <>
      {pages.map((page) => {
        if (page.kind === "quote") {
          return (
            <div key={page.pair} className="page page-quote">
              <QuotePage interlude={page.interlude} />
            </div>
          );
        }
        const Frame = FRAMES[page.id];
        return (
          <div
            key={page.id}
            ref={refs[page.id]}
            className={page.id === OPENING ? "page page-opening" : "page"}
            data-page={page.id}
          >
            {page.id === OPENING ? (
              <>
                <span className="opening-stop" aria-hidden="true" />
                <span className="opening-stop" aria-hidden="true" />
              </>
            ) : null}
            <Frame />
          </div>
        );
      })}
      <SiteMenu pages={refs} opening={refs[OPENING]} />
    </>
  );
}
