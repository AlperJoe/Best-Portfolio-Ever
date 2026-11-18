import { whyNoteStyle } from "./config";
import "./whyNote.css";

export type WhyNoteOptions = {
  note: string;
  /** Accessible name of the note panel. */
  label: string;
  /** With a mouse, the note also opens on hover. */
  hover?: boolean;
};

export type WhyNote = {
  isOpen: () => boolean;
  close: () => void;
  destroy: () => void;
};

/** Class of the layer that holds an open note. The scroll engines pause while one is on screen. */
export const WHY_LAYER = "why-layer";

let count = 0;

/** Applies the shared look as CSS variables. Call once before the first paint. */
export function applyWhyNoteStyle() {
  const root = document.documentElement;
  const s = whyNoteStyle;
  root.style.setProperty("--why-size", `${s.size}px`);
  root.style.setProperty("--why-weight", String(s.weight));
  root.style.setProperty("--why-navy", s.navy);
  root.style.setProperty("--why-border", s.border);
  root.style.setProperty("--why-radius", `${s.radius}px`);
  root.style.setProperty("--why-pad", s.pad);
  root.style.setProperty("--why-text-size", `${s.textSize}px`);
  root.style.setProperty("--why-text-line", String(s.textLine));
  root.style.setProperty("--why-text-color", s.textColor);
  root.style.setProperty("--why-fade", `${s.fadeMs}ms`);
}

/**
 * Turns `button` into a "Why I say this" control. A click, Enter or Space
 * opens the note in a small panel inside `host`, placed under the button, or
 * above it when there is no room. Escape or a click outside closes it.
 */
export function attachWhyNote(button: HTMLButtonElement, host: HTMLElement, options: WhyNoteOptions): WhyNote {
  const id = `why-note-${(count += 1)}`;
  const s = whyNoteStyle;
  let layer: HTMLDivElement | null = null;
  let panel: HTMLDivElement | null = null;
  let pinned = false;
  let closeTimer = 0;
  let fadeFrame = 0;

  button.setAttribute("aria-expanded", "false");

  const inside = (target: EventTarget | null) =>
    target instanceof Node && (button.contains(target) || Boolean(panel?.contains(target)));

  const place = () => {
    if (!panel) return;
    const box = host.getBoundingClientRect();
    const at = button.getBoundingClientRect();
    panel.style.maxWidth = `${Math.max(120, Math.min(s.maxWidth, box.width - 2 * s.edge))}px`;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const center = at.left + at.width / 2 - box.left;
    const left = Math.max(s.edge, Math.min(box.width - s.edge - width, center - width / 2));
    let top = at.bottom - box.top + s.gap;
    if (top + height > box.height - s.edge) top = Math.max(s.edge, at.top - box.top - s.gap - height);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  };

  const swallowClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (inside(event.target)) return;
    close();
    document.addEventListener("click", swallowClick, { capture: true, once: true });
    window.setTimeout(() => document.removeEventListener("click", swallowClick, true), 400);
  };

  const onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget && !inside(event.relatedTarget)) close();
  };

  const cancelClose = () => window.clearTimeout(closeTimer);
  const closeSoon = () => {
    cancelClose();
    if (!pinned) closeTimer = window.setTimeout(close, s.hoverCloseMs);
  };

  function open(pin: boolean) {
    cancelClose();
    pinned ||= pin;
    if (!panel) {
      layer = document.createElement("div");
      layer.className = WHY_LAYER;
      panel = document.createElement("div");
      panel.className = "why-panel";
      panel.id = id;
      panel.tabIndex = -1;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", options.label);
      const text = document.createElement("p");
      text.textContent = options.note;
      panel.append(text);
      panel.addEventListener("pointerenter", cancelClose);
      panel.addEventListener("pointerleave", closeSoon);
      panel.addEventListener("focusout", onFocusOut);
      layer.append(panel);
      host.append(layer);
      place();
      fadeFrame = requestAnimationFrame(() => layer?.classList.add("is-on"));
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-controls", id);
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("resize", place);
    }
    if (pin) panel.focus({ preventScroll: true });
  }

  function close() {
    cancelClose();
    pinned = false;
    if (!layer) return;
    const hadFocus = layer.contains(document.activeElement);
    cancelAnimationFrame(fadeFrame);
    layer.remove();
    layer = null;
    panel = null;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-controls");
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("resize", place);
    if (hadFocus) button.focus({ preventScroll: true });
  }

  const onClick = () => {
    if (panel && pinned) close();
    else open(true);
  };
  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === "mouse") open(false);
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") closeSoon();
  };

  button.addEventListener("click", onClick);
  button.addEventListener("focusout", onFocusOut);
  if (options.hover) {
    button.addEventListener("pointerenter", onEnter);
    button.addEventListener("pointerleave", onLeave);
  }

  return {
    isOpen: () => panel !== null,
    close,
    destroy: () => {
      close();
      button.removeEventListener("click", onClick);
      button.removeEventListener("focusout", onFocusOut);
      button.removeEventListener("pointerenter", onEnter);
      button.removeEventListener("pointerleave", onLeave);
      button.removeAttribute("aria-expanded");
    },
  };
}
