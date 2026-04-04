import { useMemo, useState } from "react";
import {
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_LABELS,
  TOOL_IDS,
  TOOL_LABELS,
  type PermissionLevel,
  type ToolId,
} from "@construction/shared";
import type { ProjectPermissionMatrixResponse } from "../api/projectSettingsApi";
import { projectSettingsApi } from "../api/projectSettingsApi";
import { useUiStore } from "../../../store/uiStore";

interface PermissionsMatrixTabProps {
  projectId: string;
  matrix: ProjectPermissionMatrixResponse;
  onRefresh: () => Promise<void>;
}

function keyOf(userId: string, toolId: ToolId) {
  return `${userId}:${toolId}`;
}

export function PermissionsMatrixTab({ projectId, matrix, onRefresh }: PermissionsMatrixTabProps) {
  const showToast = useUiStore((state) => state.showToast);
  const [pending, setPending] = useState<Record<string, PermissionLevel>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const overridesByKey = useMemo(() => {
    const map = new Map<string, PermissionLevel>();
    for (const override of matrix.overrides) {
      map.set(keyOf(override.userId, override.toolId), override.level);
    }
    return map;
  }, [matrix.overrides]);

  const currentLevel = (userId: string, toolId: ToolId): PermissionLevel => {
    const member = matrix.members.find((item) => item.userId === userId);
    if (!member) return "NONE";
    return (member.toolPermissions[toolId] ?? "NONE") as PermissionLevel;
  };

  const handleApplyChanges = async () => {
    const entries = Object.entries(pending);
    if (entries.length === 0) {
      return;
    }

    setIsApplying(true);
    try {
      for (const [compoundKey, level] of entries) {
        const [userId, toolIdRaw] = compoundKey.split(":");
        const toolId = toolIdRaw as ToolId;
        const existingOverride = overridesByKey.get(compoundKey);
        const current = currentLevel(userId, toolId);

        if (existingOverride === level) {
          continue;
        }

        if (!existingOverride && current === level) {
          continue;
        }

        await projectSettingsApi.upsertPermissionOverride({
          projectId,
          userId,
          toolId,
          level,
        });
      }

      setPending({});
      await onRefresh();
      showToast({ type: "success", title: "Đã cập nhật permission matrix" });
    } catch (error) {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Không thể cập nhật permission matrix",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const resetUserOverrides = async (userId: string) => {
    const userOverrides = matrix.overrides.filter((override) => override.userId === userId);
    if (userOverrides.length === 0) {
      return;
    }

    setResettingUserId(userId);
    try {
      for (const override of userOverrides) {
        await projectSettingsApi.removePermissionOverride({
          projectId,
          userId: override.userId,
          toolId: override.toolId,
        });
      }

      setPending((prev) => {
        const next = { ...prev };
        for (const toolId of TOOL_IDS) {
          delete next[keyOf(userId, toolId)];
        }
        return next;
      });

      await onRefresh();
      showToast({ type: "success", title: "Da reset override cua nguoi dung" });
    } catch (error) {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Không thể reset override",
      });
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3>Permissions Matrix</h3>
        <button
          onClick={handleApplyChanges}
          disabled={Object.keys(pending).length === 0 || isApplying}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Apply changes
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">User</th>
              {TOOL_IDS.map((toolId) => (
                <th key={toolId} className="px-3 py-2">
                  {TOOL_LABELS[toolId]}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matrix.members.map((member) => (
              <tr key={member.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 align-top">
                  <p className="font-medium text-slate-900">{member.user.name}</p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                  <p className="text-[11px] text-slate-400">{member.role}</p>
                </td>

                {TOOL_IDS.map((toolId) => {
                  const cellKey = keyOf(member.userId, toolId);
                  const effectiveLevel = currentLevel(member.userId, toolId);
                  const overrideLevel = overridesByKey.get(cellKey);
                  const value = pending[cellKey] ?? effectiveLevel;

                  return (
                    <td key={toolId} className="px-3 py-2 align-top">
                      <select
                        value={value}
                        onChange={(event) =>
                          setPending((prev) => ({
                            ...prev,
                            [cellKey]: event.target.value as PermissionLevel,
                          }))
                        }
                        className={`w-full rounded-lg border px-2 py-1 text-xs font-medium ${
                          overrideLevel
                            ? "border-brand-200 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {PERMISSION_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {PERMISSION_LEVEL_LABELS[level]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {overrideLevel ? "Override" : "Preset"}
                      </p>
                    </td>
                  );
                })}

                <td className="px-3 py-2 text-right align-top">
                  <button
                    onClick={() => resetUserOverrides(member.userId)}
                    disabled={resettingUserId === member.userId}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset to default
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



