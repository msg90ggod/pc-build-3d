@echo off
title PC Builder 3D Simulator
cd /d "%~dp0"

REM Viet bang chu ASCII thoi: cua so lenh cua Windows mac dinh khong doc duoc
REM tieng Viet co dau trong file .bat, se hien ra lung tung.
echo ===================================================
echo      PC BUILDER 3D - KHOI DONG
echo ===================================================

REM [1] Node.js bat buoc. Thieu no thi lenh npm khong ton tai.
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] May chua cai Node.js.
  echo        Tai Node.js 18 tro len tai: https://nodejs.org
  echo        Cai xong, mo lai may roi chay lai file nay.
  echo.
  pause
  exit /b 1
)

REM [2] Thu vien chua co trong repo (node_modules bi .gitignore loai bo),
REM     va lenh "npm run dev" goi dung chinh ten Vite tren dia.
if not exist "node_modules\vite\package.json" (
  echo.
  echo [1/2] Lan dau chay: dang cai thu vien, vai phut...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [LOI] npm install that bai. Kiem tra lai mang Internet roi chay lai.
    echo.
    pause
    exit /b 1
  )
)

REM [3] Server can vai giay moi len. Mo trinh duyet som se ra
REM     ERR_CONNECTION_REFUSED, dung khi gap loi "khong truy cap duoc trang".
echo.
echo [2/2] Khoi dong server tai http://localhost:5173
echo.
start "" cmd /c "ping -n 6 127.0.0.1 >nul & start http://localhost:5173"

call npm run dev

echo.
echo Server da dung. Dong cua so nay di.
pause