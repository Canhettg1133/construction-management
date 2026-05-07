import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, ShieldCheck, UserRound } from "lucide-react";
import { TOOL_LABELS } from "@construction/shared";
import type { AiMessage, AiMessageIntent } from "../api/aiApi";

export interface QuickPrompt {
  label: string;
  content: string;
  intent: AiMessageIntent;
  requiresDraftPermission?: boolean;
}

interface AiChatBoxProps {
  messages: AiMessage[];
  quickPrompts: QuickPrompt[];
  canDraft: boolean;
  providerStatus?: string;
  providerStatusTone?: "default" | "warning";
  isSending: boolean;
  onSend: (content: string, intent: AiMessageIntent) => Promise<void>;
}

function messageTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function AiChatBox({
  messages,
  quickPrompts,
  canDraft,
  providerStatus,
  providerStatusTone = "default",
  isSending,
  onSend,
}: AiChatBoxProps) {
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }
    setContent("");
    await onSend(trimmed, "CHAT");
  };

  const handleQuickPrompt = async (prompt: QuickPrompt) => {
    if (prompt.requiresDraftPermission && !canDraft) {
      return;
    }
    await onSend(prompt.content, prompt.intent);
  };

  return (
    <section className="flex min-h-[calc(100vh-12rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trợ lý AI công trình</h2>
            <p className="text-xs text-slate-500">Chat theo dự án, có kiểm soát quyền dữ liệu.</p>
          </div>
        </div>
        {providerStatus && (
          <div
            className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              providerStatusTone === "warning"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{providerStatus}</span>
          </div>
        )}
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {quickPrompts.map((prompt) => {
            const disabled = isSending || Boolean(prompt.requiresDraftPermission && !canDraft);
            return (
              <button
                key={prompt.label}
                type="button"
                onClick={() => void handleQuickPrompt(prompt)}
                disabled={disabled}
                className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                title={prompt.requiresDraftPermission && !canDraft ? "Cần quyền STANDARD trên Trợ lý AI" : prompt.label}
              >
                {prompt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
            Chưa có tin nhắn trong cuộc trò chuyện này.
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "USER";
            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[min(44rem,85%)] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isUser
                      ? "bg-brand-600 text-white"
                      : message.errorCode
                        ? "border border-red-200 bg-red-50 text-red-800"
                        : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words leading-6">{message.content}</div>

                  {!isUser && message.contextSources && message.contextSources.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-2">
                      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Nguồn dữ liệu đã dùng
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {message.contextSources.slice(0, 8).map((source) => (
                          <span
                            key={`${source.toolId}:${source.recordId}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {TOOL_LABELS[source.toolId]} · {source.title ?? source.recordId}
                          </span>
                        ))}
                        {message.contextSources.length > 8 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            +{message.contextSources.length - 8} nguồn
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`mt-2 text-[11px] ${isUser ? "text-brand-100" : "text-slate-400"}`}>
                    {messageTime(message.createdAt)}
                    {message.model ? ` · ${message.model}` : ""}
                    {message.errorCode ? ` · ${message.errorCode}` : ""}
                  </div>
                </div>

                {isUser && (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                )}
              </article>
            );
          })
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tổng hợp dữ liệu và gọi AI...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Nhập câu hỏi về tiến độ, task, báo cáo, kho, an toàn, chất lượng..."
            className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={isSending || !content.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi
          </button>
        </div>
      </form>
    </section>
  );
}
