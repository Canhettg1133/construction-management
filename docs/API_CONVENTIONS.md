# API Conventions — Phase 1

## 1. Base URL & Versioning

```
Development: http://localhost:3001/api/v1
Production:  https://api.yourdomain.com/api/v1
```

### Versioning strategy
- URL versioning: `/api/v1/...`
- Phase 1 chỉ có v1
- Khi có breaking change → tăng lên v2, giữ v1 cho client cũ
- Non-breaking change (thêm field) → không tăng version

---

## 2. HTTP Method Convention

| Method | Ý nghĩa | Idempotent | Body |
|--------|---------|------------|------|
| GET | Đọc dữ liệu | ✅ | Không |
| POST | Tạo mới | ❌ | Có |
| PUT | Thay thế toàn bộ | ✅ | Có |
| PATCH | Cập nhật một phần | ✅ | Có |
| DELETE | Xóa | ✅ | Không (dùng query param nếu cần) |

### Rules:
- Không dùng GET cho mutation
- PUT = thay thế toàn bộ resource (gửi đủ fields)
- PATCH = cập nhật một phần (chỉ gửi fields cần đổi)
- DELETE trả về 204 No Content hoặc 200 với `{ success: true }`

---

## 3. Response Format

### Success — Single resource (200/201)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dự án A",
    "code": "PRJ-001",
    "status": "ACTIVE",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  }
}
```

### Success — List with pagination (200)
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "Dự án A" },
    { "id": "...", "name": "Dự án B" }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Success — No content (204)
```
HTTP 204 No Content
(Empty body)
```

### Error (4xx/5xx)
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
      },
      {
        "field": "password",
        "message": "Mật khẩu phải có ít nhất 8 ký tự"
      }
    ]
  }
}
```

### Error — Simple (không có details)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy dự án"
  }
}
```

---

## 4. HTTP Status Codes

| Code | Khi nào dùng |
|------|--------------|
| 200 | GET/PATCH thành công |
| 201 | POST tạo mới thành công |
| 204 | DELETE thành công |
| 400 | Validation lỗi, input sai |
| 401 | Chưa đăng nhập, token hết hạn/sai |
| 403 | Đã đăng nhập nhưng không có quyền |
| 404 | Resource không tồn tại |
| 409 | Trùng dữ liệu (email, mã dự án) |
| 422 | Semantic validation lỗi (logic nghiệp vụ) |
| 429 | Rate limit exceeded |
| 500 | Lỗi server không mong đợi |

### Phân biệt 400 vs 422:
- **400**: Syntax error — JSON invalid, thiếu required field, sai type
- **422**: Semantic error — đủ field nhưng giá trị không hợp lệ nghiệp vụ (ví dụ: ngày kết thúc < ngày bắt đầu)

> **Thực tế phase 1:** Dùng 400 cho cả validation lỗi cho đơn giản. Phân biệt 400/422 khi cần chi tiết hơn.

---

## 5. Query Parameters Convention

### Pagination
```
GET /api/v1/projects?page=1&page_size=20
```
- `page`: số trang (mặc định: 1)
- `page_size`: số item/trang (mặc định: 20, max: 100)

### Sorting
```
GET /api/v1/tasks?sort_by=due_date&sort_order=asc
```
- `sort_by`: column name (snake_case)
- `sort_order`: `asc` hoặc `desc` (mặc định: `desc` cho created_at)

### Filtering
```
GET /api/v1/tasks?status=IN_PROGRESS&priority=HIGH&assigned_to=uuid
```
- Filter bằng query param, snake_case
- Multiple values: comma-separated `?status=TO_DO,IN_PROGRESS`

### Date range
```
GET /api/v1/reports?from=2026-03-01&to=2026-03-31
```
- Format: `YYYY-MM-DD`

### Search
```
GET /api/v1/projects?q=nhà+máy
```
- `q`: fulltext search đơn giản (LIKE %query%)

### Combined example
```
GET /api/v1/tasks?status=IN_PROGRESS&sort_by=due_date&sort_order=asc&page=1&page_size=10
```

---

## 6. Authentication

### Headers
```
Cookie: access_token=eyJhbGciOiJIUzI1NiIs...
```

### Token flow
```
1. POST /api/v1/auth/login
   → Set-Cookie: access_token=...; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800
   → Set-Cookie: refresh_token=...; HttpOnly; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=2592000
   → Body: { success: true, data: { user: {...} } }

2. Mọi request sau đó tự động gửi cookie

3. Access token hết hạn (7 ngày):
   POST /api/v1/auth/refresh
   → Cấp access_token mới
   → Body: { success: true }

4. Refresh token hết hạn (30 ngày):
   → 401 Unauthorized
   → FE redirect /login

5. POST /api/v1/auth/logout
   → Clear cả 2 cookie
   → Body: { success: true }
