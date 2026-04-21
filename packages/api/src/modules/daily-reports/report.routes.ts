import { Router } from 'express'
import { reportController } from './report.controller'
import {
  authenticate,
  validate,
  asyncHandler,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from '../../shared/middleware'
import { createReportSchema, updateReportSchema, updateReportStatusSchema } from './report.validation'

const router: Router = Router({ mergeParams: true })

router.use(authenticate)
router.use(requireProjectMembership())
router.use(loadUserPermissions)

router.get('/', requireToolPermission('DAILY_REPORT', 'READ'), asyncHandler(reportController.list))
router.get('/:reportId', requireToolPermission('DAILY_REPORT', 'READ'), asyncHandler(reportController.getById))
router.post(
  '/',
  requireToolPermission('DAILY_REPORT', 'STANDARD'),
  validate(createReportSchema),
  asyncHandler(reportController.create),
)
router.patch(
  '/:reportId',
  requireToolPermission('DAILY_REPORT', 'STANDARD'),
  validate(updateReportSchema),
  asyncHandler(reportController.update),
)
router.patch(
  '/:reportId/status',
  requireToolPermission('DAILY_REPORT', 'STANDARD'),
  validate(updateReportStatusSchema),
  asyncHandler(reportController.updateStatus),
)
router.post(
  '/:reportId/submit',
  requireToolPermission('DAILY_REPORT', 'STANDARD'),
  asyncHandler(reportController.submitForApproval),
)
router.post('/:reportId/reopen', requireToolPermission('DAILY_REPORT', 'ADMIN'), asyncHandler(reportController.reopen))
router.delete('/:reportId', requireToolPermission('DAILY_REPORT', 'ADMIN'), asyncHandler(reportController.delete))

export default router
