import { Router } from 'express'
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireSpecialPrivilege,
  requireToolPermission,
} from '../../shared/middleware'
import { safetyController } from './safety.controller'

const router: Router = Router({ mergeParams: true })

router.use(authenticate)
router.use(requireProjectMembership())
router.use(loadUserPermissions)

router.get('/', requireToolPermission('SAFETY', 'READ'), asyncHandler(safetyController.list))
router.get('/:reportId', requireToolPermission('SAFETY', 'READ'), asyncHandler(safetyController.getById))
router.post('/', requireToolPermission('SAFETY', 'STANDARD'), asyncHandler(safetyController.create))
router.patch('/:reportId', requireToolPermission('SAFETY', 'STANDARD'), asyncHandler(safetyController.update))
router.post('/:reportId/sign', requireSpecialPrivilege('SAFETY_SIGNER'), asyncHandler(safetyController.sign))
router.post('/:reportId/reopen', requireToolPermission('SAFETY', 'ADMIN'), asyncHandler(safetyController.reopen))

// Checklist Items
router.get(
  '/:reportId/checklist',
  requireToolPermission('SAFETY', 'READ'),
  asyncHandler(safetyController.listChecklist),
)
router.post(
  '/:reportId/checklist',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.upsertChecklistItem),
)
router.patch(
  '/:reportId/checklist/:itemId',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.updateChecklistItem),
)

// Incident
router.post(
  '/:reportId/incident',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.createIncident),
)
router.patch(
  '/:reportId/incident',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.updateIncident),
)

// Near Miss
router.post(
  '/:reportId/near-miss',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.createNearMiss),
)
router.patch(
  '/:reportId/near-miss',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.updateNearMiss),
)

// Corrective Actions
router.get(
  '/:reportId/corrective-actions',
  requireToolPermission('SAFETY', 'READ'),
  asyncHandler(safetyController.listCorrectiveActions),
)
router.post(
  '/:reportId/corrective-actions',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.createCorrectiveAction),
)
router.patch(
  '/corrective-actions/:actionId',
  requireToolPermission('SAFETY', 'STANDARD'),
  asyncHandler(safetyController.updateCorrectiveAction),
)

export default router
