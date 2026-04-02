import { describe, expect, it } from "vitest";
import { useAuthStore } from "./authStore";

describe("auth store", () => {
  it("should set authenticated state when setUser", () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useAuthStore.getState().setUser({
      id: "u1",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
      isActive: true,
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("test@example.com");
  });

  it("should clear state on clearAuth", () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
