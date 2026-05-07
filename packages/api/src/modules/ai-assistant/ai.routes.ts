import { Router } from "express";
import {
  asyncHandler,
  authenticate,
  authorize,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
  validate,
} from "../../shared/middleware";
import { aiAssistantController } from "./ai.controller";
import {
  createProviderProfileSchema,
  createThreadSchema,
  sendMessageSchema,
  updateAiSettingsSchema,
  updateProviderProfileSchema,
} from "./ai.validation";

const aiAssistantRoutes: Router = Router({ mergeParams: true });

aiAssistantRoutes.use(authenticate);
aiAssistantRoutes.use(requireProjectMembership());
aiAssistantRoutes.use(loadUserPermissions);

aiAssistantRoutes.get(
  "/settings",
  requireToolPermission("AI_ASSISTANT", "ADMIN"),
  asyncHandler(aiAssistantController.getProjectSettings)
);
aiAssistantRoutes.put(
  "/settings",
  requireToolPermission("AI_ASSISTANT", "ADMIN"),
  validate(updateAiSettingsSchema),
  asyncHandler(aiAssistantController.updateProjectSettings)
);
aiAssistantRoutes.get(
  "/threads",
  requireToolPermission("AI_ASSISTANT", "READ"),
  asyncHandler(aiAssistantController.listThreads)
);
aiAssistantRoutes.post(
  "/threads",
  requireToolPermission("AI_ASSISTANT", "READ"),
  validate(createThreadSchema),
  asyncHandler(aiAssistantController.createThread)
);
aiAssistantRoutes.get(
  "/threads/:threadId/messages",
  requireToolPermission("AI_ASSISTANT", "READ"),
  asyncHandler(aiAssistantController.listMessages)
);
aiAssistantRoutes.post(
  "/threads/:threadId/messages",
  requireToolPermission("AI_ASSISTANT", "READ"),
  validate(sendMessageSchema),
  asyncHandler(aiAssistantController.sendMessage)
);

export const aiProviderProfileRoutes: Router = Router({ mergeParams: true });

aiProviderProfileRoutes.use(authenticate);
aiProviderProfileRoutes.use(authorize("ADMIN"));

aiProviderProfileRoutes.get("/", asyncHandler(aiAssistantController.listProviderProfiles));
aiProviderProfileRoutes.post(
  "/",
  validate(createProviderProfileSchema),
  asyncHandler(aiAssistantController.createProviderProfile)
);
aiProviderProfileRoutes.put(
  "/:profileId",
  validate(updateProviderProfileSchema),
  asyncHandler(aiAssistantController.updateProviderProfile)
);

export default aiAssistantRoutes;
