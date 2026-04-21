import { PrismaClient } from '@prisma/client'
import * as bcrypt from '@node-rs/bcrypt'
import { seedPortfolioBusinessData, type PortfolioBusinessRoleUsers } from './portfolio-business-seed'

const prisma = new PrismaClient()

const SAMPLE_IDS = {
  projectMain: '11111111-1111-1111-1111-111111111111',
  projectSecond: '22222222-2222-2222-2222-222222222222',
  reportMain1: '31111111-1111-1111-1111-111111111111',
  reportMain2: '32222222-2222-2222-2222-222222222222',
  taskMain1: '41111111-1111-1111-1111-111111111111',
  taskMain2: '42222222-2222-2222-2222-222222222222',
  taskMain3: '43333333-3333-3333-3333-333333333333',
  commentMain1: '51111111-1111-1111-1111-111111111111',
  folderRoot: '61111111-1111-1111-1111-111111111111',
  folderChild: '62222222-2222-2222-2222-222222222222',
  fileMain1: '71111111-1111-1111-1111-111111111111',
  fileMain2: '72222222-2222-2222-2222-222222222222',
  reportImage1: '81111111-1111-1111-1111-111111111111',
  reportImage2: '82222222-2222-2222-2222-222222222222',
  safetyReport1: '91111111-1111-1111-1111-111111111111',
  safetyChecklist1: '92111111-1111-1111-1111-111111111111',
  safetyChecklist2: '92222222-2222-2222-2222-222222222222',
  safetyIncident1: '93111111-1111-1111-1111-111111111111',
  safetyNearMiss1: '94111111-1111-1111-1111-111111111111',
  safetyAction1: '95111111-1111-1111-1111-111111111111',
  qualityReport1: 'a1111111-1111-1111-1111-111111111111',
  qualityPunch1: 'a2111111-1111-1111-1111-111111111111',
  qualityPunch2: 'a2222222-2222-2222-2222-222222222222',
  qualityPhoto1: 'a3111111-1111-1111-1111-111111111111',
  qualityPhoto2: 'a3222222-2222-2222-2222-222222222222',
  inventory1: 'b1111111-1111-1111-1111-111111111111',
  inventory2: 'b1222222-2222-2222-2222-222222222222',
  transaction1: 'b2111111-1111-1111-1111-111111111111',
  transaction2: 'b2222222-2222-2222-2222-222222222222',
  budget1: 'c1111111-1111-1111-1111-111111111111',
  budget2: 'c1222222-2222-2222-2222-222222222222',
  disbursement1: 'c2111111-1111-1111-1111-111111111111',
  notification1: 'd1111111-1111-1111-1111-111111111111',
  notification2: 'd1222222-2222-2222-2222-222222222222',
  audit1: 'e1111111-1111-1111-1111-111111111111',
  audit2: 'e1222222-2222-2222-2222-222222222222',
} as const

async function upsertUser(
  email: string,
  data: {
    name: string
    systemRole: 'ADMIN' | 'STAFF'
    phone?: string
    specialty?: string
  },
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name: data.name,
      systemRole: data.systemRole,
      phone: data.phone,
      specialty: data.specialty,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      name: data.name,
      systemRole: data.systemRole,
      phone: data.phone,
      specialty: data.specialty,
      isActive: true,
    },
  })
}

type SeedProjectRole =
  | 'PROJECT_MANAGER'
  | 'ENGINEER'
  | 'SAFETY_OFFICER'
  | 'DESIGN_ENGINEER'
  | 'QUALITY_MANAGER'
  | 'WAREHOUSE_KEEPER'
  | 'CLIENT'
  | 'VIEWER'

type SeedProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'

type PortfolioMemberSeed = {
  email: string
  name: string
  phone: string
  role: SeedProjectRole
  specialty: string
}

type PortfolioProjectSeed = {
  index: number
  code: string
  name: string
  description: string
  location: string
  clientName: string
  startDate: Date
  endDate: Date
  status: SeedProjectStatus
  progress: number
  team: PortfolioMemberSeed[]
}

