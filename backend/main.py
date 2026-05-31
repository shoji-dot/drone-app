# -*- coding: utf-8 -*-
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi import APIRouter
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import Session, relationship
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from urllib.parse import quote
from pathlib import Path
import io, json, re, os, subprocess, tempfile
import models, schemas
from database import SessionLocal, engine
from export_word import generate_shiki2_word, generate_shiki3_word
from docx_helpers import generate_estimate_docx, generate_invoice_docx

# ── Base（既存modelsと共有していない場合はmodels.Baseを使用） ──
Base = models.Base

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Drone Business Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# 追加Models（見積・請求書・タスクマスター・顧客書類）
# ════════════════════════════════════════════════════════════

class Estimate(Base):
    __tablename__ = "estimates"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    estimate_number = Column(String, unique=True)
    issue_date = Column(Date, default=date.today)
    valid_until = Column(Date)
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=0.1)
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    notes = Column(Text)
    status = Column(String, default="draft")  # draft/sent/approved/rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    project = relationship("Project", back_populates="estimates")

class EstimateItem(Base):
    __tablename__ = "estimate_items"
    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    name = Column(String, nullable=False)
    description = Column(Text)
    quantity = Column(Float, default=1)
    unit = Column(String, default="式")
    unit_price = Column(Float, default=0)
    amount = Column(Float, default=0)
    estimate = relationship("Estimate", back_populates="items")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=True)
    invoice_number = Column(String, unique=True)
    issue_date = Column(Date, default=date.today)
    due_date = Column(Date)
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=0.1)
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    notes = Column(Text)
    status = Column(String, default="unpaid")  # unpaid/paid/overdue/cancelled
    paid_at = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    project = relationship("Project", back_populates="invoices")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    name = Column(String, nullable=False)
    description = Column(Text)
    quantity = Column(Float, default=1)
    unit = Column(String, default="式")
    unit_price = Column(Float, default=0)
    amount = Column(Float, default=0)
    invoice = relationship("Invoice", back_populates="items")

class TaskMaster(Base):
    __tablename__ = "task_masters"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    default_offset_days = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Integer, default=1)

class CustomerDocument(Base):
    __tablename__ = "customer_documents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    doc_type = Column(String, nullable=False)
    variables = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project")

# Projectモデルにrelationship追加（models.pyのProjectクラスに以下を追記する代わりにここで動的追加）
if not hasattr(models.Project, "estimates"):
    models.Project.estimates = relationship("Estimate", back_populates="project", cascade="all, delete-orphan")
if not hasattr(models.Project, "invoices"):
    models.Project.invoices = relationship("Invoice", back_populates="project", cascade="all, delete-orphan")

# 追加テーブル作成
Base.metadata.create_all(bind=engine)


# ════════════════════════════════════════════════════════════
# 追加Schemas
# ════════════════════════════════════════════════════════════

class EstimateItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: float = 1
    unit: str = "式"
    unit_price: float = 0
    sort_order: int = 0

class EstimateItemOut(EstimateItemBase):
    id: int
    amount: float
    class Config: from_attributes = True

class EstimateCreate(BaseModel):
    project_id: Optional[int] = None
    issue_date: Optional[date] = None
    valid_until: Optional[date] = None
    tax_rate: float = 0.1
    notes: Optional[str] = None
    items: List[EstimateItemBase] = []

class EstimateOut(BaseModel):
    id: int
    project_id: int
    estimate_number: str
    issue_date: Optional[date]
    valid_until: Optional[date]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str]
    status: str
    items: List[EstimateItemOut]
    class Config: from_attributes = True

class InvoiceCreate(BaseModel):
    project_id: Optional[int] = None
    estimate_id: Optional[int] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    tax_rate: float = 0.1
    notes: Optional[str] = None
    items: List[EstimateItemBase] = []

class InvoiceOut(BaseModel):
    id: int
    project_id: int
    estimate_id: Optional[int]
    invoice_number: str
    issue_date: Optional[date]
    due_date: Optional[date]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str]
    status: str
    paid_at: Optional[date]
    items: List[EstimateItemOut]
    class Config: from_attributes = True

