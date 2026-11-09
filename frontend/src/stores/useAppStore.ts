import { create } from "zustand";

interface AppState {
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
  sidebarOpen: boolean;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeWorkspaceId: null,
  activeProjectId: null,
  sidebarOpen: true,
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

