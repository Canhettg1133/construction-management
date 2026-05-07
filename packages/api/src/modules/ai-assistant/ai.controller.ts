import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils";
import { aiAssistantService } from "./ai.service";

function readProjectId(req: Request) {
  return String(req.params.projectId ?? "");
}

function readThreadId(req: Request) {
  return String(req.params.threadId ?? "");
}

export const aiAssistantController = {
  async listThreads(req: Request, res: Response) {
    const data = await aiAssistantService.listThreads(readProjectId(req), {
      userId: req.user!.id,
      permissions: req.userPermissions!,
    });
    return sendSuccess(res, data);
  },

  async createThread(req: Request, res: Response) {
    const data = await aiAssistantService.createThread({
      projectId: readProjectId(req),
      ownerId: req.user!.id,
      title: req.body.title,
      providerProfileId: req.body.providerProfileId,
    });
    return sendSuccess(res, data);
  },

  async listMessages(req: Request, res: Response) {
    const data = await aiAssistantService.listMessages(readProjectId(req), readThreadId(req), {
      userId: req.user!.id,
      permissions: req.userPermissions!,
    });
    return sendSuccess(res, data);
  },

  async sendMessage(req: Request, res: Response) {
    const data = await aiAssistantService.sendMessage({
      projectId: readProjectId(req),
      threadId: readThreadId(req),
      userId: req.user!.id,
      content: req.body.content,
      intent: req.body.intent,
      permissions: req.userPermissions!,
    });
    return sendSuccess(res, data);
  },

  async getProjectSettings(req: Request, res: Response) {
    const data = await aiAssistantService.getProjectSettings(readProjectId(req));
    return sendSuccess(res, data);
  },

  async updateProjectSettings(req: Request, res: Response) {
    const data = await aiAssistantService.updateProjectSettings({
      projectId: readProjectId(req),
      enabledSourceTools: req.body.enabledSourceTools,
      customSystemPrompt: req.body.customSystemPrompt,
      defaultProviderProfileId: req.body.defaultProviderProfileId,
    });
    return sendSuccess(res, data);
  },

  async listProviderProfiles(_req: Request, res: Response) {
    const data = await aiAssistantService.listProviderProfiles();
    return sendSuccess(res, data);
  },

  async createProviderProfile(req: Request, res: Response) {
    const data = await aiAssistantService.createProviderProfile(req.body);
    return sendSuccess(res, data);
  },

  async updateProviderProfile(req: Request, res: Response) {
    const data = await aiAssistantService.updateProviderProfile({
      id: String(req.params.profileId ?? ""),
      ...req.body,
    });
    return sendSuccess(res, data);
  },
};
