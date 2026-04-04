import { notificationService } from './notification.service'

function taskLink(projectId: string, taskId: string): string {
  return `/projects/${projectId}/tasks/${taskId}`
}

function reportLink(projectId: string, reportId: string): string {
  return `/projects/${projectId}/reports/${reportId}`
}

function qualityLink(projectId: string, reportId: string): string {
  return `/projects/${projectId}/quality/${reportId}`
}

function safetyLink(projectId: string, reportId: string): string {
  return `/projects/${projectId}/safety/${reportId}`
}

function warehouseLink(projectId: string): string {
  return `/projects/${projectId}/warehouse`
}

export const notificationTriggers = {
  async taskAssigned(params: { assigneeId: string; taskId: string; taskTitle: string; projectId: string }) {
    await notificationService.create({
      userId: params.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'Ban duoc giao task moi',
      message: params.taskTitle,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async reportSubmitted(params: { pmIds: string[]; reportId: string; reportDate: Date; projectId: string }) {
    const dateStr = params.reportDate.toLocaleDateString('vi-VN')
    await notificationService.createMany(params.pmIds, {
      type: 'REPORT_PENDING_APPROVAL',
      title: 'Co bao cao ngay can duyet',
      message: `Bao cao ngay ${dateStr} dang cho duyet`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        link: reportLink(params.projectId, params.reportId),
      },
    })
  },

  async taskSubmitted(params: { pmIds: string[]; taskId: string; taskTitle: string; projectId: string }) {
    await notificationService.createMany(params.pmIds, {
      type: 'REPORT_PENDING_APPROVAL',
      title: 'Co task can duyet',
      message: params.taskTitle,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async reportApproved(params: { creatorId: string; reportId: string; reportDate: Date; projectId: string }) {
    const dateStr = params.reportDate.toLocaleDateString('vi-VN')
    await notificationService.create({
      userId: params.creatorId,
      type: 'PROJECT_PROGRESS_UPDATE',
      title: 'Bao cao da duoc duyet',
      message: `Bao cao ngay ${dateStr} da duoc duyet`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        link: reportLink(params.projectId, params.reportId),
      },
    })
  },

  async reportRejected(params: {
    creatorId: string
    reportId: string
    reportDate: Date
    reason: string
    projectId: string
  }) {
    const dateStr = params.reportDate.toLocaleDateString('vi-VN')
    await notificationService.create({
      userId: params.creatorId,
      type: 'PROJECT_PROGRESS_UPDATE',
      title: 'Bao cao bi tu choi',
      message: `Bao cao ngay ${dateStr} bi tu choi: ${params.reason}`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        link: reportLink(params.projectId, params.reportId),
      },
    })
  },

  async taskApproved(params: { creatorId: string; taskId: string; taskTitle: string; projectId: string }) {
    await notificationService.create({
      userId: params.creatorId,
      type: 'PROJECT_PROGRESS_UPDATE',
      title: 'Task da duoc duyet',
      message: params.taskTitle,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async taskRejected(params: {
    creatorId: string
    taskId: string
    taskTitle: string
    reason: string
    projectId: string
  }) {
    await notificationService.create({
      userId: params.creatorId,
      type: 'PROJECT_PROGRESS_UPDATE',
      title: 'Task bi tu choi',
      message: `${params.taskTitle} - Ly do: ${params.reason}`,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async taskDueSoon(params: {
    assigneeId: string
    taskId: string
    taskTitle: string
    projectId: string
    dueDate: Date
  }) {
    const dateStr = params.dueDate.toLocaleDateString('vi-VN')
    await notificationService.create({
      userId: params.assigneeId,
      type: 'TASK_DEADLINE_SOON',
      title: 'Task sap qua han',
      message: `"${params.taskTitle}" can hoan thanh truoc ngay ${dateStr}`,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        dueDate: params.dueDate.toISOString(),
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async taskOverdue(params: { assigneeId: string; taskId: string; taskTitle: string; projectId: string }) {
    await notificationService.create({
      userId: params.assigneeId,
      type: 'TASK_OVERDUE',
      title: 'Task da qua han',
      message: `"${params.taskTitle}" da qua han`,
      data: {
        taskId: params.taskId,
        projectId: params.projectId,
        link: taskLink(params.projectId, params.taskId),
      },
    })
  },

  async safetyReportPending(params: { projectId: string; reportId: string; location: string }) {
    await notificationService.notifyProjectRolesAndAdmins(params.projectId, ['SAFETY_OFFICER'], {
      type: 'SAFETY_REPORT_PENDING',
      title: 'Bao cao an toan cho duyet',
      message: `Bao cao an toan tai ${params.location} dang cho duyet`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        link: safetyLink(params.projectId, params.reportId),
      },
    })
  },

  async safetyViolationCreated(params: { projectId: string; reportId: string; location: string; violations: number }) {
    await notificationService.notifyProjectRolesAndAdmins(params.projectId, ['SAFETY_OFFICER', 'PROJECT_MANAGER'], {
      type: 'SAFETY_VIOLATION',
      title: 'Canh bao vi pham an toan',
      message: `${params.violations} vi pham an toan tai ${params.location}`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        violations: params.violations,
        link: safetyLink(params.projectId, params.reportId),
      },
    })
  },

  async qualityReportPending(params: { projectId: string; reportId: string; location: string }) {
    await notificationService.notifyProjectRolesAndAdmins(params.projectId, ['QUALITY_MANAGER'], {
      type: 'QUALITY_REPORT_PENDING',
      title: 'Bao cao chat luong cho duyet',
      message: `Bao cao QC tai ${params.location} dang cho duyet`,
      data: {
        reportId: params.reportId,
        projectId: params.projectId,
        link: qualityLink(params.projectId, params.reportId),
      },
    })
  },

  async lowStockAlert(params: {
    projectId: string
    inventoryId: string
    materialName: string
    quantity: number
    minQuantity: number
  }) {
    await notificationService.notifyProjectRoles(params.projectId, ['WAREHOUSE_KEEPER', 'PROJECT_MANAGER'], {
      type: 'LOW_STOCK_ALERT',
      title: 'Canh bao ton kho thap',
      message: `${params.materialName}: ${params.quantity} < ${params.minQuantity}`,
      data: {
        inventoryId: params.inventoryId,
        projectId: params.projectId,
        quantity: params.quantity,
        minQuantity: params.minQuantity,
        link: warehouseLink(params.projectId),
      },
    })
  },

  async transactionPending(params: {
    projectId: string
    transactionId: string
    materialName: string
    quantity: number
  }) {
    await notificationService.notifyProjectRoles(params.projectId, ['WAREHOUSE_KEEPER'], {
      type: 'TRANSACTION_PENDING',
      title: 'Yeu cau vat tu cho xu ly',
      message: `${params.materialName}: ${params.quantity}`,
      data: {
        transactionId: params.transactionId,
        projectId: params.projectId,
        link: warehouseLink(params.projectId),
      },
    })
  },
}
