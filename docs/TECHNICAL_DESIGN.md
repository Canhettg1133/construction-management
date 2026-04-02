# Technical Design — Phase 1

## 1. Repo Structure

### Quyết định: Monorepo (pnpm workspaces)

```
construction-mgmt/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── shared/              # Shared types, constants, utils
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/       # TypeScript interfaces shared FE/BE
│   │   │   ├── constants/   # Role enums, status enums, limits
│   │   │   └── utils/       # Common utils (date, validation helpers)
│   │   └── tsconfig.json
│   ├── web/                 # Frontend — React + Vite
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   └── api/                 # Backend — Express
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── src/
├── docs/                    # Tài liệu thiết kế
└── .env.example
```

### Tại sao monorepo:
- Shared types giữa FE và BE (không phải định nghĩa 2 lần)
- Single CI/CD pipeline
- Dev chạy 1 lệnh `pnpm dev` lên cả 2
- Phase 1 team nhỏ, chưa cần tách repo

---

## 2. Naming Convention

### Database (snake_case)
- Bảng: `users`, `projects`, `daily_reports`, `report_images`, `tasks`, `project_files`, `audit_logs`
- Cột: `id`, `created_at`, `updated_at`, `deleted_at`, `project_id`, `user_id`
- Khóa ngoại: `fk_{table}_{column}` — Prisma tự đặt cũng được, không cần explicit
- Index: `idx_{table}_{column}`

### Backend (camelCase)
- File: `kebab-case` — `daily-report.controller.ts`
- Class: `PascalCase` — `DailyReportService`
- Function/variable: `camelCase`
- Constant: `UPPER_SNAKE_CASE`

### Frontend (PascalCase cho component)
- Component: `PascalCase` — `DailyReportForm.tsx`
- Hook: `camelCase` prefix `use` — `useDailyReports`
- File component: `PascalCase.tsx`
- File non-component: `camelCase.ts`
- Folder: `kebab-case` — `daily-reports/`

### API
- URL: `kebab-case` — `/daily-reports`, `/project-members`
- Query param: `snake_case` — `?page_size=20&sort_by=created_at`

---

## 3. Backend Module Structure

```
packages/api/src/
├── app.ts                          # Express app setup
├── server.ts                       # Entry point
├── config/
│   ├── database.ts                 # Prisma client
│   ├── env.ts                      # Env validation (zod)
│   └── logger.ts                   # Pino logger
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT verify, attach user
│   │   ├── error.middleware.ts     # Global error handler
│   │   ├── validate.middleware.ts  # Request validation (zod)
│   │   └── audit.middleware.ts     # Auto audit log
│   ├── utils/
│   │   ├── api-response.ts         # Success/error response builders
│   │   ├── pagination.ts           # Page helper
│   │   └── upload.ts               # Multer config
│   ├── errors/
│   │   ├── app-error.ts            # Base error class
│   │   ├── not-found.error.ts
│   │   ├── forbidden.error.ts
│   │   └── validation.error.ts
│   └── types/
│       └── express.d.ts            # Extend Express Request
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   └── auth.validation.ts
│   ├── users/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── user.routes.ts
│   │   └── user.validation.ts
│   ├── projects/
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   ├── project.repository.ts
│   │   ├── project.routes.ts
│   │   └── project.validation.ts
│   ├── project-members/
│   │   ├── member.controller.ts
│   │   ├── member.service.ts
│   │   ├── member.repository.ts
│   │   ├── member.routes.ts
│   │   └── member.validation.ts
│   ├── daily-reports/
│   │   ├── report.controller.ts
│   │   ├── report.service.ts
│   │   ├── report.repository.ts
│   │   ├── report.routes.ts
│   │   └── report.validation.ts
│   ├── tasks/
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   ├── task.repository.ts
│   │   ├── task.routes.ts
│   │   └── task.validation.ts
│   ├── files/
│   │   ├── file.controller.ts
│   │   ├── file.service.ts
│   │   ├── file.repository.ts
│   │   ├── file.routes.ts
│   │   └── file.validation.ts
│   └── audit/
│       ├── audit.controller.ts
│       ├── audit.service.ts
│       ├── audit.repository.ts
│       ├── audit.routes.ts
│       └── audit.validation.ts
└── routes/
    └── index.ts                    # Mount all module routes
```

### Trách nhiệm mỗi layer:

| Layer | Làm gì | Không làm gì |
|-------|--------|--------------|
| **Controller** | Nhận request, gọi service, trả response | Không chứa business logic, không query DB trực tiếp |
| **Service** | Business logic, orchestrate, gọi repository | Không touch request/response object |
| **Repository** | Query DB qua Prisma, trả entity/DTO | Không chứa business logic |

