import { prisma } from '../../config/database'
import { env } from '../../config/env'
import { notificationTriggers } from '../../modules/notifications/notification.triggers'
import { documentRepository } from '../../modules/documents/document.repository'
import { logger } from '../../config/logger'

const CRON_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes
const DAY_MS = 24 * 60 * 60 * 1000

let cronInterval: ReturnType<typeof setInterval> | null = null

async function checkDeadlines() {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)

    // Tasks due tomorrow — notify assignee
    const dueSoonTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assignedTo: { not: null },
      },
      select: { id: true, title: true, projectId: true, assignedTo: true, dueDate: true },
    })

    for (const task of dueSoonTasks) {
      if (!task.assignedTo || !task.dueDate) continue
      // Avoid duplicate: skip if a "sắp quá hạn" notification was already sent today for this task
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assignedTo,
          type: 'TASK_DEADLINE_SOON',
          data: { path: '$.taskId', equals: task.id },
          createdAt: { gte: today },
        },
      })
      if (!existing) {
        await notificationTriggers.taskDueSoon({
          assigneeId: task.assignedTo,
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          dueDate: task.dueDate,
        })
      }
    }

    // Tasks already overdue — notify assignee + PM
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assignedTo: { not: null },
      },
      select: { id: true, title: true, projectId: true, assignedTo: true },
    })

    for (const task of overdueTasks) {
      if (!task.assignedTo) continue

      // Skip if already notified today
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assignedTo,
          type: 'TASK_OVERDUE',
          data: { path: '$.taskId', equals: task.id },
          createdAt: { gte: today },
        },
      })
      if (!existing) {
        await notificationTriggers.taskOverdue({
          assigneeId: task.assignedTo,
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
        })
      }

      // Also notify PMs of the project
      const pmIds = await prisma.projectMember.findMany({
        where: { projectId: task.projectId, role: 'PROJECT_MANAGER' },
        select: { userId: true },
      })
      for (const pm of pmIds) {
        const existingPm = await prisma.notification.findFirst({
          where: {
            userId: pm.userId,
            type: 'TASK_OVERDUE',
            data: { path: '$.taskId', equals: task.id },
            createdAt: { gte: today },
          },
        })
        if (!existingPm) {
          await notificationTriggers.taskOverdue({
            assigneeId: pm.userId,
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
          })
        }
      }
    }

    logger.debug({ dueSoonCount: dueSoonTasks.length, overdueCount: overdueTasks.length }, 'Deadline check completed')
  } catch (err) {
    logger.error({ err }, 'Deadline check failed')
  }
}

async function purgeExpiredDocumentTrash() {
  try {
    const cutoff = new Date(Date.now() - env.DOCUMENT_TRASH_RETENTION_DAYS * DAY_MS)
    const purgedCount = await documentRepository.purgeTrashedFilesBefore(cutoff)
    if (purgedCount > 0) {
      logger.info(
        {
          purgedCount,
          retentionDays: env.DOCUMENT_TRASH_RETENTION_DAYS,
          cutoff: cutoff.toISOString(),
        },
        'Document trash purge completed',
      )
      return
    }

    logger.debug(
      {
        purgedCount,
        retentionDays: env.DOCUMENT_TRASH_RETENTION_DAYS,
        cutoff: cutoff.toISOString(),
      },
      'Document trash purge completed',
    )
  } catch (err) {
    logger.error({ err }, 'Document trash purge failed')
  }
}

async function runCronJobs() {
  await checkDeadlines()
  await purgeExpiredDocumentTrash()
}

export function startCron() {
  if (cronInterval) return
  // Run immediately on start
  runCronJobs()
  cronInterval = setInterval(runCronJobs, CRON_INTERVAL_MS)
  logger.info({ intervalMs: CRON_INTERVAL_MS }, 'Deadline cron started')
}

export function stopCron() {
  if (cronInterval) {
    clearInterval(cronInterval)
    cronInterval = null
    logger.info('Deadline cron stopped')
  }
}
