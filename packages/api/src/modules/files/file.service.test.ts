import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fileRepository: {
    findByProjectId: vi.fn(),
    delete: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
}))

vi.mock('./file.repository', () => ({
  fileRepository: mocks.fileRepository,
}))

vi.mock('../audit/audit.service', () => ({
  auditService: mocks.auditService,
}))

const { fileService } = await import('./file.service')

describe('fileService project scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auditService.log.mockResolvedValue(undefined)
  })

  it('returns 404 when a file id does not belong to the URL project', async () => {
    mocks.fileRepository.findByProjectId.mockResolvedValue(null)

    await expect(fileService.getById('project-2', 'file-1')).rejects.toMatchObject({ statusCode: 404 })

    expect(mocks.fileRepository.findByProjectId).toHaveBeenCalledWith('project-2', 'file-1')
  })

  it('deletes only files scoped to the URL project', async () => {
    const file = { id: 'file-1', originalName: 'plan.pdf' }
    mocks.fileRepository.findByProjectId.mockResolvedValue(file)
    mocks.fileRepository.delete.mockResolvedValue(file)

    await fileService.delete('project-1', 'file-1', 'user-1')

    expect(mocks.fileRepository.findByProjectId).toHaveBeenCalledWith('project-1', 'file-1')
    expect(mocks.fileRepository.delete).toHaveBeenCalledWith('file-1')
  })
})
