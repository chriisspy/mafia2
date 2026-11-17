@echo off
cd /d "%~dp0"
start "" http://127.0.0.1:8952/tools/builder/
python -I tools/builder_server.py 8952
