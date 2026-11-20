import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { attachWhyNote } from "../whyNote/whyNote";
import { interludeStyle, interludeWhy, type Interlude, type InterludeLine } from "./interludes";
import { phoneWidth } from "./pages";

function LineText({ line }: { line: InterludeLine }) {
  const at = line.text.indexOf(line.focus);
  if (at < 0) return <>{line.text}</>;
  return (
    <>
      {line.text.slice(0, at)}
      <em className="quote-focus">{line.focus}</em>
      {line.text.slice(at + line.focus.length)}
    </>
  );
}

/**
 * A quote in the passage between two frames: the lines centered inside large
 * gold quotation marks, and the "Read more" marker under them.
 */
export function QuotePage({ interlude }: { interlude: Interlude }) {
  const pageRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLQuoteElement>(null);
  const whyRef = useRef<HTMLButtonElement>(null);
  const last = interlude.lines.length - 1;

  useLayoutEffect(() => {
    const page = pageRef.current;
    const text = textRef.current;
    if (!page || !text) return;
    const style = interludeStyle;
    const measure = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;
      if (width < 2 || height < 2) return;
      if (width < phoneWidth) {
        const phone = style.phone;
        text.style.width = `${Math.max(1, width - 2 * phone.marginX)}px`;
        text.style.fontSize = `${Math.min(phone.maxSize, Math.max(phone.minSize, width * phone.sizeShare)).toFixed(2)}px`;
        page.classList.add("is-narrow");
        return;
      }
      page.classList.remove("is-narrow");
      text.style.width = "";
      const probe = 100;
      text.style.fontSize = `${probe}px`;
      const lines = [...text.querySelectorAll<HTMLElement>(".quote-line")];
      const widest = Math.max(1, ...lines.map((line) => line.offsetWidth));
      const roomW = width * (1 - 2 * style.marginX);
      const roomH = height * (1 - 2 * style.marginY);
      const below = interludeWhy.gap + (whyRef.current?.offsetHeight ?? 0);
      const size = Math.max(
        8,
        Math.min(
          style.maxSize,
          window.innerHeight * style.maxHeightShare,
          (roomW * probe) / widest,
          (roomH - below) / (lines.length * style.lineHeight),
        ),
      );
      text.style.fontSize = `${size.toFixed(2)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [interlude]);

  useEffect(() => {
    const button = whyRef.current;
    const page = pageRef.current;
    if (!button || !page || !interlude.note) return;
    const note = attachWhyNote(button, page, { note: interlude.note, label: interludeWhy.label });
    return () => note.destroy();
  }, [interlude]);

  const style = {
    "--quote-bg": interludeStyle.background,
    "--quote-text": interludeStyle.textColor,
    "--quote-gold": interludeStyle.focusColor,
    "--quote-font": `"${interludeStyle.font}", serif`,
    "--quote-line": String(interludeStyle.lineHeight),
    "--quote-mark": String(interludeStyle.markScale),
    "--quote-why-gap": `${interludeWhy.gap}px`,
  } as CSSProperties;

  return (
    <section ref={pageRef} className="quote" style={style}>
      <div className="quote-stack">
        <blockquote ref={textRef} className="quote-text">
          {interlude.lines.map((line, index) => (
            <p key={line.text} className="quote-line">
              {index === 0 ? (
                <span className="quote-mark quote-open" aria-hidden="true">
                  “
                </span>
              ) : null}
              <LineText line={line} />
              {index === last ? (
                <span className="quote-mark quote-close" aria-hidden="true">
                  ”
                </span>
              ) : null}
            </p>
          ))}
        </blockquote>
        {interlude.note ? (
          <button ref={whyRef} type="button" className="why-button quote-why">
            {interludeWhy.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}
