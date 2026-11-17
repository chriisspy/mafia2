@echo off
cd /d "%~dp0"
rem the server first, then the page once it is listening (opening the page first could show "can't connect")
start "Map builder server" python -I tools/builder_server.py 8952
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8952/tools/builder/
