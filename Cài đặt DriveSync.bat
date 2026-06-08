@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cai dat DriveSync

echo ============================================
echo            CAI DAT DRIVESYNC
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js.
  echo Hay tai va cai tai: https://nodejs.org  roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/4] Dang cai thu vien... (lan dau co the mat vai phut^)
  call npm install
) else (
  echo [1/4] Thu vien da co - bo qua.
)

echo [2/4] Dang tao icon...
call npm run geticon

echo [3/4] Dang build ung dung...
call npm run build

echo [4/4] Dang tao shortcut tren Desktop...
powershell -ExecutionPolicy Bypass -NoProfile -File "scripts\create-shortcut.ps1"

echo.
echo ============================================
echo   XONG! Tu gio chi can bam icon "DriveSync"
echo   tren Desktop la chay ngay.
echo ============================================
echo.
echo Dang mo DriveSync...
call npm run start
