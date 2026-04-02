# Database Schema — Phase 1

## ERD Overview

```
users (1) ──── (M) project_members (M) ──── (1) projects
                       │                           │
                       │                           ├── (M) daily_reports ── (M) report_images
                       │                           │         │
                       │                           │         └── (1) tasks (created_from_report)
                       │                           │
                       │                           ├── (M) tasks (assigned_to user)
                       │                           │
                       │                           └── (M) project_files
                       │
                       └── (M) audit_logs
```

---

## Enums

### UserRole
Role hệ thống của user.
```
ADMIN           — Quản trị toàn hệ thống
PROJECT_MANAGER — Quản lý dự án
SITE_ENGINEER   — Kỹ sư hiện trường
VIEWER          — Chỉ xem
```

### ProjectMemberRole
Role của user trong một dự án cụ thể.
```
PROJECT_MANAGER — PM của dự án này
SITE_ENGINEER   — SE của dự án này
VIEWER          — Viewer của dự án này
```
> Lưu ý: ADMIN là role hệ thống, không gán vào project_member. Admin truy cập mọi project.

### ProjectStatus
```
ACTIVE      — Đang hoạt động
ON_HOLD     — Tạm dừng
COMPLETED   — Hoàn thành
```

### TaskStatus
```
TO_DO        — Chưa làm
IN_PROGRESS  — Đang làm
DONE         — Hoàn thành
CANCELLED    — Hủy
```

### TaskPriority
```
LOW     — Thấp
MEDIUM  — Trung bình
HIGH    — Cao
```

### WeatherCondition
```
SUNNY       — Nắng
RAINY       — Mưa
CLOUDY      — Nhiều mây
OTHER       — Khác
```

### AuditAction
```
LOGIN           — Đăng nhập
LOGOUT          — Đăng xuất
CREATE          — Tạo mới
UPDATE          — Cập nhật
DELETE          — Xóa
STATUS_CHANGE   — Đổi trạng thái
```

### AuditEntityType
```
USER            — Người dùng
PROJECT         — Dự án
PROJECT_MEMBER  — Thành viên dự án
DAILY_REPORT    — Báo cáo ngày
TASK            — Task
FILE            — File
```

---

## Bảng chi tiết

### 1. users

Thông tin tài khoản người dùng.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| name | VARCHAR(200) | NO | | Tên đầy đủ |
| email | VARCHAR(255) | NO | | Unique, lowercase |
| password_hash | VARCHAR(255) | NO | | Bcrypt hash |
| phone | VARCHAR(20) | YES | | SĐT Việt Nam |
| role | ENUM(UserRole) | NO | VIEWER | Role hệ thống |
| avatar_url | VARCHAR(500) | YES | | URL avatar |
| is_active | BOOLEAN | NO | true | true = hoạt động |
| last_login_at | TIMESTAMP | YES | | Lần đăng nhập cuối |
| created_at | TIMESTAMP | NO | NOW() | |
| updated_at | TIMESTAMP | NO | NOW() | Auto update |
| deleted_at | TIMESTAMP | YES | | Soft delete — chỉ user |

**Indexes:**
- `UNIQUE INDEX` trên `email`
- `INDEX` trên `role`
- `INDEX` trên `is_active`
- `INDEX` trên `deleted_at`

**Ghi chú:**
- Soft delete user để giữ audit trail
- Khi user bị soft delete: `is_active = false`, `deleted_at = NOW()`
- Không xóa cứng user

---

### 2. projects

Thông tin dự án xây dựng.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| code | VARCHAR(50) | NO | | Mã dự án, unique |
| name | VARCHAR(200) | NO | | Tên dự án |
| description | TEXT | YES | | Mô tả |
| location | VARCHAR(500) | NO | | Địa điểm công trình |
| client_name | VARCHAR(200) | YES | | Chủ đầu tư |
| start_date | DATE | NO | | Ngày khởi công |
| end_date | DATE | YES | | Ngày hoàn thành dự kiến |
| status | ENUM(ProjectStatus) | NO | ACTIVE | |
| progress | DECIMAL(5,2) | NO | 0.00 | % tiến độ tổng thể (0-100) |
| created_by | UUID | NO | | FK → users |
| created_at | TIMESTAMP | NO | NOW() | |
| updated_at | TIMESTAMP | NO | NOW() | Auto update |

**Indexes:**
- `UNIQUE INDEX` trên `code`
- `INDEX` trên `status`
- `INDEX` trên `created_by`
- `INDEX` trên `start_date`

