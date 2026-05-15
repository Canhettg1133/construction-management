import type { Request, Response } from 'express'
import { sendSuccess } from '../../shared/utils'
import { aiAssistantService } from './ai.service'

function readProjectId(req: Request) {
  return String(req.params.projectId ?? '')
}

function readThreadId(req: Request) {
  return String(req.params.threadId ?? '')
}

function writeStreamEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export const aiAssistantController = {
  async listThreads(req: Request, res: Response) {
    const data = await aiAssistantService.listThreads(readProjectId(req), {
      userId: req.user!.id,
      permissions: req.userPermissions!,
    })
    return sendSuccess(res, data)
  },

  async createThread(req: Request, res: Response) {
    const data = await aiAssistantService.createThread({
      projectId: readProjectId(req),
      ownerId: req.user!.id,
      title: req.body.title,
    })
    return sendSuccess(res, data)
  },

  async updateThread(req: Request, res: Response) {
    const data = await aiAssistantService.updateThread({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      title: req.body.title,
      actor: {
        userId: req.user!.id,
        permissions: req.userPermissions!,
      },
    })
    return sendSuccess(res, data)
  },

  async deleteThread(req: Request, res: Response) {
    const data = await aiAssistantService.deleteThread({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      actor: {
        userId: req.user!.id,
        permissions: req.userPermissions!,
      },
    })
    return sendSuccess(res, data)
  },

  async listMessages(req: Request, res: Response) {
    const data = await aiAssistantService.listMessages(readProjectId(req), readThreadId(req), {
      userId: req.user!.id,
      permissions: req.userPermissions!,
    })
    return sendSuccess(res, data)
  },

  async sendMessage(req: Request, res: Response) {
    const data = await aiAssistantService.sendMessage({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      userId: req.user!.id,
      content: req.body.content,
      intent: req.body.intent,
      quickPromptPreset: req.body.quickPromptPreset,
      permissions: req.userPermissions!,
      runId: req.body.runId,
    })
    return sendSuccess(res, data)
  },

  async sendMessageStream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    let completed = false
    const projectId = readProjectId(req)
    const runId = req.body.runId

    req.on('close', () => {
      if (completed || !runId) {
        return
      }
      void aiAssistantService.cancelRun({
        projectId,
        runId,
        actor: {
          userId: req.user!.id,
          permissions: req.userPermissions!,
        },
      })
    })

    try {
      writeStreamEvent(res, 'ready', { runId: runId ?? null })
      const data = await aiAssistantService.streamMessage(
        {
          projectId,
          threadId: readThreadId(req),
          userId: req.user!.id,
          content: req.body.content,
          intent: req.body.intent,
          quickPromptPreset: req.body.quickPromptPreset,
          permissions: req.userPermissions!,
          runId,
        },
        {
          onUserMessage: (message) => writeStreamEvent(res, 'user_message', message),
          onAssistantDelta: (delta) => writeStreamEvent(res, 'delta', { text: delta }),
        },
      )
      completed = true
      writeStreamEvent(res, 'done', data)
      res.end()
    } catch (error) {
      completed = true
      writeStreamEvent(res, 'error', {
        message: error instanceof Error ? error.message : 'Không thể stream phản hồi AI',
      })
      res.end()
    }
  },

  async updateMessage(req: Request, res: Response) {
    const data = await aiAssistantService.updateMessage({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      messageId: String(req.params.messageId ?? ''),
      userId: req.user!.id,
      content: req.body.content,
      rerun: req.body.rerun,
      permissions: req.userPermissions!,
      runId: req.body.runId,
    })
    return sendSuccess(res, data)
  },

  async retryMessage(req: Request, res: Response) {
    const data = await aiAssistantService.retryMessage({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      messageId: String(req.params.messageId ?? ''),
      userId: req.user!.id,
      permissions: req.userPermissions!,
      runId: req.body.runId,
    })
    return sendSuccess(res, data)
  },

  async cancelRun(req: Request, res: Response) {
    const data = await aiAssistantService.cancelRun({
      projectId: readProjectId(req),
      runId: String(req.params.runId ?? ''),
      actor: {
        userId: req.user!.id,
        permissions: req.userPermissions!,
      },
    })
    return sendSuccess(res, data)
  },

  async getProjectSettings(req: Request, res: Response) {
    const data = await aiAssistantService.getProjectSettings(readProjectId(req))
    return sendSuccess(res, data)
  },

  async getProjectAiStatus(req: Request, res: Response) {
    const data = await aiAssistantService.getProjectAiStatus(readProjectId(req))
    return sendSuccess(res, data)
  },

  async updateProjectSettings(req: Request, res: Response) {
    const data = await aiAssistantService.updateProjectSettings({
      projectId: readProjectId(req),
      enabledSourceTools: req.body.enabledSourceTools,
      customSystemPrompt: req.body.customSystemPrompt,
      defaultProviderProfileId: req.body.defaultProviderProfileId,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async getSystemSettings(_req: Request, res: Response) {
    const data = await aiAssistantService.getSystemSettings()
    return sendSuccess(res, data)
  },

  async updateSystemSettings(req: Request, res: Response) {
    const data = await aiAssistantService.updateSystemSettings({
      enabledSourceTools: req.body.enabledSourceTools,
      globalSystemPrompt: req.body.globalSystemPrompt,
      defaultProviderProfileId: req.body.defaultProviderProfileId,
      maxContextItems: req.body.maxContextItems,
      allowDrafts: req.body.allowDrafts,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async listProviderProfiles(_req: Request, res: Response) {
    const data = await aiAssistantService.listProviderProfiles()
    return sendSuccess(res, data)
  },

  async createProviderProfile(req: Request, res: Response) {
    const data = await aiAssistantService.createProviderProfile({
      ...req.body,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async updateProviderProfile(req: Request, res: Response) {
    const data = await aiAssistantService.updateProviderProfile({
      id: String(req.params.profileId ?? ''),
      ...req.body,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async listProviderModels(req: Request, res: Response) {
    const data = await aiAssistantService.listProviderModels(String(req.params.profileId ?? ''))
    return sendSuccess(res, data)
  },

  async listProviderModelsFromConfig(req: Request, res: Response) {
    const data = await aiAssistantService.listProviderModelsFromConfig(req.body)
    return sendSuccess(res, data)
  },

  async testProvider(req: Request, res: Response) {
    const data = await aiAssistantService.testProvider(req.body)
    return sendSuccess(res, data)
  },

  async listProviderCredentials(req: Request, res: Response) {
    const data = await aiAssistantService.listProviderCredentials(String(req.params.profileId ?? ''))
    return sendSuccess(res, data)
  },

  async createProviderCredentials(req: Request, res: Response) {
    const data = await aiAssistantService.createProviderCredentials({
      providerProfileId: String(req.params.profileId ?? ''),
      keys: req.body.keys,
      label: req.body.label,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async updateProviderCredential(req: Request, res: Response) {
    const data = await aiAssistantService.updateProviderCredential({
      providerProfileId: String(req.params.profileId ?? ''),
      credentialId: String(req.params.credentialId ?? ''),
      label: req.body.label,
      isEnabled: req.body.isEnabled,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },

  async deleteProviderCredential(req: Request, res: Response) {
    const data = await aiAssistantService.deleteProviderCredential(
      String(req.params.profileId ?? ''),
      String(req.params.credentialId ?? ''),
      req.user!.id,
    )
    return sendSuccess(res, data)
  },

  async exportProviderCredentials(req: Request, res: Response) {
    const data = await aiAssistantService.exportProviderCredentials({
      providerProfileId: String(req.params.profileId ?? ''),
      confirmation: req.body.confirmation,
      actorUserId: req.user!.id,
    })
    return sendSuccess(res, data)
  },
}
