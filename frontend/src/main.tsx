import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Entry from "./entry";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Entry />
  </StrictMode>,
);
