@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Telegram-бот заявок
node bot.js
pause
