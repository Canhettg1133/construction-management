import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  taskRepository: {
    findByProjectId: vi.fn(),
  },
  taskCommentRepository: {
    findByTask: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
}))

vi.mock('./task.repository', () => ({
  taskRepository: mocks.taskRepository,
}))

vi.mock('./task-comment.repository', () => ({
  taskCommentRepository: mocks.taskCommentRepository,
}))

vi.mock('../audit/audit.service', () => ({
  auditService: mocks.auditService,
}))

const { taskCommentService } = await import('./task-comment.service')

describe('taskCommentService project scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auditService.log.mockResolvedValue(undefined)
  })

  it('does not list comments when task is outside the URL project', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue(null)

    await expect(taskCommentService.list('project-2', 'task-1')).rejects.toMatchObject({ statusCode: 404 })

    expect(mocks.taskCommentRepository.findByTask).not.toHaveBeenCalled()
  })

  it('does not update comments belonging to another task', async () => {
    mocks.taskRepository.findByProjectId.mockResolvedValue({ id: 'task-1', title: 'Task' })
    mocks.taskCommentRepository.findById.mockResolvedValue({
      id: 'comment-1',
      taskId: 'task-2',
      authorId: 'user-1',
    })

    await expect(
      taskCommentService.update('project-1', 'task-1', 'comment-1', 'user-1', 'Updated'),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mocks.taskCommentRepository.update).not.toHaveBeenCalled()
  })
})
