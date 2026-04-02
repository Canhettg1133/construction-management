# ============================================================
# Skeleton E2E Smoke Test — Giai doan 5 Gate
# Kiem tra toan bo skeleton chay duoc truoc khi mo vertical slices
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
    $psi.FileName = $PwshCmd
    $psi.Arguments = $PwshArgsPrefix + "`"cd '$dir'; $args`""
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

# pnpm on Windows is a .ps1 file — invoke via powershell.exe to avoid execution policy issues
$PwshCmd = "powershell.exe"
$PwshArgsPrefix = "-NoProfile -ExecutionPolicy Bypass -Command "

# 1. Repository structure
Header "1. Repository Structure"
FileCheck "Root package.json"          "package.json"
FileCheck "pnpm-workspace.yaml"        "pnpm-workspace.yaml"
DirCheck  "packages/api/src"           "packages\api\src"
DirCheck  "packages/web/src"            "packages\web\src"
DirCheck  "packages/shared/src"         "packages\shared\src"
DirCheck  "docs folder"                "docs"
DirCheck  ".github/workflows"           ".github\workflows"

# 2. Build artifacts
Header "2. Build Artifacts"
Check "Shared package builds"   $RootDir    "pnpm -C `"$RootDir\packages\shared`" build"
Check "Web package builds"    $RootDir    "pnpm -C `"$RootDir\packages\web`" build"
Check "API package builds"    $RootDir    "pnpm -C `"$RootDir\packages\api`" build"

# 3. TypeScript typecheck
Header "3. TypeScript Typecheck"
Check "Shared typecheck"      $RootDir    "pnpm -C `"$RootDir\packages\shared`" typecheck"
Check "Web typecheck"        $RootDir    "pnpm -C `"$RootDir\packages\web`" typecheck"
Check "API typecheck"        $RootDir    "pnpm -C `"$RootDir\packages\api`" typecheck"

# 4. Docker Compose config
Header "4. Docker Compose Configuration"
FileCheck "docker-compose.yml"         "docker-compose.yml"
FileCheck "Dockerfile for API"         "packages\api\Dockerfile"
FileCheck ".dockerignore for API"      "packages\api\.dockerignore"
FileCheck "Dockerfile for Web"          "packages\web\Dockerfile"

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

# 5. Dependencies integrity
Header "5. Dependencies Integrity"
Check "pnpm install --frozen-lockfile"  $RootDir    "pnpm install --frozen-lockfile"

# 6. API Smoke (optional, requires running services)
Header "6. API Smoke Tests (optional)"
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

# Summary
Write-Host ""
Write-Host "============================================================"
Write-Host "  PASSED checks: $PASS"
Write-Host "  FAILED checks: $FAIL"
Write-Host "============================================================"
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "Smoke test FAILED - skeleton gate not passed"
    exit 1
} else {
    Write-Host "Smoke test PASSED - skeleton gate verified"
    exit 0
}
