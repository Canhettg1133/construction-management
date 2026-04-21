# Construction Management System

Monorepo quan ly cong trinh xay dung gom:
- `packages/web`: frontend React + Vite
- `packages/api`: backend Express + Prisma
- `packages/shared`: shared types, constants, utils

Tai lieu chinh:
- `README.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`

## Overview

He thong hien co cac nhom chuc nang:
- Auth, user profile, password reset
- User management va audit logs
- Project, member, permission matrix, special privileges
- Daily reports, tasks, files, documents
- Dashboard, notifications, approvals
- Safety, quality, warehouse, budget

`equipment/workforce` da duoc go khoi branch nay vi slice chua hoan thien va khong nam trong feature surface dang support.

## Local Setup

Yeu cau:
- Node.js `>=20`
- pnpm `>=9`
- MySQL 8 dang chay

`.env` o root repo la source of truth cho local runtime va Prisma commands.

1. Cai dependency

```bash
pnpm install
```

2. Tao file env

```bash
cp .env.example .env
```

Gia tri local khuyen dung tren Windows:

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/construction_mgmt"
```

3. Tao database

```sql
CREATE DATABASE construction_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Setup local dev

```bash
pnpm setup:dev
```

Lenh nay se:
- build `@construction/shared`
- chay Prisma migrate
- seed tai khoan mac dinh

5. Chay ung dung

```bash
pnpm dev
```

Hoac chay rieng:

```bash
pnpm dev:api
pnpm dev:web
```

Local URLs:
- Web: `http://localhost:5173`
- API: `http://localhost:3001/api/v1`

Seed account:
- Email: `admin@construction.local`
- Password: `Admin@123`

## Daily Commands

```bash
pnpm setup:dev
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm db:migrate
pnpm db:migrate:dev
pnpm db:seed
pnpm db:studio
pnpm typecheck
pnpm test
pnpm build
```

## Common Failures

`POST /api/v1/auth/login` hoac `GET /api/v1/auth/me` tren `localhost:5173` tra `500`:
- Thuong la Vite proxy khong noi duoc API.
- Kiem tra `pnpm dev:api` co boot thanh cong khong.
- Neu API log `P1001`, MySQL chua reach duoc.

API boot fail voi `P1012`:
- `DATABASE_URL` sai format.
- Chuoi bat buoc phai bat dau bang `mysql://`.

API boot fail voi `P1001`:
- MySQL chua chay hoac sai host/port.
- Thu `127.0.0.1` thay cho `localhost` trong `.env`.
- Sau khi DB san sang, chay lai `pnpm setup:dev`.

`pnpm db:migrate` va `pnpm db:migrate:dev` khac nhau:
- `pnpm db:migrate`: apply cac migration da commit, dung cho setup local/onboarding
- `pnpm db:migrate:dev`: dung khi chinh schema va can tao migration moi

`GET /auth/me` tra `401`:
- Neu chua login thi day la binh thuong.
- Neu da login ma van `401`, xoa cookie `access_token`, `refresh_token`, clear session hint trong localStorage, roi login lai.

## Verification

Trang thai repo sau cleanup nay duoc ky vong pass:
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
