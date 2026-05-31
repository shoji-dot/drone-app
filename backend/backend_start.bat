@echo off
cd /d "C:\Users\ABC\Dropbox\個人フォルダ\営業関係のフォルダ\個人\YOIYOISTUDIO\WEBアプリ\drone-app\backend"

python -m uvicorn main:app --reload --port 8080

pause