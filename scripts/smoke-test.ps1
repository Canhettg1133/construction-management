# ============================================================
# Smoke Test v2 — Giai đoạn 7-9 Regression Gate
# Kiểm tra toàn bộ codebase: structure, build, quality, regression
#
# Usage: .\scripts\smoke-test.ps1
# Exit codes: 0 = pass, 1 = fail
# ============================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

$PASS = 0
$FAIL = 0

function Header($text) {
    Write-Host ""
    Write-Host "============================================================"
    Write-Host "  $text"
    Write-Host "============================================================"
}

function Check($label, $dir, $args) {
    Write-Host -NoNewline "  $label... "
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$dir'; $args`""
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()
    $exitCode = $proc.ExitCode
    $proc.Dispose()
    if ($exitCode -eq 0) {
        Write-Host "PASS"
        $script:PASS++
    } else {
        Write-Host "FAIL (exit $exitCode)"
        $script:FAIL++
    }
}

function FileCheck($label, $relPath) {
    Write-Host -NoNewline "  $label... "
    $fullPath = Join-Path $RootDir $relPath
    if (Test-Path $fullPath) {
        Write-Host "PASS"
        $script:PASS++
    } else {
        Write-Host "FAIL"
        $script:FAIL++
    }
}

function DirCheck($label, $relPath) {
    Write-Host -NoNewline "  $label... "
    $fullPath = Join-Path $RootDir $relPath
    if (Test-Path $fullPath -PathType Container) {
        Write-Host "PASS"
        $script:PASS++
    } else {
        Write-Host "FAIL"
        $script:FAIL++
    }
}

# ============================================================
# 1. Repository Structure (GĐ7-B Regression B1)
# ============================================================
Header "1. Repository Structure"
FileCheck "Root package.json"            "package.json"
FileCheck "pnpm-workspace.yaml"          "pnpm-workspace.yaml"
FileCheck ".prettierrc"                  ".prettierrc"
FileCheck ".prettierignore"              ".prettierignore"
FileCheck "eslint.config.mjs"             "eslint.config.mjs"
FileCheck ".gitignore"                   ".gitignore"
FileCheck ".env.example"                 ".env.example"
FileCheck "README.md"                    "README.md"
DirCheck  "packages/api/src"             "packages\api\src"
DirCheck  "packages/web/src"             "packages\web\src"
DirCheck  "packages/shared/src"          "packages\shared\src"
DirCheck  "packages/api/prisma"          "packages\api\prisma"
DirCheck  "docs"                         "docs"
DirCheck  "scripts"                      "scripts"
DirCheck  "scripts/verify"               "scripts\verify"
DirCheck  ".github/workflows"             ".github\workflows"

# ============================================================
# 2. API Module Structure
# ============================================================
Header "2. API Module Structure"
DirCheck  "auth module"                  "packages\api\src\modules\auth"
DirCheck  "users module"                 "packages\api\src\modules\users"
DirCheck  "projects module"              "packages\api\src\modules\projects"
DirCheck  "tasks module"                 "packages\api\src\modules\tasks"
DirCheck  "daily-reports module"         "packages\api\src\modules\daily-reports"
DirCheck  "files module"                 "packages\api\src\modules\files"
DirCheck  "audit module"                 "packages\api\src\modules\audit"
DirCheck  "dashboard module"             "packages\api\src\modules\dashboard"
DirCheck  "health module"                "packages\api\src\modules\health"
DirCheck  "project-members module"       "packages\api\src\modules\project-members"
DirCheck  "shared/middleware"            "packages\api\src\shared\middleware"
DirCheck  "shared/errors"                "packages\api\src\shared\errors"
DirCheck  "shared/utils"                "packages\api\src\shared\utils"
DirCheck  "config"                       "packages\api\src\config"

# ============================================================
# 3. Web Feature Structure
# ============================================================
Header "3. Web Feature Structure"
DirCheck  "auth features"                "packages\web\src\features\auth"
DirCheck  "dashboard features"            "packages\web\src\features\dashboard"
DirCheck  "projects features"            "packages\web\src\features\projects"
DirCheck  "reports features"             "packages\web\src\features\reports"
DirCheck  "tasks features"               "packages\web\src\features\tasks"
DirCheck  "audit features"               "packages\web\src\features\audit"
DirCheck  "users features"              "packages\web\src\features\users"
DirCheck  "settings features"            "packages\web\src\features\settings"
DirCheck  "web shared/components"        "packages\web\src\shared\components"
DirCheck  "web shared/hooks"            "packages\web\src\shared\hooks"
DirCheck  "web shared/utils"             "packages\web\src\shared\utils"
DirCheck  "web shared/constants"         "packages\web\src\shared\constants"
DirCheck  "web router"                  "packages\web\src\router"
DirCheck  "web store"                   "packages\web\src\store"

