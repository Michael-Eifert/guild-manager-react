import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // You can create this for Tailwind directives if not using CDN

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
