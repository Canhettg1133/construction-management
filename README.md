# Construction Management System — Phase 1

Hệ thống quản lý công trình xây dựng. Phase 1 tập trung vào: quản lý dự án, báo cáo ngày (daily reports), task, file, và dashboard.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | Khuyên dùng Node 22 |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| MySQL | 8.0 | Hoặc dùng Docker |
| Docker + Docker Compose | Latest | Tùy chọn |

## Quick Start (Local — không Docker)

### 1. Clone & install

```bash
pnpm install
```

### 2. Setup environment

```bash
# Copy và điền thông tin thật
cp .env.example packages/api/.env

# MySQL: tạo database
mysql -u root -p -e "CREATE DATABASE construction_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. Database setup

```bash
pnpm db:migrate
pnpm db:seed
```

Admin mặc định: `admin@construction.local` / `Admin@123`

### 4. Dev server

```bash
pnpm dev
```

- **Web:** http://localhost:5173
- **API:** http://localhost:3001

## Docker Development

### 1. Clone & install

```bash
pnpm install
```

### 2. Start infrastructure (MySQL)

```bash
docker compose up -d mysql
```

### 3. Setup DB

```bash
# Chạy migration
docker compose run --rm api pnpm db:migrate

# Seed data
docker compose run --rm api pnpm db:seed
```

### 4. Start services

```bash
# Dev mode (hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production mode
docker compose up -d
```

### 5. Smoke test

```bash
# macOS/Linux
pnpm smoke-test

# Windows
pnpm smoke-test:win
```

## Scripts

```bash
# Development
pnpm dev              # Build shared → chạy cả api + web
pnpm dev:api          # Chỉ API
pnpm dev:web          # Chỉ Web

# Code quality
pnpm lint             # ESLint toàn workspace
pnpm format           # Format tất cả file (Prettier)
pnpm format:check     # Check format (không sửa)
pnpm typecheck        # TypeScript check toàn workspace

# Build
pnpm build            # Build tất cả packages

# Database
pnpm db:migrate       # Tạo migration
pnpm db:seed          # Seed data
pnpm db:studio        # Mở Prisma Studio

# Verification
pnpm smoke-test       # Smoke test skeleton E2E
pnpm verify:quality    # lint + typecheck + test + build
pnpm verify:security   # Security baseline check
pnpm verify:audit      # Audit log coverage check
pnpm verify:migrations # Migration files check

# Tests
pnpm test             # Chạy test tất cả packages
```

## Project Structure

```
construction-mgmt/
├── packages/
│   ├── shared/          # Shared types, constants, utils (built trước)
│   │   ├── src/
│   │   │   ├── types/      # TypeScript interfaces
│   │   │   ├── constants/   # Enums, labels
│   │   │   └── utils/       # Date, cn helpers
│   │   └── dist/            # Build output
│   │
│   ├── api/             # Backend — Express + Prisma
│   │   ├── src/
│   │   │   ├── config/      # env, logger, database
│   │   │   ├── modules/      # Feature modules (auth, projects, reports...)
│   │   │   ├── routes/      # Route mounting
│   │   │   ├── security/     # Auth middleware, JWT
│   │   │   ├── shared/       # Middleware, errors, utils
│   │   │   ├── app.ts        # Express app
│   │   │   └── server.ts     # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── Dockerfile
│   │
│   └── web/              # Frontend — React + Vite
│       ├── src/
│       │   ├── config/      # Axios, API config
│       │   ├── features/     # Feature-based pages/components
│       │   ├── shared/       # Reusable components, hooks, utils
│       │   ├── store/        # Zustand stores
│       │   └── router/       # React Router config
│       └── Dockerfile
│
├── docs/                  # Thiết kế, quy trình, checklist
├── scripts/               # Automation scripts
├── docker-compose.yml      # MySQL + API (production mode)
├── docker-compose.dev.yml  # Dev overlay (hot-reload)
└── .env.example
```

## API Base URL

```
Development: http://localhost:3001/api/v1
Production:  https://api.yourdomain.com/api/v1
```

### Main Endpoints

| Module | Endpoint | Auth |
|--------|----------|------|
| Auth | `/auth/login`, `/auth/logout`, `/auth/refresh` | Public / Required |
| Users | `/users` | Admin |
| Projects | `/projects` | Required |
| Members | `/projects/:id/members` | Member |
| Reports | `/projects/:id/reports` | Member |
| Tasks | `/projects/:id/tasks` | Member |
| Files | `/projects/:id/files` | Member |
| Dashboard | `/dashboard` | Required |
| Audit Logs | `/audit-logs` | Admin, PM |

## Environment Variables

### API (`packages/api/.env`)

| Variable | Default | Required |
|----------|---------|----------|
| `DATABASE_URL` | — | Yes |
| `JWT_SECRET` | — | Yes (≥32 chars) |
| `JWT_REFRESH_SECRET` | — | Yes (≥32 chars) |
| `PORT` | `3001` | No |
| `UPLOAD_DIR` | `./uploads` | No |
| `MAX_FILE_SIZE` | `10485760` | No |
| `SMTP_*` | — | For password reset email |
| `APP_URL` | `http://localhost:5173` | No |
| `FRONTEND_URL` | `http://localhost:5173` | No |

### Web (`packages/web/.env`)

| Variable | Default | Required |
|----------|---------|----------|
| `VITE_API_URL` | `http://localhost:3001/api/v1` | No |

## Roles

| Role | Mô tả |
|------|--------|
| `ADMIN` | Quản trị toàn hệ thống |
| `PROJECT_MANAGER` | Quản lý dự án được giao |
| `SITE_ENGINEER` | Tạo báo cáo ngày, upload file, cập nhật task |
| `VIEWER` | Chỉ xem |

## Contributing

### Trước khi commit

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

### Commit message format

```
<type>(<module>): <mô tả ngắn>

Types: feat | fix | refactor | docs | test | chore
```

### Vertical Slice Checklist

Mỗi tính năng mới phải bao gồm:
- [ ] Frontend (UI + validation)
- [ ] Backend (API route + controller + service + repository)
- [ ] Database (migration nếu cần)
- [ ] Permission theo role
- [ ] Audit log cho mutations
- [ ] Test (unit hoặc integration)
- [ ] `pnpm smoke-test` pass

## Deployment

### Docker (Production)

```bash
# Build production image
docker build -t construction-api ./packages/api

# Run với docker-compose (production mode)
docker compose up -d
```

### Manual

```bash
pnpm build
pnpm --filter @construction/api db:migrate
pnpm --filter @construction/api start
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query, Zustand |
| Backend | Express.js, Prisma ORM, Zod |
| Database | MySQL 8.0 |
| Auth | JWT (access + refresh), bcrypt |
| Infra | Docker, Docker Compose, GitHub Actions |