function portfolioAuditId(kind: 'user' | 'project' | 'member', projectIndex: number, memberIndex = 0) {
  const kindCode = kind === 'user' ? '1' : kind === 'project' ? '2' : '3'
  return `e${kindCode}${String(projectIndex).padStart(2, '0')}${String(memberIndex).padStart(2, '0')}00-0000-4000-8000-${String(
    projectIndex * 100 + memberIndex,
  ).padStart(12, '0')}`
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  const admin = await upsertUser(
    'admin@construction.local',
    { name: 'Admin Hệ thống', systemRole: 'ADMIN', phone: '0900000001', specialty: 'Quản trị hệ thống' },
    passwordHash,
  )
  const pm = await upsertUser(
    'pm@construction.local',
    { name: 'Nguyễn Văn Quản', systemRole: 'STAFF', phone: '0900000002', specialty: 'Quản lý dự án' },
    passwordHash,
  )
  const engineer = await upsertUser(
    'engineer@construction.local',
    { name: 'Trần Minh Kỹ', systemRole: 'STAFF', phone: '0900000003', specialty: 'Kỹ sư công trường' },
    passwordHash,
  )
  const safetyOfficer = await upsertUser(
    'safety@construction.local',
    { name: 'Phạm Đức An', systemRole: 'STAFF', phone: '0900000004', specialty: 'An toàn lao động' },
    passwordHash,
  )
  const qualityManager = await upsertUser(
    'quality@construction.local',
    { name: 'Lê Thu Chất', systemRole: 'STAFF', phone: '0900000005', specialty: 'Quản lý chất lượng' },
    passwordHash,
  )
  const warehouseKeeper = await upsertUser(
    'warehouse@construction.local',
    { name: 'Hoàng Văn Kho', systemRole: 'STAFF', phone: '0900000006', specialty: 'Kho vật tư' },
    passwordHash,
  )
  const client = await upsertUser(
    'client@construction.local',
    { name: 'Đại diện Chủ đầu tư', systemRole: 'STAFF', phone: '0900000007', specialty: 'Giám sát' },
    passwordHash,
  )
  const viewer = await upsertUser(
    'viewer@construction.local',
    { name: 'Người xem dự án', systemRole: 'STAFF', phone: '0900000008', specialty: 'Theo dõi tiến độ' },
    passwordHash,
  )

  const projectMain = await prisma.project.upsert({
    where: { code: 'HH-CT-001' },
    update: {
      name: 'Hệ thống quản lý thi công tòa nhà văn phòng',
      description: 'Dự án mẫu phục vụ kiểm thử các phân hệ quản lý thi công xây dựng trên nền tảng web.',
      location: 'Quận Nam Từ Liêm, Hà Nội',
      clientName: 'Công ty TNHH Đầu tư và Xây dựng Nền móng Huy Hoàng',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      status: 'ACTIVE',
      progress: 62.5,
      createdBy: admin.id,
    },
    create: {
      id: SAMPLE_IDS.projectMain,
      code: 'HH-CT-001',
      name: 'Hệ thống quản lý thi công tòa nhà văn phòng',
      description: 'Dự án mẫu phục vụ kiểm thử các phân hệ quản lý thi công xây dựng trên nền tảng web.',
      location: 'Quận Nam Từ Liêm, Hà Nội',
      clientName: 'Công ty TNHH Đầu tư và Xây dựng Nền móng Huy Hoàng',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      status: 'ACTIVE',
      progress: 62.5,
      createdBy: admin.id,
    },
  })

  const projectSecond = await prisma.project.upsert({
    where: { code: 'HH-CT-002' },
    update: {
      name: 'Dự án nhà xưởng kết cấu thép',
      description: 'Dự án mẫu thứ hai dùng để minh họa dữ liệu nhiều công trình trong hệ thống.',
      location: 'Khu công nghiệp Yên Phong, Bắc Ninh',
      clientName: 'Công ty Cổ phần Công nghiệp Yên Phong',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-12-20'),
      status: 'ON_HOLD',
      progress: 38,
      createdBy: admin.id,
    },
    create: {
      id: SAMPLE_IDS.projectSecond,
      code: 'HH-CT-002',
      name: 'Dự án nhà xưởng kết cấu thép',
      description: 'Dự án mẫu thứ hai dùng để minh họa dữ liệu nhiều công trình trong hệ thống.',
      location: 'Khu công nghiệp Yên Phong, Bắc Ninh',
      clientName: 'Công ty Cổ phần Công nghiệp Yên Phong',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-12-20'),
      status: 'ON_HOLD',
      progress: 38,
      createdBy: admin.id,
    },
  })

  const memberships = [
    { projectId: projectMain.id, userId: pm.id, role: 'PROJECT_MANAGER', specialty: 'Quản lý dự án' },
    { projectId: projectMain.id, userId: engineer.id, role: 'ENGINEER', specialty: 'Thi công hiện trường' },
    { projectId: projectMain.id, userId: safetyOfficer.id, role: 'SAFETY_OFFICER', specialty: 'An toàn lao động' },
    {
      projectId: projectMain.id,
      userId: qualityManager.id,
      role: 'QUALITY_MANAGER',
      specialty: 'Kiểm soát chất lượng',
    },
    { projectId: projectMain.id, userId: warehouseKeeper.id, role: 'WAREHOUSE_KEEPER', specialty: 'Quản lý vật tư' },
    { projectId: projectMain.id, userId: client.id, role: 'CLIENT', specialty: 'Giám sát chủ đầu tư' },
    { projectId: projectMain.id, userId: viewer.id, role: 'VIEWER', specialty: 'Theo dõi báo cáo' },
    { projectId: projectSecond.id, userId: pm.id, role: 'PROJECT_MANAGER', specialty: 'Quản lý dự án' },
    { projectId: projectSecond.id, userId: engineer.id, role: 'ENGINEER', specialty: 'Thi công nhà xưởng' },
    { projectId: projectSecond.id, userId: qualityManager.id, role: 'QUALITY_MANAGER', specialty: 'Nghiệm thu' },
  ] as const

  for (const membership of memberships) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: membership.projectId,
          userId: membership.userId,
        },
      },
      update: {
        role: membership.role,
        specialty: membership.specialty,
      },
      create: membership,
    })
  }

  const toolPermissions = [
    { projectId: projectMain.id, userId: engineer.id, toolId: 'WAREHOUSE', level: 'READ' },
    { projectId: projectMain.id, userId: qualityManager.id, toolId: 'WAREHOUSE', level: 'STANDARD' },
    { projectId: projectMain.id, userId: client.id, toolId: 'BUDGET', level: 'READ' },
  ] as const

  for (const permission of toolPermissions) {
    await prisma.projectToolPermission.upsert({
      where: {
        projectId_userId_toolId: {
          projectId: permission.projectId,
          userId: permission.userId,
          toolId: permission.toolId,
        },
      },
      update: { level: permission.level },
      create: permission,
    })
  }

  const specialPrivileges = [
    { projectId: projectMain.id, userId: safetyOfficer.id, privilege: 'SAFETY_SIGNER', grantedBy: admin.id },
    { projectId: projectMain.id, userId: qualityManager.id, privilege: 'QUALITY_SIGNER', grantedBy: admin.id },
    { projectId: projectMain.id, userId: pm.id, privilege: 'BUDGET_APPROVER', grantedBy: admin.id },
  ] as const

  for (const privilege of specialPrivileges) {
    await prisma.specialPrivilegeAssignment.upsert({
      where: {
        projectId_userId_privilege: {
          projectId: privilege.projectId,
          userId: privilege.userId,
          privilege: privilege.privilege,
        },
      },
      update: { grantedBy: privilege.grantedBy },
      create: privilege,
    })
  }

  const portfolioProjects: PortfolioProjectSeed[] = [
    {
      index: 1,
      code: 'HH-CT-001',
      name: 'Hệ thống quản lý thi công tòa nhà văn phòng',
      description:
        'Dữ liệu demo dành cho dự án tòa nhà văn phòng, bao gồm đầy đủ nhân sự, vai trò và nhật ký hệ thống.',
      location: 'Quận Nam Từ Liêm, Hà Nội',
      clientName: 'Công ty TNHH Đầu tư và Xây dựng Nền móng Huy Hoàng',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      status: 'ACTIVE',
      progress: 62.5,
      team: [
        {
          email: 'hhct001.pm@construction.local',
          name: 'Nguyễn Hải Long',
          phone: '0910010101',
          role: 'PROJECT_MANAGER',
          specialty: 'Chỉ huy trưởng',
        },
        {
          email: 'hhct001.engineer@construction.local',
          name: 'Trần Quang Minh',
          phone: '0910010102',
          role: 'ENGINEER',
          specialty: 'Kỹ sư hiện trường',
        },
        {
          email: 'hhct001.safety@construction.local',
          name: 'Phạm Đức Thắng',
          phone: '0910010103',
          role: 'SAFETY_OFFICER',
          specialty: 'An toàn lao động',
        },
        {
          email: 'hhct001.design@construction.local',
          name: 'Lê Thu Hà',
          phone: '0910010104',
          role: 'DESIGN_ENGINEER',
          specialty: 'Thiết kế kết cấu',
        },
        {
          email: 'hhct001.quality@construction.local',
          name: 'Đỗ Minh Châu',
          phone: '0910010105',
          role: 'QUALITY_MANAGER',
          specialty: 'Quản lý chất lượng',
        },
        {
          email: 'hhct001.warehouse@construction.local',
          name: 'Hoàng Văn Khôi',
          phone: '0910010106',
          role: 'WAREHOUSE_KEEPER',
          specialty: 'Kho vật tư',
        },
      ],
    },
    {
      index: 2,
      code: 'HH-CT-002',
      name: 'Dự án nhà xưởng kết cấu thép',
      description: 'Dữ liệu demo dành cho công trình nhà xưởng kết cấu thép tại khu công nghiệp.',
      location: 'Khu công nghiệp Yên Phong, Bắc Ninh',
      clientName: 'Công ty Cổ phần Công nghiệp Yên Phong',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-12-20'),
      status: 'ON_HOLD',
      progress: 38,
      team: [
        {
          email: 'hhct002.pm@construction.local',
          name: 'Vũ Thanh Sơn',
          phone: '0910020101',
          role: 'PROJECT_MANAGER',
          specialty: 'Quản lý dự án nhà xưởng',
        },
        {
          email: 'hhct002.engineer@construction.local',
          name: 'Bùi Anh Tuấn',
          phone: '0910020102',
          role: 'ENGINEER',
          specialty: 'Lắp dựng khung thép',
        },
        {
          email: 'hhct002.safety@construction.local',
          name: 'Đặng Quốc Việt',
          phone: '0910020103',
          role: 'SAFETY_OFFICER',
          specialty: 'Giám sát an toàn nâng hạ',
        },
        {
          email: 'hhct002.design@construction.local',
          name: 'Nguyễn Ngọc Anh',
          phone: '0910020104',
          role: 'DESIGN_ENGINEER',
          specialty: 'Bản vẽ shop drawing',
        },
        {
          email: 'hhct002.quality@construction.local',
          name: 'Mai Phương Linh',
          phone: '0910020105',
          role: 'QUALITY_MANAGER',
          specialty: 'Nghiệm thu mối hàn',
        },
        {
          email: 'hhct002.warehouse@construction.local',
          name: 'Cao Văn Nam',
          phone: '0910020106',
          role: 'WAREHOUSE_KEEPER',
          specialty: 'Kho thép và bulong',
        },
      ],
    },
    {
      index: 3,
      code: 'HH-CT-003',
      name: 'Trung tâm logistics Long Hậu',
      description:
        'Dữ liệu demo cho dự án trung tâm logistics, tập trung vào tiến độ nền móng, kho và hạ tầng kỹ thuật.',
      location: 'Cần Giuộc, Long An',
      clientName: 'Long Hau Logistics JSC',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-11-30'),
      status: 'ACTIVE',
      progress: 21.75,
      team: [
        {
          email: 'hhct003.pm@construction.local',
          name: 'Nguyễn Bảo Khánh',
          phone: '0910030101',
          role: 'PROJECT_MANAGER',
          specialty: 'Điều phối tổng thể',
        },
        {
          email: 'hhct003.engineer@construction.local',
          name: 'Lê Hoàng Phúc',
          phone: '0910030102',
          role: 'ENGINEER',
          specialty: 'Nền móng và hạ tầng',
        },
        {
          email: 'hhct003.safety@construction.local',
          name: 'Trần Hữu Nhân',
          phone: '0910030103',
          role: 'SAFETY_OFFICER',
          specialty: 'An toàn máy thi công',
        },
        {
          email: 'hhct003.design@construction.local',
          name: 'Phạm Bảo Trâm',
          phone: '0910030104',
          role: 'DESIGN_ENGINEER',
          specialty: 'Thiết kế hạ tầng kỹ thuật',
        },
        {
          email: 'hhct003.quality@construction.local',
          name: 'Võ Thị Thanh',
          phone: '0910030105',
          role: 'QUALITY_MANAGER',
          specialty: 'Kiểm soát vật liệu đầu vào',
        },
        {
          email: 'hhct003.warehouse@construction.local',
          name: 'Huỳnh Văn Lâm',
          phone: '0910030106',
          role: 'WAREHOUSE_KEEPER',
          specialty: 'Kho vật tư hạ tầng',
        },
      ],
    },
    {
      index: 4,
      code: 'HH-CT-004',
      name: 'Cầu vượt nội bộ khu công nghiệp',
      description: 'Dữ liệu demo cho dự án cầu vượt nội bộ, có đội thi công cầu, an toàn và nghiệm thu riêng.',
      location: 'An Dương, Hải Phòng',
      clientName: 'Ban quản lý KCN An Dương',
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-10-15'),
      status: 'ACTIVE',
      progress: 47.25,
      team: [
        {
          email: 'hhct004.pm@construction.local',
          name: 'Đỗ Quang Huy',
          phone: '0910040101',
          role: 'PROJECT_MANAGER',
          specialty: 'Chỉ huy thi công cầu',
        },
        {
          email: 'hhct004.engineer@construction.local',
          name: 'Nguyễn Mạnh Cường',
          phone: '0910040102',
          role: 'ENGINEER',
          specialty: 'Kết cấu cầu đường',
        },
        {
          email: 'hhct004.safety@construction.local',
          name: 'Phạm Văn Lợi',
          phone: '0910040103',
          role: 'SAFETY_OFFICER',
          specialty: 'An toàn giao thông nội bộ',
        },
        {
          email: 'hhct004.design@construction.local',
          name: 'Lê Anh Duy',
          phone: '0910040104',
          role: 'DESIGN_ENGINEER',
          specialty: 'Kiểm tra bản vẽ cầu',
        },
        {
          email: 'hhct004.quality@construction.local',
          name: 'Trần Thị Mỹ Hạnh',
          phone: '0910040105',
          role: 'QUALITY_MANAGER',
          specialty: 'Nghiệm thu bê tông và cốt thép',
        },
        {
          email: 'hhct004.warehouse@construction.local',
          name: 'Bùi Văn Dũng',
          phone: '0910040106',
          role: 'WAREHOUSE_KEEPER',
          specialty: 'Kho vật tư cầu đường',
        },
      ],
    },
    {
      index: 5,
      code: 'HH-CT-005',
      name: 'Trường liên cấp Tây Hồ',
      description: 'Dữ liệu demo cho dự án trường học đã hoàn thành, phù hợp kiểm tra dashboard và báo cáo tổng kết.',
      location: 'Quận Tây Hồ, Hà Nội',
      clientName: 'Công ty Cổ phần Giáo dục Tây Hồ',
      startDate: new Date('2025-08-10'),
      endDate: new Date('2026-03-25'),
      status: 'COMPLETED',
      progress: 100,
      team: [
        {
          email: 'hhct005.pm@construction.local',
          name: 'Nguyễn Trọng Nghĩa',
          phone: '0910050101',
          role: 'PROJECT_MANAGER',
          specialty: 'Bàn giao công trình',
        },
        {
          email: 'hhct005.engineer@construction.local',
          name: 'Hoàng Minh Đức',
          phone: '0910050102',
          role: 'ENGINEER',
          specialty: 'Hoàn thiện kiến trúc',
        },
        {
          email: 'hhct005.safety@construction.local',
          name: 'Võ Thanh Bình',
          phone: '0910050103',
          role: 'SAFETY_OFFICER',
          specialty: 'An toàn nghiệm thu',
        },
        {
          email: 'hhct005.design@construction.local',
          name: 'Phạm Ngọc Mai',
          phone: '0910050104',
          role: 'DESIGN_ENGINEER',
          specialty: 'Hồ sơ hoàn công',
        },
        {
          email: 'hhct005.quality@construction.local',
          name: 'Nguyễn Thị Yến',
          phone: '0910050105',
          role: 'QUALITY_MANAGER',
          specialty: 'Kiểm định chất lượng',
        },
        {
          email: 'hhct005.warehouse@construction.local',
          name: 'Trần Văn Hưng',
          phone: '0910050106',
          role: 'WAREHOUSE_KEEPER',
          specialty: 'Quyết toán vật tư',
        },
      ],
    },
  ]

  for (const seedProject of portfolioProjects) {
    const project = await prisma.project.upsert({
      where: { code: seedProject.code },
      update: {
        name: seedProject.name,
        description: seedProject.description,
        location: seedProject.location,
        clientName: seedProject.clientName,
        startDate: seedProject.startDate,
        endDate: seedProject.endDate,
        status: seedProject.status,
        progress: seedProject.progress,
        createdBy: admin.id,
      },
      create: {
        code: seedProject.code,
        name: seedProject.name,
        description: seedProject.description,
        location: seedProject.location,
        clientName: seedProject.clientName,
        startDate: seedProject.startDate,
        endDate: seedProject.endDate,
        status: seedProject.status,
        progress: seedProject.progress,
        createdBy: admin.id,
      },
    })

    await prisma.auditLog.upsert({
      where: { id: portfolioAuditId('project', seedProject.index) },
      update: {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'PROJECT',
        entityId: project.id,
        description: `Tạo dữ liệu dự án ${seedProject.code} - ${seedProject.name}.`,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
      create: {
        id: portfolioAuditId('project', seedProject.index),
        userId: admin.id,
        action: 'CREATE',
        entityType: 'PROJECT',
        entityId: project.id,
        description: `Tạo dữ liệu dự án ${seedProject.code} - ${seedProject.name}.`,
        ipAddress: '127.0.0.1',
        userAgent: 'Seed Script',
      },
    })

    const roleUsers: PortfolioBusinessRoleUsers = {}

    for (const [memberIndex, teamMember] of seedProject.team.entries()) {
      const memberUser = await upsertUser(
        teamMember.email,
        {
          name: teamMember.name,
          systemRole: 'STAFF',
          phone: teamMember.phone,
          specialty: teamMember.specialty,
        },
        passwordHash,
      )
      roleUsers[teamMember.role] = memberUser

      await prisma.auditLog.upsert({
        where: { id: portfolioAuditId('user', seedProject.index, memberIndex + 1) },
        update: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: memberUser.id,
          description: `Tạo tài khoản ${teamMember.email} cho dự án ${seedProject.code}.`,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
        },
        create: {
          id: portfolioAuditId('user', seedProject.index, memberIndex + 1),
          userId: admin.id,
          action: 'CREATE',
          entityType: 'USER',
          entityId: memberUser.id,
          description: `Tạo tài khoản ${teamMember.email} cho dự án ${seedProject.code}.`,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
        },
      })

      const membership = await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: memberUser.id,
          },
        },
        update: {
          role: teamMember.role,
          specialty: teamMember.specialty,
        },
        create: {
          projectId: project.id,
          userId: memberUser.id,
          role: teamMember.role,
          specialty: teamMember.specialty,
        },
      })

      await prisma.auditLog.upsert({
        where: { id: portfolioAuditId('member', seedProject.index, memberIndex + 1) },
        update: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'PROJECT_MEMBER',
          entityId: membership.id,
          description: `Tạo thành viên ${teamMember.name} với vai trò ${teamMember.role} vào dự án ${seedProject.code}.`,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
        },
        create: {
          id: portfolioAuditId('member', seedProject.index, memberIndex + 1),
          userId: admin.id,
          action: 'CREATE',
          entityType: 'PROJECT_MEMBER',
          entityId: membership.id,
          description: `Tạo thành viên ${teamMember.name} với vai trò ${teamMember.role} vào dự án ${seedProject.code}.`,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
        },
      })
    }

    await seedPortfolioBusinessData(prisma, seedProject, project, roleUsers, admin.id)
  }

  const reports = [
    {
      id: SAMPLE_IDS.reportMain1,
      projectId: projectMain.id,
      createdBy: engineer.id,
      reportDate: new Date('2026-04-15'),
      weather: 'SUNNY' as const,
      temperatureMin: 24,
      temperatureMax: 32,
      workerCount: 18,
      workDescription: 'Thi công cốt thép sàn tầng 2, kiểm tra coffa và đổ bê tông khu vực trục A-B.',
      issues: 'Một số vị trí vật tư cấp chậm so với kế hoạch buổi sáng.',
      progress: 58,
      notes: 'Tiến độ cuối ngày cơ bản đáp ứng kế hoạch tuần.',
      status: 'SENT' as const,
      approvalStatus: 'APPROVED' as const,
      submittedAt: new Date('2026-04-15T16:30:00'),
      approvedBy: pm.id,
      approvedAt: new Date('2026-04-15T18:00:00'),
      rejectedReason: null,
    },
    {
      id: SAMPLE_IDS.reportMain2,
      projectId: projectMain.id,
      createdBy: engineer.id,
      reportDate: new Date('2026-04-16'),
      weather: 'CLOUDY' as const,
      temperatureMin: 23,
      temperatureMax: 30,
      workerCount: 16,
      workDescription: 'Lắp dựng ván khuôn khu vực mở rộng và chuẩn bị kiểm tra an toàn giàn giáo tầng 2.',
      issues: 'Cần bổ sung thêm nhân lực cho hạng mục hoàn thiện cốp pha.',
      progress: 62.5,
      notes: 'Báo cáo đang chờ trưởng dự án xem xét phê duyệt.',
      status: 'SENT' as const,
      approvalStatus: 'PENDING' as const,
      submittedAt: new Date('2026-04-16T17:10:00'),
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
    },
  ]

  for (const report of reports) {
    await prisma.dailyReport.upsert({
      where: { id: report.id },
      update: report,
      create: report,
    })
  }

  const reportImages = [
    {
      id: SAMPLE_IDS.reportImage1,
      reportId: SAMPLE_IDS.reportMain1,
      fileName: 'bao-cao-ngay-15-04-1.jpg',
      originalName: 'hien-truong-tang-2.jpg',
      fileSize: 245000,
      mimeType: 'image/jpeg',
      filePath: '/uploads/reports/hien-truong-tang-2.jpg',
      displayOrder: 0,
    },
    {
      id: SAMPLE_IDS.reportImage2,
      reportId: SAMPLE_IDS.reportMain2,
      fileName: 'bao-cao-ngay-16-04-1.jpg',
      originalName: 'kiem-tra-gian-giao.png',
      fileSize: 198500,
      mimeType: 'image/png',
      filePath: '/uploads/reports/kiem-tra-gian-giao.png',
      displayOrder: 0,
    },
  ]

  for (const image of reportImages) {
    await prisma.reportImage.upsert({
      where: { id: image.id },
      update: image,
      create: image,
    })
  }

  const tasks = [
    {
      id: SAMPLE_IDS.taskMain1,
      projectId: projectMain.id,
      title: 'Hoàn thiện cốp pha trục A-B',
      description: 'Hoàn thiện cốp pha và kiểm tra trước khi đổ bê tông.',
      assignedTo: engineer.id,
      createdBy: pm.id,
      reportId: SAMPLE_IDS.reportMain2,
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2026-04-18'),
      completedAt: null,
      requiresApproval: true,
      approvalStatus: 'PENDING' as const,
      submittedAt: new Date('2026-04-16T17:15:00'),
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
    },
    {
      id: SAMPLE_IDS.taskMain2,
      projectId: projectMain.id,
      title: 'Kiểm tra an toàn giàn giáo tầng 2',
      description: 'Đánh giá rủi ro khu vực làm việc trên cao và bổ sung biện pháp cảnh báo.',
      assignedTo: safetyOfficer.id,
      createdBy: pm.id,
      reportId: SAMPLE_IDS.reportMain2,
      status: 'TO_DO' as const,
      priority: 'HIGH' as const,
      dueDate: new Date('2026-04-17'),
      completedAt: null,
      requiresApproval: false,
      approvalStatus: 'PENDING' as const,
      submittedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
    },
    {
      id: SAMPLE_IDS.taskMain3,
      projectId: projectSecond.id,
      title: 'Rà soát hồ sơ nghiệm thu kết cấu thép',
      description: 'Chuẩn bị bộ hồ sơ nghiệm thu cho giai đoạn lắp dựng khung thép.',
      assignedTo: qualityManager.id,
      createdBy: pm.id,
      reportId: null,
      status: 'DONE' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date('2026-04-12'),
      completedAt: new Date('2026-04-12T16:00:00'),
      requiresApproval: true,
      approvalStatus: 'APPROVED' as const,
      submittedAt: new Date('2026-04-12T15:00:00'),
      approvedBy: pm.id,
      approvedAt: new Date('2026-04-12T17:30:00'),
      rejectedReason: null,
    },
  ]

  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: task,
      create: task,
    })
  }

  await prisma.taskComment.upsert({
    where: { id: SAMPLE_IDS.commentMain1 },
    update: {
      taskId: SAMPLE_IDS.taskMain1,
      authorId: pm.id,
      content: 'Ưu tiên hoàn thành trước cuối ngày mai để kịp kế hoạch đổ bê tông.',
    },
    create: {
      id: SAMPLE_IDS.commentMain1,
      taskId: SAMPLE_IDS.taskMain1,
      authorId: pm.id,
      content: 'Ưu tiên hoàn thành trước cuối ngày mai để kịp kế hoạch đổ bê tông.',
    },
  })

  await prisma.documentFolder.upsert({
    where: { id: SAMPLE_IDS.folderRoot },
    update: {
      projectId: projectMain.id,
      name: 'Hồ sơ kỹ thuật',
      parentId: null,
      createdBy: pm.id,
    },
    create: {
      id: SAMPLE_IDS.folderRoot,
      projectId: projectMain.id,
      name: 'Hồ sơ kỹ thuật',
      parentId: null,
      createdBy: pm.id,
    },
  })

  await prisma.documentFolder.upsert({
    where: { id: SAMPLE_IDS.folderChild },
    update: {
      projectId: projectMain.id,
      name: 'Bản vẽ thi công',
      parentId: SAMPLE_IDS.folderRoot,
      createdBy: engineer.id,
    },
    create: {
      id: SAMPLE_IDS.folderChild,
      projectId: projectMain.id,
      name: 'Bản vẽ thi công',
      parentId: SAMPLE_IDS.folderRoot,
      createdBy: engineer.id,
    },
  })

  const projectFiles = [
    {
      id: SAMPLE_IDS.fileMain1,
      projectId: projectMain.id,
      uploadedBy: engineer.id,
      folderId: SAMPLE_IDS.folderChild,
      fileName: 'ban-ve-san-tang-2-v1.pdf',
      originalName: 'Bản vẽ sàn tầng 2.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      filePath: '/uploads/files/ban-ve-san-tang-2-v1.pdf',
      fileType: 'DRAWING',
      version: 1,
      parentVersionId: null,
      tags: 'bản vẽ,tầng 2,kết cấu',
      deletedAt: null,
    },
    {
      id: SAMPLE_IDS.fileMain2,
      projectId: projectMain.id,
      uploadedBy: qualityManager.id,
      folderId: SAMPLE_IDS.folderRoot,
      fileName: 'bien-ban-nghiem-thu-vat-lieu.docx',
      originalName: 'Biên bản nghiệm thu vật liệu.docx',
      fileSize: 256000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filePath: '/uploads/files/bien-ban-nghiem-thu-vat-lieu.docx',
      fileType: 'DOCUMENT',
      version: 1,
      parentVersionId: null,
      tags: 'nghiệm thu,vật liệu,hồ sơ',
      deletedAt: null,
    },
  ]

  for (const file of projectFiles) {
    await prisma.projectFile.upsert({
      where: { id: file.id },
      update: file,
      create: file,
    })
  }

  await prisma.safetyReport.upsert({
    where: { id: SAMPLE_IDS.safetyReport1 },
    update: {
      projectId: projectMain.id,
      reportDate: new Date('2026-04-16'),
      inspectorId: safetyOfficer.id,
      location: 'Khu vực thi công sàn tầng 2',
      description: 'Kiểm tra công tác cảnh báo khu vực thi công và độ ổn định của giàn giáo.',
      violations: 2,
      photos: ['/uploads/safety/gian-giao-1.jpg', '/uploads/safety/canh-bao-2.jpg'],
      status: 'PENDING',
      signedBy: safetyOfficer.id,
      signedAt: null,
    },
    create: {
      id: SAMPLE_IDS.safetyReport1,
      projectId: projectMain.id,
      reportDate: new Date('2026-04-16'),
      inspectorId: safetyOfficer.id,
      location: 'Khu vực thi công sàn tầng 2',
      description: 'Kiểm tra công tác cảnh báo khu vực thi công và độ ổn định của giàn giáo.',
      violations: 2,
      photos: ['/uploads/safety/gian-giao-1.jpg', '/uploads/safety/canh-bao-2.jpg'],
      status: 'PENDING',
      signedBy: safetyOfficer.id,
      signedAt: null,
    },
  })

  const checklistItems = [
    {
      id: SAMPLE_IDS.safetyChecklist1,
      reportId: SAMPLE_IDS.safetyReport1,
      label: 'Hệ thống cảnh báo khu vực làm việc trên cao',
      checked: true,
      note: 'Đã bố trí đầy đủ biển cảnh báo.',
    },
    {
      id: SAMPLE_IDS.safetyChecklist2,
      reportId: SAMPLE_IDS.safetyReport1,
      label: 'Tình trạng giàn giáo và sàn thao tác',
      checked: false,
      note: 'Cần gia cố thêm tại một số điểm neo.',
    },
  ]

  for (const item of checklistItems) {
    await prisma.safetyChecklistItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }

  await prisma.safetyIncident.upsert({
    where: { reportId: SAMPLE_IDS.safetyReport1 },
    update: {
      severity: 'MEDIUM',
      involvedPersons: 'Tổ giàn giáo tầng 2',
      immediateAction: 'Tạm dừng thi công khu vực có nguy cơ mất an toàn để kiểm tra lại liên kết giàn giáo.',
      damages: 'Chưa phát sinh thiệt hại về người và tài sản.',
      status: 'UNDER_REVIEW',
    },
    create: {
      id: SAMPLE_IDS.safetyIncident1,
      reportId: SAMPLE_IDS.safetyReport1,
      severity: 'MEDIUM',
      involvedPersons: 'Tổ giàn giáo tầng 2',
      immediateAction: 'Tạm dừng thi công khu vực có nguy cơ mất an toàn để kiểm tra lại liên kết giàn giáo.',
      damages: 'Chưa phát sinh thiệt hại về người và tài sản.',
      status: 'UNDER_REVIEW',
    },
  })

  await prisma.safetyNearMiss.upsert({
    where: { reportId: SAMPLE_IDS.safetyReport1 },
    update: {
      reporterId: safetyOfficer.id,
      description: 'Một tấm ván thao tác bị xô lệch nhẹ khi công nhân di chuyển vật tư.',
      potentialHarm: 'Có thể gây trượt ngã nếu không phát hiện kịp thời.',
      witnesses: 'Tổ an toàn và tổ thi công sàn tầng 2',
      rootCause: 'Liên kết tạm thời chưa được cố định chắc chắn.',
      likelihood: 'MEDIUM',
      severity: 'MEDIUM',
      status: 'INVESTIGATING',
      resolvedAt: null,
    },
    create: {
      id: SAMPLE_IDS.safetyNearMiss1,
      reportId: SAMPLE_IDS.safetyReport1,
      reporterId: safetyOfficer.id,
      description: 'Một tấm ván thao tác bị xô lệch nhẹ khi công nhân di chuyển vật tư.',
      potentialHarm: 'Có thể gây trượt ngã nếu không phát hiện kịp thời.',
      witnesses: 'Tổ an toàn và tổ thi công sàn tầng 2',
      rootCause: 'Liên kết tạm thời chưa được cố định chắc chắn.',
      likelihood: 'MEDIUM',
      severity: 'MEDIUM',
      status: 'INVESTIGATING',
      resolvedAt: null,
    },
  })

  await prisma.safetyCorrectiveAction.upsert({
    where: { id: SAMPLE_IDS.safetyAction1 },
    update: {
      incidentId: SAMPLE_IDS.safetyIncident1,
      title: 'Gia cố lại điểm neo giàn giáo tầng 2',
      description: 'Bổ sung khóa giằng và kiểm tra lại toàn bộ sàn thao tác trước khi cho phép tiếp tục thi công.',
      assignedTo: engineer.id,
      dueDate: new Date('2026-04-17'),
      status: 'IN_PROGRESS',
      completedAt: null,
      completedNote: null,
      createdBy: safetyOfficer.id,
    },
    create: {
      id: SAMPLE_IDS.safetyAction1,
      incidentId: SAMPLE_IDS.safetyIncident1,
      title: 'Gia cố lại điểm neo giàn giáo tầng 2',
      description: 'Bổ sung khóa giằng và kiểm tra lại toàn bộ sàn thao tác trước khi cho phép tiếp tục thi công.',
      assignedTo: engineer.id,
      dueDate: new Date('2026-04-17'),
      status: 'IN_PROGRESS',
      completedAt: null,
      completedNote: null,
      createdBy: safetyOfficer.id,
    },
  })

  await prisma.qualityReport.upsert({
    where: { id: SAMPLE_IDS.qualityReport1 },
    update: {
      projectId: projectMain.id,
      reportDate: new Date('2026-04-16'),
      inspectorId: qualityManager.id,
      location: 'Khu vực dầm và sàn tầng 2',
      description: 'Kiểm tra chất lượng lắp dựng cốp pha, khoảng cách thép và vệ sinh bề mặt trước khi đổ bê tông.',
      status: 'PENDING',
      result: 'CONDITIONAL',
      notes: 'Cần xử lý lại một số điểm kê thép chưa đúng vị trí.',
      signedBy: null,
      signedAt: null,
    },
    create: {
      id: SAMPLE_IDS.qualityReport1,
      projectId: projectMain.id,
      reportDate: new Date('2026-04-16'),
      inspectorId: qualityManager.id,
      location: 'Khu vực dầm và sàn tầng 2',
      description: 'Kiểm tra chất lượng lắp dựng cốp pha, khoảng cách thép và vệ sinh bề mặt trước khi đổ bê tông.',
      status: 'PENDING',
      result: 'CONDITIONAL',
      notes: 'Cần xử lý lại một số điểm kê thép chưa đúng vị trí.',
      signedBy: null,
      signedAt: null,
    },
  })

  const qualityItems = [
    {
      id: SAMPLE_IDS.qualityPunch1,
      reportId: SAMPLE_IDS.qualityReport1,
      title: 'Khoảng cách thép lớp trên chưa đồng đều',
      description: 'Một số vị trí cần điều chỉnh lại thanh kê để bảo đảm khoảng cách đúng bản vẽ.',
      severity: 'MEDIUM',
      location: 'Trục A-B / Tầng 2',
      status: 'OPEN',
      fixedAt: null,
      note: 'Yêu cầu xử lý trước khi nghiệm thu nội bộ.',
    },
    {
      id: SAMPLE_IDS.qualityPunch2,
      reportId: SAMPLE_IDS.qualityReport1,
      title: 'Bề mặt cốp pha còn bụi bẩn',
      description: 'Cần vệ sinh lại trước khi đổ bê tông.',
      severity: 'LOW',
      location: 'Khu vực sàn tầng 2',
      status: 'FIXED',
      fixedAt: new Date('2026-04-16T15:30:00'),
      note: 'Đã vệ sinh xong, chờ kiểm tra lại.',
    },
  ]

  for (const item of qualityItems) {
    await prisma.qualityPunchListItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }

  const qualityPhotos = [
    {
      id: SAMPLE_IDS.qualityPhoto1,
      reportId: SAMPLE_IDS.qualityReport1,
      type: 'BEFORE',
      photoUrl: '/uploads/quality/before-kiem-tra-thep.jpg',
      caption: 'Hiện trạng trước khi điều chỉnh khoảng cách thép.',
    },
    {
      id: SAMPLE_IDS.qualityPhoto2,
      reportId: SAMPLE_IDS.qualityReport1,
      type: 'AFTER',
      photoUrl: '/uploads/quality/after-ve-sinh-coffa.jpg',
      caption: 'Hiện trạng sau khi vệ sinh cốp pha.',
    },
  ]

  for (const photo of qualityPhotos) {
    await prisma.qualityReportPhoto.upsert({
      where: { id: photo.id },
      update: photo,
      create: photo,
    })
  }

  const inventories = [
    {
      id: SAMPLE_IDS.inventory1,
      projectId: projectMain.id,
      materialName: 'Thép D16',
      unit: 'kg',
      quantity: 2850,
      minQuantity: 1000,
      maxQuantity: 5000,
      location: 'Kho vật tư số 1',
    },
    {
      id: SAMPLE_IDS.inventory2,
      projectId: projectMain.id,
      materialName: 'Xi măng PCB40',
      unit: 'bao',
      quantity: 120,
      minQuantity: 80,
      maxQuantity: 300,
      location: 'Kho vật tư số 2',
    },
  ]

  for (const inventory of inventories) {
    await prisma.warehouseInventory.upsert({
      where: { id: inventory.id },
      update: inventory,
      create: inventory,
    })
  }

  const transactions = [
    {
      id: SAMPLE_IDS.transaction1,
      inventoryId: SAMPLE_IDS.inventory1,
      type: 'IN',
      quantity: 500,
      note: 'Nhập bổ sung thép phục vụ thi công dầm sàn tầng 2.',
      requestedBy: warehouseKeeper.id,
      approvedBy: pm.id,
      status: 'APPROVED',
    },
    {
      id: SAMPLE_IDS.transaction2,
      inventoryId: SAMPLE_IDS.inventory2,
      type: 'REQUEST',
      quantity: 40,
      note: 'Yêu cầu cấp phát xi măng cho tổ bê tông.',
      requestedBy: engineer.id,
      approvedBy: null,
      status: 'PENDING',
    },
  ]

  for (const transaction of transactions) {
    await prisma.warehouseTransaction.upsert({
      where: { id: transaction.id },
      update: transaction,
      create: transaction,
    })
  }

  const budgetItems = [
    {
      id: SAMPLE_IDS.budget1,
      projectId: projectMain.id,
      category: 'Vật tư kết cấu',
      description: 'Chi phí mua thép và vật tư phụ trợ cho tầng 2.',
      estimatedCost: 180000000,
      approvedCost: 170000000,
      spentCost: 95000000,
      status: 'APPROVED',
    },
    {
      id: SAMPLE_IDS.budget2,
      projectId: projectMain.id,
      category: 'An toàn lao động',
      description: 'Chi phí bổ sung thiết bị an toàn và biển cảnh báo.',
      estimatedCost: 25000000,
      approvedCost: 20000000,
      spentCost: 8000000,
      status: 'PENDING',
    },
  ]

  for (const item of budgetItems) {
    await prisma.budgetItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }

  await prisma.budgetDisbursement.upsert({
    where: { id: SAMPLE_IDS.disbursement1 },
    update: {
      budgetItemId: SAMPLE_IDS.budget1,
      amount: 50000000,
      approvedBy: pm.id,
      approvedAt: new Date('2026-04-10T10:30:00'),
      status: 'APPROVED',
      note: 'Giải ngân đợt 1 cho gói vật tư kết cấu tầng 2.',
    },
    create: {
      id: SAMPLE_IDS.disbursement1,
      budgetItemId: SAMPLE_IDS.budget1,
      amount: 50000000,
      approvedBy: pm.id,
      approvedAt: new Date('2026-04-10T10:30:00'),
      status: 'APPROVED',
      note: 'Giải ngân đợt 1 cho gói vật tư kết cấu tầng 2.',
    },
  })

  const notifications = [
    {
      id: SAMPLE_IDS.notification1,
      userId: engineer.id,
      type: 'TASK_DEADLINE_SOON' as const,
      title: 'Công việc sắp đến hạn',
      message: 'Công việc Hoàn thiện cốp pha trục A-B sẽ đến hạn vào ngày 18/04/2026.',
      data: { taskId: SAMPLE_IDS.taskMain1, projectId: projectMain.id },
      isRead: false,
    },
    {
      id: SAMPLE_IDS.notification2,
      userId: pm.id,
      type: 'REPORT_PENDING_APPROVAL' as const,
      title: 'Có báo cáo ngày chờ phê duyệt',
      message: 'Báo cáo ngày 16/04/2026 đang chờ trưởng dự án phê duyệt.',
      data: { reportId: SAMPLE_IDS.reportMain2, projectId: projectMain.id },
      isRead: false,
    },
  ]

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    })
  }

  const auditLogs = [
    {
      id: SAMPLE_IDS.audit1,
      userId: admin.id,
      action: 'CREATE' as const,
      entityType: 'PROJECT' as const,
      entityId: projectMain.id,
      description: 'Tạo mới dự án HH-CT-001 trên hệ thống.',
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
    {
      id: SAMPLE_IDS.audit2,
      userId: pm.id,
      action: 'STATUS_CHANGE' as const,
      entityType: 'TASK' as const,
      entityId: SAMPLE_IDS.taskMain3,
      description: 'Cập nhật trạng thái công việc rà soát hồ sơ nghiệm thu kết cấu thép sang hoàn thành.',
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
  ]

  for (const audit of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: audit.id },
      update: audit,
      create: audit,
    })
  }

  console.log('Seed completed with sample users, projects, reports, tasks, safety, quality, warehouse and budget data.')
  console.log('Seed accounts:')
  console.log('- admin@construction.local / Admin@123')
  console.log('- pm@construction.local / Admin@123')
  console.log('- engineer@construction.local / Admin@123')
  console.log('- safety@construction.local / Admin@123')
  console.log('- quality@construction.local / Admin@123')
  console.log('- warehouse@construction.local / Admin@123')
  console.log('- client@construction.local / Admin@123')
  console.log('- viewer@construction.local / Admin@123')
  console.log('Portfolio seed accounts:')
  console.log('- Project codes HH-CT-001..HH-CT-005 have 6 dedicated member accounts each.')
  console.log('- Email pattern: hhct00X.<pm|engineer|safety|design|quality|warehouse>@construction.local / Admin@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
