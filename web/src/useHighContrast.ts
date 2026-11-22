import { useEffect, useState } from "react";

const STORAGE_KEY = "energy-monitor:high-contrast";

function initialValue(): boolean {
  const fromUrl = new URLSearchParams(location.search).get("contraste");
  if (fromUrl) return fromUrl === "alto";

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "true";
  } catch {
    return false;
  }

  return window.matchMedia?.("(prefers-contrast: more)").matches ?? false;
}

export function useHighContrast(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(initialValue);

  useEffect(() => {
    document.documentElement.dataset.contrast = enabled ? "high" : "normal";
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      return;
    }
  }, [enabled]);

  return [enabled, () => setEnabled((value) => !value)];
}
