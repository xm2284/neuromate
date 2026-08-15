@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 元知己 V1.4 本地演示...
echo 如果浏览器没有自动打开，请手动访问 http://localhost:8321/
start "" "http://localhost:8321/index.html"
node "%~dp0_local-server.js" 8321 index.html
pause
