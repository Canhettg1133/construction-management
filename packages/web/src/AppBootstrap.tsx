import { useEffect } from "react";
import { me } from "./features/auth/api/authApi";
import { useAuthStore } from "./store/authStore";

export function AppBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const user = await me();
        if (active) setUser(user);
      } catch {
        if (active) clearAuth();
      } finally {
        if (active) setInitialized(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [setUser, clearAuth, setInitialized]);

  return null;
}
