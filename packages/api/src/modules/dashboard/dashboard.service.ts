import type { DashboardStats, ProjectRole, SystemRole, TaskStatus } from '@construction/shared'
import { dashboardRepository, type DashboardRoleEntry } from './dashboard.repository'

const SAFETY_TAGS = ['safety', 'an toan', 'vi pham']

interface DashboardContext {
  userId: string
  systemRole: SystemRole
  projectRoles: DashboardRoleEntry[]
  memberProjectIds: string[]
}

function emptyTaskStatusCounts(): Record<TaskStatus, number> {
  return {
    TO_DO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    CANCELLED: 0,
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function createEmptyDashboardStats(): DashboardStats {
  return {
    projectCount: 0,
    activeProjectCount: 0,
    openTaskCount: 0,
    overdueTaskCount: 0,
    todayReportCount: 0,
    memberCount: 0,
    tasksByStatus: emptyTaskStatusCounts(),
    recentActivity: [],
    updatedAt: new Date().toISOString(),
    pendingApprovals: { taskCount: 0, reportCount: 0 },
    overdueTasks: [],
    riskyProjects: [],
    activeMembers: [],
    weeklyProgress: [],
  }
}

export const dashboardService = {
  async getStats(userId: string): Promise<DashboardStats> {
    const ctx = await this.buildContext(userId)

    const [general, roleSpecific] = await Promise.all([this.getGeneralStats(ctx), this.getRoleSpecificStats(ctx)])

    return {
      ...general,
      ...roleSpecific,
      updatedAt: new Date().toISOString(),
    }
  },

  async buildContext(userId: string): Promise<DashboardContext> {
    const [user, projectRoles, memberProjectIds] = await Promise.all([
      dashboardRepository.findUserById(userId),
      dashboardRepository.getProjectRoles(userId),
      dashboardRepository.getMemberProjectIds(userId),
    ])

    return {
      userId,
      systemRole: user.systemRole as SystemRole,
      projectRoles,
      memberProjectIds: unique(memberProjectIds),
    }
  },

  getScopeProjectIds(ctx: DashboardContext): string[] | undefined {
    if (ctx.systemRole === 'ADMIN') return undefined
    return ctx.memberProjectIds
  },

  getProjectIdsByRoles(ctx: DashboardContext, roles: ProjectRole[]): string[] {
    const roleSet = new Set(roles)
    return unique(ctx.projectRoles.filter((entry) => roleSet.has(entry.role)).map((entry) => entry.projectId))
  },

  hasAnyRole(ctx: DashboardContext, roles: ProjectRole[]): boolean {
    const roleSet = new Set(roles)
    return ctx.projectRoles.some((entry) => roleSet.has(entry.role))
  },

  async getGeneralStats(ctx: DashboardContext): Promise<DashboardStats> {
    const stats = createEmptyDashboardStats()
    const projectIds = this.getScopeProjectIds(ctx)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      projectCount,
      activeProjectCount,
      todayReportCount,
      memberCount,
      tasksByStatus,
      recentActivity,
      weeklyProgress,
    ] = await Promise.all([
      dashboardRepository.countProjects({ projectIds }),
      dashboardRepository.countActiveProjects({ projectIds }),
      dashboardRepository.countTodayReports(today, { projectIds }),
      dashboardRepository.countActiveMembers({ projectIds }),
      dashboardRepository.getTaskStatusCounts({ projectIds }),
      dashboardRepository.findRecentActivity(10, { projectIds, userId: undefined }),
      dashboardRepository.findWeeklyProgress({ projectIds }),
    ])

    stats.projectCount = projectCount
    stats.activeProjectCount = activeProjectCount
    stats.todayReportCount = todayReportCount
    stats.memberCount = memberCount
    stats.tasksByStatus = tasksByStatus
    stats.recentActivity = recentActivity as unknown as DashboardStats['recentActivity']
    stats.weeklyProgress = weeklyProgress

    return stats
  },

  async getRoleSpecificStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    if (ctx.systemRole === 'ADMIN') {
      return this.getAdminStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['PROJECT_MANAGER'])) {
      return this.getPMStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['SAFETY_OFFICER'])) {
      return this.getSafetyStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['QUALITY_MANAGER'])) {
      return this.getQualityStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['WAREHOUSE_KEEPER'])) {
      return this.getWarehouseStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['ENGINEER', 'DESIGN_ENGINEER'])) {
      return this.getEngineerStats(ctx)
    }

    if (this.hasAnyRole(ctx, ['CLIENT', 'VIEWER'])) {
      return this.getClientProjectStats(ctx)
    }

    return this.getStaffStats(ctx)
  },

  async getAdminStats(_ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const [openTaskCount, overdueTaskCount, pendingApprovals, overdueTasks, riskyProjects, activeMembers] =
      await Promise.all([
        dashboardRepository.countOpenTasks(),
        dashboardRepository.countOverdueTasks(),
        dashboardRepository.countPendingApprovals(),
        dashboardRepository.findOverdueTasks({ limit: 10 }),
        dashboardRepository.findRiskyProjects({ limit: 5 }),
        dashboardRepository.findActiveMembers({ limit: 5 }),
      ])

    return {
      openTaskCount,
      overdueTaskCount,
      pendingApprovals,
      overdueTasks,
      riskyProjects,
      activeMembers,
    }
  },

  async getStaffStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getScopeProjectIds(ctx)
    const [openTaskCount, overdueTaskCount, pendingApprovals, overdueTasks, riskyProjects, activeMembers] =
      await Promise.all([
        dashboardRepository.countOpenTasks({ projectIds }),
        dashboardRepository.countOverdueTasks({ projectIds }),
        dashboardRepository.countPendingApprovals({ projectIds }),
        dashboardRepository.findOverdueTasks({ projectIds, limit: 10 }),
        dashboardRepository.findRiskyProjects({ projectIds, limit: 5 }),
        dashboardRepository.findActiveMembers({ projectIds, limit: 5 }),
      ])

    return {
      openTaskCount,
      overdueTaskCount,
      pendingApprovals,
      overdueTasks,
      riskyProjects,
      activeMembers,
    }
  },

  async getPMStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getProjectIdsByRoles(ctx, ['PROJECT_MANAGER'])
    const [
      openTaskCount,
      overdueTaskCount,
      pendingApprovals,
      overdueTasks,
      riskyProjects,
      activeMembers,
      budgetOverview,
      warehouseStats,
    ] = await Promise.all([
      dashboardRepository.countOpenTasks({ projectIds }),
      dashboardRepository.countOverdueTasks({ projectIds }),
      dashboardRepository.countPendingApprovals({ projectIds }),
      dashboardRepository.findOverdueTasks({ projectIds, limit: 10 }),
      dashboardRepository.findRiskyProjects({ projectIds, limit: 5 }),
      dashboardRepository.findActiveMembers({ projectIds, limit: 5 }),
      dashboardRepository.getBudgetOverviewByProjectIds(projectIds),
      dashboardRepository.getWarehouseStatsByProjectIds(projectIds),
    ])

    return {
      openTaskCount,
      overdueTaskCount,
      pendingApprovals,
      overdueTasks,
      riskyProjects,
      activeMembers,
      budgetOverview,
      warehouseStats,
    }
  },

  async getEngineerStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const [openTaskCount, overdueTaskCount, myTasks, myReports, todayReportCount, weeklyProgress, myTasksByStatus] =
      await Promise.all([
        dashboardRepository.countOpenTasks({ assigneeId: ctx.userId }),
        dashboardRepository.countOverdueTasks({ assigneeId: ctx.userId }),
        dashboardRepository.findMyTasks(ctx.userId),
        dashboardRepository.findMyReports(ctx.userId),
        dashboardRepository.countMyTodayReports(ctx.userId),
        dashboardRepository.getMyWeeklyProgress(ctx.userId),
        dashboardRepository.getMyTasksByStatus(ctx.userId),
      ])

    return {
      openTaskCount,
      overdueTaskCount,
      todayReportCount,
      myTasks: myTasks as unknown as DashboardStats['myTasks'],
      myReports: myReports as unknown as DashboardStats['myReports'],
      weeklyProgress,
      pendingApprovals: { taskCount: 0, reportCount: 0 },
      myTasksByStatus,
      tasksByStatus: myTasksByStatus,
      overdueTasks: [],
      riskyProjects: [],
      activeMembers: [],
    }
  },

  async getSafetyStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getProjectIdsByRoles(ctx, ['SAFETY_OFFICER'])

    const [
      safetyStats,
      pendingSafetyApprovals,
      safetyViolations,
      safetyTasks,
      openTaskCount,
      overdueTaskCount,
      weeklyProgress,
      myReports,
      riskyProjects,
    ] = await Promise.all([
      dashboardRepository.getSafetyStatsByProjectIds(projectIds),
      dashboardRepository.countPendingSafetyApprovalsByProjectIds(projectIds),
      dashboardRepository.findRecentViolationsByProjectIds(projectIds),
      dashboardRepository.findSafetyTasksByProjectIds(projectIds),
      dashboardRepository.countOpenTasks({ projectIds, tags: SAFETY_TAGS }),
      dashboardRepository.countOverdueTasks({ projectIds, tags: SAFETY_TAGS }),
      dashboardRepository.getWeeklySafetyProgressByProjectIds(projectIds),
      dashboardRepository.findMyReports(ctx.userId),
      dashboardRepository.findRiskyProjects({ projectIds, limit: 5 }),
    ])

    return {
      safetyStats,
      pendingSafetyApprovals,
      safetyViolations,
      safetyTasks: safetyTasks as unknown as DashboardStats['safetyTasks'],
      openTaskCount,
      overdueTaskCount,
      weeklyProgress,
      myReports: myReports as unknown as DashboardStats['myReports'],
      pendingApprovals: { taskCount: 0, reportCount: pendingSafetyApprovals },
      riskyProjects,
      overdueTasks: [],
      activeMembers: [],
    }
  },

  async getQualityStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getProjectIdsByRoles(ctx, ['QUALITY_MANAGER'])

    const [
      qualityStats,
      pendingQualityApprovals,
      qualityReports,
      warehouseStats,
      openTaskCount,
      overdueTaskCount,
      weeklyProgress,
      riskyProjects,
    ] = await Promise.all([
      dashboardRepository.getQualityStatsByProjectIds(projectIds),
      dashboardRepository.countPendingQualityApprovalsByProjectIds(projectIds),
      dashboardRepository.findRecentQualityReportsByProjectIds(projectIds),
      dashboardRepository.getWarehouseStatsByProjectIds(projectIds),
      dashboardRepository.countOpenTasks({ projectIds }),
      dashboardRepository.countOverdueTasks({ projectIds }),
      dashboardRepository.getWeeklyQualityProgressByProjectIds(projectIds),
      dashboardRepository.findRiskyProjects({ projectIds, limit: 5 }),
    ])

    return {
      qualityStats,
      pendingQualityApprovals,
      qualityReports: qualityReports as unknown as DashboardStats['qualityReports'],
      warehouseStats,
      openTaskCount,
      overdueTaskCount,
      weeklyProgress,
      pendingApprovals: { taskCount: 0, reportCount: pendingQualityApprovals },
      riskyProjects,
      overdueTasks: [],
      activeMembers: [],
    }
  },

  async getWarehouseStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getProjectIdsByRoles(ctx, ['WAREHOUSE_KEEPER'])

    const [warehouseStats, lowStockItems, pendingTransactions, recentTransactions, warehouseTrendData] =
      await Promise.all([
        dashboardRepository.getWarehouseStatsByProjectIds(projectIds),
        dashboardRepository.findLowStockItemsByProjectIds(projectIds),
        dashboardRepository.countPendingTransactionsByProjectIds(projectIds),
        dashboardRepository.findRecentTransactionsByProjectIds(projectIds),
        dashboardRepository.getWarehouseTrendDataByProjectIds(projectIds),
      ])

    return {
      openTaskCount: 0,
      overdueTaskCount: 0,
      pendingApprovals: { taskCount: 0, reportCount: 0 },
      overdueTasks: [],
      riskyProjects: [],
      activeMembers: [],
      weeklyProgress: [],
      warehouseStats,
      lowStockItems: lowStockItems as unknown as DashboardStats['lowStockItems'],
      pendingTransactions,
      recentTransactions: recentTransactions as unknown as DashboardStats['recentTransactions'],
      warehouseTrendData,
    }
  },

  async getClientProjectStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
    const projectIds = this.getProjectIdsByRoles(ctx, ['CLIENT', 'VIEWER'])

    const [projectProgress, recentReports, qualityReports, budgetOverview, weeklyProgress] = await Promise.all([
      dashboardRepository.getProjectProgressByProjectIds(projectIds),
      dashboardRepository.findRecentReportsForClientByProjectIds(projectIds),
      dashboardRepository.findRecentQualityReportsByProjectIds(projectIds),
      dashboardRepository.getBudgetOverviewByProjectIds(projectIds),
      dashboardRepository.getWeeklyProgressByProjectIds(projectIds),
    ])

    return {
      openTaskCount: 0,
      overdueTaskCount: 0,
      pendingApprovals: { taskCount: 0, reportCount: 0 },
      overdueTasks: [],
      riskyProjects: [],
      activeMembers: [],
      projectProgress,
      recentReports: recentReports as unknown as DashboardStats['recentReports'],
      qualityReports: qualityReports as unknown as DashboardStats['qualityReports'],
      budgetOverview,
      weeklyProgress,
      tasksByStatus: emptyTaskStatusCounts(),
    }
  },
}
