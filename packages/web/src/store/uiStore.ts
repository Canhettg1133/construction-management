import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface UiState {
  sidebarOpen: boolean;
  toast: ToastMessage | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toast: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  showToast: (toast) => {
    const id = crypto.randomUUID();
    set({
      toast: {
        id,
        ...toast,
      },
    });

    setTimeout(() => {
      set((state) => (state.toast?.id === id ? { toast: null } : {}));
    }, 3500);
  },
  clearToast: () => set({ toast: null }),
}));
