import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import type { ProjectRole, SystemRole } from '@construction/shared'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors'
import { notificationTriggers } from '../notifications/notification.triggers'

interface WarehouseActorContext {
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
}

function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

function parseQuantity(value: unknown): Prisma.Decimal {
  let quantity: Prisma.Decimal
  try {
    quantity = new Prisma.Decimal(String(value ?? "0"))
  } catch {
    throw new BadRequestError("Số lượng không hợp lệ")
  }

  if (quantity.lt(0)) {
    throw new BadRequestError("Số lượng không được âm")
  }
  return quantity
}

function parseTransactionQuantity(value: unknown): Prisma.Decimal {
  let quantity: Prisma.Decimal
  try {
    quantity = new Prisma.Decimal(String(value ?? "0"))
  } catch {
    throw new BadRequestError("Số lượng không hợp lệ")
  }

  if (quantity.lte(0)) {
    throw new BadRequestError("Số lượng phải lớn hơn 0")
  }
  return quantity
}

function parseMinQuantity(value: unknown): Prisma.Decimal {
  try {
    return new Prisma.Decimal(String(value ?? "0"))
  } catch {
    throw new BadRequestError("Ngưỡng tối thiểu không hợp lệ")
  }
}

function parseMaxQuantity(value: unknown): Prisma.Decimal {
  try {
    return new Prisma.Decimal(String(value ?? "0"))
  } catch {
    throw new BadRequestError("Ngưỡng tối đa không hợp lệ")
  }
}

