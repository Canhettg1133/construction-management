import { Router } from 'express'
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireSpecialPrivilege,
  requireToolPermission,
} from '../../shared/middleware'
import { qualityController } from './quality.controller'

const router: Router = Router({ mergeParams: true })

router.use(authenticate)
router.use(requireProjectMembership())
router.use(loadUserPermissions)

router.get('/', requireToolPermission('QUALITY', 'READ'), asyncHandler(qualityController.list))
router.get('/:reportId', requireToolPermission('QUALITY', 'READ'), asyncHandler(qualityController.getById))
router.post('/', requireToolPermission('QUALITY', 'STANDARD'), asyncHandler(qualityController.create))
router.patch('/:reportId', requireToolPermission('QUALITY', 'STANDARD'), asyncHandler(qualityController.update))
router.post('/:reportId/sign', requireSpecialPrivilege('QUALITY_SIGNER'), asyncHandler(qualityController.sign))
router.post('/:reportId/reopen', requireToolPermission('QUALITY', 'ADMIN'), asyncHandler(qualityController.reopen))
router.post('/:reportId/reject', requireSpecialPrivilege('QUALITY_SIGNER'), asyncHandler(qualityController.reject))
router.post('/:reportId/accept', requireSpecialPrivilege('QUALITY_SIGNER'), asyncHandler(qualityController.accept))

// Punch List Items
router.get(
  '/:reportId/punch-list',
  requireToolPermission('QUALITY', 'READ'),
  asyncHandler(qualityController.listPunchList),
)
router.post(
  '/:reportId/punch-list',
  requireToolPermission('QUALITY', 'STANDARD'),
  asyncHandler(qualityController.createPunchListItem),
)
router.patch(
  '/punch-list/:itemId',
  requireToolPermission('QUALITY', 'STANDARD'),
  asyncHandler(qualityController.updatePunchListItem),
)
router.delete(
  '/punch-list/:itemId',
  requireToolPermission('QUALITY', 'STANDARD'),
  asyncHandler(qualityController.deletePunchListItem),
)

// Photos
router.get('/:reportId/photos', requireToolPermission('QUALITY', 'READ'), asyncHandler(qualityController.listPhotos))
router.post('/:reportId/photos', requireToolPermission('QUALITY', 'STANDARD'), asyncHandler(qualityController.addPhoto))
router.delete(
  '/photos/:photoId',
  requireToolPermission('QUALITY', 'STANDARD'),
  asyncHandler(qualityController.deletePhoto),
)

export default router
