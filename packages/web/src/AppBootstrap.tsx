import { useEffect } from "react";
import { me } from "./features/auth/api/authApi";
import { useAuthStore } from "./store/authStore";

export function AppBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = await me();
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setUser, clearAuth, setInitialized]);

  return null;
}