```

### Cookie attributes
| Attribute | Value | Lý do |
|-----------|-------|-------|
| HttpOnly | true | JavaScript không đọc được (chống XSS) |
| SameSite | Strict | Chống CSRF |
| Secure | true (production) | Chỉ gửi qua HTTPS |
| Path | `/` (access), `/api/v1/auth/refresh` (refresh) | Giới hạn scope |

### Protected route middleware flow
```typescript
// 1. Extract token từ cookie
// 2. Verify JWT
// 3. Query user từ DB (check isActive, deletedAt)
// 4. Attach req.user = { id, email, role }
// 5. Next()
```

---

## 7. Authorization

### Role check middleware
```typescript
// Usage trong route
router.post('/', 
  authenticate,                    // Phải đăng nhập
  authorize('ADMIN', 'PM'),       // Chỉ ADMIN hoặc PM
  validate(createSchema),
  controller.create
);
```

### Project-level authorization
```typescript
// Service layer check
// 1. Admin → access mọi project
// 2. Non-admin → check project_members table
// 3. Không có trong project → 403
```

### Response khi không có quyền
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền thực hiện hành động này"
  }
}
```

---

## 8. API Endpoints Summary

### Auth
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/auth/login` | Public | `{ email, password }` | User info + set cookies |
| POST | `/auth/logout` | Required | — | Clear cookies |
| POST | `/auth/refresh` | Refresh token | — | New access token |
| POST | `/auth/forgot-password` | Public | `{ email }` | 200 (luôn, không tiết lộ email tồn tại) |
| POST | `/auth/reset-password` | Public | `{ token, newPassword }` | 200 |

### Users (Admin only)
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/users` | Admin | Query: page, page_size, role, q | List users |
| POST | `/users` | Admin | `{ name, email, password, role, phone }` | Created user |
| GET | `/users/:id` | Admin | — | User detail |
| PATCH | `/users/:id` | Admin | `{ name, role, phone }` | Updated user |
| PATCH | `/users/:id/status` | Admin | `{ isActive: boolean }` | Updated status |
| POST | `/users/:id/reset-password` | Admin | — | 200 |

### Projects
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/projects` | Required | Query: page, page_size, status, q | List projects |
| POST | `/projects` | Admin | Project fields | Created project |
| GET | `/projects/:id` | Member | — | Project detail |
| PATCH | `/projects/:id` | Admin, PM | Project fields | Updated project |

### Project Members
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/projects/:id/members` | Member | — | List members |
| POST | `/projects/:id/members` | Admin, PM | `{ userId, role }` | Created membership |
| PATCH | `/projects/:id/members/:memberId` | Admin, PM | `{ role }` | Updated role |
| DELETE | `/projects/:id/members/:memberId` | Admin, PM | — | 204 |

### Daily Reports
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/projects/:id/reports` | Member | Query: page, from, to, created_by | List reports |
| POST | `/projects/:id/reports` | PM, SE | Report fields | Created report |
| GET | `/projects/:id/reports/:reportId` | Member | — | Report detail + images |
| PATCH | `/projects/:id/reports/:reportId` | Creator(7d), PM | Report fields | Updated report |
| DELETE | `/projects/:id/reports/:reportId` | Admin, PM | — | 204 |

### Report Images
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/projects/:id/reports/:reportId/images` | PM, SE | Multipart: images[] | Uploaded images |
| DELETE | `/reports/:reportId/images/:imageId` | Admin, PM | — | 204 |

### Tasks
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/projects/:id/tasks` | Member | Query: page, status, priority, assigned_to | List tasks |
| POST | `/projects/:id/tasks` | PM, SE | Task fields | Created task |
| GET | `/projects/:id/tasks/:taskId` | Member | — | Task detail |
| PATCH | `/projects/:id/tasks/:taskId` | Creator, PM | Task fields | Updated task |
| PATCH | `/projects/:id/tasks/:taskId/status` | Assignee, PM | `{ status }` | Updated status |
| DELETE | `/projects/:id/tasks/:taskId` | Admin, PM | — | 204 |

### Files
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/projects/:id/files` | Member | Query: page, file_type | List files |
| POST | `/projects/:id/files/upload` | PM, SE | Multipart: file | Uploaded file |
| GET | `/projects/:id/files/:fileId/download` | Member | — | File stream |
| DELETE | `/projects/:id/files/:fileId` | Admin, PM | — | 204 |

### Dashboard
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/dashboard` | Required | — | Dashboard stats |
| GET | `/dashboard/projects/:id` | Member | — | Project dashboard |

### Audit Logs
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/audit-logs` | Admin | Query: page, action, entity_type, user_id, from, to | List logs |
| GET | `/projects/:id/audit-logs` | PM | Query: page, action, entity_type | Project logs |

---

## 9. Validation Schemas (Zod Examples)

### Login
```typescript
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
  }),
});
```

