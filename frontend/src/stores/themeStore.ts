import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "indigo"
  | "amber"
  | "gray"
  | "emerald"
  | "rose"
  | "violet";

interface ThemeState {
  mode: ThemeMode;
  accent: AccentColor;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyTheme(accent: AccentColor, mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  root.setAttribute("data-accent", accent);
  root.setAttribute("data-theme", resolved);

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  localStorage.setItem("theme-mode", mode);
  localStorage.setItem("theme-accent", accent);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const storedMode =
    (localStorage.getItem("theme-mode") as ThemeMode) || "system";
  const storedAccent =
    (localStorage.getItem("theme-accent") as AccentColor) || "indigo";

  applyTheme(storedAccent, storedMode);

  if (typeof window !== "undefined") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        const { mode, accent } = get();
        applyTheme(accent, mode);
        set({ resolved: resolveTheme(mode) });
      });
  }

  return {
    mode: storedMode,
    accent: storedAccent,
    resolved: resolveTheme(storedMode),

    setMode: (mode) => {
      const { accent } = get();
      applyTheme(accent, mode);
      set({ mode, resolved: resolveTheme(mode) });
    },

    setAccent: (accent) => {
      const { mode } = get();
      applyTheme(accent, mode);
      set({ accent });
    },
  };
});
