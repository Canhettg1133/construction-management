# Architecture

## Repo Layout

```text
packages/
  api/
    prisma/
    src/modules/
    src/shared/
  web/
    src/features/
    src/shared/
    src/store/
  shared/
    src/types/
    src/constants/
```

Nguyen tac:
- `packages/shared` chua shared contract
- `packages/api` chua backend vertical modules
- `packages/web` chua feature UI va state client

## Backend Boundaries

Moi module backend thuong co:
- `*.routes.ts`
- `*.controller.ts`
- `*.service.ts`
- `*.repository.ts` neu can truy cap DB
- `*.validation.ts` neu co request schema

`src/shared/` chi chua:
- middleware dung chung
- error handling
- utility response/pagination
- infra-level services

Slice nao chua hoan thien khong duoc de o trang thai compile-fail. Trong cleanup nay `equipment/workforce` da bi go bo hoan toan theo nguyen tac do.

## Permission Model

2 tang quyen:
- Company-level: `SystemRole`
- Project-level: `ProjectRole` + tool overrides + special privileges

Permission resolution:
1. `authenticate` doc JWT va gan `req.user`
2. `requireProjectMembership` kiem tra user co thuoc project khong
3. `loadUserPermissions` tinh effective permissions
4. `requireToolPermission` enforce tung endpoint

JWT chi giu claim toi thieu:
- `id`
- `email`
- `systemRole`

Project role khong nam trong JWT.

## Frontend / Backend Data Flow

1. Web login qua `/auth/login`
2. API set cookie session
3. Web bootstrap session qua `/auth/me` khi co session hint
4. Feature pages goi API qua Axios client
5. API response theo `success/data/meta`
6. FE store user trong `authStore`, permission du an load theo nhu cau

## Local Runtime Notes

- Root `.env` la source of truth
- `pnpm setup:dev` la entrypoint setup
- `pnpm dev`, `pnpm dev:api`, `pnpm dev:web` la entrypoint chay
- Neu API khong boot, Vite proxy se tra `500` cho `/api/*`

## Adding A New Vertical Slice

Chi them slice moi khi du 4 dieu kien:
1. Prisma schema va migration dat ten dung nghia
2. Route/controller/service build pass
3. Shared type va permission surface da ro rang
4. Docs duoc cap nhat trong 4 file source-of-truth

Khong merge:
- module mo coi khong mount route
- schema da them nhung code chua co
- migration accidental hoac ten khong lien quan noi dung
