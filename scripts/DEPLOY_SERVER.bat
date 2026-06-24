@echo off
title GameHub Pro - Deploy to IIS Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-server-iis.ps1" %*
if errorlevel 1 pause
