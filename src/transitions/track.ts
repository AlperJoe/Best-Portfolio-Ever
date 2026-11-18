import { transitionConfig } from "./config";
import { clamp, latchHump, lerp } from "./math";

/**
 * The slim track at the right edge: one station per frame and a carriage
 * that runs on the push progress itself.
 */
export class Track {
  private readonly root = document.createElement("nav");
  private readonly line = document.createElement("div");
  private readonly carriage = document.createElement("div");
  private readonly stations: HTMLButtonElement[] = [];
  private length = 0;

  constructor(
    stage: HTMLElement,
    count: number,
    onPick: (index: number) => void,
  ) {
    const cfg = transitionConfig.track;
    this.root.className = "tx-track";
    this.root.setAttribute("aria-label", "Frames");
    const vars: Record<string, string> = {
      "--track-right": `${cfg.right}px`,
      "--track-color": cfg.color,
      "--track-idle": String(cfg.idleOpacity),
      "--track-busy": String(cfg.busyOpacity),
      "--track-fade": `${cfg.fadeMs}ms`,
      "--track-line": String(cfg.lineOpacity),
      "--track-station": `${cfg.station}px`,
      "--track-hit": `${cfg.hitArea}px`,
      "--track-carriage-w": `${cfg.carriageWidth}px`,
      "--track-carriage-h": `${cfg.carriageLength}px`,
    };
    for (const [name, value] of Object.entries(vars)) this.root.style.setProperty(name, value);

    this.line.className = "tx-track-line";
    this.carriage.className = "tx-track-carriage";
    this.root.append(this.line);
    for (let index = 0; index < count; index += 1) {
      const station = document.createElement("button");
      station.type = "button";
      station.className = "tx-track-station";
      station.setAttribute("aria-label", `Frame ${index + 1}`);
      station.style.top = `${this.fraction(index) * 100}%`;
      station.addEventListener("click", () => onPick(index));
      this.stations.push(station);
      this.root.append(station);
    }
    this.root.append(this.carriage);
    stage.append(this.root);
    this.measure();
  }

  destroy() {
    this.root.remove();
  }

  private fraction(index: number) {
    const last = this.stations.length > 0 ? Math.max(1, this.stations.length - 1) : 1;
    return index / last;
  }

  setActive(index: number) {
    this.stations.forEach((station, at) => {
      if (at === index) station.setAttribute("aria-current", "step");
      else station.removeAttribute("aria-current");
    });
  }

  setBusy(busy: boolean) {
    this.root.classList.toggle("is-busy", busy);
  }

  setHidden(hidden: boolean) {
    this.root.classList.toggle("is-hidden", hidden);
  }

  /** Same p, latch and impact as the scene, so the carriage moves exactly with the push. */
  measure() {
    this.length = transitionConfig.track.length * window.innerHeight;
    this.root.style.setProperty("--track-length", `${this.length}px`);
  }

  render(from: number, to: number, p: number, latch = -1, impact = 1) {
    const cfg = transitionConfig.track;
    const y = lerp(this.fraction(from), this.fraction(to), clamp(p)) * this.length;
    const hump = latch >= 0 ? latchHump(latch) * impact : 0;
    const nudge = Math.sign(to - from) * cfg.latchNudge * hump;
    this.carriage.style.transform = `translate3d(-50%, calc(${(y + nudge).toFixed(2)}px - 50%), 0)`;
  }

  place(index: number) {
    this.render(index, index, 0);
  }
}
