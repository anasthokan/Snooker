@echo off
REM Run this AFTER RDP login on server 74.208.184.175
REM Double-click or: powershell -ExecutionPolicy Bypass -File setup-on-rdp.ps1

powershell -ExecutionPolicy Bypass -File "%~dp0setup-on-rdp.ps1"
pause