**Ghi chú:**
- Không soft delete project — nếu hủy thì đổi status
- Progress cập nhật tự động từ task completion hoặc manual

---

### 3. project_members

Quan hệ nhiều-nhiều giữa users và projects, kèm role trong dự án.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| project_id | UUID | NO | | FK → projects |
| user_id | UUID | NO | | FK → users |
| role | ENUM(ProjectMemberRole) | NO | SITE_ENGINEER | Role trong dự án |
| joined_at | TIMESTAMP | NO | NOW() | |
| created_at | TIMESTAMP | NO | NOW() | |

**Indexes:**
- `UNIQUE INDEX` trên `(project_id, user_id)` — 1 user chỉ 1 record/project
- `INDEX` trên `project_id`
- `INDEX` trên `user_id`

**Foreign Keys:**
- `project_id` → `projects.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE

**Ghi chú:**
- Xóa project → xóa hết members
- Xóa user → xóa khỏi mọi projects
- ADMIN không cần có record ở đây — access mọi project

---

### 4. daily_reports

Báo cáo ngày tại công trường.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| project_id | UUID | NO | | FK → projects |
| created_by | UUID | NO | | FK → users |
| report_date | DATE | NO | | Ngày báo cáo |
| weather | ENUM(WeatherCondition) | NO | | Thời tiết |
| temperature_min | INT | YES | | Nhiệt độ thấp nhất |
| temperature_max | INT | YES | | Nhiệt độ cao nhất |
| worker_count | INT | NO | 0 | Số công nhân |
| work_description | TEXT | NO | | Công việc hôm nay |
| issues | TEXT | YES | | Vấn đề / vướng mắc |
| progress | DECIMAL(5,2) | NO | 0.00 | Progress tổng thể % |
| notes | TEXT | YES | | Ghi chú thêm |
| created_at | TIMESTAMP | NO | NOW() | |
| updated_at | TIMESTAMP | NO | NOW() | Auto update |

**Indexes:**
- `INDEX` trên `project_id`
- `INDEX` trên `created_by`
- `INDEX` trên `report_date`
- `UNIQUE INDEX` trên `(project_id, report_date)` — 1 project chỉ 1 report/ngày

> **Lưu ý:** UNIQUE(project_id, report_date) có thể gây vấn đề nếu cần tạo lại report cùng ngày sau khi xóa. Cân nhắc bỏ UNIQUE, thay bằng application-level check.

**Foreign Keys:**
- `project_id` → `projects.id` ON DELETE CASCADE
- `created_by` → `users.id` ON DELETE RESTRICT (không xóa user nếu còn report)

**Ghi chú:**
- ON DELETE RESTRICT cho created_by để giữ audit trail
- Nếu muốn xóa user: chuyển created_by sang system user hoặc soft delete user

---

### 5. report_images

Ảnh đính kèm báo cáo ngày.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| report_id | UUID | NO | | FK → daily_reports |
| file_name | VARCHAR(255) | NO | | Tên file trên disk (uuid.ext) |
| original_name | VARCHAR(255) | NO | | Tên file gốc |
| file_size | INT | NO | | Bytes |
| mime_type | VARCHAR(100) | NO | | image/jpeg, image/png |
| file_path | VARCHAR(500) | NO | | Đường dẫn tương đối |
| display_order | INT | NO | 0 | Thứ tự hiển thị |
| created_at | TIMESTAMP | NO | NOW() | |

**Indexes:**
- `INDEX` trên `report_id`
- `INDEX` trên `display_order`

**Foreign Keys:**
- `report_id` → `daily_reports.id` ON DELETE CASCADE

**Ghi chú:**
- Xóa report → xóa cascade images
- File lưu ở `uploads/projects/{projectId}/reports/{reportId}/{uuid}.{ext}`

---

### 6. tasks

Công việc cần làm trong dự án.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| project_id | UUID | NO | | FK → projects |
| title | VARCHAR(200) | NO | | Tiêu đề task |
| description | TEXT | YES | | Mô tả chi tiết |
| assigned_to | UUID | YES | | FK → users, người phụ trách |
| created_by | UUID | NO | | FK → users |
| report_id | UUID | YES | | FK → daily_reports (nếu tạo từ report) |
| status | ENUM(TaskStatus) | NO | TO_DO | |
| priority | ENUM(TaskPriority) | NO | MEDIUM | |
| due_date | DATE | YES | | Deadline |
| completed_at | TIMESTAMP | YES | | Thời gian hoàn thành |
| created_at | TIMESTAMP | NO | NOW() | |
| updated_at | TIMESTAMP | NO | NOW() | Auto update |

**Indexes:**
- `INDEX` trên `project_id`
- `INDEX` trên `assigned_to`
- `INDEX` trên `status`
- `INDEX` trên `priority`
- `INDEX` trên `due_date`
- `INDEX` trên `created_by`
- `INDEX` trên `report_id`

**Foreign Keys:**
- `project_id` → `projects.id` ON DELETE CASCADE
- `assigned_to` → `users.id` ON DELETE SET NULL (user rời project thì task vẫn còn)
- `created_by` → `users.id` ON DELETE RESTRICT
- `report_id` → `daily_reports.id` ON DELETE SET NULL (xóa report thì task vẫn còn)

**Ghi chú:**
- assigned_to SET NULL vì user có thể bị xóa khỏi project nhưng task vẫn tồn tại
- report_id SET NULL vì task có thể độc lập, không phụ thuộc report
- completed_at tự set khi status chuyển sang DONE

---

### 7. project_files

File tài liệu upload lên dự án (không phải ảnh report).

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| project_id | UUID | NO | | FK → projects |
| uploaded_by | UUID | NO | | FK → users |
| file_name | VARCHAR(255) | NO | | Tên file trên disk (uuid.ext) |
| original_name | VARCHAR(255) | NO | | Tên file gốc |
| file_size | INT | NO | | Bytes |
| mime_type | VARCHAR(100) | NO | | application/pdf, v.v. |
| file_path | VARCHAR(500) | NO | | Đường dẫn tương đối |
| file_type | VARCHAR(50) | NO | | pdf, excel, image, document, other |
| created_at | TIMESTAMP | NO | NOW() | |

**Indexes:**
- `INDEX` trên `project_id`
- `INDEX` trên `uploaded_by`
- `INDEX` trên `file_type`
- `INDEX` trên `created_at`

**Foreign Keys:**
- `project_id` → `projects.id` ON DELETE CASCADE
- `uploaded_by` → `users.id` ON DELETE RESTRICT

**Ghi chú:**
- File lưu ở `uploads/projects/{projectId}/files/{uuid}.{ext}`
- Phân biệt với report_images: report_images gắn với report cụ thể, project_files là tài liệu chung của dự án

---

### 8. audit_logs

Nhật ký hành động hệ thống. Chỉ INSERT.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| user_id | UUID | YES | | FK → users, null cho system action |
| action | ENUM(AuditAction) | NO | | |
| entity_type | ENUM(AuditEntityType) | NO | | |
| entity_id | UUID | YES | | ID bản ghi bị tác động |
| description | TEXT | NO | | Mô tả ngắn |
| ip_address | VARCHAR(45) | YES | | IPv4 hoặc IPv6 |
| user_agent | VARCHAR(500) | YES | | Browser/device |
| created_at | TIMESTAMP | NO | NOW() | |

**Indexes:**
- `INDEX` trên `user_id`
- `INDEX` trên `action`
- `INDEX` trên `entity_type`
- `INDEX` trên `entity_id`
- `INDEX` trên `created_at`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE SET NULL (xóa user vẫn giữ log)

**Ghi chú:**
- **KHÔNG UPDATE, KHÔNG DELETE** — append only
- Không có FK ON DELETE CASCADE — log phải giữ lại dù entity bị xóa
- entity_id lưu UUID của bản ghi, có thể đã bị xóa (vẫn ghi log được)

---

### 9. password_reset_tokens

Token cho chức năng quên mật khẩu.

| Cột | Type | Nullable | Default | Ghi chú |
|-----|------|----------|---------|---------|
| id | UUID | NO | uuid() | PK |
| user_id | UUID | NO | | FK → users |
| token_hash | VARCHAR(255) | NO | | SHA256 hash của token, unique |
| expires_at | TIMESTAMP | NO | | Hết hạn (1 giờ sau khi tạo) |
| used | BOOLEAN | NO | false | Đã dùng chưa |
| created_at | TIMESTAMP | NO | NOW() | |

**Indexes:**
- `UNIQUE INDEX` trên `token_hash`
- `INDEX` trên `user_id`
- `INDEX` trên `expires_at`

**Foreign Keys:**
- `user_id` → `users.id` ON DELETE CASCADE

**Ghi chú:**
- Lưu token_hash thay vì plain token (bảo mật)
- Khi user request reset: tạo token, gửi plain token qua email, lưu hash trong DB
- Khi user submit: hash input so sánh với token_hash
- Cleanup định kỳ các token đã hết hạn hoặc đã dùng

---

## Quan hệ tổng quan

```
users
  ├── 1:N ── projects (created_by)
  ├── 1:N ── project_members
  ├── 1:N ── daily_reports (created_by)
  ├── 1:N ── tasks (created_by)
  ├── 1:N ── tasks (assigned_to)
  ├── 1:N ── project_files (uploaded_by)
  ├── 1:N ── audit_logs (user_id)
  └── 1:N ── password_reset_tokens

