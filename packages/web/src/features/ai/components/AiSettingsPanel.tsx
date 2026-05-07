import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  Cloud,
  Copy,
  Cpu,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { TOOL_LABELS } from "@construction/shared";
import {
  AI_SOURCE_TOOL_IDS,
  aiApi,
  type AiProviderCredential,
  type AiProviderModelOption,
  type AiProviderProfile,
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

type ProviderGroupId = "openai-compatible" | "gemini-direct" | "ollama-local";

interface ProviderGroup {
  id: ProviderGroupId;
  provider: AiProviderType;
  title: string;
  subtitle: string;
  icon: typeof Server;
  defaultName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  defaultChatPath: string;
  defaultModelsPath: string;
  requiresKey: boolean;
}

const PROVIDER_LABELS: Record<AiProviderType, string> = {
  MOCK: "Mock",
  OPENAI_RESPONSES: "OpenAI Responses",
  OPENAI_COMPATIBLE: "OpenAI-compatible",
  GEMINI_DIRECT: "Gemini Direct",
  OLLAMA: "Ollama",
};

const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    id: "openai-compatible",
    provider: "OPENAI_COMPATIBLE",
    title: "OpenAI-compatible / GitHub Models / Proxy",
    subtitle: "Dùng cho GitHub Models, OpenRouter, one-api, NewAPI hoặc proxy tương thích OpenAI.",
    icon: Server,
    defaultName: "OpenAI-compatible",
    defaultBaseUrl: "",
    defaultModel: "gpt-5.4",
    defaultChatPath: "/chat/completions",
    defaultModelsPath: "/models",
    requiresKey: true,
  },
  {
    id: "gemini-direct",
    provider: "GEMINI_DIRECT",
    title: "Gemini / Google AI Studio",
    subtitle: "Dùng API key Google AI Studio, lấy danh sách model Gemini qua backend.",
    icon: Cloud,
    defaultName: "Gemini AI Studio",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    defaultChatPath: "",
    defaultModelsPath: "/models",
    requiresKey: true,
  },
  {
    id: "ollama-local",
    provider: "OLLAMA",
    title: "Ollama local",
    subtitle: "Dùng model chạy tại máy nội bộ, không cần API key.",
    icon: Cpu,
    defaultName: "Ollama local",
    defaultBaseUrl: "http://localhost:11434",
    defaultModel: "llama3.1",
    defaultChatPath: "/api/chat",
    defaultModelsPath: "/api/tags",
    requiresKey: false,
  },
];

function parseKeys(value: string) {
  return value
    .split(/[\s,;]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 10);
}

function readConfigString(profile: AiProviderProfile | null, key: string, fallback = "") {
  const value = profile?.config?.[key];
  return typeof value === "string" ? value : fallback;
}

function readConfigModels(profile: AiProviderProfile | null) {
  const value = profile?.config?.modelOptions;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AiProviderModelOption => {
    return Boolean(item && typeof item === "object" && "id" in item && "label" in item);
  });
}

function groupForProvider(provider: AiProviderType) {
  if (provider === "GEMINI_DIRECT") return PROVIDER_GROUPS[1];
  if (provider === "OLLAMA") return PROVIDER_GROUPS[2];
  return PROVIDER_GROUPS[0];
}

function providerConfigPayload(group: ProviderGroup, chatPath: string, modelsPath: string, modelOptions?: AiProviderModelOption[]) {
  return {
    providerGroup: group.id,
    ...(chatPath.trim() && { chatPath: chatPath.trim() }),
    ...(modelsPath.trim() && { modelsPath: modelsPath.trim() }),
    ...(modelOptions && { modelOptions }),
  };
}

