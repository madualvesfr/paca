import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { I18nProvider, useAppStore } from "@paca/api";
import { App } from "./App";
import { ToastProvider } from "./components/ui/Toast";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

// Hydrate finance mode from localStorage and persist on change.
const MODE_KEY = "paca:mode";
const stored = (typeof window !== "undefined" && window.localStorage.getItem(MODE_KEY)) || null;
if (stored === "personal" || stored === "couple") {
  useAppStore.getState().setMode(stored);
}
useAppStore.subscribe((state) => {
  try {
    window.localStorage.setItem(MODE_KEY, state.mode);
  } catch {
    // ignore quota errors
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
