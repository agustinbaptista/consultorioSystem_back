from datetime import time
from uuid import UUID

from pydantic import BaseModel, Field


class SpecialtyOut(BaseModel):
    id: UUID
    code: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class ProfessionalCreate(BaseModel):
    first_name: str = Field(max_length=80)
    last_name: str = Field(max_length=80)
    license_number: str | None = None
    default_slot_minutes: int = 30
    specialty_ids: list[UUID] = []


class ProfessionalUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    license_number: str | None = None
    default_slot_minutes: int | None = None
    is_active: bool | None = None
    specialty_ids: list[UUID] | None = None


class ProfessionalOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    license_number: str | None
    default_slot_minutes: int
    is_active: bool
    specialty_ids: list[UUID] = []

    class Config:
        from_attributes = True


class ScheduleBlock(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    branch_id: UUID


class ScheduleUpdate(BaseModel):
    blocks: list[ScheduleBlock]


class SlotOut(BaseModel):
    start: str
    end: str
    available: bool