class TaskMasterBase(BaseModel):
    category: str
    name: str
    description: Optional[str] = None
    default_offset_days: Optional[int] = None
    sort_order: int = 0
    is_active: int = 1

class TaskMasterOut(TaskMasterBase):
    id: int
    class Config: from_attributes = True

class DocGenerateRequest(BaseModel):
    doc_type: str
    variables: dict
    templates: Optional[dict] = None


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════

def generate_number(db, model, field, prefix):
    year = datetime.now().year
    pattern = f"{prefix}-{year}-%"
    last = db.query(model).filter(
        getattr(model, field).like(pattern)
    ).order_by(getattr(model, field).desc()).first()
    seq = (int(getattr(last, field).split("-")[-1]) + 1) if last else 1
    return f"{prefix}-{year}-{seq:03d}"

def calc_totals(items_data, tax_rate):
    subtotal = sum(i.quantity * i.unit_price for i in items_data)
    tax = round(subtotal * tax_rate)
    return subtotal, tax, subtotal + tax


# ════════════════════════════════════════════════════════════
# 既存エンドポイント（元のmain.pyそのまま）
# ════════════════════════════════════════════════════════════

# ── 顧客 ──
@app.get("/customers", response_model=List[schemas.Customer])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.id.desc()).all()

@app.post("/customers", response_model=schemas.Customer)
def create_customer(c: schemas.CustomerCreate, db: Session = Depends(get_db)):
    obj = models.Customer(**c.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.get("/customers/{id}", response_model=schemas.Customer)
def get_customer(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Customer).get(id)
    if not obj: raise HTTPException(404)
    return obj

@app.put("/customers/{id}", response_model=schemas.Customer)
def update_customer(id: int, c: schemas.CustomerCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Customer).get(id)
    if not obj: raise HTTPException(404)
    for k, v in c.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@app.delete("/customers/{id}")
def delete_customer(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Customer).get(id)
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

# ── 案件 ──
@app.get("/projects", response_model=List[schemas.Project])
def list_projects(customer_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Project)
    if customer_id: q = q.filter(models.Project.customer_id == customer_id)
    return q.order_by(models.Project.id.desc()).all()

@app.post("/projects", response_model=schemas.Project)
def create_project(p: schemas.ProjectCreate, db: Session = Depends(get_db)):
    obj = models.Project(**p.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.get("/projects/{id}", response_model=schemas.Project)
def get_project(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Project).get(id)
    if not obj: raise HTTPException(404)
    return obj

@app.put("/projects/{id}", response_model=schemas.Project)
def update_project(id: int, p: schemas.ProjectCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Project).get(id)
    if not obj: raise HTTPException(404)
    for k, v in p.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@app.delete("/projects/{id}")
def delete_project(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Project).get(id)
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

# ── 撮影条件 ──
@app.get("/projects/{project_id}/shooting-condition", response_model=schemas.ShootingCondition)
def get_shooting_condition(project_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.ShootingCondition).filter(models.ShootingCondition.project_id == project_id).first()
    if not obj: raise HTTPException(404)
    return obj

@app.post("/projects/{project_id}/shooting-condition", response_model=schemas.ShootingCondition)
def create_shooting_condition(project_id: int, data: schemas.ShootingConditionCreate, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id): raise HTTPException(404)
    existing = db.query(models.ShootingCondition).filter(models.ShootingCondition.project_id == project_id).first()
    if existing: raise HTTPException(400, "Already exists. Use PUT to update.")
    obj = models.ShootingCondition(project_id=project_id, **data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@app.put("/projects/{project_id}/shooting-condition", response_model=schemas.ShootingCondition)
def upsert_shooting_condition(project_id: int, data: schemas.ShootingConditionCreate, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id): raise HTTPException(404)
    obj = db.query(models.ShootingCondition).filter(models.ShootingCondition.project_id == project_id).first()
    if obj:
        for k, v in data.dict().items(): setattr(obj, k, v)
    else:
        obj = models.ShootingCondition(project_id=project_id, **data.dict()); db.add(obj)
    db.commit(); db.refresh(obj); return obj

# ── タスク ──
@app.get("/projects/{project_id}/tasks", response_model=List[schemas.ProjectTask])
def list_tasks(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.ProjectTask).filter(models.ProjectTask.project_id == project_id).order_by(models.ProjectTask.id).all()

@app.post("/projects/{project_id}/tasks", response_model=schemas.ProjectTask)
def create_task(project_id: int, data: schemas.ProjectTaskCreate, db: Session = Depends(get_db)):
    if not db.query(models.Project).get(project_id): raise HTTPException(404)
    obj = models.ProjectTask(project_id=project_id, **data.dict())
    db.add(obj); db.commit(); db.refresh(obj); return obj

@app.put("/projects/{project_id}/tasks/{task_id}", response_model=schemas.ProjectTask)
def update_task(project_id: int, task_id: int, data: schemas.ProjectTaskUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.ProjectTask).filter(models.ProjectTask.id == task_id, models.ProjectTask.project_id == project_id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict(exclude_none=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@app.delete("/projects/{project_id}/tasks/{task_id}")
def delete_task(project_id: int, task_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.ProjectTask).filter(models.ProjectTask.id == task_id, models.ProjectTask.project_id == project_id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

# ── 機体 ──
@app.get("/drones", response_model=List[schemas.Drone])
def list_drones(db: Session = Depends(get_db)):
    return db.query(models.Drone).all()

@app.post("/drones", response_model=schemas.Drone)
def create_drone(d: schemas.DroneCreate, db: Session = Depends(get_db)):
    obj = models.Drone(**d.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.put("/drones/{id}", response_model=schemas.Drone)
def update_drone(id: int, d: schemas.DroneCreate, db: Session = Depends(get_db)):
    obj = db.query(models.Drone).get(id)
    if not obj: raise HTTPException(404)
    for k, v in d.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

@app.delete("/drones/{id}")
def delete_drone(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Drone).get(id)
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

# ── 飛行ログ ──
@app.get("/flights", response_model=List[schemas.Flight])
def list_flights(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Flight)
    if project_id: q = q.filter(models.Flight.project_id == project_id)
    return q.order_by(models.Flight.id.desc()).all()

@app.post("/flights", response_model=schemas.Flight)
def create_flight(f: schemas.FlightCreate, db: Session = Depends(get_db)):
    obj = models.Flight(**f.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

# ── 飛行ログ検索（フィルタ付き） ──
@app.get("/flights/search", response_model=List[schemas.Flight])
def search_flights(
    drone_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.Flight)
    if drone_id: q = q.filter(models.Flight.drone_id == drone_id)
    if status: q = q.filter(models.Flight.status == status)
    if date_from:
        dt = datetime.fromisoformat(date_from)
        q = q.filter(models.Flight.start_time >= dt)
    if date_to:
        dt = datetime.fromisoformat(date_to) 
        q = q.filter(models.Flight.start_time <= dt)
    return q.order_by(models.Flight.start_time.desc()).all()

@app.get("/flights/{id}", response_model=schemas.Flight)
def get_flight(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Flight).get(id)
    if not obj: raise HTTPException(404)
    return obj

@app.put("/flights/{id}", response_model=schemas.Flight)
def update_flight(id: int, f: schemas.FlightUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Flight).get(id)
    if not obj: raise HTTPException(404)
    
    for k, v in f.dict(exclude_none=True).items(): setattr(obj, k, v)
    
    if f.status == "done" and obj.start_time and obj.end_time:
        # ← ここでobj（DB反映後）から取得し、両方naiveに統一
        def to_naive(dt):
            return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt
        
        start = to_naive(obj.start_time)
        end   = to_naive(obj.end_time)
        diff  = (end - start).total_seconds() / 60
        drone = db.query(models.Drone).get(obj.drone_id)
        if drone: drone.total_flight_time = (drone.total_flight_time or 0) + diff
    
    db.commit(); db.refresh(obj); return obj

# ── 飛行ログ削除 ──
@app.delete("/flights/{id}")
def delete_flight(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Flight).get(id)
    if not obj: raise HTTPException(404)
    # 関連チェックリストも削除
    db.query(models.Checklist).filter(models.Checklist.flight_id == id).delete()
    db.delete(obj); db.commit(); return {"ok": True}

# ── チェックリスト ──
@app.get("/checklists", response_model=List[schemas.Checklist])
def list_checklists(flight_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Checklist)
    if flight_id: q = q.filter(models.Checklist.flight_id == flight_id)
    return q.all()

@app.post("/checklists", response_model=schemas.Checklist)
def create_checklist(c: schemas.ChecklistCreate, db: Session = Depends(get_db)):
    obj = models.Checklist(**c.dict()); db.add(obj); db.commit(); db.refresh(obj); return obj

@app.put("/checklists/{id}", response_model=schemas.Checklist)
def update_checklist(id: int, c: schemas.ChecklistUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Checklist).get(id)
    if not obj: raise HTTPException(404)
    for k, v in c.dict(exclude_none=True).items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj

# ── EXCEL出力 ──
@app.get("/export/flights/excel")
def export_flights_excel(drone_id: Optional[int] = None, nr: Optional[str] = "", db: Session = Depends(get_db)):
    from export_excel import build_flight_excel
    drone = db.query(models.Drone).get(drone_id) if drone_id else None
    q = db.query(models.Flight).filter(models.Flight.status == "done")
    if drone_id: q = q.filter(models.Flight.drone_id == drone_id)
    flights_db = q.order_by(models.Flight.start_time).all()
    cumulative = 0.0
    flight_list = []
    for f in flights_db:
        flight_min = (f.end_time - f.start_time).total_seconds() / 60 if f.start_time and f.end_time else 0.0
        cumulative += flight_min
        flight_list.append({
            "date": f.start_time.strftime("%Y/%m/%d") if f.start_time else "",
            "pilot_name": f.pilot_name or "", "pilot_license": f.pilot_license or "",
            "flight_purpose": f.flight_purpose or (f.memo or ""),
            "takeoff_location": f.takeoff_location or "", "landing_location": f.landing_location or "",
            "takeoff_time": f.start_time.strftime("%H:%M") if f.start_time else "",
            "landing_time": f.end_time.strftime("%H:%M") if f.end_time else "",
            "flight_minutes": round(flight_min, 1), "total_flight_minutes": round(cumulative, 1),
            "safety_notes": f.safety_notes or "", "squawk_date": f.squawk_date or "",
            "squawk_detail": f.squawk_detail or "", "action_date": f.action_date or "",
            "action_detail": f.action_detail or "", "confirmer": f.confirmer or "",
        })
    excel_bytes = build_flight_excel(
        drone_name=drone.name if drone else "全機体",
        drone_serial=drone.serial if drone else "",
        drone_remote_id=drone.remote_id if drone else "",
        flights=flight_list, nr=nr or "",
    )
    filename = quote(f"飛行記録_{datetime.now().strftime('%Y%m%d')}.xlsx")
    return StreamingResponse(io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"})

# ── 日常点検 ──
INSPECTION_ITEMS = [
    ("機体", "外観（傷・変形・汚れ）"), ("機体", "プロペラ（傷・変形・緩み）"),
    ("機体", "モーター（異音・異臭・過熱）"), ("機体", "フレーム・アーム（緩み・破損）"),
    ("機体", "ランディングギア（変形・緩み）"), ("電装", "バッテリー残量・膨張・接続"),
    ("電装", "配線（断線・被覆損傷）"), ("電装", "送信機バッテリー残量"),
    ("通信", "送受信機リンク確認"), ("通信", "リモートID送信確認"),
    ("センサー", "GPS捕捉確認"), ("センサー", "コンパスキャリブレーション"),
    ("センサー", "各種センサー正常動作"), ("飛行前", "フライトモード設定確認"),
    ("飛行前", "フェールセーフ設定確認"), ("飛行前", "周辺環境・気象確認"),
]

@app.post("/daily-inspections/", response_model=schemas.DailyInspection)
def create_daily_inspection(data: schemas.DailyInspectionCreate, db: Session = Depends(get_db)):
    inspection = models.DailyInspection(drone_id=data.drone_id, inspector_name=data.inspector_name,
        weather=data.weather, temperature=data.temperature, notes=data.notes, result=data.result)
    db.add(inspection); db.flush()
    for item in data.items:
        db.add(models.DailyInspectionItem(inspection_id=inspection.id, category=item.category,
            item_name=item.item_name, checked=item.checked, note=item.note))
    db.commit(); db.refresh(inspection); return inspection

@app.get("/daily-inspections/", response_model=List[schemas.DailyInspection])
def get_daily_inspections(drone_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.DailyInspection)
    if drone_id: q = q.filter(models.DailyInspection.drone_id == drone_id)
    return q.order_by(models.DailyInspection.inspected_at.desc()).all()

@app.get("/daily-inspections/template/items")
def get_inspection_template():
    return [{"category": c, "item_name": n} for c, n in INSPECTION_ITEMS]

@app.get("/daily-inspections/{inspection_id}/export-word")
def export_daily_inspection_word(inspection_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.DailyInspection).filter(models.DailyInspection.id == inspection_id).first()
    if not obj: raise HTTPException(404)
    drone = db.query(models.Drone).get(obj.drone_id)
    record = {
        "registration_id": drone.remote_id if drone else "", "nr": str(inspection_id),
        "drone_name": drone.name if drone else "",
        "inspected_at": obj.inspected_at.strftime("%Y-%m-%d") if obj.inspected_at else "",
        "place": "", "inspector_name": obj.inspector_name or "",
        "weather": obj.weather or "", "temperature": str(obj.temperature) if obj.temperature else "",
        "result": obj.result or "", "notes": obj.notes or "",
        "items": [{"checked": item.checked, "note": item.note or ""} for item in obj.items],
    }
    docx_bytes = generate_shiki2_word(record)
    filename = quote(f"日常点検記録_{inspection_id}_{datetime.now().strftime('%Y%m%d')}.docx")
    return StreamingResponse(io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"})

@app.get("/daily-inspections/{inspection_id}", response_model=schemas.DailyInspection)
def get_daily_inspection(inspection_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.DailyInspection).filter(models.DailyInspection.id == inspection_id).first()
    if not obj: raise HTTPException(404)
    return obj

@app.delete("/daily-inspections/{inspection_id}")
def delete_daily_inspection(inspection_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.DailyInspection).filter(models.DailyInspection.id == inspection_id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@app.put("/daily-inspections/items/{item_id}")
def update_inspection_item(item_id: int, checked: bool, db: Session = Depends(get_db)):
    obj = db.query(models.DailyInspectionItem).filter(models.DailyInspectionItem.id == item_id).first()
    if not obj: raise HTTPException(404)
    obj.checked = checked
    db.commit(); return {"ok": True, "id": item_id, "checked": checked}


# ── 点検整備記録 ──
@app.post("/maintenance-records/", response_model=schemas.MaintenanceRecord)
def create_maintenance_record(data: schemas.MaintenanceRecordCreate, db: Session = Depends(get_db)):
    record = models.MaintenanceRecord(**data.dict()); db.add(record); db.commit(); db.refresh(record); return record

@app.get("/maintenance-records/", response_model=List[schemas.MaintenanceRecord])
def get_maintenance_records(drone_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.MaintenanceRecord)
    if drone_id: q = q.filter(models.MaintenanceRecord.drone_id == drone_id)
    return q.order_by(models.MaintenanceRecord.performed_at.desc()).all()

@app.get("/maintenance-records/{drone_id}/export-word")
def export_maintenance_records_word(drone_id: int, db: Session = Depends(get_db)):
    drone = db.query(models.Drone).get(drone_id)
    if not drone: raise HTTPException(404)
    records = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.drone_id == drone_id).order_by(models.MaintenanceRecord.performed_at).all()
    record = {
        "registration_id": drone.remote_id or "", "nr": str(drone_id), "drone_name": drone.name or "",
        "entries": [{"performed_at": r.performed_at if isinstance(r.performed_at, str) else r.performed_at.strftime("%Y-%m-%d"),
            "total_flight_time": r.total_flight_time, "detail": r.detail or "",
            "reason": r.reason or "", "place": r.place or "", "engineer": r.engineer or "", "remarks": r.remarks or ""}
            for r in records],
    }
    docx_bytes = generate_shiki3_word(record)
    filename = quote(f"点検整備記録_{drone.name}_{datetime.now().strftime('%Y%m%d')}.docx")
    return StreamingResponse(io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"})

@app.delete("/maintenance-records/{record_id}")
def delete_maintenance_record(record_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.id == record_id).first()
    if not obj: raise HTTPException(404)
    db.delete(obj); db.commit(); return {"ok": True}

@app.put("/maintenance-records/{record_id}", response_model=schemas.MaintenanceRecord)
def update_maintenance_record(record_id: int, data: schemas.MaintenanceRecordCreate, db: Session = Depends(get_db)):
    obj = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.id == record_id).first()
    if not obj: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(obj, k, v)
    db.commit(); db.refresh(obj); return obj


# ════════════════════════════════════════════════════════════
# 見積エンドポイント
# ════════════════════════════════════════════════════════════

router_estimate = APIRouter(prefix="/projects/{project_id}/estimates", tags=["estimates"])

@router_estimate.get("", response_model=List[EstimateOut])
def list_estimates(project_id: int, db=Depends(get_db)):
    return db.query(Estimate).filter(Estimate.project_id == project_id).all()

@router_estimate.post("", response_model=EstimateOut)
def create_estimate(project_id: int, data: EstimateCreate, db=Depends(get_db)):
    subtotal, tax, total = calc_totals(data.items, data.tax_rate)
    est = Estimate(project_id=project_id,
        estimate_number=generate_number(db, Estimate, "estimate_number", "EST"),
        issue_date=data.issue_date or date.today(), valid_until=data.valid_until,
        tax_rate=data.tax_rate, notes=data.notes, subtotal=subtotal, tax_amount=tax, total=total)
    db.add(est); db.flush()
    for i, item in enumerate(data.items):
        db.add(EstimateItem(estimate_id=est.id, sort_order=i, name=item.name,
            description=item.description, quantity=item.quantity, unit=item.unit,
            unit_price=item.unit_price, amount=item.quantity * item.unit_price))
    db.commit(); db.refresh(est); return est

@router_estimate.put("/{estimate_id}", response_model=EstimateOut)
def update_estimate(project_id: int, estimate_id: int, data: EstimateCreate, db=Depends(get_db)):
    est = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not est: raise HTTPException(404)
    subtotal, tax, total = calc_totals(data.items, data.tax_rate)
    est.issue_date = data.issue_date or est.issue_date; est.valid_until = data.valid_until
    est.tax_rate = data.tax_rate; est.notes = data.notes
    est.subtotal = subtotal; est.tax_amount = tax; est.total = total
    db.query(EstimateItem).filter(EstimateItem.estimate_id == estimate_id).delete()
    for i, item in enumerate(data.items):
        db.add(EstimateItem(estimate_id=est.id, sort_order=i, name=item.name,
            description=item.description, quantity=item.quantity, unit=item.unit,
            unit_price=item.unit_price, amount=item.quantity * item.unit_price))
    db.commit(); db.refresh(est); return est

@router_estimate.patch("/{estimate_id}/status")
def update_estimate_status(project_id: int, estimate_id: int, status: str, db=Depends(get_db)):
    est = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not est: raise HTTPException(404)
    est.status = status; db.commit(); return {"ok": True}

@router_estimate.delete("/{estimate_id}")
def delete_estimate(project_id: int, estimate_id: int, db=Depends(get_db)):
    est = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not est: raise HTTPException(404)
    db.delete(est); db.commit(); return {"ok": True}

@router_estimate.get("/{estimate_id}/word")
def export_estimate_word(project_id: int, estimate_id: int, db=Depends(get_db)):
    est = db.query(Estimate).filter(Estimate.id == estimate_id).first()
    if not est: raise HTTPException(404)
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    customer = db.query(models.Customer).filter(models.Customer.id == project.customer_id).first()
    path = generate_estimate_docx(est, project, customer)
    return FileResponse(path, filename=f"{est.estimate_number}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


# ════════════════════════════════════════════════════════════
# 請求書エンドポイント
# ════════════════════════════════════════════════════════════

router_invoice = APIRouter(prefix="/projects/{project_id}/invoices", tags=["invoices"])

@router_invoice.get("", response_model=List[InvoiceOut])
def list_invoices(project_id: int, db=Depends(get_db)):
    return db.query(Invoice).filter(Invoice.project_id == project_id).all()

@router_invoice.post("", response_model=InvoiceOut)
def create_invoice(project_id: int, data: InvoiceCreate, db=Depends(get_db)):
    items_data = data.items
    if data.estimate_id and not items_data:
        est = db.query(Estimate).filter(Estimate.id == data.estimate_id).first()
        if est: items_data = est.items
    subtotal, tax, total = calc_totals(items_data, data.tax_rate)
    inv = Invoice(project_id=project_id, estimate_id=data.estimate_id,
        invoice_number=generate_number(db, Invoice, "invoice_number", "INV"),
        issue_date=data.issue_date or date.today(), due_date=data.due_date,
        tax_rate=data.tax_rate, notes=data.notes, subtotal=subtotal, tax_amount=tax, total=total)
    db.add(inv); db.flush()
    for i, item in enumerate(items_data):
        qty = getattr(item, 'quantity', 1); up = getattr(item, 'unit_price', 0)
        db.add(InvoiceItem(invoice_id=inv.id, sort_order=i, name=item.name,
            description=getattr(item, 'description', None), quantity=qty,
            unit=getattr(item, 'unit', '式'), unit_price=up, amount=qty * up))
    db.commit(); db.refresh(inv); return inv

@router_invoice.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(project_id: int, invoice_id: int, data: InvoiceCreate, db=Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404)
    subtotal, tax, total = calc_totals(data.items, data.tax_rate)
    inv.issue_date = data.issue_date or inv.issue_date; inv.due_date = data.due_date
    inv.tax_rate = data.tax_rate; inv.notes = data.notes
    inv.subtotal = subtotal; inv.tax_amount = tax; inv.total = total
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
    for i, item in enumerate(data.items):
        db.add(InvoiceItem(invoice_id=inv.id, sort_order=i, name=item.name,
            description=item.description, quantity=item.quantity, unit=item.unit,
            unit_price=item.unit_price, amount=item.quantity * item.unit_price))
    db.commit(); db.refresh(inv); return inv

@router_invoice.patch("/{invoice_id}/status")
def update_invoice_status(project_id: int, invoice_id: int, status: str, paid_at: Optional[str] = None, db=Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404)
    inv.status = status
    if paid_at: inv.paid_at = date.fromisoformat(paid_at)
    db.commit(); return {"ok": True}

@router_invoice.delete("/{invoice_id}")
def delete_invoice(project_id: int, invoice_id: int, db=Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404)
    db.delete(inv); db.commit(); return {"ok": True}

@router_invoice.get("/{invoice_id}/word")
def export_invoice_word(project_id: int, invoice_id: int, db=Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404)
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    customer = db.query(models.Customer).filter(models.Customer.id == project.customer_id).first()
    path = generate_invoice_docx(inv, project, customer)
    return FileResponse(path, filename=f"{inv.invoice_number}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


# ════════════════════════════════════════════════════════════
# タスクマスターエンドポイント
# ════════════════════════════════════════════════════════════

router_task_master = APIRouter(prefix="/task-masters", tags=["task-masters"])

@router_task_master.get("", response_model=List[TaskMasterOut])
def list_task_masters(db=Depends(get_db)):
    return db.query(TaskMaster).filter(TaskMaster.is_active == 1).order_by(TaskMaster.category, TaskMaster.sort_order).all()

@router_task_master.post("", response_model=TaskMasterOut)
def create_task_master(data: TaskMasterBase, db=Depends(get_db)):
    tm = TaskMaster(**data.dict()); db.add(tm); db.commit(); db.refresh(tm); return tm

@router_task_master.put("/{tm_id}", response_model=TaskMasterOut)
def update_task_master(tm_id: int, data: TaskMasterBase, db=Depends(get_db)):
    tm = db.query(TaskMaster).filter(TaskMaster.id == tm_id).first()
    if not tm: raise HTTPException(404)
    for k, v in data.dict().items(): setattr(tm, k, v)
    db.commit(); db.refresh(tm); return tm

@router_task_master.delete("/{tm_id}")
def delete_task_master(tm_id: int, db=Depends(get_db)):
    tm = db.query(TaskMaster).filter(TaskMaster.id == tm_id).first()
    if not tm: raise HTTPException(404)
    tm.is_active = 0; db.commit(); return {"ok": True}


# ════════════════════════════════════════════════════════════
# 顧客書類生成エンドポイント
# ════════════════════════════════════════════════════════════

router_docs = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])

@router_docs.post("/generate")
def generate_document(project_id: int, req: DocGenerateRequest, db=Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project: raise HTTPException(404)
    customer = db.query(models.Customer).filter(models.Customer.id == project.customer_id).first()

    doc_types = list(req.templates.keys()) if req.templates else [req.doc_type]
    templates_to_use = req.templates or {}

    path = _generate_docs_docx(doc_types, req.variables, templates_to_use, project, customer)
    cname = (customer.company or customer.name or "顧客") if customer else "顧客"
    fname = f"{cname}_書類一式.docx" if req.doc_type == "all" else f"{cname}_{req.doc_type}.docx"
    return FileResponse(path, filename=quote(fname),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

def _generate_docs_docx(types: list, variables: dict, templates: dict, project, customer) -> str:
    payload = {
        "types": types,
        "variables": variables,
        "templates": templates,
        "project": {"name": project.name if project else "", "scheduled_date": str(project.scheduled_date) if project and project.scheduled_date else ""},
        "customer": {"name": (customer.company or customer.name) if customer else ""},
    }
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
        json_path = f.name
    out_path = json_path.replace(".json", ".docx")
    result = subprocess.run(
        ["node", str(Path(__file__).parent / "generate_customer_docs.js"), json_path, out_path],
        capture_output=True,
        encoding="utf-8",       # ← 追加
        errors="replace",       # ← 追加（デコード失敗時に ? に置換）
    )
    os.unlink(json_path)
    if result.returncode != 0:
        raise RuntimeError(f"doc generation failed: {result.stderr}")
    return out_path


# ════════════════════════════════════════════════════════════
# Router登録 & Startup
# ════════════════════════════════════════════════════════════

app.include_router(router_estimate)
app.include_router(router_invoice)
app.include_router(router_task_master)
app.include_router(router_docs)

DEFAULT_TASK_MASTERS = [
    ("事前確認", "現地調査・ロケハン",    "飛行エリアの事前確認",           -14, 0),
    ("事前確認", "天候・METAR確認",       "気象情報の確認",                  -1, 1),
    ("事前確認", "航空法該当確認",         "DID・空港周辺等の確認",          -14, 2),
    ("準備",     "機体整備・点検",         "飛行前の機体コンディション確認",   -3, 0),
    ("準備",     "バッテリー充電",         "予備含め全バッテリー充電",         -1, 1),
    ("準備",     "撮影機材準備",           "カメラ・レンズ・メモリ等",         -1, 2),
    ("申請",     "飛行許可申請（国交省）", "DIPS2.0での申請",                -14, 0),
    ("申請",     "土地使用許可取得",       "飛行エリア地権者への許可",        -10, 1),
    ("申請",     "警察・消防への届出",     "必要に応じて届出",                 -7, 2),
    ("見積",     "見積書作成・送付",       "顧客への見積提出",                -10, 0),
    ("見積",     "見積承認確認",           "顧客からの承認連絡受領",           -5, 1),
    ("提出",     "納品データ確認",         "データ品質・容量の確認",            2, 0),
    ("提出",     "納品・請求書送付",       "データ納品と請求書の送付",          3, 1),
    ("提出",     "入金確認",               "請求書の入金確認",                 30, 2),
]

@app.on_event("startup")
def seed():
    db = SessionLocal()
    try:
        # 機体初期データ
        if db.query(models.Drone).count() == 0:
            for name in ["DJI Mini 4 Pro", "DJI Mavic 3", "Autel EVO Nano+"]:
                db.add(models.Drone(name=name, serial="SN-"+name[:4]))
            db.commit()
        # タスクマスター初期データ
        if db.query(TaskMaster).count() == 0:
            for category, name, description, offset_days, sort_order in DEFAULT_TASK_MASTERS:
                db.add(TaskMaster(category=category, name=name, description=description,
                    default_offset_days=offset_days, sort_order=sort_order))
            db.commit()
    finally:
        db.close()
