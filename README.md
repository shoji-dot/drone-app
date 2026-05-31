# DroneOps — ドローン業務管理アプリ

## 構成

```
drone-app/
├── backend/          # FastAPI + SQLite
│   ├── main.py       # APIエンドポイント
│   ├── models.py     # SQLAlchemyモデル
│   ├── schemas.py    # Pydanticスキーマ
│   ├── database.py   # DB接続
│   └── requirements.txt
└── frontend/         # Next.js (App Router)
    ├── app/
    │   ├── page.tsx  # メインUI（全機能）
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json
    └── next.config.js
```

## セットアップ手順

### バックエンド起動

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API確認: http://localhost:8000/docs

### フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

アクセス: http://localhost:3000

## 機能一覧

| 機能 | 説明 |
|------|------|
| 🏠 飛行開始 | 3ステップで飛行を開始（案件選択→事前確認→飛行中） |
| 👥 顧客管理 | 顧客のCRUD |
| 📋 案件管理 | 顧客に紐づく案件CRUD |
| 🚁 飛行ログ | 飛行記録・チェックリストの確認 |

## REST API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET/POST | /customers | 顧客一覧・作成 |
| GET/PUT/DELETE | /customers/{id} | 顧客取得・更新・削除 |
| GET/POST | /projects | 案件一覧・作成 |
| GET/PUT/DELETE | /projects/{id} | 案件取得・更新・削除 |
| GET | /drones | 機体一覧 |
| GET/POST | /flights | 飛行ログ一覧・作成 |
| GET/PUT | /flights/{id} | 飛行ログ取得・更新 |
| GET/POST | /checklists | チェックリスト一覧・作成 |
| PUT | /checklists/{id} | チェック状態更新 |
