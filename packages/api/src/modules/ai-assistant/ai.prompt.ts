import type { ToolId } from "@construction/shared";
import type { AiContextPayload } from "./ai.context";

export type AiMessageIntent =
  | "CHAT"
  | "DRAFT_DAILY_REPORT"
  | "DRAFT_SAFETY_CHECKLIST"
  | "DRAFT_QUALITY_CHECKLIST";

const INTENT_INSTRUCTIONS: Record<AiMessageIntent, string> = {
  CHAT: "Trả lời trực tiếp câu hỏi của người dùng.",
  DRAFT_DAILY_REPORT:
    "Tạo bản nháp báo cáo ngày. Không tự lưu vào hệ thống. Ghi rõ đây là bản nháp để người dùng kiểm tra và xác nhận.",
  DRAFT_SAFETY_CHECKLIST:
    "Tạo bản nháp checklist an toàn. Không tự lưu vào hệ thống. Ghi rõ đây là đề xuất để người dùng kiểm tra.",
  DRAFT_QUALITY_CHECKLIST:
    "Tạo bản nháp checklist chất lượng. Không tự lưu vào hệ thống. Ghi rõ đây là đề xuất để người dùng kiểm tra.",
};

export interface AiPromptInput {
  question: string;
  intent: AiMessageIntent;
  context: AiContextPayload;
  customSystemPrompt?: string | null;
}

function formatToolList(items: ToolId[]) {
  return items.length > 0 ? items.join(", ") : "không có";
}

export function buildAiPrompt(input: AiPromptInput) {
  const system = [
    "Bạn là Trợ lý AI công trình trong hệ thống quản lý thi công.",
    "Bạn chỉ được sử dụng dữ liệu do backend cung cấp trong phần context.",
    "Không suy đoán số liệu, ngân sách, tồn kho, tiến độ, an toàn hoặc chất lượng nếu context không có dữ liệu.",
    "Nếu dữ liệu thiếu hoặc người dùng không có quyền truy cập nguồn dữ liệu, hãy nói rõ là hệ thống chưa cung cấp dữ liệu khả dụng.",
    "Luôn nêu phạm vi dữ liệu: dự án, thời điểm, các phân hệ đã dùng.",
    "Với nhận định rủi ro hoặc kế hoạch xử lý, ghi rõ đó là đề xuất, không phải quyết định chính thức.",
    "Không tự tạo, sửa, duyệt, xóa dữ liệu nghiệp vụ. Với yêu cầu tạo nội dung, chỉ tạo bản nháp để người dùng xác nhận.",
    "Trả lời bằng tiếng Việt có dấu, rõ ràng, ngắn gọn và có mục nguồn dữ liệu khi phù hợp.",
    input.customSystemPrompt?.trim() ? `Bổ sung theo cấu hình dự án: ${input.customSystemPrompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Ý định: ${input.intent}`,
    `Hướng dẫn theo ý định: ${INTENT_INSTRUCTIONS[input.intent]}`,
    `Câu hỏi của người dùng: ${input.question}`,
    `Phân hệ đã đưa vào context: ${formatToolList(input.context.includedTools)}`,
    `Phân hệ bị bỏ qua: ${JSON.stringify(input.context.omittedTools)}`,
    "Context có cấu trúc JSON:",
    JSON.stringify(input.context.data, null, 2),
  ].join("\n\n");

  return { system, user };
}
