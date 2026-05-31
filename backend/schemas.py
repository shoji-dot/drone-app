from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CustomerCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    note: Optional[str] = None

class Customer(CustomerCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class ProjectCreate(BaseModel):
    customer_id: int
    name: str
    location: Optional[str] = None
    status: Optional[str] = "商談中"
    scheduled_date: Optional[str] = None
    note: Optional[str] = None

class Project(ProjectCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class DroneCreate(BaseModel):
    name: str
    serial: Optional[str] = None
    remote_id: Optional[str] = None
    total_flight_time: Optional[float] = 0.0

class Drone(DroneCreate):
    id: int
    class Config: from_attributes = True

class FlightCreate(BaseModel):
    project_id: int
    drone_id: int
    memo: Optional[str] = None
    status: Optional[str] = "planned"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    pilot_name: Optional[str] = None
    pilot_license: Optional[str] = None
    flight_purpose: Optional[str] = None
    takeoff_location: Optional[str] = None
    landing_location: Optional[str] = None
    safety_notes: Optional[str] = None
    squawk_date: Optional[str] = None
    squawk_detail: Optional[str] = None
    action_date: Optional[str] = None
    action_detail: Optional[str] = None
    confirmer: Optional[str] = None

class FlightUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    memo: Optional[str] = None
    status: Optional[str] = None
    drone_id: Optional[int] = None
    pilot_name: Optional[str] = None
    pilot_license: Optional[str] = None
    flight_purpose: Optional[str] = None
    takeoff_location: Optional[str] = None
    landing_location: Optional[str] = None
    safety_notes: Optional[str] = None
    squawk_date: Optional[str] = None
    squawk_detail: Optional[str] = None
    action_date: Optional[str] = None
    action_detail: Optional[str] = None
    confirmer: Optional[str] = None

class Flight(FlightCreate):
    id: int
    created_at: datetime
    class Config: from_attributes = True

class ChecklistCreate(BaseModel):
    flight_id: int
    type: str
    item: str
    checked: Optional[bool] = False

class ChecklistUpdate(BaseModel):
    checked: Optional[bool] = None
    item: Optional[str] = None

class Checklist(ChecklistCreate):
    id: int
    class Config: from_attributes = True

# --- Daily Inspection ---
class DailyInspectionItemBase(BaseModel):
    category: str
    item_name: str
    checked: bool = False
    note: Optional[str] = None

class DailyInspectionItemCreate(DailyInspectionItemBase):
    pass

class DailyInspectionItem(DailyInspectionItemBase):
    id: int
    inspection_id: int
    class Config: from_attributes = True

class DailyInspectionBase(BaseModel):
    drone_id: int
    inspector_name: str
    weather: Optional[str] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None
    result: str = "合格"

class DailyInspectionCreate(DailyInspectionBase):
    items: List[DailyInspectionItemCreate]

class DailyInspection(DailyInspectionBase):
    id: int
    inspected_at: datetime
    items: List[DailyInspectionItem] = []
    class Config: from_attributes = True

# --- Maintenance Record ---
class MaintenanceRecordBase(BaseModel):
    drone_id: int
    performed_at: str
    total_flight_time: Optional[float] = None
    detail: str
    reason: Optional[str] = None
    place: Optional[str] = None
    engineer: Optional[str] = None
    remarks: Optional[str] = None

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecord(MaintenanceRecordBase):
    id: int
    created_at: datetime
    class Config: from_attributes = True

# --- Shooting Condition ---
class ShootingConditionBase(BaseModel):
    location_detail: Optional[str] = None
    area_type: Optional[str] = None        # DID/山岳/海上/その他
    altitude: Optional[float] = None       # 飛行高度(m)
    purpose: Optional[str] = None          # 撮影目的
    camera_spec: Optional[str] = None      # カメラ/センサー指定
    delivery_format: Optional[str] = None  # 動画/静止画/RAW/その他
    scheduled_start: Optional[str] = None  # 撮影希望開始日時
    scheduled_end: Optional[str] = None    # 撮影希望終了日時
    remarks: Optional[str] = None

class ShootingConditionCreate(ShootingConditionBase):
    pass

class ShootingCondition(ShootingConditionBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True

# --- Project Task ---
class ProjectTaskBase(BaseModel):
    title: str
    category: str          # 事前確認/準備/申請/見積/提出
    status: Optional[str] = "未対応"  # 未対応/対応中/完了
    due_date: Optional[str] = None
    note: Optional[str] = None

class ProjectTaskCreate(ProjectTaskBase):
    pass

class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    note: Optional[str] = None

class ProjectTask(ProjectTaskBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True
