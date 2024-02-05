import React from "react";
import ReactDOM from "react-dom/client";
import { clarity } from 'react-microsoft-clarity';
import "./assets/css/alphaday.css";
import App from "./App";
import CONFIG from "./config";

// Clarity
if (CONFIG.CLARITY_ID) {
  clarity.init(CONFIG.CLARITY_ID);
  clarity.consent();
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
