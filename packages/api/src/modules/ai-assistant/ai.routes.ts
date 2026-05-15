import { Router } from 'express'
import {
  asyncHandler,
  authenticate,
  authorize,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
  validate,
} from '../../shared/middleware'
import { aiAssistantController } from './ai.controller'
import {
  createProviderCredentialsSchema,
  createProviderProfileSchema,
  createThreadSchema,
  exportProviderCredentialsSchema,
  providerModelsSchema,
  providerTestSchema,
  retryMessageSchema,
  sendMessageSchema,
  updateAiSettingsSchema,
  updateMessageSchema,
  updateProviderCredentialSchema,
  updateProviderProfileSchema,
  updateSystemAiSettingsSchema,
  updateThreadSchema,
} from './ai.validation'

const aiAssistantRoutes: Router = Router({ mergeParams: true })

aiAssistantRoutes.use(authenticate)
aiAssistantRoutes.use(requireProjectMembership())
aiAssistantRoutes.use(loadUserPermissions)

aiAssistantRoutes.get(
  '/settings',
  requireToolPermission('AI_ASSISTANT', 'ADMIN'),
  asyncHandler(aiAssistantController.getProjectSettings),
)
aiAssistantRoutes.get(
  '/status',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  asyncHandler(aiAssistantController.getProjectAiStatus),
)
aiAssistantRoutes.put(
  '/settings',
  requireToolPermission('AI_ASSISTANT', 'ADMIN'),
  validate(updateAiSettingsSchema),
  asyncHandler(aiAssistantController.updateProjectSettings),
)
aiAssistantRoutes.get(
  '/threads',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  asyncHandler(aiAssistantController.listThreads),
)
aiAssistantRoutes.post(
  '/threads',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(createThreadSchema),
  asyncHandler(aiAssistantController.createThread),
)
aiAssistantRoutes.patch(
  '/threads/:threadId',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(updateThreadSchema),
  asyncHandler(aiAssistantController.updateThread),
)
aiAssistantRoutes.delete(
  '/threads/:threadId',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  asyncHandler(aiAssistantController.deleteThread),
)
aiAssistantRoutes.get(
  '/threads/:threadId/messages',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  asyncHandler(aiAssistantController.listMessages),
)
aiAssistantRoutes.post(
  '/threads/:threadId/messages/stream',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(sendMessageSchema),
  asyncHandler(aiAssistantController.sendMessageStream),
)
aiAssistantRoutes.post(
  '/threads/:threadId/messages',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(sendMessageSchema),
  asyncHandler(aiAssistantController.sendMessage),
)
aiAssistantRoutes.patch(
  '/threads/:threadId/messages/:messageId',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(updateMessageSchema),
  asyncHandler(aiAssistantController.updateMessage),
)
aiAssistantRoutes.post(
  '/threads/:threadId/messages/:messageId/retry',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  validate(retryMessageSchema),
  asyncHandler(aiAssistantController.retryMessage),
)
aiAssistantRoutes.post(
  '/runs/:runId/cancel',
  requireToolPermission('AI_ASSISTANT', 'READ'),
  asyncHandler(aiAssistantController.cancelRun),
)

export const aiProviderProfileRoutes: Router = Router({ mergeParams: true })

aiProviderProfileRoutes.use(authenticate)
aiProviderProfileRoutes.use(authorize('ADMIN'))

aiProviderProfileRoutes.get('/', asyncHandler(aiAssistantController.listProviderProfiles))
aiProviderProfileRoutes.post(
  '/models',
  validate(providerModelsSchema),
  asyncHandler(aiAssistantController.listProviderModelsFromConfig),
)
aiProviderProfileRoutes.post('/test', validate(providerTestSchema), asyncHandler(aiAssistantController.testProvider))
aiProviderProfileRoutes.post(
  '/',
  validate(createProviderProfileSchema),
  asyncHandler(aiAssistantController.createProviderProfile),
)
aiProviderProfileRoutes.get('/:profileId/models', asyncHandler(aiAssistantController.listProviderModels))
aiProviderProfileRoutes.get('/:profileId/credentials', asyncHandler(aiAssistantController.listProviderCredentials))
aiProviderProfileRoutes.post(
  '/:profileId/credentials',
  validate(createProviderCredentialsSchema),
  asyncHandler(aiAssistantController.createProviderCredentials),
)
aiProviderProfileRoutes.post(
  '/:profileId/credentials/export',
  validate(exportProviderCredentialsSchema),
  asyncHandler(aiAssistantController.exportProviderCredentials),
)
aiProviderProfileRoutes.put(
  '/:profileId/credentials/:credentialId',
  validate(updateProviderCredentialSchema),
  asyncHandler(aiAssistantController.updateProviderCredential),
)
aiProviderProfileRoutes.delete(
  '/:profileId/credentials/:credentialId',
  asyncHandler(aiAssistantController.deleteProviderCredential),
)
aiProviderProfileRoutes.put(
  '/:profileId',
  validate(updateProviderProfileSchema),
  asyncHandler(aiAssistantController.updateProviderProfile),
)

export const aiSettingsRoutes: Router = Router({ mergeParams: true })

aiSettingsRoutes.use(authenticate)
aiSettingsRoutes.use(authorize('ADMIN'))

aiSettingsRoutes.get('/', asyncHandler(aiAssistantController.getSystemSettings))
aiSettingsRoutes.put(
  '/',
  validate(updateSystemAiSettingsSchema),
  asyncHandler(aiAssistantController.updateSystemSettings),
)

export default aiAssistantRoutes
