import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Plus, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { aiApi, type AiMessageIntent, type AiThread } from "../api/aiApi";
import { AiChatBox, type QuickPrompt } from "../components/AiChatBox";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useUiStore } from "../../../store/uiStore";

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "Tóm tắt dự án tuần này",
    content: "Tóm tắt tình hình dự án trong tuần này, nêu tiến độ, task nổi bật, báo cáo và rủi ro chính.",
    intent: "CHAT",
  },
  {
    label: "Liệt kê công việc quá hạn",
    content: "Liệt kê các công việc đang quá hạn, kèm mức ưu tiên, người phụ trách và đề xuất xử lý.",
    intent: "CHAT",
  },
  {
    label: "Phân tích rủi ro tiến độ",
    content: "Phân tích rủi ro tiến độ từ task, báo cáo ngày và dữ liệu hiện có. Chỉ dùng dữ liệu được cung cấp.",
    intent: "CHAT",
  },
  {
    label: "Kiểm tra tồn kho thấp",
    content: "Kiểm tra vật tư tồn kho thấp hoặc có nguy cơ thiếu, kèm tác động tới thi công nếu có dữ liệu.",
    intent: "CHAT",
  },
  {
    label: "Tóm tắt an toàn/chất lượng",
    content: "Tóm tắt tình hình an toàn và chất lượng gần đây, nêu vấn đề mở và khuyến nghị theo dữ liệu hiện có.",
    intent: "CHAT",
  },
  {
    label: "Gợi ý báo cáo ngày hôm nay",
    content: "Tạo bản nháp báo cáo ngày hôm nay dựa trên dữ liệu hiện có. Không tự lưu vào hệ thống.",
    intent: "DRAFT_DAILY_REPORT",
    requiresDraftPermission: true,
  },
];

export function ProjectAiChatPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { has: canDraft } = usePermission({
    projectId,
    toolId: "AI_ASSISTANT",
    minLevel: "STANDARD",
  });

  const threadsQuery = useQuery({
    queryKey: ["ai-threads", projectId],
    queryFn: () => aiApi.listThreads(projectId),
    enabled: Boolean(projectId),
  });

  const selectedThread = useMemo(
    () => threadsQuery.data?.find((thread) => thread.id === selectedThreadId) ?? threadsQuery.data?.[0] ?? null,
    [threadsQuery.data, selectedThreadId]
  );

  useEffect(() => {
    if (!selectedThreadId && threadsQuery.data && threadsQuery.data.length > 0) {
      setSelectedThreadId(threadsQuery.data[0].id);
    }
  }, [selectedThreadId, threadsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: ["ai-messages", projectId, selectedThread?.id],
    queryFn: () => aiApi.listMessages(projectId, selectedThread!.id),
    enabled: Boolean(projectId && selectedThread?.id),
  });

  const createThreadMutation = useMutation({
    mutationFn: (payload: { title?: string }) => aiApi.createThread(projectId, payload),
    onSuccess: async (thread) => {
      setSelectedThreadId(thread.id);
      await queryClient.invalidateQueries({ queryKey: ["ai-threads", projectId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { content: string; intent: AiMessageIntent }) => {
      let thread: AiThread | null = selectedThread;
      if (!thread) {
        thread = await aiApi.createThread(projectId, { title: payload.content.slice(0, 120) });
        setSelectedThreadId(thread.id);
      }
      return aiApi.sendMessage(projectId, thread.id, payload);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-threads", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["ai-messages", projectId] }),
      ]);

      if (result.assistantMessage.errorCode) {
        showToast({
          type: "error",
          title: "Provider AI đang lỗi",
          description: "Câu hỏi đã được lưu, vui lòng kiểm tra cấu hình provider.",
        });
      }
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Không gửi được câu hỏi",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
      });
    },
  });

  const handleSend = async (content: string, intent: AiMessageIntent) => {
    await sendMessageMutation.mutateAsync({ content, intent });
  };

  if (threadsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (threadsQuery.isError) {
    return <ErrorState message="Không tải được Trợ lý AI của dự án." />;
  }

  const threads = threadsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cuộc trò chuyện</h2>
            <p className="text-xs text-slate-500">Mặc định riêng tư theo người dùng.</p>
          </div>
          <button
            type="button"
            onClick={() => createThreadMutation.mutate({ title: "Cuộc trò chuyện mới" })}
            disabled={createThreadMutation.isPending}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            title="Tạo cuộc trò chuyện mới"
          >
            {createThreadMutation.isPending ? <Plus className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          </button>
        </div>

        <div className="max-h-[calc(100vh-13rem)] space-y-2 overflow-y-auto p-3">
          {threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Chưa có thread AI nào.
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedThread?.id === thread.id
                    ? "border-brand-200 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="line-clamp-2 text-sm font-medium">{thread.title}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3 w-3" />
                  {thread._count?.messages ?? 0} tin nhắn · Riêng tư
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <AiChatBox
        messages={messages}
        quickPrompts={QUICK_PROMPTS}
        canDraft={canDraft}
        isSending={sendMessageMutation.isPending || messagesQuery.isFetching}
        onSend={handleSend}
      />
    </div>
  );
}
