from datetime import date, datetime, timedelta, time
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import Professional, WeeklySchedule


def _parse_time(t: time) -> datetime:
    return datetime.combine(date.today(), t)


def generate_slots(
    db: Session,
    professional_id: UUID,
    branch_id: UUID,
    target_date: date,
) -> list[dict]:
    prof = db.get(Professional, professional_id)
    if not prof:
        return []

    dow = target_date.weekday()
    schedules = (
        db.query(WeeklySchedule)
        .filter(
            WeeklySchedule.professional_id == professional_id,
            WeeklySchedule.branch_id == branch_id,
            WeeklySchedule.day_of_week == dow,
        )
        .all()
    )

    slot_minutes = prof.default_slot_minutes or 30
    slots: list[dict] = []

    for sched in schedules:
        current = _parse_time(sched.start_time)
        end = _parse_time(sched.end_time)
        delta = timedelta(minutes=slot_minutes)
        while current + delta <= end:
            slot_end = current + delta
            slots.append(
                {
                    "start": current.strftime("%H:%M"),
                    "end": slot_end.strftime("%H:%M"),
                    "available": True,
                }
            )
            current = slot_end

    return slots
