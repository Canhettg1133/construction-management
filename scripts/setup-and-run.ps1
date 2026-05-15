$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $rootDir ".env"
$xamppMysqlStart = "C:\xampp\mysql_start.bat"
$xamppMysqlClient = "C:\xampp\mysql\bin\mysql.exe"

function Write-Step {
  param([string] $Message)
  Write-Host ""
  Write-Host "==> $Message"
}

function Get-CommandPath {
  param([string] $Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $null
  }
  return $command.Source
}

function Ensure-Pnpm {
  if (Get-CommandPath "pnpm") {
    return
  }

  if (Get-CommandPath "corepack") {
    Write-Step "pnpm not found. Enabling pnpm with Corepack"
    corepack enable
    corepack prepare pnpm@9 --activate
  }

  if (-not (Get-CommandPath "pnpm")) {
    Write-Error "pnpm is not available. Install Node.js 20+ with Corepack, then run this script again."
  }
}

function Ensure-EnvFile {
  if (Test-Path -LiteralPath $envPath) {
    Write-Host ".env already exists. Keeping current local settings."
    return
  }

  Write-Step "Creating local .env"
  @'
NODE_ENV=development
PORT=3001
DATABASE_URL="mysql://root:@127.0.0.1:3306/construction_mgmt"
JWT_SECRET="dev-secret-key-min-32-characters-long"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="dev-refresh-secret-key-min-32-chars"
JWT_REFRESH_EXPIRES_IN="30d"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
DOCUMENT_TRASH_RETENTION_DAYS=30
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
APP_URL="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"
LOG_LEVEL=debug
AI_SECRET_ENCRYPTION_KEY=""
AI_PROVIDER="MOCK"
AI_OPENAI_API_KEY=""
AI_OPENAI_MODEL="gpt-5.4"
AI_OPENAI_COMPATIBLE_BASE_URL=""
AI_OPENAI_COMPATIBLE_API_KEY=""
AI_OPENAI_COMPATIBLE_MODEL="gpt-5.4"
AI_GEMINI_API_KEY=""
AI_GEMINI_MODEL="gemini-2.5-flash"
AI_OLLAMA_BASE_URL="http://localhost:11434"
AI_OLLAMA_MODEL="llama3.1"
AI_REQUEST_TIMEOUT_MS=30000
'@ | Set-Content -LiteralPath $envPath -Encoding UTF8
}

function Read-EnvValue {
  param([string] $Name)

  $line = Get-Content -LiteralPath $envPath |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$([regex]::Escape($Name))\s*=\s*", "").Trim()
  return $value.Trim('"').Trim("'")
}

function Test-PortListening {
  param([int] $Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

function Get-DatabaseUri {
  $databaseUrl = Read-EnvValue "DATABASE_URL"
  if (-not $databaseUrl) {
    Write-Error "DATABASE_URL is missing in .env."
  }

  try {
    return [Uri] $databaseUrl
  } catch {
    Write-Error "DATABASE_URL is not a valid URL: $databaseUrl"
  }
}

function Ensure-MysqlRunning {
  param([Uri] $DatabaseUri)

  $hostName = $DatabaseUri.Host
  $port = if ($DatabaseUri.Port -gt 0) { $DatabaseUri.Port } else { 3306 }
  $isLocalHost = $hostName -in @("localhost", "127.0.0.1", "::1")

  if (-not $isLocalHost) {
    Write-Host "DATABASE_URL points to $hostName. Skipping local MySQL startup."
    return
  }

  Write-Step "Checking MySQL on port $port"
  if (Test-PortListening -Port $port) {
    Write-Host "MySQL is already running."
    return
  }

  if (-not (Test-Path -LiteralPath $xamppMysqlStart)) {
    Write-Error "MySQL is not running and $xamppMysqlStart was not found. Start MySQL, then run this script again."
  }

  Write-Host "Starting MySQL with XAMPP..."
  Start-Process -FilePath $xamppMysqlStart -WorkingDirectory "C:\xampp" -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    if (Test-PortListening -Port $port) {
      Write-Host "MySQL is ready."
      return
    }
  }

  Write-Error "MySQL was not ready after 30 seconds. Check XAMPP Control Panel and run this script again."
}

function Get-MysqlClient {
  $mysql = Get-CommandPath "mysql"
  if ($mysql) {
    return $mysql
  }

  if (Test-Path -LiteralPath $xamppMysqlClient) {
    return $xamppMysqlClient
  }

  Write-Error "mysql client was not found. Install MySQL client or XAMPP, then run this script again."
}

function Ensure-Database {
  param([Uri] $DatabaseUri)

  $databaseName = $DatabaseUri.AbsolutePath.TrimStart("/")
  if (-not $databaseName) {
    Write-Error "DATABASE_URL must include a database name."
  }
  if ($databaseName -notmatch "^[A-Za-z0-9_]+$") {
    Write-Error "Database name '$databaseName' contains unsupported characters for automatic setup."
  }

  $userInfo = $DatabaseUri.UserInfo.Split(":", 2)
  $user = [Uri]::UnescapeDataString($userInfo[0])
  $password = if ($userInfo.Length -gt 1) { [Uri]::UnescapeDataString($userInfo[1]) } else { "" }
  $port = if ($DatabaseUri.Port -gt 0) { $DatabaseUri.Port } else { 3306 }
  $mysql = Get-MysqlClient

  Write-Step "Ensuring database '$databaseName' exists"
  $args = @("-h", $DatabaseUri.Host, "-P", "$port", "-u", $user)
  if ($password.Length -gt 0) {
    $args += "-p$password"
  }
  $args += @("-e", "CREATE DATABASE IF NOT EXISTS ``$databaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")

  & $mysql @args
}

Set-Location $rootDir

Write-Step "Preparing local development environment"
Ensure-Pnpm
Ensure-EnvFile
$databaseUri = Get-DatabaseUri
Ensure-MysqlRunning -DatabaseUri $databaseUri
Ensure-Database -DatabaseUri $databaseUri

Write-Step "Installing dependencies from lockfile"
pnpm install --frozen-lockfile

Write-Step "Building shared package"
pnpm --filter @construction/shared build

Write-Step "Applying database migrations"
pnpm db:migrate

Write-Step "Seeding database"
pnpm db:seed

Write-Step "Starting API and web app"
pnpm dev
