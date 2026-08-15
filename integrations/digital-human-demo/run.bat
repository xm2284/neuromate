@echo off
chcp 65001 >nul
cd /d "%~dp0"
python server.py --open
if errorlevel 1 (
  echo.
  echo 启动失败，请确认已安装 Python。
  pause
)
