#!/usr/bin/env bash
# ============================================================
# Skeleton E2E Smoke Test — Giai đoạn 5 Gate
# Kiểm tra toàn bộ skeleton chạy được trước khi mở vertical slices
#
# Usage: bash scripts/smoke-test.sh
# Exit codes: 0 = pass, 1 = fail
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

header() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  $1${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check() {
  local label="$1"
  local cmd="$2"
  echo -n "  $label... "
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"
    echo "    Command: $cmd"
    ((FAIL++))
  fi
}

pass_count() {
  echo ""
  echo -e "${GREEN}PASSED: $PASS${NC}"
  echo -e "${RED}FAILED: $FAIL${NC}"
  echo ""
}

cd "$ROOT_DIR"

# ─── 1. Repository structure ─────────────────────────────
header "1. Repository Structure"

check "Root package.json exists"          "test -f package.json"
check "pnpm-workspace.yaml exists"        "test -f pnpm-workspace.yaml"
check "packages/api exists"                "test -d packages/api/src"
check "packages/web exists"               "test -d packages/web/src"
check "packages/shared exists"            "test -d packages/shared/src"
check "docs folder exists"               "test -d docs"
check ".github/workflows exists"          "test -d .github/workflows"

# ─── 2. Build artifacts (shared → api → web) ─────────────
header "2. Build Artifacts"

check "Shared package builds"             "cd packages/shared && pnpm build"
check "Web package builds"                "cd packages/web && pnpm build"
check "API package builds"                "cd packages/api && pnpm build"

# ─── 3. TypeScript typecheck ──────────────────────────────
header "3. TypeScript Typecheck"

check "Shared typecheck"                  "cd packages/shared && pnpm typecheck"
check "Web typecheck"                     "cd packages/web && pnpm typecheck"
check "API typecheck"                     "cd packages/api && pnpm typecheck"

# ─── 4. Docker Compose config is valid ───────────────────
header "4. Docker Compose Configuration"

check "docker-compose.yml valid YAML"     "docker compose -f docker-compose.yml config > /dev/null"
check "Dockerfile for API exists"         "test -f packages/api/Dockerfile"
check ".dockerignore for API exists"      "test -f packages/api/.dockerignore"

# ─── 5. Dependencies integrity ───────────────────────────
header "5. Dependencies Integrity"

check "No phantom deps (pnpm install)"    "pnpm install --frozen-lockfile"

# ─── 6. API Smoke (requires running services) ─────────────
header "6. API Smoke Tests (requires running DB + API)"

# These only run if API_URL is set (for CI/manual testing)
if [ -n "$API_URL" ]; then
  HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
  check "API health endpoint returns 200" "test \"$HEALTH_RESPONSE\" = \"200\""

  if [ "$HEALTH_RESPONSE" = "200" ]; then
    # Auth smoke
    AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@construction.local","password":"Admin@123"}' 2>/dev/null || echo "000")
    check "Auth login returns 2xx/4xx (not 5xx)" "test \"$AUTH_RESPONSE\" != \"000\" && test \"$AUTH_RESPONSE\" -lt \"500\""

    # Protected route rejects unauth
    PROTECTED_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/users" 2>/dev/null || echo "000")
    check "Protected route returns 401 unauthenticated" "test \"$PROTECTED_RESPONSE\" = \"401\""
  fi
else
  echo "  (Skipped — set API_URL env var to run API smoke tests)"
fi

# ─── Summary ──────────────────────────────────────────────
pass_count

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Smoke test FAILED — skeleton gate not passed${NC}"
  exit 1
else
  echo -e "${GREEN}Smoke test PASSED — skeleton gate verified${NC}"
  exit 0
fi
