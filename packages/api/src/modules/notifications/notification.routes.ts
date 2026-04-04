import { Router } from 'express'
import { notificationController } from './notification.controller'
import { authenticate, asyncHandler } from '../../shared/middleware'

const router: Router = Router()

router.use(authenticate)

router.get('/', asyncHandler(notificationController.list))
router.get('/count', asyncHandler(notificationController.getUnreadCount))
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount))
router.patch('/:id/read', asyncHandler(notificationController.markAsRead))
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead))

export default router
