import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reportRepository: {
    findAll: vi.fn(),
    count: vi.fn(),
    findByProjectId: vi.fn(),
    findByProjectAndDate: vi.fn(),
    findLatestBeforeDate: vi.fn(),
    findEarliestAfterDate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getProjectPmIds: vi.fn(),
  },
  taskRepository: {
    create: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
  notificationTriggers: {
    reportSubmitted: vi.fn(),
  },
}))

vi.mock('./report.repository', () => ({
  reportRepository: mocks.reportRepository,
}))

vi.mock('../tasks/task.repository', () => ({
  taskRepository: mocks.taskRepository,
}))

vi.mock('../audit/audit.service', () => ({
  auditService: mocks.auditService,
}))

vi.mock('../notifications/notification.triggers', () => ({
  notificationTriggers: mocks.notificationTriggers,
}))

const { reportService } = await import('./report.service')

function actor() {
  return { userId: 'creator-1', systemRole: 'STAFF' as const, projectRole: 'ENGINEER' as const }
}

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    projectId: 'project-1',
    createdBy: 'creator-1',
    reportDate: new Date('2026-05-01'),
    progress: 10,
    approvalStatus: 'PENDING',
    status: 'DRAFT',
    submittedAt: null,
    ...overrides,
  }
}

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.reportRepository.findByProjectAndDate.mockResolvedValue(null)
    mocks.reportRepository.findLatestBeforeDate.mockResolvedValue(null)
    mocks.reportRepository.findEarliestAfterDate.mockResolvedValue(null)
    mocks.reportRepository.getProjectPmIds.mockResolvedValue([])
    mocks.auditService.log.mockResolvedValue(undefined)
    mocks.notificationTriggers.reportSubmitted.mockResolvedValue(undefined)
  })

  it('scopes report reads by projectId', async () => {
    mocks.reportRepository.findByProjectId.mockResolvedValue(null)

    await expect(reportService.getById('project-2', 'report-1')).rejects.toMatchObject({ statusCode: 404 })

    expect(mocks.reportRepository.findByProjectId).toHaveBeenCalledWith('project-2', 'report-1')
  })

  it('marks non-draft creates as submitted so approval queue can see them', async () => {
    mocks.reportRepository.create.mockResolvedValue(report({ status: 'SENT', submittedAt: new Date() }))

    await reportService.create({
      projectId: 'project-1',
      createdBy: 'creator-1',
      reportDate: new Date('2026-05-01'),
      weather: 'SUNNY',
      workerCount: 5,
      workDescription: 'Work',
      progress: 10,
      isDraft: false,
    })

    expect(mocks.reportRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SENT',
        submittedAt: expect.any(Date),
      }),
    )
  })

  it('resets rejected approval fields when an allowed user edits', async () => {
    mocks.reportRepository.findByProjectId.mockResolvedValue(
      report({ approvalStatus: 'REJECTED', submittedAt: new Date('2026-05-01') }),
    )
    mocks.reportRepository.update.mockResolvedValue(report({ workDescription: 'Updated' }))

    await reportService.update('project-1', 'report-1', { workDescription: 'Updated' }, actor())

    expect(mocks.reportRepository.update).toHaveBeenCalledWith(
      'report-1',
      expect.objectContaining({
        workDescription: 'Updated',
        approvalStatus: 'PENDING',
        submittedAt: null,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
      }),
    )
  })
})