projects
  ├── 1:N ── project_members
  ├── 1:N ── daily_reports
  ├── 1:N ── tasks
  └── 1:N ── project_files

daily_reports
  ├── 1:N ── report_images
  └── 1:N ── tasks (report_id — optional)
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum UserRole {
  ADMIN
  PROJECT_MANAGER
  SITE_ENGINEER
  VIEWER
}

enum ProjectMemberRole {
  PROJECT_MANAGER
  SITE_ENGINEER
  VIEWER
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
}

enum TaskStatus {
  TO_DO
  IN_PROGRESS
  DONE
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum WeatherCondition {
  SUNNY
  RAINY
  CLOUDY
  OTHER
}

enum AuditAction {
  LOGIN
  LOGOUT
  CREATE
  UPDATE
  DELETE
  STATUS_CHANGE
}

enum AuditEntityType {
  USER
  PROJECT
  PROJECT_MEMBER
  DAILY_REPORT
  TASK
  FILE
}

// ==================== TABLES ====================

model User {
  id            String    @id @default(uuid())
  name          String    @db.VarChar(200)
  email         String    @unique @db.VarChar(255)
  passwordHash  String    @map("password_hash") @db.VarChar(255)
  phone         String?   @db.VarChar(20)
  role          UserRole  @default(VIEWER)
  avatarUrl     String?   @map("avatar_url") @db.VarChar(500)
  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @default(now()) @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  // Relations
  createdProjects     Project[]           @relation("ProjectCreator")
  projectMembers      ProjectMember[]
  createdReports      DailyReport[]       @relation("ReportCreator")
  assignedTasks       Task[]              @relation("TaskAssignee")
  createdTasks        Task[]              @relation("TaskCreator")
  uploadedFiles       ProjectFile[]       @relation("FileUploader")
  auditLogs           AuditLog[]
  passwordResetTokens PasswordResetToken[]

  @@index([role])
  @@index([isActive])
  @@index([deletedAt])
  @@map("users")
}

model Project {
  id          String         @id @default(uuid())
  code        String         @unique @db.VarChar(50)
  name        String         @db.VarChar(200)
  description String?        @db.Text
  location    String         @db.VarChar(500)
  clientName  String?        @map("client_name") @db.VarChar(200)
  startDate   DateTime       @map("start_date") @db.Date
  endDate     DateTime?      @map("end_date") @db.Date
  status      ProjectStatus  @default(ACTIVE)
  progress    Decimal        @default(0.00) @db.Decimal(5, 2)
  createdBy   String         @map("created_by")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @default(now()) @updatedAt @map("updated_at")

  // Relations
  creator       User            @relation("ProjectCreator", fields: [createdBy], references: [id])
  members       ProjectMember[]
  dailyReports  DailyReport[]
  tasks         Task[]
  files         ProjectFile[]

  @@index([status])
  @@index([createdBy])
  @@index([startDate])
  @@map("projects")
}

model ProjectMember {
  id        String            @id @default(uuid())
  projectId String            @map("project_id")
  userId    String            @map("user_id")
  role      ProjectMemberRole @default(SITE_ENGINEER)
  joinedAt  DateTime          @default(now()) @map("joined_at")
  createdAt DateTime          @default(now()) @map("created_at")

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
  @@map("project_members")
}

model DailyReport {
  id              String            @id @default(uuid())
  projectId       String            @map("project_id")
  createdBy       String            @map("created_by")
  reportDate      DateTime          @map("report_date") @db.Date
  weather         WeatherCondition
  temperatureMin  Int?              @map("temperature_min")
  temperatureMax  Int?              @map("temperature_max")
  workerCount     Int               @default(0) @map("worker_count")
  workDescription String            @map("work_description") @db.Text
  issues          String?           @db.Text
  progress        Decimal           @default(0.00) @db.Decimal(5, 2)
  notes           String?           @db.Text
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @default(now()) @updatedAt @map("updated_at")

  // Relations
  project Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator User           @relation("ReportCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  images  ReportImage[]
  tasks   Task[]

  @@index([projectId])
  @@index([createdBy])
  @@index([reportDate])
  @@map("daily_reports")
}

model ReportImage {
  id           String   @id @default(uuid())
  reportId     String   @map("report_id")
  fileName     String   @map("file_name") @db.VarChar(255)
  originalName String   @map("original_name") @db.VarChar(255)
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type") @db.VarChar(100)
  filePath     String   @map("file_path") @db.VarChar(500)
  displayOrder Int      @default(0) @map("display_order")
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  report DailyReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId])
  @@index([displayOrder])
  @@map("report_images")
}

