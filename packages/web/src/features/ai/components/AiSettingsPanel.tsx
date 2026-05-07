import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, KeyRound, Save, SlidersHorizontal } from "lucide-react";
import { TOOL_LABELS } from "@construction/shared";
import {
  AI_SOURCE_TOOL_IDS,
  aiApi,
  type AiProviderType,
  type AiSourceToolId,
  type ProviderProfilePayload,
} from "../api/aiApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";

interface AiSettingsPanelProps {
  projectId: string;
}

const PROVIDER_LABELS: Record<AiProviderType, string> = {
  MOCK: "Mock",
  OPENAI_RESPONSES: "OpenAI Responses",
  OPENAI_COMPATIBLE: "OpenAI-compatible",
  GEMINI_DIRECT: "Gemini Direct",
  OLLAMA: "Ollama",
};

const PROVIDER_OPTIONS = Object.keys(PROVIDER_LABELS) as AiProviderType[];

function defaultModelFor(provider: AiProviderType) {
  if (provider === "GEMINI_DIRECT") return "gemini-2.5-flash";
  if (provider === "OLLAMA") return "llama3.1";
  if (provider === "MOCK") return "mock-construction-assistant";
  return "gpt-5.4";
}

export function AiSettingsPanel({ projectId }: AiSettingsPanelProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const showToast = useUiStore((state) => state.showToast);
  const { has: canManageAi, isLoading: permissionLoading } = usePermission({
    projectId,
    toolId: "AI_ASSISTANT",
    minLevel: "ADMIN",
  });

  const [enabledSourceTools, setEnabledSourceTools] = useState<AiSourceToolId[]>(AI_SOURCE_TOOL_IDS);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [defaultProviderProfileId, setDefaultProviderProfileId] = useState("");
  const [providerForm, setProviderForm] = useState<ProviderProfilePayload>({
    name: "",
    provider: "OPENAI_COMPATIBLE",
    baseUrl: "",
    model: "gpt-5.4",
    apiKey: "",
    isEnabled: true,
    isDefault: false,
  });

  const isSystemAdmin = user?.systemRole === "ADMIN";

  const settingsQuery = useQuery({
    queryKey: ["ai-settings", projectId],
    queryFn: () => aiApi.getProjectSettings(projectId),
    enabled: Boolean(projectId && canManageAi),
  });

  const providerProfilesQuery = useQuery({
    queryKey: ["ai-provider-profiles"],
    queryFn: () => aiApi.listProviderProfiles(),
    enabled: Boolean(isSystemAdmin),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabledSourceTools(settingsQuery.data.enabledSourceTools ?? AI_SOURCE_TOOL_IDS);
    setCustomSystemPrompt(settingsQuery.data.customSystemPrompt ?? "");
    setDefaultProviderProfileId(settingsQuery.data.defaultProviderProfileId ?? "");
  }, [settingsQuery.data]);

  const availableProviderProfiles = settingsQuery.data?.availableProviderProfiles ?? [];
  const providerProfiles = providerProfilesQuery.data ?? availableProviderProfiles;

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      aiApi.updateProjectSettings(projectId, {
        enabledSourceTools,
        customSystemPrompt,
        defaultProviderProfileId: defaultProviderProfileId || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai-settings", projectId] });
      showToast({ type: "success", title: "Đã lưu cấu hình Trợ lý AI" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không lưu được cấu hình AI",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
      });
    },
  });

  const createProviderMutation = useMutation({
    mutationFn: () =>
      aiApi.createProviderProfile({
        ...providerForm,
        baseUrl: providerForm.baseUrl?.trim() || null,
        apiKey: providerForm.apiKey?.trim() || null,
      }),
    onSuccess: async () => {
      setProviderForm({
        name: "",
        provider: "OPENAI_COMPATIBLE",
        baseUrl: "",
        model: "gpt-5.4",
        apiKey: "",
        isEnabled: true,
        isDefault: false,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-settings", projectId] }),
      ]);
      showToast({ type: "success", title: "Đã tạo provider AI" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không tạo được provider AI",
        description: error instanceof Error ? error.message : "Vui lòng kiểm tra cấu hình",
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<ProviderProfilePayload> & { clearApiKey?: boolean } }) =>
      aiApi.updateProviderProfile(payload.id, payload.data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-settings", projectId] }),
      ]);
      showToast({ type: "success", title: "Đã cập nhật provider AI" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không cập nhật được provider AI",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
      });
    },
  });

  const selectedSourceSet = useMemo(() => new Set(enabledSourceTools), [enabledSourceTools]);

  const toggleSourceTool = (toolId: AiSourceToolId) => {
    setEnabledSourceTools((current) =>
      current.includes(toolId) ? current.filter((item) => item !== toolId) : [...current, toolId]
    );
  };

  const handleProviderChange = (provider: AiProviderType) => {
    setProviderForm((current) => ({
      ...current,
      provider,
      model: defaultModelFor(provider),
      baseUrl: provider === "OLLAMA" ? "http://localhost:11434" : current.baseUrl,
    }));
  };

  if (permissionLoading) {
    return <SkeletonCard lines={4} />;
  }

  if (!canManageAi) {
    return <ErrorState message="Bạn cần quyền ADMIN trên Trợ lý AI để cấu hình mục này." />;
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return <ErrorState message="Không tải được cấu hình Trợ lý AI." />;
  }

  return (
    <div className="space-y-4">
      <section className="app-card space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-brand-600" />
          <h3>Cấu hình theo dự án</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="form-label">Provider mặc định</span>
            <select
              value={defaultProviderProfileId}
              onChange={(event) => setDefaultProviderProfileId(event.target.value)}
              className="form-input"
            >
              <option value="">Provider từ biến môi trường</option>
              {availableProviderProfiles
                .filter((profile) => !profile.readonly)
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} · {PROVIDER_LABELS[profile.provider]} · {profile.model}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="form-label">Prompt bổ sung của dự án</span>
            <textarea
              value={customSystemPrompt}
              onChange={(event) => setCustomSystemPrompt(event.target.value)}
              rows={4}
              maxLength={3000}
              className="form-input min-h-28 resize-y"
              placeholder="Ví dụ: ưu tiên cảnh báo rủi ro an toàn tại khu vực thi công trên cao."
            />
          </label>
        </div>

        <div>
          <p className="form-label">Nguồn dữ liệu AI được phép sử dụng</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AI_SOURCE_TOOL_IDS.map((toolId) => (
              <label
                key={toolId}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedSourceSet.has(toolId)}
                  onChange={() => toggleSourceTool(toolId)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {TOOL_LABELS[toolId]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Lưu cấu hình AI
          </button>
        </div>
      </section>

      <section className="app-card space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-600" />
          <h3>Provider AI khả dụng</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {providerProfiles.map((profile) => (
            <div key={profile.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{profile.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {PROVIDER_LABELS[profile.provider]} · {profile.model}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {profile.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Mặc định
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      profile.isEnabled ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {profile.isEnabled ? "Đang bật" : "Đã tắt"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5" />
                  {profile.hasApiKey ? "Có API key" : "Chưa có API key"}
                </span>
                {profile.baseUrl && <span className="break-all">{profile.baseUrl}</span>}
              </div>

              {isSystemAdmin && !profile.readonly && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateProviderMutation.mutate({ id: profile.id, data: { isDefault: true } })}
                    disabled={updateProviderMutation.isPending || profile.isDefault}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Đặt mặc định
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateProviderMutation.mutate({ id: profile.id, data: { isEnabled: !profile.isEnabled } })
                    }
                    disabled={updateProviderMutation.isPending}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {profile.isEnabled ? "Tắt" : "Bật"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {isSystemAdmin && (
        <section className="app-card space-y-4">
          <h3>Thêm provider AI</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="form-label">Tên provider</span>
              <input
                value={providerForm.name}
                onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))}
                className="form-input"
                placeholder="GitHub Models proxy, AI Studio, Ollama local..."
              />
            </label>
            <label>
              <span className="form-label">Loại provider</span>
              <select
                value={providerForm.provider}
                onChange={(event) => handleProviderChange(event.target.value as AiProviderType)}
                className="form-input"
              >
                {PROVIDER_OPTIONS.map((provider) => (
                  <option key={provider} value={provider}>
                    {PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">Base URL</span>
              <input
                value={providerForm.baseUrl ?? ""}
                onChange={(event) => setProviderForm((current) => ({ ...current, baseUrl: event.target.value }))}
                className="form-input"
                placeholder="https://api.openai.com/v1 hoặc http://localhost:11434"
              />
            </label>
            <label>
              <span className="form-label">Model</span>
              <input
                value={providerForm.model}
                onChange={(event) => setProviderForm((current) => ({ ...current, model: event.target.value }))}
                className="form-input"
                placeholder="gpt-5.4, gemini-2.5-flash, llama3.1..."
              />
            </label>
            <label className="md:col-span-2">
              <span className="form-label">API key</span>
              <input
                value={providerForm.apiKey ?? ""}
                onChange={(event) => setProviderForm((current) => ({ ...current, apiKey: event.target.value }))}
                className="form-input"
                type="password"
                placeholder="API key được gửi về backend để mã hóa, không lưu ở frontend"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={providerForm.isEnabled ?? true}
                  onChange={(event) =>
                    setProviderForm((current) => ({ ...current, isEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Bật provider
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={providerForm.isDefault ?? false}
                  onChange={(event) =>
                    setProviderForm((current) => ({ ...current, isDefault: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Đặt làm mặc định
              </label>
            </div>
            <button
              type="button"
              onClick={() => createProviderMutation.mutate()}
              disabled={createProviderMutation.isPending || !providerForm.name.trim() || !providerForm.model.trim()}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              Tạo provider
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
