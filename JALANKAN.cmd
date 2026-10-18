@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 belum tersedia. Instal Node.js 24 terlebih dahulu.
  pause
  exit /b 1
)
if not exist node_modules\qrcode (
  echo Dependensi belum terpasang. Jalankan npm.cmd install terlebih dahulu.
  pause
  exit /b 1
)
echo Buka http://127.0.0.1:3010 di browser.
echo Akun awal tersedia pada data\akses-awal.txt setelah server dimulai.
call npm.cmd start
pause
