@echo off
chcp 65001 >nul
title DriveSync - Cai dat phu thuoc
echo Dang khoi dong trinh cai dat (Git + Python + DVC)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-deps.ps1"
