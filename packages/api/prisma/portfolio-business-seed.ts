import type { PrismaClient } from '@prisma/client'

export type PortfolioBusinessProjectSeed = {
  index: number
  code: string
  name: string
  startDate: Date
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  progress: number
}

export type PortfolioBusinessRole =
  | 'PROJECT_MANAGER'
  | 'ENGINEER'
  | 'SAFETY_OFFICER'
  | 'DESIGN_ENGINEER'
  | 'QUALITY_MANAGER'
  | 'WAREHOUSE_KEEPER'
  | 'CLIENT'
  | 'VIEWER'

export type PortfolioBusinessRoleUsers = Partial<Record<PortfolioBusinessRole, { id: string }>>

type PortfolioDataKind =
  | 'folder'
  | 'report'
  | 'reportImage'
  | 'task'
  | 'taskComment'
  | 'file'
  | 'safetyReport'
  | 'safetyChecklist'
  | 'safetyIncident'
  | 'safetyNearMiss'
  | 'safetyAction'
  | 'qualityReport'
  | 'qualityPunch'
  | 'qualityPhoto'
  | 'inventory'
  | 'warehouseTransaction'
  | 'budget'
  | 'disbursement'
  | 'notification'
  | 'moduleAudit'

function portfolioDataId(kind: PortfolioDataKind, projectIndex: number, itemIndex: number, childIndex = 0) {
  const prefixes: Record<PortfolioDataKind, string> = {
    folder: 'a0',
    report: 'a1',
    reportImage: 'a2',
    task: 'a3',
    taskComment: 'a4',
    file: 'a5',
    safetyReport: 'a6',
    safetyChecklist: 'a7',
    safetyIncident: 'a8',
    safetyNearMiss: 'a9',
    safetyAction: 'b0',
    qualityReport: 'b1',
    qualityPunch: 'b2',
    qualityPhoto: 'b3',
    inventory: 'b4',
    warehouseTransaction: 'b5',
    budget: 'b6',
    disbursement: 'b7',
    notification: 'b8',
    moduleAudit: 'b9',
  }
  const firstSegment = `${prefixes[kind]}${String(projectIndex).padStart(2, '0')}${String(itemIndex).padStart(2, '0')}${childIndex}0`
  const lastSegment = String(projectIndex * 1_000_000 + itemIndex * 1_000 + childIndex).padStart(12, '0')
  return `${firstSegment}-0000-4000-8000-${lastSegment}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function atHour(date: Date, hour: number, minute = 0) {
  return new Date(
    `${date.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  )
}

function roundMillion(amount: number) {
  return Math.round(amount / 1_000_000) * 1_000_000
}

