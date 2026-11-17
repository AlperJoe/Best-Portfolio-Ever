import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyFonts } from "./theme/fonts";
import "./index.css";

applyFonts();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
