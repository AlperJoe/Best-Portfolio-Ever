import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyFonts } from "./theme/fonts";
import { applyWhyNoteStyle } from "./whyNote/whyNote";
import "./index.css";

applyFonts();
applyWhyNoteStyle();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
