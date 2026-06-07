import { create } from "zustand";

/**
 * Global client UI state (placeholder). Holds only ephemeral UI state — server
 * data belongs in TanStack Query, not here. Extend as the UI grows.
 */
interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