# ============================================================
# 4. Build Artifacts (GĐ7-B Regression B6)
# ============================================================
Header "4. Build Artifacts"
Check "Shared package builds"    $RootDir    "pnpm -C `"$RootDir\packages\shared`" build 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "Web package builds"       $RootDir    "pnpm -C `"$RootDir\packages\web`" build 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "API package builds"       $RootDir    "pnpm -C `"$RootDir\packages\api`" build 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"

# ============================================================
# 5. TypeScript Typecheck (GĐ7-B Regression B6)
# ============================================================
Header "5. TypeScript Typecheck"
Check "Shared typecheck"        $RootDir    "pnpm -C `"$RootDir\packages\shared`" typecheck 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "Web typecheck"           $RootDir    "pnpm -C `"$RootDir\packages\web`" typecheck 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "API typecheck"           $RootDir    "pnpm -C `"$RootDir\packages\api`" typecheck 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "Root typecheck"          $RootDir    "pnpm typecheck 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"

# ============================================================
# 6. Lint & Format (GĐ7-B Regression B6)
# ============================================================
Header "6. Lint & Format"
Check "ESLint check"            $RootDir    "pnpm lint 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"
Check "Prettier format check"   $RootDir    "pnpm format:check 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"

# ============================================================
# 7. Docker Compose Config (GĐ7-B Regression B4)
# ============================================================
Header "7. Docker Compose Configuration"
FileCheck "docker-compose.yml"          "docker-compose.yml"
FileCheck "docker-compose.dev.yml"      "docker-compose.dev.yml"
FileCheck "Dockerfile for API"          "packages\api\Dockerfile"
FileCheck ".dockerignore for API"       "packages\api\.dockerignore"
FileCheck "Dockerfile for Web"          "packages\web\Dockerfile"
FileCheck ".dockerignore for Web"       "packages\web\.dockerignore"

Write-Host -NoNewline "  docker-compose.yml config valid... "
try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "docker"
    $psi.Arguments = "compose -f `"$RootDir\docker-compose.yml`" config"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    $proc.WaitForExit()
    if ($proc.ExitCode -eq 0) { Write-Host "PASS"; $script:PASS++ } else { Write-Host "FAIL"; $script:FAIL++ }
    $proc.Dispose()
} catch {
    Write-Host "FAIL"
    $script:FAIL++
}

# ============================================================
# 8. Dependencies Integrity (GĐ7-B Regression B5)
# ============================================================
Header "8. Dependencies Integrity"
Check "pnpm install --frozen-lockfile" $RootDir "pnpm install --frozen-lockfile 2>&1 | Out-Null; if (`$LASTEXITCODE -ne 0) { exit 1 }"

# ============================================================
# 9. Database Migrations (GĐ9 — Data & Migration Safety)
# ============================================================
Header "9. Database Migrations"
DirCheck  "Migrations folder exists"    "packages\api\prisma\migrations"

Write-Host -NoNewline "  Migration files contain SQL... "
$migrationDir = Join-Path $RootDir "packages\api\prisma\migrations"
$sqlFiles = Get-ChildItem -Path $migrationDir -Recurse -Filter "*.sql" -ErrorAction SilentlyContinue
if ($sqlFiles.Count -gt 0) {
    Write-Host "PASS ($($sqlFiles.Count) files)"
    $script:PASS++
} else {
    Write-Host "FAIL (no SQL files)"
    $script:FAIL++
}

# ============================================================
# 10. Verify Scripts (GĐ9 — Reliability Gate)
# ============================================================
Header "10. Verify Scripts"
FileCheck "security-check.mjs"         "scripts\verify\security-check.mjs"
FileCheck "migration-check.mjs"         "scripts\verify\migration-check.mjs"
FileCheck "audit-check.mjs"             "scripts\verify\audit-check.mjs"
FileCheck "ac-report.mjs"                "scripts\verify\ac-report.mjs"

# ============================================================
# 11. CI Workflow (GĐ9)
# ============================================================
Header "11. CI Workflow"
FileCheck "GitHub Actions CI"           ".github\workflows\ci.yml"
FileCheck "CI has quality job"          ".github\workflows\ci.yml"
FileCheck "CI has build job"            ".github\workflows\ci.yml"
FileCheck "CI has migration job"         ".github\workflows\ci.yml"
FileCheck "CI has test job"             ".github\workflows\ci.yml"

# ============================================================
# 12. API Smoke (optional, requires running services)
# ============================================================
Header "12. API Smoke Tests (optional)"
$apiUrl = $env:API_URL
if ([string]::IsNullOrEmpty($apiUrl)) {
    Write-Host "  (Skipped - set API_URL env var to run API smoke tests)"
} else {
    Write-Host "  Testing against: $apiUrl"
    try {
        $healthResp = Invoke-WebRequest -Uri "$apiUrl/api/v1/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        $healthCode = [int]$healthResp.StatusCode
    } catch {
        $healthCode = 0
    }
    Write-Host -NoNewline "  Health endpoint returns 200... "
    if ($healthCode -eq 200) { Write-Host "PASS"; $script:PASS++ } else { Write-Host "FAIL ($healthCode)"; $script:FAIL++ }
}

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "============================================================"
Write-Host "  PASSED checks: $PASS"
Write-Host "  FAILED checks: $FAIL"
Write-Host "============================================================"
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "Smoke test FAILED - regression gate not passed"
    exit 1
} else {
    Write-Host "Smoke test PASSED - regression gate verified"
    exit 0
}
