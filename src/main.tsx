import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./styles/overhaul.css";
import "./styles/argenti3.css";
import { MotionConfig } from "motion/react";
import { DataStoreProvider } from "./services/mockStore";
import { AuthProvider } from "./services/auth";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider><DataStoreProvider>
        <BrowserRouter><App /></BrowserRouter>
      </DataStoreProvider></AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
);
