import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WalletProvider } from "./context/WalletContext";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<pre style='padding:24px;background:#fef2f2;color:#991b1b'>Root #root not found.</pre>";
  throw new Error("Root element #root not found");
}

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <WalletProvider>
          <App />
        </WalletProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  rootEl.innerHTML = `<div style="padding:24px;background:#fef2f2;color:#991b1b;font-family:system-ui;min-height:100vh"><h2>Failed to start</h2><pre style="overflow:auto">${msg}</pre></div>`;
  console.error("UsageX bootstrap error:", err);
}