### Ví dụ flow:
```
Request → Route → validate middleware → Controller → Service → Repository → Prisma → DB
                                                                                  ↓
Response ← error middleware ← Controller ← Service ← Repository ← Result
```

---

## 4. Frontend Structure

```
packages/web/src/
├── main.tsx
├── App.tsx
├── vite-env.d.ts
├── config/
│   └── api.ts                    # Axios instance, base URL
├── shared/
│   ├── components/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Pagination.tsx
│   │   ├── FileUpload.tsx
│   │   └── Layout/
│   │       ├── AppLayout.tsx     # Sidebar + header
│   │       └── MobileLayout.tsx  # Bottom nav
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   └── useApi.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validation.ts
│   ├── types/                    # Re-export from @construction/shared
│   └── constants/
│       ├── roles.ts
│       └── routes.ts
├── features/                     # Feature-based modules
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── components/
│   │   │   └── LoginForm.tsx
│   │   ├── hooks/
│   │   │   └── useLogin.ts
│   │   └── api/
│   │       └── authApi.ts
│   ├── dashboard/
│   │   ├── pages/
│   │   │   └── DashboardPage.tsx
│   │   ├── components/
│   │   │   ├── StatCards.tsx
│   │   │   ├── TaskChart.tsx
│   │   │   └── ReportChart.tsx
│   │   └── api/
│   │       └── dashboardApi.ts
│   ├── projects/
│   │   ├── pages/
│   │   │   ├── ProjectListPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   └── CreateProjectPage.tsx
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   └── ProjectTabs.tsx
│   │   ├── hooks/
│   │   │   └── useProjects.ts
│   │   └── api/
│   │       └── projectApi.ts
│   ├── reports/
│   │   ├── pages/
│   │   │   ├── ReportListPage.tsx
│   │   │   ├── CreateReportPage.tsx
│   │   │   └── ReportDetailPage.tsx
│   │   ├── components/
│   │   │   ├── ReportForm.tsx
│   │   │   ├── ReportCard.tsx
│   │   │   └── ImageGallery.tsx
│   │   ├── hooks/
│   │   │   └── useReports.ts
│   │   └── api/
│   │       └── reportApi.ts
│   ├── tasks/
│   │   ├── pages/
│   │   │   ├── TaskListPage.tsx
│   │   │   └── TaskDetailPage.tsx
│   │   ├── components/
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskStatusBadge.tsx
│   │   ├── hooks/
│   │   │   └── useTasks.ts
│   │   └── api/
│   │       └── taskApi.ts
│   ├── users/
│   │   ├── pages/
│   │   │   └── UserManagementPage.tsx
│   │   ├── components/
│   │   │   └── UserForm.tsx
│   │   └── api/
│   │       └── userApi.ts
│   └── audit/
│       ├── pages/
│       │   └── AuditLogPage.tsx
│       └── api/
│           └── auditApi.ts
├── store/
│   ├── authStore.ts              # Zustand: user, token, login/logout
│   └── uiStore.ts                # Zustand: sidebar, modal, toast
├── router/
│   ├── index.tsx                 # React Router config
│   ├── ProtectedRoute.tsx        # Auth guard
│   └── RoleGuard.tsx             # Role-based guard
└── assets/
```

### State management:
- **Zustand** cho global state (auth, UI)
- **React Query (TanStack Query)** cho server state (fetch, cache, invalidate)
- Không dùng Redux — quá nặng cho phase 1

---

## 5. Env Strategy

### Backend (`packages/api/.env`)
```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="mysql://root:password@localhost:3306/construction_mgmt"

# JWT
JWT_SECRET="change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="change-this-too"
JWT_REFRESH_EXPIRES_IN="30d"

# Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Email (reset password)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
APP_URL="http://localhost:5173"

# Logging
LOG_LEVEL=debug
```

### Frontend (`packages/web/.env`)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

### Rules:
- `.env` trong `.gitignore`
- `.env.example` commit lên repo (không có giá trị thật)
- Validate env ở startup — thiếu biến nào crash ngay, không chạy ngầm
- Backend: dùng `zod` validate env trong `config/env.ts`
- Frontend: Vite chỉ expose biến prefix `VITE_`

---

## 6. API Response Format

