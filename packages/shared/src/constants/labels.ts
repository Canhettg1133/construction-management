import type { ProjectStatus, TaskStatus, TaskPriority, WeatherCondition, AuditAction } from "../types";

export const TASK_STATUSES: TaskStatus[] = ["TO_DO", "IN_PROGRESS", "DONE", "CANCELLED"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TO_DO: "Chưa làm",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  CANCELLED: "Hủy",
};

export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

export const WEATHER_CONDITIONS: WeatherCondition[] = ["SUNNY", "RAINY", "CLOUDY", "OTHER"];

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: "Nắng",
  RAINY: "Mưa",
  CLOUDY: "Nhiều mây",
  OTHER: "Khác",
};

export const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Đang hoạt động",
  ON_HOLD: "Tạm dừng",
  COMPLETED: "Hoàn thành",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  STATUS_CHANGE: "Đổi trạng thái",
};
