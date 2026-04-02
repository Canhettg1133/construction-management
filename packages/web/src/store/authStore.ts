import { create } from "zustand";
import type { User, UserRole } from "@construction/shared";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setInitialized: (value: boolean) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearAuth: () => set({ user: null, isAuthenticated: false }),
  setInitialized: (value) => set({ initialized: value }),
  hasRole: (roles) => {
    const { user } = get();
    return user ? roles.includes(user.role) : false;
  },
}));