### Success response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng"
      }
    ]
  }
}
```

### Error codes
| Code | HTTP Status | Ý nghĩa |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Sai input |
| `UNAUTHORIZED` | 401 | Chưa đăng nhập / token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `CONFLICT` | 409 | Trùng dữ liệu (email, mã dự án) |
| `RATE_LIMITED` | 429 | Quá số lần thử |
| `INTERNAL_ERROR` | 500 | Lỗi server |

### Pagination query params
```
GET /api/v1/projects?page=1&page_size=20&sort_by=created_at&sort_order=desc
```

### List response có pagination
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Single resource response
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 7. Validation Rules

### Công cụ: Zod (cả FE và BE)

### Backend validation flow:
```typescript
// validation schema
const createReportSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    date: z.coerce.date(),
    weather: z.enum(['sunny', 'rainy', 'cloudy', 'other']),
    workerCount: z.number().int().min(0),
    workDescription: z.string().min(1).max(5000),
    progress: z.number().min(0).max(100),
    // optional fields...
  }),
});

// route
router.post('/', validate(createReportSchema), reportController.create);
```

### Frontend validation:
- Dùng React Hook Form + Zod resolver
- Schema có thể import từ `@construction/shared` nếu giống BE
- Validate trước khi gọi API — BE validate lại lần nữa (không tin FE)

### Common validation rules:
| Field | Rule |
|-------|------|
| Email | Valid format, unique |
| Password | Min 8 chars, có chữ hoa, chữ thường, số |
| Phone | Optional, valid Vietnam phone format |
| Date | Valid date, không tương lai (trừ deadline task) |
| Progress | 0-100, integer |
| Text (short) | Max 200 chars |
| Text (long/textarea) | Max 5000 chars |
| File upload | Max 10MB/file, allowed types: jpg, png, pdf, xlsx, docx |
| Images | Max 5MB/ảnh, chỉ jpg/png, tối đa 10 ảnh/report |

---

## 8. Migration Rule

### Công cụ: Prisma Migrate

### Rules:
- **Mọi thay đổi DB phải qua migration** — không sửa DB bằng tay
- Migration đặt tên có nghĩa: `001_create_users`, `002_add_project_status`
- Chạy `npx prisma migrate dev` ở local
- CI chạy `npx prisma migrate deploy` ở production
- Không force reset migration trên production
- `prisma/schema.prisma` là source of truth cho DB structure
- Sau khi sửa schema → tạo migration → commit cả 2 file

### Migration workflow:
```bash
# 1. Sửa prisma/schema.prisma
# 2. Tạo migration
npx prisma migrate dev --name add_task_priority

