$ErrorActionPreference = "Stop"

$mysqlPort = 3306
$xamppMysqlStart = "C:\xampp\mysql_start.bat"

function Test-PortListening {
  param([int] $Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

Write-Host "Kiem tra MySQL tren cong $mysqlPort..."

if (Test-PortListening -Port $mysqlPort) {
  Write-Host "MySQL dang chay."
} else {
  if (-not (Test-Path -LiteralPath $xamppMysqlStart)) {
    Write-Error "Khong thay $xamppMysqlStart. Hay bat MySQL thu cong roi chay lai lenh nay."
    exit 1
  }

  Write-Host "MySQL chua chay. Dang bat MySQL bang XAMPP..."
  Start-Process -FilePath $xamppMysqlStart -WorkingDirectory "C:\xampp" -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
    if (Test-PortListening -Port $mysqlPort) {
      Write-Host "MySQL da san sang."
      break
    }
  }

  if (-not (Test-PortListening -Port $mysqlPort)) {
    Write-Error "MySQL chua san sang sau 30 giay. Hay mo XAMPP Control Panel de kiem tra MySQL."
    exit 1
  }
}

Write-Host "Chay frontend va backend..."
pnpm dev