export async function seedPortfolioBusinessData(
  prisma: PrismaClient,
  seedProject: PortfolioBusinessProjectSeed,
  project: { id: string; code: string },
  roleUsers: PortfolioBusinessRoleUsers,
  adminId: string,
) {
  const managerId = roleUsers.PROJECT_MANAGER?.id ?? adminId
  const engineerId = roleUsers.ENGINEER?.id ?? managerId
  const safetyId = roleUsers.SAFETY_OFFICER?.id ?? managerId
  const designId = roleUsers.DESIGN_ENGINEER?.id ?? engineerId
  const qualityId = roleUsers.QUALITY_MANAGER?.id ?? managerId
  const warehouseId = roleUsers.WAREHOUSE_KEEPER?.id ?? managerId
  const isCompleted = seedProject.status === 'COMPLETED'
  const folderId = portfolioDataId('folder', seedProject.index, 1)

  await prisma.documentFolder.upsert({
    where: { id: folderId },
    update: {
      projectId: project.id,
      name: 'Hồ sơ dự án',
      parentId: null,
      createdBy: managerId,
    },
    create: {
      id: folderId,
      projectId: project.id,
      name: 'Hồ sơ dự án',
      parentId: null,
      createdBy: managerId,
    },
  })

  const dailyReportTemplates = [
    {
      workDescription: 'Huy động nhân lực, kiểm tra mặt bằng và lập rào chắn khu vực thi công.',
      issues: null,
      notes: 'Tổ đội đã nắm rõ kế hoạch trong ngày.',
      weather: 'SUNNY' as const,
      workerCount: 22,
    },
    {
      workDescription: 'Thi công cốt thép, coffa và kiểm tra kích thước theo bản vẽ được duyệt.',
      issues: 'Cần bổ sung vật tư phụ vào đầu giờ chiều.',
      notes: 'Đã điều phối kho cấp bù vật tư trong ngày.',
      weather: 'CLOUDY' as const,
      workerCount: 26,
    },
    {
      workDescription: 'Đổ bê tông khu vực trọng tâm, lấy mẫu kiểm tra và bảo dưỡng bề mặt.',
      issues: null,
      notes: 'Mẫu bê tông đã bàn giao cho bộ phận chất lượng.',
      weather: 'SUNNY' as const,
      workerCount: 31,
    },
    {
      workDescription: 'Lắp đặt hệ thống tấm, thu dọn vật liệu và kiểm tra an toàn cuối ca.',
      issues: 'Mưa nhẹ làm chậm tiến độ khoảng 30 phút.',
      notes: 'Không phát sinh sự cố mất an toàn.',
      weather: 'RAINY' as const,
      workerCount: 20,
    },
    {
      workDescription: 'Nghiệm thu nội bộ hạng mục đã hoàn thành và cập nhật khối lượng thi công.',
      issues: null,
      notes: 'Khối lượng thực hiện phù hợp kế hoạch tuần.',
      weather: 'CLOUDY' as const,
      workerCount: 24,
    },
  ]

  for (const [index, template] of dailyReportTemplates.entries()) {
    const item = index + 1
    const reportApproved = isCompleted || item <= 3
    const reportDate = addDays(seedProject.startDate, item * 3)
    const reportId = portfolioDataId('report', seedProject.index, item)
    const reportData = {
      projectId: project.id,
      createdBy: engineerId,
      reportDate,
      weather: template.weather,
      temperatureMin: 24 + (item % 2),
      temperatureMax: 31 + item,
      workerCount: template.workerCount,
      workDescription: template.workDescription,
      issues: template.issues,
      progress: Math.min(100, Math.max(0, seedProject.progress - (5 - item) * 2)),
      notes: template.notes,
      status: 'SENT' as const,
      approvalStatus: reportApproved ? ('APPROVED' as const) : ('PENDING' as const),
      submittedAt: atHour(reportDate, 16, 30),
      approvedBy: reportApproved ? managerId : null,
      approvedAt: reportApproved ? atHour(reportDate, 18, 0) : null,
      rejectedReason: null,
    }

    await prisma.dailyReport.upsert({
      where: { id: reportId },
      update: reportData,
      create: { id: reportId, ...reportData },
    })

    const imageData = {
      reportId,
      fileName: `${seedProject.code.toLowerCase()}-bao-cao-ngay-${item}.jpg`,
      originalName: `hien-truong-${seedProject.code.toLowerCase()}-${item}.jpg`,
      fileSize: 180000 + item * 12000,
      mimeType: 'image/jpeg',
      filePath: `/uploads/reports/${seedProject.code.toLowerCase()}-${item}.jpg`,
      displayOrder: 0,
    }

    await prisma.reportImage.upsert({
      where: { id: portfolioDataId('reportImage', seedProject.index, item) },
      update: imageData,
      create: { id: portfolioDataId('reportImage', seedProject.index, item), ...imageData },
    })
  }

  const taskTemplates = [
    { title: 'Hoàn thiện biện pháp thi công tuần', assignee: managerId, priority: 'HIGH' as const },
    { title: 'Kiểm tra kích thước và cao độ hiện trường', assignee: engineerId, priority: 'HIGH' as const },
    { title: 'Cập nhật bản vẽ shop drawing mới nhất', assignee: designId, priority: 'MEDIUM' as const },
    { title: 'Nghiệm thu vật liệu đầu vào', assignee: qualityId, priority: 'MEDIUM' as const },
    { title: 'Kiểm kê vật tư và lập đề nghị mua bổ sung', assignee: warehouseId, priority: 'LOW' as const },
  ]
  const taskStatuses = isCompleted
    ? (['DONE', 'DONE', 'DONE', 'DONE', 'DONE'] as const)
    : (['DONE', 'IN_PROGRESS', 'TO_DO', 'IN_PROGRESS', 'TO_DO'] as const)

  for (const [index, template] of taskTemplates.entries()) {
    const item = index + 1
    const status = taskStatuses[index]
    const dueDate = addDays(seedProject.startDate, 14 + item * 4)
    const taskId = portfolioDataId('task', seedProject.index, item)
    const taskData = {
      projectId: project.id,
      title: template.title,
      description: `${template.title} cho ${seedProject.code}, cần cập nhật kết quả vào hệ thống trước hạn.`,
      assignedTo: template.assignee,
      createdBy: managerId,
      reportId: portfolioDataId('report', seedProject.index, Math.min(item, 5)),
      status,
      priority: template.priority,
      dueDate,
      completedAt: status === 'DONE' ? atHour(dueDate, 15, 45) : null,
      requiresApproval: item % 2 === 0,
      approvalStatus: status === 'DONE' ? ('APPROVED' as const) : ('PENDING' as const),
      submittedAt: status === 'DONE' ? atHour(dueDate, 15, 20) : null,
      approvedBy: status === 'DONE' ? managerId : null,
      approvedAt: status === 'DONE' ? atHour(dueDate, 16, 10) : null,
      rejectedReason: null,
    }

    await prisma.task.upsert({
      where: { id: taskId },
      update: taskData,
      create: { id: taskId, ...taskData },
    })

    await prisma.taskComment.upsert({
      where: { id: portfolioDataId('taskComment', seedProject.index, item) },
      update: {
        taskId,
        authorId: managerId,
        content: `Cập nhật tiến độ công việc ${item} của ${seedProject.code} trong cuộc họp giao ban.`,
      },
      create: {
        id: portfolioDataId('taskComment', seedProject.index, item),
        taskId,
        authorId: managerId,
        content: `Cập nhật tiến độ công việc ${item} của ${seedProject.code} trong cuộc họp giao ban.`,
      },
    })
  }

  const fileTemplates = [
    {
      fileName: 'hop-dong-thi-cong.pdf',
      originalName: 'Hợp đồng thi công.pdf',
      fileType: 'CONTRACT',
      uploader: managerId,
      mimeType: 'application/pdf',
    },
    {
      fileName: 'ban-ve-shop-drawing.pdf',
      originalName: 'Bản vẽ shop drawing.pdf',
      fileType: 'DRAWING',
      uploader: designId,
      mimeType: 'application/pdf',
    },
    {
      fileName: 'bien-phap-thi-cong.docx',
      originalName: 'Biện pháp thi công.docx',
      fileType: 'METHOD',
      uploader: engineerId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    {
      fileName: 'bien-ban-nghiem-thu.docx',
      originalName: 'Biên bản nghiệm thu.docx',
      fileType: 'QAQC',
      uploader: qualityId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    {
      fileName: 'bang-ke-vat-tu.xlsx',
      originalName: 'Bảng kê vật tư.xlsx',
      fileType: 'WAREHOUSE',
      uploader: warehouseId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ]

  for (const [index, template] of fileTemplates.entries()) {
    const item = index + 1
    const fileName = `${seedProject.code.toLowerCase()}-${template.fileName}`
    const fileData = {
      projectId: project.id,
      uploadedBy: template.uploader,
      folderId,
      fileName,
      originalName: template.originalName,
      fileSize: 240000 + item * 185000,
      mimeType: template.mimeType,
      filePath: `/uploads/files/${fileName}`,
      fileType: template.fileType,
      version: 1,
      parentVersionId: null,
      tags: `${seedProject.code},${template.fileType.toLowerCase()}`,
      deletedAt: null,
    }

    await prisma.projectFile.upsert({
      where: { id: portfolioDataId('file', seedProject.index, item) },
      update: fileData,
      create: { id: portfolioDataId('file', seedProject.index, item), ...fileData },
    })
  }

  const safetyTemplates = [
    { location: 'Cổng vào công trường', description: 'Kiểm tra bảo hộ cá nhân và nội quy ra vào.', violations: 0 },
    {
      location: 'Khu vực làm việc trên cao',
      description: 'Kiểm tra lan can, dây an toàn và sàn thao tác.',
      violations: 1,
    },
    { location: 'Khu tập kết vật tư', description: 'Kiểm tra đường đi nội bộ và nguy cơ va chạm.', violations: 0 },
    { location: 'Khu máy móc thiết bị', description: 'Kiểm tra hồ sơ vận hành và vùng nguy hiểm.', violations: 1 },
    {
      location: 'Khu vực thi công chính',
      description: 'Kiểm tra vệ sinh công trường và biển cảnh báo.',
      violations: 0,
    },
  ]

  for (const [index, template] of safetyTemplates.entries()) {
    const item = index + 1
    const status = isCompleted || item <= 3 ? ('APPROVED' as const) : ('PENDING' as const)
    const reportDate = addDays(seedProject.startDate, 8 + item * 4)
    const reportId = portfolioDataId('safetyReport', seedProject.index, item)
    const safetyData = {
      projectId: project.id,
      reportDate,
      inspectorId: safetyId,
      location: template.location,
      description: template.description,
      violations: template.violations,
      photos: [`/uploads/safety/${seedProject.code.toLowerCase()}-${item}.jpg`],
      status,
      signedBy: status === 'APPROVED' ? safetyId : null,
      signedAt: status === 'APPROVED' ? atHour(reportDate, 17, 0) : null,
    }

    await prisma.safetyReport.upsert({
      where: { id: reportId },
      update: safetyData,
      create: { id: reportId, ...safetyData },
    })

    for (const checklistIndex of [1, 2]) {
      const checklistData = {
        reportId,
        label: checklistIndex === 1 ? 'Người lao động sử dụng đầy đủ PPE' : 'Khu vực thi công có biển báo rõ ràng',
        checked: checklistIndex === 1 || template.violations === 0,
        note: checklistIndex === 1 ? 'Đã kiểm tra tại hiện trường.' : 'Cần theo dõi lại vào ca tiếp theo.',
      }

      await prisma.safetyChecklistItem.upsert({
        where: { id: portfolioDataId('safetyChecklist', seedProject.index, item, checklistIndex) },
        update: checklistData,
        create: {
          id: portfolioDataId('safetyChecklist', seedProject.index, item, checklistIndex),
          ...checklistData,
        },
      })
    }
  }

  await prisma.safetyIncident.upsert({
    where: { reportId: portfolioDataId('safetyReport', seedProject.index, 2) },
    update: {
      severity: 'LOW',
      involvedPersons: 'Tổ thi công khu vực làm việc trên cao',
      immediateAction: 'Nhắc nhở và bổ sung biển báo trước khi tiếp tục thi công.',
      damages: 'Không có thiệt hại về người và tài sản.',
      status: isCompleted ? 'CLOSED' : 'UNDER_REVIEW',
    },
    create: {
      id: portfolioDataId('safetyIncident', seedProject.index, 2),
      reportId: portfolioDataId('safetyReport', seedProject.index, 2),
      severity: 'LOW',
      involvedPersons: 'Tổ thi công khu vực làm việc trên cao',
      immediateAction: 'Nhắc nhở và bổ sung biển báo trước khi tiếp tục thi công.',
      damages: 'Không có thiệt hại về người và tài sản.',
      status: isCompleted ? 'CLOSED' : 'UNDER_REVIEW',
    },
  })

  await prisma.safetyCorrectiveAction.upsert({
    where: { id: portfolioDataId('safetyAction', seedProject.index, 2) },
    update: {
      incidentId: portfolioDataId('safetyIncident', seedProject.index, 2),
      title: 'Bổ sung biển báo và rào chắn khu vực nguy cơ',
      description: 'Lắp thêm biển cảnh báo, rào chắn mềm và phổ biến lại cho tổ thi công.',
      assignedTo: engineerId,
      dueDate: addDays(seedProject.startDate, 18),
      status: isCompleted ? 'DONE' : 'IN_PROGRESS',
      completedAt: isCompleted ? atHour(addDays(seedProject.startDate, 18), 15, 0) : null,
      completedNote: isCompleted ? 'Đã hoàn thành và nghiệm thu nội bộ.' : null,
      createdBy: safetyId,
    },
    create: {
      id: portfolioDataId('safetyAction', seedProject.index, 2),
      incidentId: portfolioDataId('safetyIncident', seedProject.index, 2),
      title: 'Bổ sung biển báo và rào chắn khu vực nguy cơ',
      description: 'Lắp thêm biển cảnh báo, rào chắn mềm và phổ biến lại cho tổ thi công.',
      assignedTo: engineerId,
      dueDate: addDays(seedProject.startDate, 18),
      status: isCompleted ? 'DONE' : 'IN_PROGRESS',
      completedAt: isCompleted ? atHour(addDays(seedProject.startDate, 18), 15, 0) : null,
      completedNote: isCompleted ? 'Đã hoàn thành và nghiệm thu nội bộ.' : null,
      createdBy: safetyId,
    },
  })

  await prisma.safetyNearMiss.upsert({
    where: { reportId: portfolioDataId('safetyReport', seedProject.index, 3) },
    update: {
      reporterId: safetyId,
      description: 'Xe nâng đi gần khu tập kết vật tư khi công nhân đang di chuyển.',
      potentialHarm: 'Có nguy cơ va chạm nếu không tách làn đi bộ và làn xe.',
      witnesses: 'Tổ an toàn và thủ kho',
      rootCause: 'Phân làn tạm thời chưa rõ trong ca cao điểm.',
      likelihood: 'MEDIUM',
      severity: 'MEDIUM',
      status: isCompleted ? 'RESOLVED' : 'INVESTIGATING',
      resolvedAt: isCompleted ? atHour(addDays(seedProject.startDate, 24), 15, 0) : null,
    },
    create: {
      id: portfolioDataId('safetyNearMiss', seedProject.index, 3),
      reportId: portfolioDataId('safetyReport', seedProject.index, 3),
      reporterId: safetyId,
      description: 'Xe nâng đi gần khu tập kết vật tư khi công nhân đang di chuyển.',
      potentialHarm: 'Có nguy cơ va chạm nếu không tách làn đi bộ và làn xe.',
      witnesses: 'Tổ an toàn và thủ kho',
      rootCause: 'Phân làn tạm thời chưa rõ trong ca cao điểm.',
      likelihood: 'MEDIUM',
      severity: 'MEDIUM',
      status: isCompleted ? 'RESOLVED' : 'INVESTIGATING',
      resolvedAt: isCompleted ? atHour(addDays(seedProject.startDate, 24), 15, 0) : null,
    },
  })

  const qualityTemplates = [
    { location: 'Vật liệu đầu vào', description: 'Kiểm tra chứng chỉ xuất xứ và kết quả thí nghiệm.', result: 'PASS' },
    {
      location: 'Cốt thép và coffa',
      description: 'Kiểm tra khoảng cách thép, lớp bảo vệ và độ chắc coffa.',
      result: 'CONDITIONAL',
    },
    { location: 'Bê tông sau đổ', description: 'Kiểm tra bề mặt, cao độ và mẫu thí nghiệm.', result: 'PASS' },
    {
      location: 'Hoàn thiện bề mặt',
      description: 'Kiểm tra kích thước, vệ sinh và sai số cho phép.',
      result: 'CONDITIONAL',
    },
    {
      location: 'Hồ sơ nghiệm thu',
      description: 'Đối chiếu biên bản, ảnh hiện trường và chữ ký liên quan.',
      result: 'PASS',
    },
  ]

  for (const [index, template] of qualityTemplates.entries()) {
    const item = index + 1
    const status = isCompleted || item <= 3 ? ('APPROVED' as const) : ('PENDING' as const)
    const reportDate = addDays(seedProject.startDate, 10 + item * 4)
    const reportId = portfolioDataId('qualityReport', seedProject.index, item)
    const qualityData = {
      projectId: project.id,
      reportDate,
      inspectorId: qualityId,
      location: template.location,
      description: template.description,
      status,
      result: template.result,
      notes:
        template.result === 'PASS'
          ? 'Đạt yêu cầu theo tiêu chuẩn nội bộ.'
          : 'Cần xử lý một số điểm nhỏ trước khi đóng hồ sơ.',
      signedBy: status === 'APPROVED' ? qualityId : null,
      signedAt: status === 'APPROVED' ? atHour(reportDate, 17, 30) : null,
    }

    await prisma.qualityReport.upsert({
      where: { id: reportId },
      update: qualityData,
      create: { id: reportId, ...qualityData },
    })

    const punchData = {
      reportId,
      title: template.result === 'PASS' ? 'Hồ sơ và hiện trường đạt yêu cầu' : 'Cần chỉnh sửa điểm sai số nhỏ',
      description:
        template.result === 'PASS'
          ? 'Không ghi nhận lỗi lớn trong lần kiểm tra.'
          : 'Yêu cầu tổ thi công xử lý và báo lại QA/QC.',
      severity: template.result === 'PASS' ? 'LOW' : 'MEDIUM',
      location: template.location,
      status: template.result === 'PASS' || isCompleted ? 'FIXED' : 'OPEN',
      fixedAt:
        template.result === 'PASS' || isCompleted ? atHour(addDays(seedProject.startDate, 12 + item * 4), 14, 0) : null,
      note: 'Dữ liệu seed phục vụ theo dõi punch list.',
    }

    await prisma.qualityPunchListItem.upsert({
      where: { id: portfolioDataId('qualityPunch', seedProject.index, item) },
      update: punchData,
      create: { id: portfolioDataId('qualityPunch', seedProject.index, item), ...punchData },
    })

    await prisma.qualityReportPhoto.upsert({
      where: { id: portfolioDataId('qualityPhoto', seedProject.index, item) },
      update: {
        reportId,
        type: template.result === 'PASS' ? 'AFTER' : 'BEFORE',
        photoUrl: `/uploads/quality/${seedProject.code.toLowerCase()}-${item}.jpg`,
        caption: `Ảnh kiểm tra chất lượng ${item} của ${seedProject.code}.`,
      },
      create: {
        id: portfolioDataId('qualityPhoto', seedProject.index, item),
        reportId,
        type: template.result === 'PASS' ? 'AFTER' : 'BEFORE',
        photoUrl: `/uploads/quality/${seedProject.code.toLowerCase()}-${item}.jpg`,
        caption: `Ảnh kiểm tra chất lượng ${item} của ${seedProject.code}.`,
      },
    })
  }

  const inventoryTemplates = [
    { materialName: 'Thép D16', unit: 'kg', quantity: 2200, minQuantity: 700, maxQuantity: 4000 },
    { materialName: 'Xi măng PCB40', unit: 'bao', quantity: 180, minQuantity: 60, maxQuantity: 350 },
    { materialName: 'Cát vàng', unit: 'm3', quantity: 95, minQuantity: 25, maxQuantity: 180 },
    { materialName: 'Đá 1x2', unit: 'm3', quantity: 120, minQuantity: 30, maxQuantity: 220 },
    { materialName: 'Sơn lót và vật tư hoàn thiện', unit: 'thùng', quantity: 34, minQuantity: 12, maxQuantity: 80 },
  ]

  for (const [index, template] of inventoryTemplates.entries()) {
    const item = index + 1
    const inventoryId = portfolioDataId('inventory', seedProject.index, item)
    const inventoryData = {
      projectId: project.id,
      materialName: template.materialName,
      unit: template.unit,
      quantity: Math.round(template.quantity * (0.85 + seedProject.index * 0.04)),
      minQuantity: template.minQuantity,
      maxQuantity: template.maxQuantity,
      location: `Kho ${seedProject.code}`,
    }

    await prisma.warehouseInventory.upsert({
      where: { id: inventoryId },
      update: inventoryData,
      create: { id: inventoryId, ...inventoryData },
    })

    const transactionData = {
      inventoryId,
      type: item % 2 === 0 ? 'REQUEST' : 'IN',
      quantity: Math.max(10, Math.round(template.quantity * 0.12)),
      note: `${item % 2 === 0 ? 'Đề nghị cấp phát' : 'Nhập bổ sung'} ${template.materialName} cho ${seedProject.code}.`,
      requestedBy: item % 2 === 0 ? engineerId : warehouseId,
      approvedBy: item % 2 === 0 && !isCompleted ? null : managerId,
      status: item % 2 === 0 && !isCompleted ? 'PENDING' : 'APPROVED',
    }

    await prisma.warehouseTransaction.upsert({
      where: { id: portfolioDataId('warehouseTransaction', seedProject.index, item) },
      update: transactionData,
      create: { id: portfolioDataId('warehouseTransaction', seedProject.index, item), ...transactionData },
    })
  }

  const budgetMultiplier = 0.88 + seedProject.index * 0.06
  const budgetTemplates = [
    {
      category: 'Vật tư kết cấu',
      description: 'Thép, bê tông và vật tư phụ cho đợt thi công hiện tại.',
      estimatedCost: 165_000_000,
    },
    {
      category: 'Nhân công thi công',
      description: 'Nhân công trực tiếp theo khối lượng nghiệm thu trong tháng.',
      estimatedCost: 125_000_000,
    },
    {
      category: 'Máy móc thiết bị',
      description: 'Thuê máy, nhiên liệu và bảo trì thiết bị thi công.',
      estimatedCost: 78_000_000,
    },
    {
      category: 'An toàn lao động',
      description: 'PPE, biển báo, lưới che và huấn luyện an toàn.',
      estimatedCost: 26_000_000,
    },
    {
      category: 'Hồ sơ và nghiệm thu',
      description: 'Thí nghiệm vật liệu, in ấn hồ sơ và nghiệm thu nội bộ.',
      estimatedCost: 34_000_000,
    },
  ]

  for (const [index, template] of budgetTemplates.entries()) {
    const item = index + 1
    const estimatedCost = roundMillion(template.estimatedCost * budgetMultiplier)
    const approvedCost = item <= 4 || isCompleted ? roundMillion(estimatedCost * 0.96) : null
    const spentCost = approvedCost ? roundMillion(approvedCost * (isCompleted ? 0.92 : 0.45 + item * 0.06)) : 0
    const budgetStatus = approvedCost ? 'APPROVED' : 'PENDING'
    const budgetId = portfolioDataId('budget', seedProject.index, item)
    const budgetData = {
      projectId: project.id,
      category: template.category,
      description: template.description,
      estimatedCost,
      approvedCost,
      spentCost,
      status: budgetStatus,
    }

    await prisma.budgetItem.upsert({
      where: { id: budgetId },
      update: budgetData,
      create: { id: budgetId, ...budgetData },
    })

    const disbursementAmount = approvedCost
      ? Math.min(spentCost, roundMillion(approvedCost * 0.5))
      : roundMillion(estimatedCost * 0.25)
    const disbursementData = {
      budgetItemId: budgetId,
      amount: disbursementAmount,
      approvedBy: approvedCost ? managerId : null,
      approvedAt: approvedCost ? atHour(addDays(seedProject.startDate, 20 + item * 3), 10, 0) : null,
      status: approvedCost ? 'APPROVED' : 'PENDING',
      note: `Giải ngân đợt ${item} cho ${template.category.toLowerCase()} của ${seedProject.code}.`,
    }

    await prisma.budgetDisbursement.upsert({
      where: { id: portfolioDataId('disbursement', seedProject.index, item) },
      update: disbursementData,
      create: { id: portfolioDataId('disbursement', seedProject.index, item), ...disbursementData },
    })
  }

  const notifications = [
    {
      userId: engineerId,
      type: 'TASK_ASSIGNED' as const,
      title: 'Công việc mới',
      message: `Bạn có công việc hiện trường mới trong ${seedProject.code}.`,
    },
    {
      userId: managerId,
      type: 'REPORT_PENDING_APPROVAL' as const,
      title: 'Báo cáo chờ duyệt',
      message: `${seedProject.code} có báo cáo ngày cần phê duyệt.`,
    },
    {
      userId: safetyId,
      type: 'SAFETY_REPORT_PENDING' as const,
      title: 'Báo cáo an toàn',
      message: `Cần cập nhật kết quả an toàn của ${seedProject.code}.`,
    },
    {
      userId: qualityId,
      type: 'QUALITY_REPORT_PENDING' as const,
      title: 'Báo cáo chất lượng',
      message: `Cần đóng hồ sơ QA/QC của ${seedProject.code}.`,
    },
    {
      userId: warehouseId,
      type: 'LOW_STOCK_ALERT' as const,
      title: 'Cần kiểm tra tồn kho',
      message: `Vật tư trong kho ${seedProject.code} cần được rà soát.`,
    },
  ]

  for (const [index, notification] of notifications.entries()) {
    const item = index + 1
    await prisma.notification.upsert({
      where: { id: portfolioDataId('notification', seedProject.index, item) },
      update: {
        ...notification,
        data: { projectId: project.id, projectCode: seedProject.code },
        isRead: isCompleted,
      },
      create: {
        id: portfolioDataId('notification', seedProject.index, item),
        ...notification,
        data: { projectId: project.id, projectCode: seedProject.code },
        isRead: isCompleted,
      },
    })
  }

  const moduleAuditLogs = [
    {
      action: 'CREATE' as const,
      entityType: 'DAILY_REPORT' as const,
      entityId: portfolioDataId('report', seedProject.index, 1),
      description: `Tạo dữ liệu 5 báo cáo ngày cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'TASK' as const,
      entityId: portfolioDataId('task', seedProject.index, 1),
      description: `Tạo dữ liệu 5 công việc cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'FILE' as const,
      entityId: portfolioDataId('file', seedProject.index, 1),
      description: `Tạo dữ liệu 5 tệp đính kèm cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'PROJECT' as const,
      entityId: project.id,
      description: `Tạo dữ liệu 5 báo cáo an toàn cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'PROJECT' as const,
      entityId: project.id,
      description: `Tạo dữ liệu 5 báo cáo chất lượng cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'PROJECT' as const,
      entityId: project.id,
      description: `Tạo dữ liệu 5 vật tư và 5 giao dịch kho cho ${seedProject.code}.`,
    },
    {
      action: 'CREATE' as const,
      entityType: 'PROJECT' as const,
      entityId: project.id,
      description: `Tạo dữ liệu 5 khoản ngân sách thực tế cho ${seedProject.code}.`,
    },
    {
      action: 'UPDATE' as const,
      entityType: 'PROJECT' as const,
      entityId: project.id,
      description: `Hoàn tất bộ dữ liệu nghiệp vụ đầy đủ cho ${seedProject.code}.`,
    },
  ]

  for (const [index, audit] of moduleAuditLogs.entries()) {
    const item = index + 1
    await prisma.auditLog.upsert({
      where: { id: portfolioDataId('moduleAudit', seedProject.index, item) },
      update: {
        userId: adminId,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        description: audit.description,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      create: {
        id: portfolioDataId('moduleAudit', seedProject.index, item),
        userId: adminId,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        description: audit.description,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    })
  }
}
