import { useEffect } from "react";
import { me } from "./features/auth/api/authApi";
import { ROUTES } from "./shared/constants/routes";
import { hasSessionHint, useAuthStore } from "./store/authStore";

const PUBLIC_PATH_PREFIXES = ["/login", "/forgot-password", "/reset-password"];

let bootstrapPromise: Promise<Awaited<ReturnType<typeof me>> | null> | null = null;

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((path) => pathname.startsWith(path));
}

function shouldBootstrapSession() {
  return hasSessionHint();
}

function getBootstrapPromise() {
  if (!bootstrapPromise) {
    bootstrapPromise = me()
      .catch((error: unknown) => {
        if (typeof error === "object" && error !== null && "response" in error) {
          const response = (error as { response?: { status?: number } }).response;
          if (response?.status === 401) {
            return null;
          }
        }
        throw error;
      })
      .finally(() => {
        bootstrapPromise = null;
      });
  }

  return bootstrapPromise;
}

export function AppBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let cancelled = false;
    const pathname = window.location.pathname;

    if (!shouldBootstrapSession()) {
      clearAuth();
      setInitialized(true);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const user = await getBootstrapPromise();
        if (cancelled) {
          return;
        }

        if (user) {
          setUser(user);
          if (isPublicPath(pathname)) {
            window.location.replace(ROUTES.DASHBOARD);
          }
          return;
        }

        clearAuth();
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
