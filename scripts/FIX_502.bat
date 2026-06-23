@echo off
title Fix GameHub 502 Error
echo Run as Administrator on RDP server 74.208.184.175
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0fix-502-atozee.ps1" -Mode direct
echo.
pause
