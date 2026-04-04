import type { PermissionLevel, ProjectRole, SpecialPrivilege, SystemRole, ToolId } from './roles'

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type WeatherCondition = 'SUNNY' | 'RAINY' | 'CLOUDY' | 'OTHER'
export type ReportStatus = 'DRAFT' | 'SENT'
export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
export type AuditEntityType =
  | 'USER'
  | 'PROJECT'
  | 'PROJECT_MEMBER'
  | 'PROJECT_TOOL_PERMISSION'
  | 'SPECIAL_PRIVILEGE_ASSIGNMENT'
  | 'DAILY_REPORT'
  | 'TASK'
  | 'FILE'
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DEADLINE_SOON'
  | 'TASK_OVERDUE'
  | 'REPORT_PENDING_APPROVAL'
  | 'SAFETY_VIOLATION'
  | 'SAFETY_REPORT_PENDING'
  | 'QUALITY_REPORT_PENDING'
  | 'LOW_STOCK_ALERT'
  | 'TRANSACTION_PENDING'
  | 'PROJECT_PROGRESS_UPDATE'
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type WarehouseTransactionType = 'IN' | 'OUT' | 'REQUEST'
export type WarehouseTransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type BudgetItemStatus = 'PENDING' | 'APPROVED' | 'PAID'
export type BudgetDisbursementStatus = 'PENDING' | 'APPROVED' | 'PAID'

export interface User {
  id: string
  name: string
  email: string
  systemRole: SystemRole
  specialty?: string | null
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  code: string
  name: string
  description?: string | null
  location: string
  clientName?: string | null
  startDate: string
  endDate?: string | null
  status: ProjectStatus
  progress: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  specialty?: string | null
  joinedAt: string
  user?: User
  project?: Project
}

export interface ProjectToolPermission {
  id: string
  projectId: string
  userId: string
  toolId: ToolId
  level: PermissionLevel
  createdAt: string
  updatedAt: string
}

export interface SpecialPrivilegeAssignment {
  id: string
  projectId: string
  userId: string
  privilege: SpecialPrivilege
  grantedBy?: string | null
  grantedAt: string
  granter?: User | null
}

export interface DailyReport {
  id: string
  projectId: string
  createdBy: string
  reportDate: string
  weather: WeatherCondition
  temperatureMin?: number | null
  temperatureMax?: number | null
  workerCount: number
  workDescription: string
  issues?: string | null
  progress: number
  notes?: string | null
  status: ReportStatus
  approvalStatus: ApprovalStatus
  submittedAt?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedReason?: string | null
  createdAt: string
  updatedAt: string
  creator?: User
  images?: ReportImage[]
}

export interface ReportImage {
  id: string
  reportId: string
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  filePath: string
  displayOrder: number
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string | null
  assignedTo?: string | null
  createdBy: string
  reportId?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  completedAt?: string | null
  requiresApproval: boolean
  approvalStatus: ApprovalStatus
  submittedAt?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedReason?: string | null
  createdAt: string
  updatedAt: string
  assignee?: User
  creator?: User
  report?: DailyReport
}

export interface ProjectFile {
  id: string
  projectId: string
  uploadedBy: string
  folderId?: string | null
  fileName: string
  originalName: string
  fileSize: number
  mimeType: string
  filePath: string
  fileType: string
  version: number
  parentVersionId?: string | null
  tags?: string | null
  deletedAt?: string | null
  createdAt: string
  uploader?: User
  folder?: DocumentFolder | null
  project?: Project
}

export interface DocumentFolder {
  id: string
  projectId: string
  name: string
  parentId?: string | null
  createdBy: string
  createdAt: string
  creator?: User
}

export interface AuditLog {
  id: string
  userId?: string | null
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  description: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  user?: User
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown> | null
  link?: string | null
  isRead: boolean
  createdAt: string
}

export interface SafetyReport {
  id: string
  projectId: string
  reportDate: string
  inspectorId: string
  location: string
  description: string
  violations: number
  photos?: string[] | null
  status: ApprovalStatus
  signedBy?: string | null
  signedAt?: string | null
  createdAt: string
  inspector?: Pick<User, 'id' | 'name' | 'email'>
}

export interface QualityReport {
  id: string
  projectId: string
  reportDate: string
  inspectorId: string
  location: string
  description: string
  status: ApprovalStatus
  signedBy?: string | null
  signedAt?: string | null
  createdAt: string
  inspector?: Pick<User, 'id' | 'name' | 'email'>
}

