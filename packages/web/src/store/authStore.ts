import { create } from "zustand";
import type { User, SystemRole, UserProjectPermissions } from "@construction/shared";

const SESSION_HINT_KEY = "auth.session.active";

function persistSessionHint(isActive: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (isActive) {
    window.localStorage.setItem(SESSION_HINT_KEY, "1");
    return;
  }

  window.localStorage.removeItem(SESSION_HINT_KEY);
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  initialized: boolean;
  projectPermissions: Record<string, UserProjectPermissions>;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setInitialized: (value: boolean) => void;
  hasSystemRole: (roles: SystemRole[]) => boolean;
  setProjectPermissions: (projectId: string, permissions: UserProjectPermissions) => void;
  clearProjectPermissions: (projectId?: string) => void;
}

export function hasSessionHint() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  projectPermissions: {},
  setUser: (user) => {
    persistSessionHint(!!user);
    set({ user, isAuthenticated: !!user, projectPermissions: {} });
  },
  clearAuth: () => {
    persistSessionHint(false);
    set({ user: null, isAuthenticated: false, projectPermissions: {} });
  },
  setInitialized: (value) => set({ initialized: value }),
  hasSystemRole: (roles) => {
    const { user } = get();
    return user ? roles.includes(user.systemRole) : false;
  },
  setProjectPermissions: (projectId, permissions) =>
    set((state) => ({
      projectPermissions: {
        ...state.projectPermissions,
        [projectId]: permissions,
      },
    })),
  clearProjectPermissions: (projectId) =>
    set((state) => {
      if (!projectId) {
        return { projectPermissions: {} };
      }

      const next = { ...state.projectPermissions };
      delete next[projectId];
      return { projectPermissions: next };
    }),
}));
