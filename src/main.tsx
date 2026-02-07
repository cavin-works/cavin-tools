import React from "react";
import ReactDOM from "react-dom/client";
import { runStorageMigration } from "./lib/storageMigration";
import { AppLayout } from "./core/layout/AppLayout";
// import App from "./App"; // 原视频编辑器，待迁移
import "./styles.css";

// 一次性迁移旧 localStorage 键名
runStorageMigration();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppLayout />
  </React.StrictMode>,
);
