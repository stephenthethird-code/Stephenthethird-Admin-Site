import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { installAuthFetch } from "./lib/auth";

installAuthFetch(() => { if (location.pathname !== "/login") location.assign("/login"); });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