### Create User
```typescript
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().toLowerCase(),
    password: z.string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Phải có ít nhất 1 số'),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'VIEWER']),
    phone: z.string().max(20).optional(),
  }),
});
```

### Create Project
```typescript
const createProjectSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/, 'Mã dự án chỉ chứa chữ, số và dấu gạch ngang'),
    name: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    location: z.string().min(1).max(500),
    clientName: z.string().max(200).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
  }).refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['endDate'] }
  ),
});
```

### Create Daily Report
```typescript
const createReportSchema = z.object({
  body: z.object({
    reportDate: z.coerce.date(),
    weather: z.enum(['SUNNY', 'RAINY', 'CLOUDY', 'OTHER']),
    temperatureMin: z.number().int().optional(),
    temperatureMax: z.number().int().optional(),
    workerCount: z.number().int().min(0),
    workDescription: z.string().min(1).max(5000),
    issues: z.string().max(5000).optional(),
    progress: z.number().min(0).max(100),
    notes: z.string().max(5000).optional(),
  }).refine(
    (data) => data.temperatureMin === undefined || data.temperatureMax === undefined || data.temperatureMin <= data.temperatureMax,
    { message: 'Nhiệt độ thấp nhất phải <= nhiệt độ cao nhất', path: ['temperatureMax'] }
  ),
});
```

### Create Task
```typescript
const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    assignedTo: z.string().uuid().optional(),
    reportId: z.string().uuid().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    dueDate: z.coerce.date().optional(),
  }),
});
```

---

## 10. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 requests | 1 phút / IP |
| `/auth/forgot-password` | 3 requests | 1 giờ / IP |
| `/auth/reset-password` | 3 requests | 1 giờ / IP |
| File upload | 10 requests | 1 phút / IP |
| API chung | 100 requests | 1 phút / IP |

### Rate limit response (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Quá số lần thử, vui lòng thử lại sau"
  }
}
```

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711872000
Retry-After: 60
```

---

## 11. CORS Configuration

```typescript
cors({
  origin: process.env.FRONTEND_URL, // http://localhost:5173
  credentials: true, // Cho phép gửi cookie
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

### Preflight (OPTIONS)
- Trả về 204 No Content
- Cache 24h: `Access-Control-Max-Age: 86400`

---

## 12. File Upload API

### Upload report images
```
POST /api/v1/projects/:id/reports/:reportId/images
Content-Type: multipart/form-data

Form data:
  images[]: File (max 10 files, each max 5MB, jpg/png only)
```

### Upload project files
```
POST /api/v1/projects/:id/files/upload
Content-Type: multipart/form-data

Form data:
  file: File (max 10MB, allowed: jpg, png, pdf, xlsx, docx)
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileName": "a1b2c3d4.jpg",
    "originalName": "anh-cong-trinh.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg",
    "createdAt": "2026-03-31T10:00:00.000Z"
  }
}
```

---

## 13. Error Handling Examples

### 404 — Resource not found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy dự án"
  }
}
```

### 409 — Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Mã dự án đã tồn tại",
    "details": [
      { "field": "code", "message": "Mã PRJ-001 đã được sử dụng" }
    ]
  }
}
```

### 422 — Business logic error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Không thể sửa báo cáo đã quá 7 ngày"
  }
}
```

### 500 — Internal error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Đã có lỗi xảy ra"
  }
}
```

> **Lưu ý:** Không bao giờ lộ chi tiết lỗi internal ra client — log ở server, trả message chung cho client

---

## 14. TypeScript Types (Shared)

```typescript
// packages/shared/src/types/api.ts

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

// Query params
export interface PaginationQuery {
  page?: number;
  page_size?: number;
}

export interface SortQuery {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
```

---

## 15. Frontend API Client

```typescript
// packages/web/src/config/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Gửi cookie tự động
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Thêm request ID cho tracing
  config.headers['X-Request-ID'] = crypto.randomUUID();
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn → thử refresh
      // Nếu refresh fail → logout
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Usage với React Query
```typescript
// packages/web/src/features/reports/api/reportApi.ts

import api from '@/config/api';
import type { DailyReport, PaginatedResponse } from '@construction/shared';

export const reportApi = {
  getList: (projectId: string, params: PaginationQuery) =>
    api.get<PaginatedResponse<DailyReport>>(`/projects/${projectId}/reports`, { params }),

  getById: (projectId: string, reportId: string) =>
    api.get<{ data: DailyReport }>(`/projects/${projectId}/reports/${reportId}`),

  create: (projectId: string, data: CreateReportInput) =>
    api.post<{ data: DailyReport }>(`/projects/${projectId}/reports`, data),

  update: (projectId: string, reportId: string, data: UpdateReportInput) =>
    api.patch<{ data: DailyReport }>(`/projects/${projectId}/reports/${reportId}`, data),

  delete: (projectId: string, reportId: string) =>
    api.delete(`/projects/${projectId}/reports/${reportId}`),
};
```
