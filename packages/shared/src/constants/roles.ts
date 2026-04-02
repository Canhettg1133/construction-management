import type { UserRole, ProjectMemberRole, ProjectStatus, TaskStatus, TaskPriority, WeatherCondition } from "../types";

export const USER_ROLES: UserRole[] = ["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"];

export const PROJECT_MEMBER_ROLES: ProjectMemberRole[] = ["PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"];

export const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

export const TASK_STATUSES: TaskStatus[] = ["TO_DO", "IN_PROGRESS", "DONE", "CANCELLED"];

export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const WEATHER_CONDITIONS: WeatherCondition[] = ["SUNNY", "RAINY", "CLOUDY", "OTHER"];

/** Labels use \\u escapes so the file stays valid UTF-8 on any editor/OS. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Qu\u1EA3n l\u00FD d\u1EF1 \u00E1n",
  SITE_ENGINEER: "K\u1EF9 s\u01B0 c\u00F4ng tr\u01B0\u1EDDng",
  VIEWER: "Ng\u01B0\u1EDDi xem",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "\u0110ang ho\u1EA1t \u0111\u1ED9ng",
  ON_HOLD: "T\u1EA1m d\u1EEBng",
  COMPLETED: "Ho\u00E0n th\u00E0nh",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TO_DO: "Ch\u01B0a l\u00E0m",
  IN_PROGRESS: "\u0110ang l\u00E0m",
  DONE: "Ho\u00E0n th\u00E0nh",
  CANCELLED: "H\u1EE7y",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Th\u1EA5p",
  MEDIUM: "Trung b\u00ECnh",
  HIGH: "Cao",
};

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  SUNNY: "N\u1EAFng",
  RAINY: "M\u01B0a",
  CLOUDY: "Nhi\u1EC1u m\u00E2y",
  OTHER: "Kh\u00E1c",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "\u0110\u0103ng nh\u1EADp",
  LOGOUT: "\u0110\u0103ng xu\u1EA5t",
  CREATE: "T\u1EA1o m\u1EDBi",
  UPDATE: "C\u1EB7p nh\u1EADt",
  DELETE: "X\u00F3a",
  STATUS_CHANGE: "\u0110\u1ED5i tr\u1EA1ng th\u00E1i",
};
