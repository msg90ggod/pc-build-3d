@echo off
title PC Builder 3D Simulator
echo ===================================================
echo     KHOI DONG PC BUILDER 3D SIMULATOR
echo ===================================================
cd /d "%~dp0"
start "" http://localhost:5173
npm run dev
pause
