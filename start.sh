#!/bin/bash
echo "=== DroneOps 起動スクリプト ==="
echo ""
echo "バックエンドをインストール＆起動します..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ バックエンド起動: http://localhost:8000"
echo ""
echo "フロントエンドをインストール＆起動します..."
cd ../frontend
npm install --silent
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev &
FRONTEND_PID=$!
echo "✅ フロントエンド起動: http://localhost:3000"
echo ""
echo "終了するには Ctrl+C を押してください"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
