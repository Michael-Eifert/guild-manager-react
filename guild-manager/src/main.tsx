import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@fontsource/cinzel/latin-400.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/lato/latin-400.css";
import "@fontsource/lato/latin-700.css";
import "./index.css"; // You can create this for Tailwind directives if not using CDN

const routerBasename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root application mount element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
