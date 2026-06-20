# =============================================================
#  DriveSync - Cài đặt phụ thuộc tự động (Git + Python + DVC)
#  Chạy 1 lần trên máy mới trước khi dùng app.
# =============================================================

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }

function Has-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
  $user    = [Environment]::GetEnvironmentVariable('Path','User')
  $env:Path = "$machine;$user"
}

Write-Host "============================================" -ForegroundColor White
Write-Host "  DriveSync - Tu dong cai dat phu thuoc" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White

# --- Kiểm tra winget ---
if (-not (Has-Command 'winget')) {
  Write-Warn "Khong tim thay 'winget' (App Installer)."
  Write-Warn "Hay cap nhat Windows hoac cai 'App Installer' tu Microsoft Store roi chay lai."
  Read-Host "`nNhan Enter de thoat"
  exit 1
}

# --- 1. Git ---
Write-Step "Kiem tra Git..."
if (Has-Command 'git') {
  Write-Ok "Git da co: $(git --version)"
} else {
  Write-Host "    Dang cai Git..."
  winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (Has-Command 'git') { Write-Ok "Da cai Git." } else { Write-Warn "Cai Git xong - co the can mo lai cua so." }
}

# --- 2. Python ---
Write-Step "Kiem tra Python..."
if (Has-Command 'python') {
  Write-Ok "Python da co: $(python --version)"
} else {
  Write-Host "    Dang cai Python 3.12..."
  winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (Has-Command 'python') { Write-Ok "Da cai Python." } else { Write-Warn "Cai Python xong - co the can mo lai cua so." }
}

# --- 3. DVC + ho tro Google Drive ---
Write-Step "Kiem tra DVC..."
if (Has-Command 'dvc') {
  Write-Ok "DVC da co: $(dvc --version)"
} else {
  Write-Host "    Dang cai DVC (kem ho tro Google Drive)..."
  if (Has-Command 'python') {
    python -m pip install --upgrade pip
    python -m pip install "dvc" "dvc-gdrive"
    Refresh-Path
  } else {
    Write-Warn "Chua co Python nen khong cai duoc DVC. Mo lai cua so roi chay lai script."
  }
  if (Has-Command 'dvc') { Write-Ok "Da cai DVC." } else { Write-Warn "Cai DVC xong - co the can mo lai cua so." }
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  HOAN TAT! Bay gio ban co the mo DriveSync." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Warn "Neu app bao chua thay git/dvc: dong app va mo lai (de nhan PATH moi)."
Read-Host "`nNhan Enter de thoat"
