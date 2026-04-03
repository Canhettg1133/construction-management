import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PermissionGate } from "./PermissionGate";

const mockUsePermission = vi.fn();

vi.mock("../hooks/usePermission", () => ({
  usePermission: (options: unknown) => mockUsePermission(options),
}));

describe("PermissionGate", () => {
  it("renders children when user has permission", () => {
    mockUsePermission.mockReturnValue({
      has: true,
      isLoading: false,
    });

    render(
      <PermissionGate projectId="p-1" toolId="TASK" minLevel="STANDARD">
        <button type="button">Tạo task</button>
      </PermissionGate>
    );

    expect(screen.getByRole("button", { name: "Tạo task" })).toBeTruthy();
  });

  it("renders fallback when permission is missing", () => {
    mockUsePermission.mockReturnValue({
      has: false,
      isLoading: false,
    });

    render(
      <PermissionGate
        projectId="p-1"
        toolId="TASK"
        minLevel="ADMIN"
        fallback={<span>Không có quyền</span>}
      >
        <button type="button">Xóa task</button>
      </PermissionGate>
    );

    expect(screen.queryByRole("button", { name: "Xóa task" })).toBeNull();
    expect(screen.getByText("Không có quyền")).toBeTruthy();
  });
});