model Task {
  id          String       @id @default(uuid())
  projectId   String       @map("project_id")
  title       String       @db.VarChar(200)
  description String?      @db.Text
  assignedTo  String?      @map("assigned_to")
  createdBy   String       @map("created_by")
  reportId    String?      @map("report_id")
  status      TaskStatus   @default(TO_DO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?    @map("due_date") @db.Date
  completedAt DateTime?    @map("completed_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at")

  // Relations
  project  Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?        @relation("TaskAssignee", fields: [assignedTo], references: [id], onDelete: SetNull)
  creator  User         @relation("TaskCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  report   DailyReport? @relation(fields: [reportId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([assignedTo])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
  @@index([createdBy])
  @@index([reportId])
  @@map("tasks")
}

model ProjectFile {
  id           String   @id @default(uuid())
  projectId    String   @map("project_id")
  uploadedBy   String   @map("uploaded_by")
  fileName     String   @map("file_name") @db.VarChar(255)
  originalName String   @map("original_name") @db.VarChar(255)
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type") @db.VarChar(100)
  filePath     String   @map("file_path") @db.VarChar(500)
  fileType     String   @map("file_type") @db.VarChar(50)
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploader User    @relation("FileUploader", fields: [uploadedBy], references: [id], onDelete: Restrict)

  @@index([projectId])
  @@index([uploadedBy])
  @@index([fileType])
  @@index([createdAt])
  @@map("project_files")
}

model AuditLog {
  id          String           @id @default(uuid())
  userId      String?          @map("user_id")
  action      AuditAction
  entityType  AuditEntityType  @map("entity_type")
  entityId    String?          @map("entity_id")
  description String           @db.Text
  ipAddress   String?          @map("ip_address") @db.VarChar(45)
  userAgent   String?          @map("user_agent") @db.VarChar(500)
  createdAt   DateTime         @default(now()) @map("created_at")

  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash") @db.VarChar(255)
  expiresAt DateTime @map("expires_at")
  used      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

---

## Ghi chú thiết kế

### 1. onDelete strategy

| Quan hệ | On Delete | Lý do |
|---------|-----------|-------|
| Project → Members | Cascade | Xóa project thì members mất theo |
| Project → Reports | Cascade | Xóa project thì reports mất theo |
| Project → Tasks | Cascade | Xóa project thì tasks mất theo |
| Project → Files | Cascade | Xóa project thì files mất theo |
| Report → Images | Cascade | Xóa report thì images mất theo |
| User → AuditLog | SetNull | Xóa user vẫn giữ log |
| User → Task (assigned) | SetNull | User rời project, task vẫn còn |
| User → Task (creator) | Restrict | Không xóa user nếu còn task tạo |
| User → Report (creator) | Restrict | Không xóa user nếu còn report |
| User → File (uploader) | Restrict | Không xóa user nếu còn file upload |
| Report → Task (report_id) | SetNull | Xóa report, task vẫn còn |

### 2. Soft delete
- Chỉ `users` có `deleted_at` — vì user là entity quan trọng nhất
- Các entity khác: nếu cần "xóa" thì dùng audit log để track, hoặc thêm status field
- Phase 1 chưa cần soft delete cho project/report/task

### 3. Unique constraints
- `users.email` — unique
- `projects.code` — unique
- `project_members(project_id, user_id)` — unique composite
- `daily_reports(project_id, report_date)` — **bỏ unique constraint**, dùng application-level check để linh hoạt hơn khi recreate report

### 4. Index strategy
- Index mọi foreign key column
- Index column hay filter: status, priority, role, created_at
- Index composite khi hay query together
- Không over-index — mỗi index làm chậm write

### 5. Decimal cho progress
- Dùng `DECIMAL(5,2)` — lưu được 0.00 đến 999.99
- Đủ cho phần trăm tiến độ
- Không dùng FLOAT vì precision issue

### 6. DateTime vs Date
- `DATE` cho: report_date, start_date, end_date, due_date — chỉ cần ngày
- `DATETIME/TIMESTAMP` cho: created_at, updated_at, completed_at — cần giờ phút
