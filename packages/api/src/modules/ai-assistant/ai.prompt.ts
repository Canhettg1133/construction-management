import type { ToolId } from "@construction/shared";
import type { AiContextPayload } from "./ai.context";
import type { AiToolCallMeta, AiToolResultMeta } from "./ai.tools";

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

const DRAFT_DAILY_REPORT_FORMAT = [
  "Định dạng riêng cho bản nháp báo cáo ngày:",
  "- Mở đầu bằng tiêu đề **Bản nháp báo cáo ngày** và 1 câu nhắc đây là bản nháp chưa lưu.",
  "- Trình bày các mục: **Thông tin chung**, **Nhân lực**, **Công việc thực hiện**, **Vật tư, thiết bị**, **An toàn, vệ sinh môi trường**, **Vấn đề & đề xuất**, **Dữ liệu còn thiếu**, **Nguồn dữ liệu**.",
  "- Không dùng placeholder dạng [Vui lòng điền...], [Ngày hôm nay] hoặc lựa chọn nước đôi như Đảm bảo/Có vi phạm.",
  "- Nếu thiếu số nhân công hôm nay, chỉ ghi **Chưa có số nhân công hôm nay trong hệ thống**; nếu có báo cáo cũ thì nêu là **tham chiếu gần nhất**, không xem là số hôm nay.",
  "- Nếu thiếu dữ liệu vật tư, máy móc, an toàn hoặc vệ sinh môi trường, ghi rõ trong **Dữ liệu còn thiếu** thay vì tự điền trạng thái tốt/xấu.",
  "- Với máy móc/thiết bị, chỉ nêu khi ngữ cảnh có dữ liệu; nếu không có phân hệ hoặc dữ liệu máy móc thì ghi rõ hệ thống chưa cung cấp dữ liệu này.",
].join("\n");

export interface AiPromptInput {
  question: string;
  intent: AiMessageIntent;
  context: AiContextPayload;
  customSystemPrompt?: string | null;
  toolCalls?: AiToolCallMeta[];
  toolResults?: AiToolResultMeta[];
}

function formatToolList(items: ToolId[]) {
  return items.length > 0 ? items.join(", ") : "không có";
}

