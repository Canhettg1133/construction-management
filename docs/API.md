# API

Base URL local:

```text
http://localhost:3001/api/v1
```

## Response Shape

Success:

```json
{
  "success": true,
  "data": {}
}
```

Success co phan trang:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## Auth Flow

Login:
- `POST /auth/login`
- set cookie `access_token`
- set cookie `refresh_token`

Session restore:
- `GET /auth/me`
- tra user hien tai neu cookie hop le

Refresh:
- `POST /auth/refresh`
- dung `refresh_token` cookie de cap lai `access_token`

Logout:
- `POST /auth/logout`
- xoa `access_token` va `refresh_token`

JWT access token contract:
- claim duoc support: `id`, `email`, `systemRole`
- khong con dung claim `role` legacy

## Cookie Behavior

- `access_token`: `httpOnly`, path `/`
- `refresh_token`: `httpOnly`, path `/api/v1/auth/refresh`
- local dev dung `sameSite: strict`
- frontend phai request voi credentials

## Main Route Groups

Public:
- `GET /health`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`

System-level protected:
- `/auth/me`
- `/auth/logout`
- `/auth/change-password`
- `/users`
- `/audit-logs`
- `/dashboard`
- `/notifications`

Project-scoped protected:
- `/projects`
- `/projects/:projectId/members`
- `/projects/:projectId/reports`
- `/projects/:projectId/tasks`
- `/projects/:projectId/files`
- `/projects/:projectId/documents`
- `/projects/:projectId/safety`
- `/projects/:projectId/quality`
- `/projects/:projectId/warehouse`
- `/projects/:projectId/budget`
- `/projects/:projectId/settings`

Other protected:
- `/documents`
- `/permissions`
- `/approvals`

## Authorization Model

System-level:
- middleware `authorize(...)` check `req.user.systemRole`

Project-level:
- `requireProjectMembership`
- `loadUserPermissions`
- `requireToolPermission(toolId, level)`

Quyen project duoc tinh tu:
- `systemRole`
- `projectRole`
- `project_tool_permissions`
- `special_privilege_assignments`

## Status Code Conventions

- `200`: doc/thao tac thanh cong
- `201`: tao moi thanh cong
- `204`: xoa thanh cong, khong body
- `400`: validation hoac input khong hop le
- `401`: chua dang nhap / token khong hop le
- `403`: khong du quyen
- `404`: resource khong ton tai
- `500`: loi noi bo; local dev thuong do API boot fail hoac DB khong reachable
