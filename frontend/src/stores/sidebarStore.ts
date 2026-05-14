import { create } from "zustand";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: localStorage.getItem("sidebar-collapsed") === "true",

  toggle: () =>
    set((s) => {
      const next = !s.collapsed;
      localStorage.setItem("sidebar-collapsed", String(next));
      return { collapsed: next };
    }),

  setCollapsed: (v) => {
    localStorage.setItem("sidebar-collapsed", String(v));
    set({ collapsed: v });
  },
}));