# 3. Review file migration SQL được sinh ra
# 4. Commit schema.prisma + migration file
# 5. Ở production
npx prisma migrate deploy
```

### Seed data:
- `prisma/seed.ts` — tạo admin user mặc định, sample data dev
- Chạy: `npx prisma db seed`

---

## 9. Logging Rule

### Công cụ: Pino (structured JSON log)

### Log levels:
| Level | Khi nào dùng |
|-------|--------------|
| `error` | Lỗi hệ thống, unhandled exception, DB connection fail |
| `warn` | Validation fail, rate limit, deprecated API |
| `info` | Request quan trọng (login, create project, payment) |
| `debug` | Chi tiết request/response (chỉ dev) |

### Log format (JSON):
```json
{
  "level": "info",
  "time": "2026-03-31T10:00:00.000Z",
  "reqId": "abc-123",
  "method": "POST",
  "url": "/api/v1/daily-reports",
  "userId": "user-uuid",
  "statusCode": 201,
  "responseTime": 45,
  "msg": "Daily report created"
}
```

### Rules:
- Không log password, token, PII nhạy cảm
- Mỗi request có `reqId` để trace
- Dev: log ra console với màu
- Production: JSON log, gom vào file hoặc ELK/Loki
- Error log phải có stack trace

---

## 10. Audit Log Rule

### Bảng: `audit_logs`
```
id              UUID PK
user_id         UUID FK -> users (nullable cho system action)
action          ENUM: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, STATUS_CHANGE
entity_type     ENUM: USER, PROJECT, PROJECT_MEMBER, DAILY_REPORT, TASK, FILE
entity_id       UUID (ID của bản ghi bị tác động)
description     TEXT (mô tả ngắn: "Tạo báo cáo ngày 2026-03-31")
ip_address      VARCHAR(45)
user_agent      VARCHAR(500)
created_at      TIMESTAMP
```

### Rules:
- Audit log **chỉ INSERT**, không UPDATE, không DELETE
- Ghi log cho mọi action CREATE, UPDATE, DELETE trên entity quan trọng
- Ghi log LOGIN, LOGOUT
- Không ghi log cho: xem danh sách, xem chi tiết, download file (có thể thêm sau)
- Service gọi `auditService.log()` sau khi action thành công
- Không dùng transaction cho audit log — nếu audit fail vẫn không rollback action chính (log riêng, best-effort)
- Admin xem toàn bộ, PM chỉ xem log của dự án được giao

### Auto audit middleware (optional):
```typescript
// Có thể wrap controller để auto log
router.post('/', 
  validate(schema),
  auditAction({ action: 'CREATE', entityType: 'DAILY_REPORT' }),
  reportController.create
);
```

---

## 11. Error Handling

### Backend error classes:
```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Specific errors
class NotFoundError extends AppError { ... }     // 404
class ForbiddenError extends AppError { ... }     // 403
class ValidationError extends AppError { ... }    // 400
class ConflictError extends AppError { ... }      // 409
class UnauthorizedError extends AppError { ... }  // 401
```

### Global error middleware:
```typescript
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unhandled error
  logger.error(err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Đã có lỗi xảy ra',
    },
  });
});
```

### Frontend error handling:
- Axios interceptor bắt 401 → logout + redirect login
- 403 → hiển thị "Không có quyền"
- 404 → hiển thị "Không tìm thấy"
- 4xx → hiển thị error message từ BE
- 5xx → hiển thị "Lỗi hệ thống, thử lại sau"
- Dùng toast notification cho error ngắn

---

## 12. Authentication Flow

### JWT Strategy:
- Access token: 7 ngày (httpOnly cookie)
- Refresh token: 30 ngày (httpOnly cookie, separate)
- Token lưu trong httpOnly cookie — không localStorage (chống XSS)
- CSRF protection: SameSite=Strict cookie + CSRF token cho mutation

### Flow:
```
Login → BE verify → set access_token + refresh_token cookie → return user info
Request → BE verify access_token from cookie → attach req.user
Access token hết hạn → FE gọi /auth/refresh → BE cấp token mới
Refresh token hết hạn → FE redirect /login
Logout → BE clear cả 2 cookie
```

### Password:
- Hash: bcrypt, salt rounds 12
- Không bao giờ lưu plain text
- Reset password: token ngẫu nhiên, hết hạn 1 giờ, 1 lần dùng

---

## 13. File Upload

### Dev: Local storage
```
packages/api/uploads/
├── projects/{projectId}/
│   ├── reports/{reportId}/
│   │   ├── image1.jpg
│   │   └── image2.png
│   └── files/
│       └── document.pdf
```

### Production (sau): S3-compatible
- Abstract upload service interface
- Dev: `LocalUploadService`
- Prod: `S3UploadService`
- Switch qua env variable `STORAGE_PROVIDER=local|s3`

### Rules:
- Multer xử lý multipart
- Validate file type + size trước khi lưu
- Rename file: `{uuid}.{ext}` — tránh trùng tên
- Lưu metadata vào DB (bảng `project_files` hoặc `report_images`)
- Serve file qua route có auth check — không public trực tiếp

---

## 14. CORS & Security

### CORS:
- Dev: `http://localhost:5173`
- Prod: domain thật
- Chỉ cho phép origin cụ thể, không `*`

### Security headers (helmet):
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Content-Security-Policy (config sau)

### Rate limiting:
- Login: 5 lần/phút/IP
- API chung: 100 lần/phút/IP
- Upload: 10 lần/phút/IP

---

## 15. TypeScript Config

### Shared tsconfig base:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Backend: `module: "CommonJS"` (Express)
### Frontend: `module: "ESNext"` (Vite)

---

## 16. Dev Commands

```bash
# Install
pnpm install

# Dev (chạy cả FE + BE)
pnpm dev

# Backend only
pnpm dev:api

# Frontend only
pnpm dev:web

# DB
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # prisma db seed
pnpm db:studio      # prisma studio

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck
```

---

## 17. Nguyên tắc bắt buộc (recap)

1. **Controller** chỉ nhận request → gọi service → trả response
2. **Service** xử lý nghiệp vụ, không touch request/response
3. **Repository** query DB qua Prisma, không chứa business logic
4. **Validation** ở cả frontend và backend — không tin FE
5. **Mọi thay đổi DB** qua Prisma migration — không sửa DB bằng tay
6. **Bảng quan trọng** có `created_at`, `updated_at`, audit log
7. **Error handling** thống nhất — AppError + global middleware
8. **Logging** structured JSON, không log sensitive data
9. **Auth** httpOnly cookie, không localStorage
10. **Audit log** chỉ INSERT, không UPDATE/DELETE
