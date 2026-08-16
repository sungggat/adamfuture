import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./i18n";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{
        token: {
          colorPrimary: "#286f6a",
          colorText: "#173b36",
          colorBgBase: "#f5f7f3",
          colorBorder: "#cfdad5",
          fontFamily: "\"Noto Sans\", system-ui, -apple-system, sans-serif",
          borderRadius: 14,
        },
      }}>
        <BrowserRouter><App /></BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
