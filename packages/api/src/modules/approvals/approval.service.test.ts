import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    projectMember: {
      findMany: vi.fn(),
    },
    dailyReport: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
  },
  permissionService: {
    hasPermission: vi.fn(),
    hasSpecialPrivilege: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
  notificationTriggers: {
    reportApproved: vi.fn(),
    reportRejected: vi.fn(),
    taskApproved: vi.fn(),
    taskRejected: vi.fn(),
  },
}))

vi.mock('../../config/database', () => ({
  prisma: mocks.prisma,
}))

vi.mock('../../shared/services/permission.service', () => ({
  permissionService: mocks.permissionService,
}))

vi.mock('../audit/audit.service', () => ({
  auditService: mocks.auditService,
}))

vi.mock('../notifications/notification.triggers', () => ({
  notificationTriggers: mocks.notificationTriggers,
}))

const { approvalService } = await import('./approval.service')

describe('approvalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.projectMember.findMany.mockResolvedValue([{ projectId: 'project-1' }])
    mocks.prisma.dailyReport.count.mockResolvedValue(0)
    mocks.prisma.task.count.mockResolvedValue(0)
    mocks.prisma.dailyReport.findMany.mockResolvedValue([])
    mocks.prisma.task.findMany.mockResolvedValue([])
    mocks.permissionService.hasPermission.mockResolvedValue(true)
    mocks.permissionService.hasSpecialPrivilege.mockResolvedValue(true)
    mocks.auditService.log.mockResolvedValue(undefined)
  })

  it('lists only submitted SENT reports for the reports tab', async () => {
    mocks.prisma.dailyReport.count.mockResolvedValue(2)
    mocks.prisma.task.count.mockResolvedValue(3)

    const result = await approvalService.listPending('staff-1', 'STAFF', 2, 10, 'reports')

    expect(result).toMatchObject({ reports: [], tasks: [], totalReports: 2, totalTasks: 3, type: 'reports' })
    expect(mocks.prisma.dailyReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: { in: ['project-1'] },
          approvalStatus: 'PENDING',
          status: 'SENT',
          submittedAt: { not: null },
        }),
        skip: 10,
        take: 10,
      }),
    )
    expect(mocks.prisma.task.findMany).not.toHaveBeenCalled()
  })

  it('lists only submitted approval-required tasks for the tasks tab', async () => {
    await approvalService.listPending('staff-1', 'STAFF', 1, 20, 'tasks')

    expect(mocks.prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: { in: ['project-1'] },
          approvalStatus: 'PENDING',
          requiresApproval: true,
          submittedAt: { not: null },
        }),
        skip: 0,
        take: 20,
      }),
    )
    expect(mocks.prisma.dailyReport.findMany).not.toHaveBeenCalled()
  })

  it('rejects report approval when the report was not submitted', async () => {
    mocks.prisma.dailyReport.findUnique.mockResolvedValue({
      id: 'report-1',
      projectId: 'project-1',
      createdBy: 'creator-1',
      reportDate: new Date('2026-05-01'),
      progress: 50,
      approvalStatus: 'PENDING',
      status: 'DRAFT',
      submittedAt: null,
      project: { progress: 0, members: [] },
    })

    await expect(approvalService.approveReport('report-1', 'approver-1')).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mocks.permissionService.hasPermission).not.toHaveBeenCalled()
    expect(mocks.prisma.dailyReport.update).not.toHaveBeenCalled()
  })

  it('rejects task approval when approval is not required or submitted', async () => {
    mocks.prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      title: 'Task',
      createdBy: 'creator-1',
      approvalStatus: 'PENDING',
      requiresApproval: false,
      submittedAt: null,
      project: { members: [] },
    })

    await expect(approvalService.approveTask('task-1', 'approver-1')).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mocks.permissionService.hasPermission).not.toHaveBeenCalled()
    expect(mocks.prisma.task.update).not.toHaveBeenCalled()
  })
})
