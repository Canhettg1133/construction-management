# ============================================================
# Build stage
# ============================================================
FROM node:22-alpine AS build

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY ../shared/package.json ./shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=http://localhost:3001/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ============================================================
# Production runtime (nginx serves static files)
# ============================================================
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ============================================================
# Dev runtime (vite dev server)
# ============================================================
FROM node:22-alpine AS development

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY ../shared/package.json ./shared/package.json
COPY vite.config.ts tsconfig.json index.html ./
COPY src ./src

RUN pnpm install

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
