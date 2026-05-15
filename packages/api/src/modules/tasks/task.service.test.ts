import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  taskRepository: {
    findAll: vi.fn(),
    count: vi.fn(),
    findByProjectId: vi.fn(),
    update: vi.fn(),
    getProjectPmIds: vi.fn(),
  },
  permissionService: {
    hasPermission: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
  notificationTriggers: {
    taskSubmitted: vi.fn(),
  },
}))

vi.mock('./task.repository', () => ({
  taskRepository: mocks.taskRepository,
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

const { taskService } = await import('./task.service')

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Pour concrete',
    createdBy: 'creator-1',
    assignedTo: 'assignee-1',
    requiresApproval: false,
    approvalStatus: 'PENDING',
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    ...overrides,
  }
}

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.permissionService.hasPermission.mockResolvedValue(false)
    mocks.auditService.log.mockResolvedValue(undefined)
    mocks.notificationTriggers.taskSubmitted.mockResolvedValue(undefined)
    mocks.taskRepository.getProjectPmIds.mockResolvedValue([])
  })

  it('scopes task reads by projectId', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(null)

    await expect(taskService.getById('other-project', 'task-1')).rejects.toMatchObject({ statusCode: 404 })

    expect(mocks.taskRepository.findByProjectId).toHaveBeenCalledWith('other-project', 'task-1')
  })

  it('passes due date filters to the repository', async () => {
    mocks.taskRepository.findAll.mockResolvedValue([])
    mocks.taskRepository.count.mockResolvedValue(0)

    await taskService.list('project-1', 1, 20, undefined, undefined, undefined, '2026-05-01', '2026-05-10')

    expect(mocks.taskRepository.findAll.mock.calls[0][6]).toEqual(new Date('2026-05-01'))
    expect(mocks.taskRepository.findAll.mock.calls[0][7]).toEqual(new Date('2026-05-10'))
    expect(mocks.taskRepository.count.mock.calls[0][4]).toEqual(new Date('2026-05-01'))
    expect(mocks.taskRepository.count.mock.calls[0][5]).toEqual(new Date('2026-05-10'))
  })

  it('allows TASK ADMIN to edit tasks they did not create or receive', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(task({ createdBy: 'other', assignedTo: 'other' }))
    mocks.permissionService.hasPermission.mockResolvedValue(true)
    mocks.taskRepository.update.mockResolvedValue(task({ title: 'Updated' }))

    const result = await taskService.update('project-1', 'task-1', { title: 'Updated' }, 'pm-1')

    expect(result.title).toBe('Updated')
    expect(mocks.permissionService.hasPermission).toHaveBeenCalledWith('pm-1', 'project-1', 'TASK', 'ADMIN')
    expect(mocks.taskRepository.update).toHaveBeenCalledWith('task-1', { title: 'Updated' })
  })

  it('resets rejected approval fields when an allowed user edits a rejected task', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(
      task({ createdBy: 'creator-1', approvalStatus: 'REJECTED', submittedAt: new Date('2026-05-01') }),
    )
    mocks.taskRepository.update.mockResolvedValue(task({ title: 'Updated' }))

    await taskService.update('project-1', 'task-1', { title: 'Updated' }, 'creator-1')

    expect(mocks.taskRepository.update).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        title: 'Updated',
        approvalStatus: 'PENDING',
        submittedAt: null,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
      }),
    )
  })

  it('blocks DONE when approval is required but not approved', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(
      task({ assignedTo: 'assignee-1', requiresApproval: true, approvalStatus: 'PENDING' }),
    )

    await expect(taskService.updateStatus('project-1', 'task-1', 'DONE', 'assignee-1')).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(mocks.taskRepository.update).not.toHaveBeenCalled()
  })

  it('allows TASK ADMIN to change status for any task in the project', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(task({ assignedTo: 'other-user' }))
    mocks.permissionService.hasPermission.mockResolvedValue(true)
    mocks.taskRepository.update.mockResolvedValue(task({ status: 'IN_PROGRESS' }))

    await taskService.updateStatus('project-1', 'task-1', 'IN_PROGRESS', 'pm-1')

    expect(mocks.taskRepository.update).toHaveBeenCalledWith('task-1', {
      status: 'IN_PROGRESS',
      completedAt: null,
    })
  })
})
