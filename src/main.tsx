import React from "react";
import ReactDOM from "react-dom/client";
import { AppLayout } from "./core/layout/AppLayout";
// import App from "./App"; // 原视频编辑器，待迁移
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppLayout />
  </React.StrictMode>,
);