function CredentialRow({
  credential,
  onToggle,
  onRename,
  onDelete,
  isBusy,
}: {
  credential: AiProviderCredential;
  onToggle: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  isBusy: boolean;
}) {
  const [labelDraft, setLabelDraft] = useState(credential.label);
  const disabledUntil = credential.disabledUntil ? new Date(credential.disabledUntil) : null;
  const temporarilyLocked = disabledUntil ? disabledUntil.getTime() > Date.now() : false;
  const labelChanged = Boolean(labelDraft.trim() && labelDraft.trim() !== credential.label);

  useEffect(() => {
    setLabelDraft(credential.label);
  }, [credential.label]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {credential.id === "legacy" ? (
          <p className="text-sm font-medium text-slate-900">{credential.label}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              disabled={isBusy}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
              aria-label="Nhãn API key"
            />
            {labelChanged && (
              <button
                type="button"
                onClick={() => onRename(labelDraft.trim())}
                disabled={isBusy}
                className="h-8 rounded-lg border border-brand-200 bg-brand-50 px-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
              >
                Lưu nhãn
              </button>
            )}
          </div>
        )}
        <p className="mt-0.5 font-mono text-xs text-slate-500">{credential.maskedKey || "Đã lưu bảo mật"}</p>
        <p className="mt-1 text-xs text-slate-500">
          {credential.isEnabled ? "Đang bật" : "Đã tắt"}
          {temporarilyLocked ? ` · Tạm khóa đến ${disabledUntil?.toLocaleTimeString("vi-VN")}` : ""}
          {credential.failureCount > 0 ? ` · ${credential.failureCount} lỗi` : ""}
        </p>
      </div>
      {credential.id !== "legacy" && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={isBusy}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {credential.isEnabled ? "Tắt" : "Bật"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            title="Xóa API key"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
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
  const [selectedGroupId, setSelectedGroupId] = useState<ProviderGroupId>("openai-compatible");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [providerForm, setProviderForm] = useState<ProviderProfilePayload>({
    name: PROVIDER_GROUPS[0].defaultName,
    provider: PROVIDER_GROUPS[0].provider,
    baseUrl: PROVIDER_GROUPS[0].defaultBaseUrl,
    model: PROVIDER_GROUPS[0].defaultModel,
    config: providerConfigPayload(PROVIDER_GROUPS[0], PROVIDER_GROUPS[0].defaultChatPath, PROVIDER_GROUPS[0].defaultModelsPath),
    isEnabled: true,
    isDefault: false,
  });
  const [chatPath, setChatPath] = useState(PROVIDER_GROUPS[0].defaultChatPath);
  const [modelsPath, setModelsPath] = useState(PROVIDER_GROUPS[0].defaultModelsPath);
  const [singleKey, setSingleKey] = useState("");
  const [bulkKeys, setBulkKeys] = useState("");
  const [createModelOptions, setCreateModelOptions] = useState<AiProviderModelOption[]>([]);
  const [selectedProfileDraft, setSelectedProfileDraft] = useState({
    name: "",
    baseUrl: "",
    model: "",
    chatPath: "",
    modelsPath: "",
  });
  const [fetchedModels, setFetchedModels] = useState<AiProviderModelOption[]>([]);
  const [newCredentialKey, setNewCredentialKey] = useState("");
  const [newCredentialBulk, setNewCredentialBulk] = useState("");
  const [exportedKeys, setExportedKeys] = useState("");

  const isSystemAdmin = user?.systemRole === "ADMIN";
  const selectedGroup = PROVIDER_GROUPS.find((group) => group.id === selectedGroupId) ?? PROVIDER_GROUPS[0];

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

  const providerProfiles = providerProfilesQuery.data ?? settingsQuery.data?.availableProviderProfiles ?? [];
  const selectedProfile = providerProfiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const modelOptions = fetchedModels.length > 0 ? fetchedModels : readConfigModels(selectedProfile);

  const credentialsQuery = useQuery({
    queryKey: ["ai-provider-credentials", selectedProfileId],
    queryFn: () => aiApi.listProviderCredentials(selectedProfileId),
    enabled: Boolean(isSystemAdmin && selectedProfileId && selectedProfile && !selectedProfile.readonly),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabledSourceTools(settingsQuery.data.enabledSourceTools ?? AI_SOURCE_TOOL_IDS);
    setCustomSystemPrompt(settingsQuery.data.customSystemPrompt ?? "");
    setDefaultProviderProfileId(settingsQuery.data.defaultProviderProfileId ?? "");
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!selectedProfileId && providerProfiles.length > 0) {
      const firstWritable = providerProfiles.find((profile) => !profile.readonly) ?? providerProfiles[0];
      setSelectedProfileId(firstWritable.id);
    }
  }, [providerProfiles, selectedProfileId]);

  useEffect(() => {
    if (!selectedProfile) return;
    setFetchedModels([]);
    setSelectedProfileDraft({
      name: selectedProfile.name,
      baseUrl: selectedProfile.baseUrl ?? "",
      model: selectedProfile.model,
      chatPath: readConfigString(selectedProfile, "chatPath", groupForProvider(selectedProfile.provider).defaultChatPath),
      modelsPath: readConfigString(selectedProfile, "modelsPath", groupForProvider(selectedProfile.provider).defaultModelsPath),
    });
  }, [selectedProfile]);

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      aiApi.updateProjectSettings(projectId, {
        enabledSourceTools,
        customSystemPrompt,
        defaultProviderProfileId: defaultProviderProfileId || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai-settings", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project-ai-status", projectId] });
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
    mutationFn: () => {
      const keys = [...parseKeys(singleKey), ...parseKeys(bulkKeys)];
      return aiApi.createProviderProfile({
        ...providerForm,
        baseUrl: providerForm.baseUrl?.trim() || null,
        apiKeys: selectedGroup.requiresKey ? keys : [],
        config: providerConfigPayload(selectedGroup, chatPath, modelsPath, createModelOptions),
      });
    },
    onSuccess: async (profile) => {
      setSingleKey("");
      setBulkKeys("");
      setSelectedProfileId(profile.id);
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

  const fetchCreateModelsMutation = useMutation({
    mutationFn: () =>
      aiApi.listProviderModelsFromConfig({
        name: providerForm.name,
        provider: providerForm.provider,
        baseUrl: providerForm.baseUrl?.trim() || null,
        model: providerForm.model || selectedGroup.defaultModel,
        apiKey: selectedGroup.requiresKey ? [...parseKeys(singleKey), ...parseKeys(bulkKeys)][0] ?? null : null,
        config: providerConfigPayload(selectedGroup, chatPath, modelsPath),
      }),
    onSuccess: (result) => {
      setCreateModelOptions(result.models);
      if (result.models.length > 0) {
        setProviderForm((current) => ({ ...current, model: result.models[0].id }));
      }
      showToast({ type: "success", title: `Đã lấy ${result.models.length} model` });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không lấy được danh sách model",
        description: error instanceof Error ? error.message : "Bạn vẫn có thể nhập model thủ công",
      });
    },
  });

  const testCreateProviderMutation = useMutation({
    mutationFn: () =>
      aiApi.testProvider({
        name: providerForm.name,
        provider: providerForm.provider,
        baseUrl: providerForm.baseUrl?.trim() || null,
        model: providerForm.model || selectedGroup.defaultModel,
        apiKey: selectedGroup.requiresKey ? [...parseKeys(singleKey), ...parseKeys(bulkKeys)][0] ?? null : null,
        config: providerConfigPayload(selectedGroup, chatPath, modelsPath, createModelOptions),
      }),
    onSuccess: (result) => {
      showToast({
        type: result.success ? "success" : "error",
        title: result.success ? "Kết nối AI hoạt động" : "Kiểm tra provider thất bại",
        description: result.message,
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
        queryClient.invalidateQueries({ queryKey: ["project-ai-status", projectId] }),
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

  const fetchModelsMutation = useMutation({
    mutationFn: (profileId: string) => aiApi.listProviderModels(profileId),
    onSuccess: async (result) => {
      setFetchedModels(result.models);
      await queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] });
      showToast({ type: "success", title: `Đã lấy ${result.models.length} model` });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không lấy được danh sách model",
        description: error instanceof Error ? error.message : "Bạn vẫn có thể nhập model thủ công",
      });
    },
  });

  const testProviderMutation = useMutation({
    mutationFn: (profileId: string) => aiApi.testProvider({ profileId }),
    onSuccess: (result) => {
      showToast({
        type: result.success ? "success" : "error",
        title: result.success ? "Kết nối AI hoạt động" : "Kiểm tra provider thất bại",
        description: result.message,
      });
    },
  });

  const createCredentialMutation = useMutation({
    mutationFn: (payload: { keys: string | string[]; label?: string | null }) =>
      aiApi.createProviderCredentials(selectedProfileId, payload),
    onSuccess: async (result) => {
      setNewCredentialKey("");
      setNewCredentialBulk("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-provider-credentials", selectedProfileId] }),
        queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] }),
      ]);
      showToast({ type: "success", title: `Đã thêm ${result.added} key, bỏ qua ${result.skipped} key trùng` });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không thêm được API key",
        description: error instanceof Error ? error.message : "Vui lòng kiểm tra lại",
      });
    },
  });

  const updateCredentialMutation = useMutation({
    mutationFn: (payload: { credentialId: string; isEnabled?: boolean; label?: string }) =>
      aiApi.updateProviderCredential(selectedProfileId, payload.credentialId, {
        ...(payload.isEnabled !== undefined && { isEnabled: payload.isEnabled }),
        ...(payload.label !== undefined && { label: payload.label }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-provider-credentials", selectedProfileId] }),
        queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] }),
      ]);
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: (credentialId: string) => aiApi.deleteProviderCredential(selectedProfileId, credentialId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-provider-credentials", selectedProfileId] }),
        queryClient.invalidateQueries({ queryKey: ["ai-provider-profiles"] }),
      ]);
    },
  });

  const exportCredentialMutation = useMutation({
    mutationFn: () => aiApi.exportProviderCredentials(selectedProfileId),
    onSuccess: (result) => {
      setExportedKeys(result.keys.map((item) => item.apiKey).filter(Boolean).join("\n"));
      showToast({ type: "success", title: `Đã xuất ${result.keys.length} API key` });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không xuất được API key",
        description: error instanceof Error ? error.message : "Chỉ system admin được xuất key gốc",
      });
    },
  });

  const selectedSourceSet = useMemo(() => new Set(enabledSourceTools), [enabledSourceTools]);
  const credentials = credentialsQuery.data ?? [];
  const createKeysCount = parseKeys(singleKey).length + parseKeys(bulkKeys).length;
  const credentialKeysCount = parseKeys(newCredentialKey).length + parseKeys(newCredentialBulk).length;

  const handleProviderGroupSelect = (group: ProviderGroup) => {
    setSelectedGroupId(group.id);
    setProviderForm({
      name: group.defaultName,
      provider: group.provider,
      baseUrl: group.defaultBaseUrl,
      model: group.defaultModel,
      config: providerConfigPayload(group, group.defaultChatPath, group.defaultModelsPath),
      isEnabled: true,
      isDefault: false,
    });
    setChatPath(group.defaultChatPath);
    setModelsPath(group.defaultModelsPath);
    setSingleKey("");
    setBulkKeys("");
    setCreateModelOptions([]);
  };

  const toggleSourceTool = (toolId: AiSourceToolId) => {
    setEnabledSourceTools((current) =>
      current.includes(toolId) ? current.filter((item) => item !== toolId) : [...current, toolId]
    );
  };

  const handleSaveSelectedProvider = () => {
    if (!selectedProfile || selectedProfile.readonly) return;
    const group = groupForProvider(selectedProfile.provider);
    updateProviderMutation.mutate({
      id: selectedProfile.id,
      data: {
        name: selectedProfileDraft.name,
        baseUrl: selectedProfileDraft.baseUrl.trim() || null,
        model: selectedProfileDraft.model,
        config: providerConfigPayload(group, selectedProfileDraft.chatPath, selectedProfileDraft.modelsPath, modelOptions),
      },
    });
  };

  const handleAddCredentials = () => {
    const keys = [...parseKeys(newCredentialKey), ...parseKeys(newCredentialBulk)];
    if (keys.length === 0) {
      showToast({ type: "error", title: "Chưa có API key hợp lệ" });
      return;
    }
    createCredentialMutation.mutate({ keys });
  };

  const handleExportCredentials = () => {
    if (!window.confirm("Bạn chắc chắn muốn xuất API key gốc? Thao tác này chỉ dành cho system admin và sẽ được ghi audit.")) {
      return;
    }
    exportCredentialMutation.mutate();
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
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return <ErrorState message="Không tải được cấu hình Trợ lý AI." />;
  }

  return (
    <div className="space-y-4">
      <section className="app-card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-600" />
            <div>
              <h3>Cấu hình Trợ lý AI theo dự án</h3>
              <p className="text-sm text-slate-500">Chọn provider mặc định, nguồn dữ liệu và prompt bổ sung cho dự án.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveSettingsMutation.mutate()}
            disabled={saveSettingsMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saveSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu cấu hình dự án
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
          <div className="space-y-4">
            <label className="block">
              <span className="form-label">Provider mặc định của dự án</span>
              <select
                value={defaultProviderProfileId}
                onChange={(event) => setDefaultProviderProfileId(event.target.value)}
                className="form-input"
              >
                <option value="">Provider từ biến môi trường</option>
                {providerProfiles
                  .filter((profile) => !profile.readonly && profile.isEnabled)
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {PROVIDER_LABELS[profile.provider]} · {profile.model}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">User có quyền Trợ lý AI sẽ dùng provider này mà không thấy API key.</p>
            </label>

            <div>
              <p className="form-label">Nguồn dữ liệu AI được phép sử dụng</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {AI_SOURCE_TOOL_IDS.map((toolId) => (
                  <label
                    key={toolId}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
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
          </div>

          <label className="block">
            <span className="form-label">Prompt bổ sung của dự án</span>
            <textarea
              value={customSystemPrompt}
              onChange={(event) => setCustomSystemPrompt(event.target.value)}
              rows={8}
              maxLength={3000}
              className="form-input min-h-48 resize-y"
              placeholder="Ví dụ: ưu tiên cảnh báo rủi ro an toàn tại khu vực thi công trên cao."
            />
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Không nhập API key, token, mật khẩu hoặc dữ liệu mật vào prompt bổ sung.
            </p>
          </label>
        </div>
      </section>

      {isSystemAdmin && (
        <section className="app-card space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-600" />
            <div>
              <h3>Tạo provider AI</h3>
              <p className="text-sm text-slate-500">Chọn nhóm provider, nhập model và key. Key được gửi về backend để mã hóa.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {PROVIDER_GROUPS.map((group) => {
              const Icon = group.icon;
              const active = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleProviderGroupSelect(group)}
                  className={`min-h-32 rounded-lg border p-4 text-left transition ${
                    active
                      ? "border-brand-300 bg-brand-50 text-brand-900 ring-2 ring-brand-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-5 w-5 text-brand-600" />
                  <p className="mt-3 text-sm font-semibold">{group.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{group.subtitle}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <label>
              <span className="form-label">Tên provider</span>
              <input
                value={providerForm.name}
                onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))}
                className="form-input"
                placeholder="Ví dụ: GitHub Models, Gemini AI Studio, Ollama local"
              />
            </label>
            <div className="space-y-2">
              <label>
                <span className="form-label">Model mặc định</span>
                <input
                  value={providerForm.model}
                  onChange={(event) => setProviderForm((current) => ({ ...current, model: event.target.value }))}
                  className="form-input"
                  placeholder="gpt-5.4, gemini-2.5-flash, llama3.1..."
                />
              </label>
              {createModelOptions.length > 0 && (
                <select
                  value={providerForm.model}
                  onChange={(event) => setProviderForm((current) => ({ ...current, model: event.target.value }))}
                  className="form-input"
                  aria-label="Chọn model đã lấy"
                >
                  {createModelOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} · {model.id}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchCreateModelsMutation.mutate()}
                  disabled={
                    fetchCreateModelsMutation.isPending ||
                    (selectedGroup.requiresKey && parseKeys(singleKey).length + parseKeys(bulkKeys).length === 0)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {fetchCreateModelsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Lấy danh sách model
                </button>
                <button
                  type="button"
                  onClick={() => testCreateProviderMutation.mutate()}
                  disabled={
                    testCreateProviderMutation.isPending ||
                    !providerForm.model.trim() ||
                    (selectedGroup.requiresKey && parseKeys(singleKey).length + parseKeys(bulkKeys).length === 0)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {testCreateProviderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Kiểm tra kết nối
                </button>
              </div>
              {selectedGroup.requiresKey && parseKeys(singleKey).length + parseKeys(bulkKeys).length === 0 && (
                <p className="text-xs text-slate-500">Nhập ít nhất 1 API key để backend lấy danh sách model.</p>
              )}
            </div>
            <label>
              <span className="form-label">Base URL</span>
              <input
                value={providerForm.baseUrl ?? ""}
                onChange={(event) => setProviderForm((current) => ({ ...current, baseUrl: event.target.value }))}
                className="form-input"
                placeholder={selectedGroup.provider === "OPENAI_COMPATIBLE" ? "https://.../v1" : selectedGroup.defaultBaseUrl}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="form-label">Chat path</span>
                <input
                  value={chatPath}
                  onChange={(event) => setChatPath(event.target.value)}
                  className="form-input"
                  placeholder={selectedGroup.defaultChatPath || "Không cần"}
                  disabled={selectedGroup.provider === "GEMINI_DIRECT"}
                />
              </label>
              <label>
                <span className="form-label">Models path</span>
                <input
                  value={modelsPath}
                  onChange={(event) => setModelsPath(event.target.value)}
                  className="form-input"
                  placeholder={selectedGroup.defaultModelsPath}
                />
              </label>
            </div>
          </div>

          {selectedGroup.requiresKey && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <label>
                <span className="form-label">Thêm 1 API key</span>
                <input
                  value={singleKey}
                  onChange={(event) => setSingleKey(event.target.value)}
                  className="form-input font-mono text-xs"
                  type="password"
                  placeholder="Dán 1 API key"
                />
              </label>
              <label>
                <span className="form-label">Nhập nhiều API key</span>
                <textarea
                  value={bulkKeys}
                  onChange={(event) => setBulkKeys(event.target.value)}
                  rows={3}
                  className="form-input min-h-24 resize-y font-mono text-xs"
                  placeholder="Mỗi dòng 1 key, hoặc phân tách bằng dấu phẩy/dấu chấm phẩy"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={providerForm.isEnabled ?? true}
                  onChange={(event) => setProviderForm((current) => ({ ...current, isEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Bật provider
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={providerForm.isDefault ?? false}
                  onChange={(event) => setProviderForm((current) => ({ ...current, isDefault: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Đặt làm mặc định toàn hệ thống
              </label>
              {selectedGroup.requiresKey && <span>{createKeysCount} key hợp lệ sẽ được lưu</span>}
            </div>
            <button
              type="button"
              onClick={() => createProviderMutation.mutate()}
              disabled={createProviderMutation.isPending || !providerForm.name.trim() || !providerForm.model.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {createProviderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Tạo provider
            </button>
          </div>
        </section>
      )}

      <section className="app-card space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <div>
            <h3>Provider AI khả dụng</h3>
            <p className="text-sm text-slate-500">Provider do system admin cấu hình sẽ dùng chung cho các dự án được phân quyền.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {providerProfiles.map((profile) => {
            const active = selectedProfileId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedProfileId(profile.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  active ? "border-brand-300 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {PROVIDER_LABELS[profile.provider]} · {profile.model}
                    </p>
                  </div>
                  {profile.isDefault && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Mặc định
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{profile.isEnabled ? "Đang bật" : "Đã tắt"}</span>
                  <span>{profile.credentialCount ?? 0} key</span>
                  {profile.baseUrl && <span className="break-all">{profile.baseUrl}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {selectedProfile && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Cấu hình provider đang chọn</h4>
                  <p className="text-sm text-slate-500">Lấy model, test kết nối và cập nhật thông tin provider.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isSystemAdmin && !selectedProfile.readonly && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateProviderMutation.mutate({ id: selectedProfile.id, data: { isDefault: true } })}
                        disabled={updateProviderMutation.isPending || selectedProfile.isDefault}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Đặt mặc định
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProviderMutation.mutate({ id: selectedProfile.id, data: { isEnabled: !selectedProfile.isEnabled } })}
                        disabled={updateProviderMutation.isPending}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {selectedProfile.isEnabled ? "Tắt" : "Bật"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label>
                  <span className="form-label">Tên provider</span>
                  <input
                    value={selectedProfileDraft.name}
                    onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, name: event.target.value }))}
                    className="form-input bg-white"
                    disabled={!isSystemAdmin || selectedProfile.readonly}
                  />
                </label>
                <label>
                  <span className="form-label">Model đang dùng</span>
                  <input
                    value={selectedProfileDraft.model}
                    onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, model: event.target.value }))}
                    className="form-input bg-white"
                    disabled={!isSystemAdmin || selectedProfile.readonly}
                  />
                </label>
                <label>
                  <span className="form-label">Base URL</span>
                  <input
                    value={selectedProfileDraft.baseUrl}
                    onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, baseUrl: event.target.value }))}
                    className="form-input bg-white"
                    disabled={!isSystemAdmin || selectedProfile.readonly}
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    <span className="form-label">Chat path</span>
                    <input
                      value={selectedProfileDraft.chatPath}
                      onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, chatPath: event.target.value }))}
                      className="form-input bg-white"
                      disabled={!isSystemAdmin || selectedProfile.readonly || selectedProfile.provider === "GEMINI_DIRECT"}
                    />
                  </label>
                  <label>
                    <span className="form-label">Models path</span>
                    <input
                      value={selectedProfileDraft.modelsPath}
                      onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, modelsPath: event.target.value }))}
                      className="form-input bg-white"
                      disabled={!isSystemAdmin || selectedProfile.readonly}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label>
                  <span className="form-label">Danh sách model đã lấy</span>
                  <select
                    value={selectedProfileDraft.model}
                    onChange={(event) => setSelectedProfileDraft((current) => ({ ...current, model: event.target.value }))}
                    className="form-input bg-white"
                    disabled={!modelOptions.length || !isSystemAdmin || selectedProfile.readonly}
                  >
                    <option value={selectedProfileDraft.model}>{selectedProfileDraft.model || "Chưa chọn model"}</option>
                    {modelOptions.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} · {model.id}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fetchModelsMutation.mutate(selectedProfile.id)}
                    disabled={fetchModelsMutation.isPending || !isSystemAdmin || selectedProfile.readonly}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {fetchModelsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Lấy danh sách model
                  </button>
                  <button
                    type="button"
                    onClick={() => testProviderMutation.mutate(selectedProfile.id)}
                    disabled={testProviderMutation.isPending || !isSystemAdmin || selectedProfile.readonly}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {testProviderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Kiểm tra kết nối
                  </button>
                  {isSystemAdmin && !selectedProfile.readonly && (
                    <button
                      type="button"
                      onClick={handleSaveSelectedProvider}
                      disabled={updateProviderMutation.isPending}
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Lưu provider
                    </button>
                  )}
                </div>
              </div>
            </section>

            {isSystemAdmin && !selectedProfile.readonly && (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">API key pool</h4>
                    <p className="text-sm text-slate-500">Key được mã hóa ở backend và xoay vòng khi gọi AI.</p>
                  </div>
                  <KeyRound className="h-5 w-5 text-brand-600" />
                </div>

                <div className="mt-4 space-y-2">
                  {credentialsQuery.isLoading ? (
                    <SkeletonCard lines={3} />
                  ) : credentials.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      Chưa có API key nào cho provider này.
                    </div>
                  ) : (
                    credentials.map((credential) => (
                      <CredentialRow
                        key={credential.id}
                        credential={credential}
                        isBusy={updateCredentialMutation.isPending || deleteCredentialMutation.isPending}
                        onToggle={() =>
                          updateCredentialMutation.mutate({
                            credentialId: credential.id,
                            isEnabled: !credential.isEnabled,
                          })
                        }
                        onRename={(label) =>
                          updateCredentialMutation.mutate({
                            credentialId: credential.id,
                            label,
                          })
                        }
                        onDelete={() => deleteCredentialMutation.mutate(credential.id)}
                      />
                    ))
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label>
                    <span className="form-label">Thêm 1 API key</span>
                    <input
                      value={newCredentialKey}
                      onChange={(event) => setNewCredentialKey(event.target.value)}
                      type="password"
                      className="form-input bg-white font-mono text-xs"
                      placeholder="Dán 1 API key"
                    />
                  </label>
                  <label>
                    <span className="form-label">Nhập nhiều API key</span>
                    <textarea
                      value={newCredentialBulk}
                      onChange={(event) => setNewCredentialBulk(event.target.value)}
                      rows={4}
                      className="form-input min-h-28 resize-y bg-white font-mono text-xs"
                      placeholder="Mỗi dòng 1 key, hoặc phân tách bằng dấu phẩy/dấu chấm phẩy"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{credentialKeysCount} key hợp lệ sẵn sàng thêm</span>
                  <button
                    type="button"
                    onClick={handleAddCredentials}
                    disabled={createCredentialMutation.isPending || credentialKeysCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {createCredentialMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Thêm key
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Xuất API key gốc</p>
                      <p className="text-xs text-amber-800">Chỉ system admin được xuất plaintext, thao tác này có audit.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCredentials}
                      disabled={exportCredentialMutation.isPending || credentials.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {exportCredentialMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Xuất key
                    </button>
                  </div>
                  {exportedKeys && (
                    <div className="mt-3">
                      <textarea
                        value={exportedKeys}
                        readOnly
                        rows={5}
                        className="form-input min-h-28 bg-white font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(exportedKeys);
                          showToast({ type: "success", title: "Đã sao chép API key" });
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Copy className="h-4 w-4" />
                        Sao chép
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {selectedProfile.readonly && (
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <XCircle className="mt-0.5 h-4 w-4 text-slate-400" />
                  Provider này đến từ biến môi trường nên chỉ xem được trong UI. Hãy chỉnh `.env` nếu muốn thay đổi key hoặc model.
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