export interface WarehouseInventory {
  id: string
  projectId: string
  materialName: string
  unit: string
  quantity: number | string
  minQuantity: number | string
  maxQuantity: number | string
  location?: string | null
  updatedAt: string
  createdAt: string
  transactions?: WarehouseTransaction[]
}

export interface WarehouseTransaction {
  id: string
  inventoryId: string
  type: WarehouseTransactionType | string
  quantity: number | string
  note?: string | null
  requestedBy?: string | null
  approvedBy?: string | null
  status: WarehouseTransactionStatus | string
  createdAt: string
  inventory?: Pick<WarehouseInventory, 'id' | 'materialName' | 'unit' | 'location'>
  requester?: Pick<User, 'id' | 'name' | 'email'> | null
}

export interface BudgetItem {
  id: string
  projectId: string
  category: string
  description: string
  estimatedCost: number | string
  approvedCost?: number | string | null
  spentCost: number | string
  status: BudgetItemStatus | string
  createdAt: string
  updatedAt: string
  disbursements?: BudgetDisbursement[]
}

export interface BudgetDisbursement {
  id: string
  budgetItemId: string
  amount: number | string
  approvedBy?: string | null
  approvedAt?: string | null
  status: BudgetDisbursementStatus | string
  note?: string | null
  createdAt: string
  budgetItem?: BudgetItem
}

export interface DashboardStats {
  projectCount: number
  activeProjectCount: number
  openTaskCount: number
  overdueTaskCount: number
  todayReportCount: number
  memberCount: number
  tasksByStatus: Record<TaskStatus, number>
  recentActivity: AuditLog[]
  updatedAt: string
  pendingApprovals: { taskCount: number; reportCount: number }
  overdueTasks: DashboardOverdueTask[]
  riskyProjects: DashboardRiskyProject[]
  activeMembers: DashboardActiveMember[]
  weeklyProgress: DashboardWeeklyProgress[]
  myTasks?: Task[]
  myReports?: DailyReport[]
  myTasksByStatus?: Record<TaskStatus, number>
  safetyStats?: SafetyDashboardStats
  pendingSafetyApprovals?: number
  safetyViolations?: SafetyViolation[]
  safetyTasks?: Task[]
  qualityStats?: QualityDashboardStats
  pendingQualityApprovals?: number
  qualityReports?: QualityReport[]
  warehouseStats?: WarehouseDashboardStats
  lowStockItems?: WarehouseInventory[]
  pendingTransactions?: number
  recentTransactions?: WarehouseTransaction[]
  warehouseTrendData?: WarehouseTrendDataPoint[]
  projectProgress?: ProjectProgressStats[]
  recentReports?: DailyReport[]
  budgetOverview?: BudgetOverview[]
}

export interface DashboardOverdueTask {
  id: string
  projectId: string
  title: string
  dueDate: string
  priority: TaskPriority
  projectName: string
  assigneeName: string | null
  daysOverdue: number
}

export interface DashboardRiskyProject {
  id: string
  name: string
  totalTasks: number
  overdueTasks: number
  overdueRate: number
}

export interface DashboardActiveMember {
  id: string
  name: string
  avatarUrl: string | null
  actionCount: number
}

export interface DashboardWeeklyProgress {
  date: string
  totalTasks: number
  completedTasks: number
  newTasks: number
}

export interface SafetyDashboardStats {
  totalReports: number
  pendingApprovals: number
  totalViolations: number
  recentViolations: SafetyViolation[]
  thisWeekReports: number
  lastWeekReports: number
  violationRate: number
}

export interface SafetyViolation {
  id: string
  date: string
  location: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  resolved: boolean
}

export interface QualityDashboardStats {
  totalReports: number
  pendingApprovals: number
  passRate: number
  thisWeekReports: number
  lastWeekReports: number
  recentReports: QualityReport[]
}

export interface WarehouseDashboardStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  pendingRequests: number
  thisMonthIn: number
  thisMonthOut: number
}

export interface WarehouseTrendDataPoint {
  date: string
  itemId: string
  itemName: string
  quantity: number
  minQuantity: number
  maxQuantity: number
  unit: string
}

export interface BudgetOverview {
  projectId: string
  projectName: string
  totalEstimated: number
  totalApproved: number
  totalSpent: number
  remaining: number
  completionRate: number
}

export interface ProjectProgressStats {
  projectId: string
  projectName: string
  progress: number
  startDate: string
  endDate: string
  daysRemaining: number
  status: ProjectStatus
  completionRate: number
}

export interface TaskComment {
  id: string
  taskId: string
  authorId: string
  content: string
  createdAt: string
  updatedAt: string
  author?: User
}
