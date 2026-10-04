@echo off
cd /d "%~dp0"
if not exist node_modules (
    call npm.cmd install
    if errorlevel 1 goto failed
)
echo ATK LIGHT: http://127.0.0.1:5173
echo Giu cua so nay mo khi su dung ung dung.
call npm.cmd run dev -- --port 5173 --strictPort
if errorlevel 1 goto failed
exit /b 0
:failed
echo Khong the khoi dong. Kiem tra Node.js va thong bao loi o tren.
pause
exit /b 1
