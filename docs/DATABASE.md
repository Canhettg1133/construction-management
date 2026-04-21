# Database

Source of truth:
- `packages/api/prisma/schema.prisma`
- `packages/api/prisma/migrations/`

Repo nay dung MySQL + Prisma. Local dev duoc phep reset DB de dong bo migration history moi.

## Connection

Root `.env` la nguon cau hinh chinh.

Vi du local:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/construction_mgmt"
```

## Main Commands

```bash
pnpm db:migrate
pnpm db:migrate:dev
pnpm db:seed
pnpm db:studio
pnpm setup:dev
```

Neu can lam sach local DB sau khi doi migration history:

1. Drop database `construction_mgmt`
2. Tao lai database rong
3. Chay `pnpm setup:dev`

## Core Enums

Identity va RBAC:
- `SystemRole`: `ADMIN`, `STAFF`
- `ProjectRole`: `PROJECT_MANAGER`, `ENGINEER`, `SAFETY_OFFICER`, `DESIGN_ENGINEER`, `QUALITY_MANAGER`, `WAREHOUSE_KEEPER`, `CLIENT`, `VIEWER`
- `ToolId`: `PROJECT`, `TASK`, `DAILY_REPORT`, `FILE`, `DOCUMENT`, `SAFETY`, `QUALITY`, `WAREHOUSE`, `BUDGET`
- `PermissionLevel`: `NONE`, `READ`, `STANDARD`, `ADMIN`
- `SpecialPrivilege`: `SAFETY_SIGNER`, `QUALITY_SIGNER`, `BUDGET_APPROVER`

Business state:
- `ProjectStatus`
- `TaskStatus`
- `TaskPriority`
- `WeatherCondition`
- `ReportStatus`
- `ApprovalStatus`
- `NotificationType`

## Table Groups

Identity va access:
- `users`
- `password_reset_tokens`
- `project_members`
- `project_tool_permissions`
- `special_privilege_assignments`

Project core:
- `projects`
- `daily_reports`
- `report_images`
- `tasks`
- `task_comments`
- `project_files`
- `document_folders`

Audit va notifications:
- `audit_logs`
- `notifications`

Safety:
- `safety_reports`
- `safety_checklist_items`
- `safety_incidents`
- `safety_near_misses`
- `safety_corrective_actions`

Quality:
- `quality_reports`
- `quality_punch_list_items`
- `quality_report_photos`

Warehouse va budget:
- `warehouse_inventory`
- `warehouse_transactions`
- `budget_items`
- `budget_disbursements`

## Migration Policy

- Migration name phai phan anh dung noi dung schema thay doi.
- Khong giu migration accidental hoac ten sai nghia.
- Data fix migration phai tach rieng khoi business schema migration.
- Sau cleanup nay, migration `verify_env_wrapper` da duoc loai bo va thay bang migration co ten dung ngữ nghia.
- `pnpm db:migrate` dung `prisma migrate deploy` de apply history on dinh cho local setup.
- `pnpm db:migrate:dev` moi la lenh dung de tao migration moi trong qua trinh phat trien schema.

## Seed

Seed file:
- `packages/api/prisma/seed.ts`

Tai khoan mac dinh:
- Email: `admin@construction.local`
- Password: `Admin@123`