function parseNonEmpty(value: unknown, fieldName: string, maxLength = 2000): string {
  const text = String(value ?? '').trim()
  if (!text) {
    throw new BadRequestError(`${fieldName} không được để trống`)
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`)
  }
  return text
}

function parseOptionalText(value: unknown, maxLength = 2000): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const text = String(value).trim()
  if (!text) {
    return null
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`Ghi chú vượt quá ${maxLength} ký tự`)
  }
  return text
}

function canManageStock(actor: WarehouseActorContext): boolean {
  return (
    actor.systemRole === 'ADMIN' || actor.projectRole === 'PROJECT_MANAGER' || actor.projectRole === 'WAREHOUSE_KEEPER'
  )
}

function canApproveRequest(actor: WarehouseActorContext): boolean {
  return canManageStock(actor) || actor.projectRole === 'QUALITY_MANAGER'
}

function isEngineerReadOnly(actor: WarehouseActorContext): boolean {
  return actor.systemRole !== 'ADMIN' && actor.projectRole === 'ENGINEER'
}

async function ensureProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw new NotFoundError("Không tìm thấy dự án")
  }

  return project
}

async function ensureInventoryInProject(projectId: string, inventoryId: string) {
  const inventory = await prisma.warehouseInventory.findFirst({
    where: { id: inventoryId, projectId },
    select: {
      id: true,
      projectId: true,
      quantity: true,
      materialName: true,
      unit: true,
      minQuantity: true,
      maxQuantity: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!inventory) {
    throw new NotFoundError("Không tìm thấy vật tư trong kho dự án")
  }

  return inventory
}

export const warehouseService = {
  async getInventory(projectId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId)

    if (isEngineerReadOnly(actor)) {
      const lightweightInventory = await prisma.warehouseInventory.findMany({
        where: { projectId },
        select: {
          id: true,
          projectId: true,
          materialName: true,
          unit: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ materialName: 'asc' }],
      })

      return {
        projectId,
        summary: {
          totalItems: lightweightInventory.length,
          lowStockItems: 0,
          totalQuantity: 0,
        },
        inventory: lightweightInventory,
        restricted: true,
        message: 'Engineer chi xem danh muc vat tu de tao yeu cau',
      }
    }

    const inventory = await prisma.warehouseInventory.findMany({
      where: { projectId },
      orderBy: [{ materialName: 'asc' }],
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    })

    const summary = inventory.reduce(
      (acc, item) => {
        acc.totalItems += 1
        acc.totalQuantity += Number(item.quantity)
        if (item.quantity.lte(item.minQuantity)) {
          acc.lowStockItems += 1
        }
        return acc
      },
      { totalItems: 0, lowStockItems: 0, totalQuantity: 0 },
    )

    return {
      projectId,
      summary,
      inventory,
    }
  },

  async getInventoryItem(projectId: string, inventoryId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId)

    if (isEngineerReadOnly(actor)) {
      throw new ForbiddenError("Engineer không được xem chi tiết tồn kho")
    }

    const inventory = await prisma.warehouseInventory.findFirst({
      where: { id: inventoryId, projectId },
      include: {
        transactions: {
          include: {
            requester: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 50,
        },
      },
    })

    if (!inventory) {
      throw new NotFoundError("Không tìm thấy vật tư trong kho dự án")
    }

    return inventory
  },

  async listTransactions(projectId: string, actor: WarehouseActorContext) {
    await ensureProjectExists(projectId)

    const where: Prisma.WarehouseTransactionWhereInput = {
      inventory: { projectId },
    }

    if (isEngineerReadOnly(actor)) {
      where.requestedBy = actor.userId
    }

    const transactions = await prisma.warehouseTransaction.findMany({
      where,
      include: {
        inventory: {
          select: {
            id: true,
            materialName: true,
            unit: true,
            location: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    })

    const summary = transactions.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.status === 'PENDING') acc.pending += 1
        if (item.type === 'REQUEST') acc.requests += 1
        return acc
      },
      { total: 0, pending: 0, requests: 0 },
    )

    return {
      projectId,
      summary,
      transactions,
    }
  },

  async createTransaction(projectId: string, actor: WarehouseActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    if (!canManageStock(actor)) {
      throw new ForbiddenError("Chỉ PM hoặc thủ kho mới được nhập/xuất vật tư")
    }

    const inventoryId = parseNonEmpty(payload.inventoryId, 'InventoryId', 64)
    const type = String(payload.type ?? '').toUpperCase()
    if (type !== 'IN' && type !== 'OUT') {
      throw new BadRequestError("Loại giao dịch phải là IN hoặc OUT")
    }

    const quantity = parseTransactionQuantity(payload.quantity)
    const note = parseOptionalText(payload.note)
    const inventory = await ensureInventoryInProject(projectId, inventoryId)

    const transaction = await prisma.$transaction(async (tx) => {
      const currentQuantity = new Prisma.Decimal(inventory.quantity)

      if (type === 'OUT' && currentQuantity.lt(quantity)) {
        throw new BadRequestError(`Tồn kho không đủ để xuất (${currentQuantity.toString()} ${inventory.unit})`)
      }

      const nextQuantity = type === 'IN' ? currentQuantity.plus(quantity) : currentQuantity.minus(quantity)

      const transaction = await tx.warehouseTransaction.create({
        data: {
          inventoryId,
          type,
          quantity,
          note,
          requestedBy: actor.userId,
          approvedBy: actor.userId,
          status: 'APPROVED',
        },
      })

      await tx.warehouseInventory.update({
        where: { id: inventoryId },
        data: { quantity: nextQuantity },
      })

      return transaction
    })

    try {
      const updatedInventory = await ensureInventoryInProject(projectId, inventoryId)
      if (new Prisma.Decimal(updatedInventory.quantity).lte(updatedInventory.minQuantity)) {
        await notificationTriggers.lowStockAlert({
          projectId,
          inventoryId: updatedInventory.id,
          materialName: updatedInventory.materialName,
          quantity: decimalToNumber(updatedInventory.quantity),
          minQuantity: decimalToNumber(updatedInventory.minQuantity),
        })
      }
    } catch {
      // Non-blocking notification
    }

    return transaction
  },

  async createRequest(projectId: string, actor: WarehouseActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    const inventoryId = parseNonEmpty(payload.inventoryId, 'InventoryId', 64)
    const quantity = parseTransactionQuantity(payload.quantity)
    const note = parseOptionalText(payload.note)

    await ensureInventoryInProject(projectId, inventoryId)

    const request = await prisma.warehouseTransaction.create({
      data: {
        inventoryId,
        type: 'REQUEST',
        quantity,
        note,
        requestedBy: actor.userId,
        status: 'PENDING',
      },
      include: {
        inventory: {
          select: { id: true, materialName: true, unit: true, location: true },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    try {
      await notificationTriggers.transactionPending({
        projectId,
        transactionId: request.id,
        materialName: request.inventory.materialName,
        quantity: decimalToNumber(request.quantity),
      })
    } catch {
      // Non-blocking notification
    }

    return request
  },

  async updateRequest(
    projectId: string,
    requestId: string,
    actor: WarehouseActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureProjectExists(projectId)

    if (!canApproveRequest(actor)) {
      throw new ForbiddenError("Bạn không có quyền duyệt yêu cầu vật tư")
    }

    const nextStatus = String(payload.status ?? '').toUpperCase()
    if (nextStatus !== 'APPROVED' && nextStatus !== 'REJECTED') {
      throw new BadRequestError("Trạng thái phải là APPROVED hoặc REJECTED")
    }

    const note = parseOptionalText(payload.note)

    const request = await prisma.warehouseTransaction.findFirst({
      where: {
        id: requestId,
        inventory: { projectId },
      },
      include: {
        inventory: {
          select: { id: true, quantity: true, unit: true },
        },
      },
    })

    if (!request) {
      throw new NotFoundError("Không tìm thấy yêu cầu vật tư")
    }

    if (request.type !== 'REQUEST') {
      throw new BadRequestError("Chỉ được cập nhật giao dịch REQUEST")
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestError("Yêu cầu đã được xử lý trước đó")
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      if (nextStatus === 'APPROVED') {
        const currentQuantity = new Prisma.Decimal(request.inventory.quantity)
        if (currentQuantity.lt(request.quantity)) {
          throw new BadRequestError(
            `Tồn kho không đủ để duyệt (${currentQuantity.toString()} ${request.inventory.unit})`,
          )
        }

        await tx.warehouseInventory.update({
          where: { id: request.inventoryId },
          data: {
            quantity: currentQuantity.minus(request.quantity),
          },
        })
      }

      return tx.warehouseTransaction.update({
        where: { id: requestId },
        data: {
          status: nextStatus,
          approvedBy: actor.userId,
          note: note ?? request.note,
        },
        include: {
          inventory: {
            select: { id: true, materialName: true, unit: true, location: true },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    })

    if (nextStatus === 'APPROVED') {
      try {
        const updatedInventory = await ensureInventoryInProject(projectId, request.inventoryId)
        if (new Prisma.Decimal(updatedInventory.quantity).lte(updatedInventory.minQuantity)) {
          await notificationTriggers.lowStockAlert({
            projectId,
            inventoryId: updatedInventory.id,
            materialName: updatedInventory.materialName,
            quantity: decimalToNumber(updatedInventory.quantity),
            minQuantity: decimalToNumber(updatedInventory.minQuantity),
          })
        }
      } catch {
        // Non-blocking notification
      }
    }

    return updatedRequest
  },

  // ─── Inventory CRUD ──────────────────────────────────────────────────────────

  async createInventoryItem(
    projectId: string,
    actor: WarehouseActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId)

    if (!canManageStock(actor)) {
      throw new ForbiddenError("Chỉ PM hoặc thủ kho mới được tạo vật tư trong kho")
    }

    const materialName = parseNonEmpty(payload.materialName, "Tên vật tư", 200)
    const unit = parseNonEmpty(payload.unit, "Đơn vị", 20)
    const quantity = parseQuantity(payload.quantity ?? 0)
    const minQuantity = parseMinQuantity(payload.minQuantity ?? 0)
    const maxQuantity = parseMaxQuantity(payload.maxQuantity ?? 0)
    const location = parseOptionalText(payload.location, 200)
    const note = parseOptionalText(payload.note)

    // Check for duplicate material name in this project
    const existing = await prisma.warehouseInventory.findFirst({
      where: { projectId, materialName },
    })

    if (existing) {
      throw new BadRequestError("Vật tư đã tồn tại trong dự án này")
    }

    return prisma.warehouseInventory.create({
      data: {
        projectId,
        materialName,
        unit,
        quantity,
        minQuantity,
        maxQuantity,
        location,
      },
    })
  },

  async updateInventoryItem(
    projectId: string,
    inventoryId: string,
    actor: WarehouseActorContext,
    payload: Record<string, unknown>
  ) {
    await ensureProjectExists(projectId)

    if (!canManageStock(actor)) {
      throw new ForbiddenError("Chỉ PM hoặc thủ kho mới được cập nhật vật tư")
    }

    const inventory = await ensureInventoryInProject(projectId, inventoryId)

    const data: Prisma.WarehouseInventoryUpdateInput = {}

    if (payload.materialName !== undefined) {
      const name = parseNonEmpty(payload.materialName, "Tên vật tư", 200)
      // Check for duplicate
      const dup = await prisma.warehouseInventory.findFirst({
        where: { projectId, materialName: name, NOT: { id: inventoryId } },
      })
      if (dup) {
        throw new BadRequestError("Tên vật tư đã tồn tại trong dự án này")
      }
      data.materialName = name
    }

    if (payload.unit !== undefined) {
      data.unit = parseNonEmpty(payload.unit, "Đơn vị", 20)
    }

    if (payload.minQuantity !== undefined) {
      data.minQuantity = parseMinQuantity(payload.minQuantity)
    }

    if (payload.maxQuantity !== undefined) {
      data.maxQuantity = parseMaxQuantity(payload.maxQuantity)
    }

    if (payload.location !== undefined) {
      data.location = payload.location === null ? null : parseOptionalText(payload.location, 200)
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Không có trường nào để cập nhật")
    }

    return prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data,
      include: { _count: { select: { transactions: true } } },
    })
  },

  async deleteInventoryItem(projectId: string, inventoryId: string) {
    await ensureProjectExists(projectId)

    const inventory = await prisma.warehouseInventory.findFirst({
      where: { id: inventoryId, projectId },
    })

    if (!inventory) {
      throw new NotFoundError("Không tìm thấy vật tư trong kho dự án")
    }

    // Check for existing transactions
    const txCount = await prisma.warehouseTransaction.count({
      where: { inventoryId },
    })

    if (txCount > 0) {
      throw new BadRequestError(
        `Vật tư đã có ${txCount} giao dịch. Không thể xóa. Hãy tạo giao dịch xuất hết trước.`
      )
    }

    await prisma.warehouseInventory.delete({ where: { id: inventoryId } })

    return { deleted: true, id: inventoryId }
  },
}
