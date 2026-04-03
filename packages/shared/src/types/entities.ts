export type UserRole = "ADMIN" | "PROJECT_MANAGER" | "SITE_ENGINEER" | "VIEWER";

export type ProjectMemberRole = "PROJECT_MANAGER" | "SITE_ENGINEER" | "VIEWER";

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED";

export type TaskStatus = "TO_DO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type WeatherCondition = "SUNNY" | "RAINY" | "CLOUDY" | "OTHER";

export type ReportStatus = "DRAFT" | "SENT";

export type AuditAction = "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export type AuditEntityType = "USER" | "PROJECT" | "PROJECT_MEMBER" | "DAILY_REPORT" | "TASK" | "FILE";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  location: string;
  clientName?: string | null;
  startDate: string;
  endDate?: string | null;
  status: ProjectStatus;
  progress: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string;
  user?: User;
  project?: Project;
}

export interface DailyReport {
  id: string;
  projectId: string;
  createdBy: string;
  reportDate: string;
  weather: WeatherCondition;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  workerCount: number;
  workDescription: string;
  issues?: string | null;
  progress: number;
  notes?: string | null;
  status: ReportStatus;
  approvalStatus: ApprovalStatus;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  images?: ReportImage[];
}

export interface ReportImage {
  id: string;
  reportId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  displayOrder: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  createdBy: string;
  reportId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  completedAt?: string | null;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  creator?: User;
  report?: DailyReport;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  uploadedBy: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  fileType: string;
  createdAt: string;
  uploader?: User;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User;
}

export interface DashboardStats {
  projectCount: number;
  activeProjectCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  todayReportCount: number;
  memberCount: number;
  tasksByStatus: Record<TaskStatus, number>;
  recentActivity: AuditLog[];
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message?: string | null;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}
