from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    company = Column(String)
    email = Column(String)
    phone = Column(String)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    projects = relationship("Project", back_populates="customer", cascade="all, delete")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    location = Column(String)
    # status選択肢: 商談中/受注/準備中/実施済/完了/キャンセル
    status = Column(String, default="商談中")
    scheduled_date = Column(String)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer", back_populates="projects")
    flights = relationship("Flight", back_populates="project", cascade="all, delete")
    shooting_condition = relationship("ShootingCondition", back_populates="project", uselist=False, cascade="all, delete")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete")

class ShootingCondition(Base):
    __tablename__ = "shooting_conditions"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    location_detail = Column(Text)           # 撮影場所詳細
    area_type = Column(String)               # DID/山岳/海上/その他
    altitude = Column(Float)                 # 飛行高度(m)
    purpose = Column(Text)                   # 撮影目的
    camera_spec = Column(Text)               # カメラ/センサー指定
    delivery_format = Column(String)         # 納品形式（動画/静止画/RAW/その他）
    scheduled_start = Column(String)         # 撮影希望開始日時
    scheduled_end = Column(String)           # 撮影希望終了日時
    remarks = Column(Text)                   # 特記事項
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project = relationship("Project", back_populates="shooting_condition")

class ProjectTask(Base):
    __tablename__ = "project_tasks"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)   # タスク名
    # category選択肢: 事前確認/準備/申請/見積/提出
    category = Column(String, nullable=False)
    # status選択肢: 未対応/対応中/完了
    status = Column(String, default="未対応")
    due_date = Column(String)                # 期限
    note = Column(Text)                      # メモ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project = relationship("Project", back_populates="tasks")

class Drone(Base):
    __tablename__ = "drones"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    serial = Column(String)
    remote_id = Column(String)
    total_flight_time = Column(Float, default=0.0)
    flights = relationship("Flight", back_populates="drone")
    daily_inspections = relationship("DailyInspection", back_populates="drone")
    maintenance_records = relationship("MaintenanceRecord", back_populates="drone")

class Flight(Base):
    __tablename__ = "flights"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    drone_id = Column(Integer, ForeignKey("drones.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="planned")
    memo = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    pilot_name = Column(String)
    pilot_license = Column(String)
    flight_purpose = Column(Text)
    takeoff_location = Column(String)
    landing_location = Column(String)
    safety_notes = Column(Text)
    squawk_date = Column(String)
    squawk_detail = Column(Text)
    action_date = Column(String)
    action_detail = Column(Text)
    confirmer = Column(String)
    project = relationship("Project", back_populates="flights")
    drone = relationship("Drone", back_populates="flights")
    checklists = relationship("Checklist", back_populates="flight", cascade="all, delete")

class Checklist(Base):
    __tablename__ = "checklists"
    id = Column(Integer, primary_key=True)
    flight_id = Column(Integer, ForeignKey("flights.id", ondelete="CASCADE"))
    type = Column(String)
    item = Column(String, nullable=False)
    checked = Column(Boolean, default=False)
    flight = relationship("Flight", back_populates="checklists")

class DailyInspection(Base):
    __tablename__ = "daily_inspections"
    id = Column(Integer, primary_key=True, index=True)
    drone_id = Column(Integer, ForeignKey("drones.id"), nullable=False)
    inspected_at = Column(DateTime, default=datetime.utcnow)
    inspector_name = Column(String, nullable=False)
    weather = Column(String)
    temperature = Column(Float)
    notes = Column(String)
    result = Column(String, default="合格")
    drone = relationship("Drone", back_populates="daily_inspections")
    items = relationship("DailyInspectionItem", back_populates="inspection", cascade="all, delete-orphan")

class DailyInspectionItem(Base):
    __tablename__ = "daily_inspection_items"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("daily_inspections.id"), nullable=False)
    category = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    checked = Column(Boolean, default=False)
    note = Column(String)
    inspection = relationship("DailyInspection", back_populates="items")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    id = Column(Integer, primary_key=True, index=True)
    drone_id = Column(Integer, ForeignKey("drones.id"), nullable=False)
    performed_at = Column(String, nullable=False)
    total_flight_time = Column(Float)
    detail = Column(Text, nullable=False)
    reason = Column(String)
    place = Column(String)
    engineer = Column(String)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    drone = relationship("Drone", back_populates="maintenance_records")
