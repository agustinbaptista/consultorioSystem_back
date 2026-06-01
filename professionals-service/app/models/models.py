import uuid
from datetime import time

from sqlalchemy import Boolean, ForeignKey, Integer, SmallInteger, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.session import Base

SCHEMA = settings.db_schema


class Specialty(Base):
    __tablename__ = "specialties"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Professional(Base):
    __tablename__ = "professionals"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    license_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    default_slot_minutes: Mapped[int] = mapped_column(Integer, default=30)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    specialties: Mapped[list["ProfessionalSpecialty"]] = relationship(back_populates="professional")
    schedules: Mapped[list["WeeklySchedule"]] = relationship(back_populates="professional")


class ProfessionalSpecialty(Base):
    __tablename__ = "professional_specialties"
    __table_args__ = {"schema": SCHEMA}

    professional_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey(f"{SCHEMA}.professionals.id", ondelete="CASCADE"), primary_key=True
    )
    specialty_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey(f"{SCHEMA}.specialties.id", ondelete="CASCADE"), primary_key=True
    )

    professional: Mapped[Professional] = relationship(back_populates="specialties")
    specialty: Mapped[Specialty] = relationship()


class WeeklySchedule(Base):
    __tablename__ = "weekly_schedules"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    professional_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey(f"{SCHEMA}.professionals.id", ondelete="CASCADE")
    )
    branch_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    day_of_week: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    professional: Mapped[Professional] = relationship(back_populates="schedules")
