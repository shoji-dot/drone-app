import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Railway では DATABASE_URL 環境変数が自動セットされる。空または未設定の場合は SQLite にフォールバック
DATABASE_URL = os.environ.get("DATABASE_URL") or "sqlite:///./drone.db"

# Railway の postgres:// を postgresql:// に修正
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