function hasWord(value: string, word: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${word}([^\\p{L}\\p{N}]|$)`, "iu").test(value);
}

function normalizeQuestionText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/giu, "d")
    .toLowerCase();
}

function questionRequestsTable(question: string) {
  return hasWord(question, "bảng") || hasWord(question, "bang") || hasWord(question, "table");
}

function questionRequestsOverdueTasks(question: string) {
  const normalized = normalizeQuestionText(question);
  return (
    normalized.includes("cong viec") &&
    (normalized.includes("qua han") || normalized.includes("tre han") || normalized.includes("cham") || normalized.includes("deadline"))
  );
}

function buildRequestedFormatInstruction(question: string) {
  if (!questionRequestsTable(question)) {
    return "";
  }

  const lines = [
    "Yêu cầu định dạng bắt buộc:",
    "- Người dùng đã yêu cầu trả lời bằng bảng, vì vậy phải tạo bảng Markdown trong câu trả lời.",
    "- Nếu kết quả truy vấn không có dòng dữ liệu, vẫn tạo bảng với các cột phù hợp và 1 dòng nêu rõ không có dữ liệu phù hợp; không viết rằng không thể cung cấp bảng.",
  ];

  if (questionRequestsOverdueTasks(question)) {
    lines.push(
      "- Với bảng công việc quá hạn, dùng các cột: Công việc | Hạn chót | Người phụ trách | Mức độ ảnh hưởng.",
      "- Nếu `list_overdue_tasks.total` bằng 0 hoặc `tasks` rỗng, bảng phải có 1 dòng: Không có công việc quá hạn | Không áp dụng | Không áp dụng | Không có ảnh hưởng quá hạn ghi nhận.",
      "- Không thay thế danh sách rỗng bằng các công việc đã hoàn thành hoặc dữ liệu gần nhất nếu người dùng chỉ hỏi công việc quá hạn."
    );
  }

  return lines.join("\n");
}

export function buildAiPrompt(input: AiPromptInput) {
  const requestedFormatInstruction = buildRequestedFormatInstruction(input.question);
  const system = [
    "Bạn là Trợ lý AI công trình trong hệ thống quản lý thi công.",
    "Bạn chỉ được sử dụng dữ liệu do máy chủ cung cấp trong phần kết quả công cụ/ngữ cảnh.",
    "Máy chủ đã kiểm tra đăng nhập, quyền dự án, quyền từng phân hệ và nguồn dữ liệu được bật trước khi chạy công cụ.",
    "Không suy đoán số liệu, ngân sách, tồn kho, tiến độ, an toàn hoặc chất lượng nếu ngữ cảnh không có dữ liệu.",
    "Nếu dữ liệu thiếu hoặc người dùng không có quyền truy cập nguồn dữ liệu, hãy nói rõ là hệ thống chưa cung cấp dữ liệu khả dụng.",
    "Luôn nêu phạm vi dữ liệu: dự án, thời điểm, các phân hệ đã dùng.",
    "Khi nói về ngày hạn hoặc mốc thời gian, so sánh với thời điểm tạo ngữ cảnh; nếu mốc đã qua thì ghi rõ là **quá hạn** hoặc **dữ liệu quá khứ**, không viết như việc còn sắp đến hạn.",
    "Với nhận định rủi ro hoặc kế hoạch xử lý, ghi rõ đó là đề xuất, không phải quyết định chính thức.",
    "Không tự tạo, sửa, duyệt, xóa dữ liệu nghiệp vụ. Với yêu cầu tạo nội dung, chỉ tạo bản nháp để người dùng xác nhận.",
    "Phân biệt dữ liệu có căn cứ và suy luận: dữ liệu phải bám vào JSON/công cụ, còn suy luận phải ghi là **nhận định** hoặc **đề xuất**.",
    "Trả lời bằng tiếng Việt có dấu, rõ ràng, ngắn gọn, đẹp mắt theo Markdown; dùng **in đậm** cho nhãn chính, số liệu quan trọng, rủi ro và kết luận cần chú ý.",
    "Ưu tiên bố cục dễ đọc trong khung chat: dùng tiêu đề ngắn, bullet list hoặc các mục đánh số. Chỉ dùng bảng Markdown khi dữ liệu thật sự ngắn và ít cột; không đặt câu giải thích dài trong ô bảng.",
    "Khi bắt buộc dùng bảng: tối đa 5 cột, tiêu đề cột ngắn, mỗi ô chỉ chứa dữ liệu hoặc cụm nhận định ngắn; phần giải thích/rủi ro/đề xuất đặt dưới bảng bằng bullet.",
    "Nếu người dùng yêu cầu cụ thể định dạng bảng, bắt buộc dùng bảng Markdown; nếu không có dòng dữ liệu, vẫn tạo bảng với một dòng trạng thái không có dữ liệu phù hợp. Quy tắc này ưu tiên hơn hướng dẫn hạn chế bảng rộng.",
    "Nếu cần liệt kê nhiều công việc/hạng mục, trình bày mỗi mục theo dạng **Tên** - hạn/người phụ trách/trạng thái/rủi ro ngắn thay vì bảng rộng khó đọc, trừ khi người dùng yêu cầu bảng.",
    "Không dùng placeholder. Nếu thiếu dữ liệu, tạo mục **Dữ liệu còn thiếu** và nói đúng nguồn nào chưa có dữ liệu khả dụng.",
    input.intent === "DRAFT_DAILY_REPORT" ? DRAFT_DAILY_REPORT_FORMAT : "",
    input.customSystemPrompt?.trim() ? `Bổ sung theo cấu hình dự án: ${input.customSystemPrompt.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Ý định: ${input.intent}`,
    `Hướng dẫn theo ý định: ${INTENT_INSTRUCTIONS[input.intent]}`,
    `Câu hỏi của người dùng: ${input.question}`,
    requestedFormatInstruction,
    input.intent === "DRAFT_DAILY_REPORT" ? DRAFT_DAILY_REPORT_FORMAT : "",
    `Phân hệ đã đưa vào kết quả công cụ/ngữ cảnh: ${formatToolList(input.context.includedTools)}`,
    `Phân hệ bị bỏ qua: ${JSON.stringify(input.context.omittedTools)}`,
    input.toolCalls?.length ? "Công cụ máy chủ đã xử lý:" : "",
    input.toolCalls?.length ? JSON.stringify(input.toolCalls, null, 2) : "",
    input.toolResults?.length ? "Kết quả công cụ đã được lọc quyền:" : "Ngữ cảnh có cấu trúc JSON:",
    input.toolResults?.length ? JSON.stringify(input.toolResults, null, 2) : JSON.stringify(input.context.data, null, 2),
  ].join("\n\n");

  return { system, user };
}
