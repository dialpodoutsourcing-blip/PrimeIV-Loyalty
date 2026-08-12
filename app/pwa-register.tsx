"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      (window as Window & { __primeIvInstallPrompt?: Event }).__primeIvInstallPrompt = event;
      window.dispatchEvent(new CustomEvent("primeiv:install-ready"));
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);
  return null;
}
