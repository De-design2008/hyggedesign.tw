@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "hygge-admin-server" /min node admin\server.mjs
timeout /t 1 >nul
start "" http://127.0.0.1:5567/admin
