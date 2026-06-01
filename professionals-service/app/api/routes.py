from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import verify_internal_key
from app.db.session import get_db
from app.models.models import Professional, ProfessionalSpecialty, Specialty, WeeklySchedule
from app.schemas.schemas import (
    ProfessionalCreate,
    ProfessionalOut,
    ProfessionalUpdate,
    ScheduleUpdate,
    SpecialtyOut,
)
from app.services.availability import generate_slots

router = APIRouter()
internal = APIRouter(prefix="/internal", dependencies=[Depends(verify_internal_key)])


def _prof_out(db: Session, p: Professional) -> ProfessionalOut:
    links = (
        db.query(ProfessionalSpecialty)
        .filter(ProfessionalSpecialty.professional_id == p.id)
        .all()
    )
    return ProfessionalOut(
        id=p.id,
        first_name=p.first_name,
        last_name=p.last_name,
        license_number=p.license_number,
        default_slot_minutes=p.default_slot_minutes,
        is_active=p.is_active,
        specialty_ids=[l.specialty_id for l in links],
    )


@router.get("/health")
def health():
    return {"status": "ok", "service": "professionals-service"}


@router.get("/specialties")
def list_specialties(db: Session = Depends(get_db)):
    items = db.query(Specialty).filter(Specialty.is_active == True).order_by(Specialty.name).all()
    return {"data": [SpecialtyOut.model_validate(s) for s in items]}


@router.get("/professionals")
def list_professionals(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    q = db.query(Professional).filter(Professional.is_active == True)
    total = q.count()
    items = q.order_by(Professional.last_name).offset(skip).limit(limit).all()
    return {
        "data": [_prof_out(db, p) for p in items],
        "meta": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": (total + limit - 1) // limit if total else 0,
        },
    }


@router.get("/professionals/{professional_id}")
def get_professional(professional_id: UUID, db: Session = Depends(get_db)):
    p = db.get(Professional, professional_id)
    if not p:
        raise HTTPException(404, "Profesional no encontrado")
    return {"data": _prof_out(db, p)}


@router.post("/professionals", status_code=201)
def create_professional(body: ProfessionalCreate, db: Session = Depends(get_db)):
    p = Professional(
        first_name=body.first_name,
        last_name=body.last_name,
        license_number=body.license_number,
        default_slot_minutes=body.default_slot_minutes,
    )
    db.add(p)
    db.flush()
    for sid in body.specialty_ids:
        db.add(ProfessionalSpecialty(professional_id=p.id, specialty_id=sid))
    db.commit()
    db.refresh(p)
    return {"data": _prof_out(db, p)}


@router.patch("/professionals/{professional_id}")
def update_professional(
    professional_id: UUID, body: ProfessionalUpdate, db: Session = Depends(get_db)
):
    p = db.get(Professional, professional_id)
    if not p:
        raise HTTPException(404, "Profesional no encontrado")
    for field in ("first_name", "last_name", "license_number", "default_slot_minutes", "is_active"):
        val = getattr(body, field)
        if val is not None:
            setattr(p, field, val)
    if body.specialty_ids is not None:
        db.query(ProfessionalSpecialty).filter(
            ProfessionalSpecialty.professional_id == p.id
        ).delete()
        for sid in body.specialty_ids:
            db.add(ProfessionalSpecialty(professional_id=p.id, specialty_id=sid))
    db.commit()
    db.refresh(p)
    return {"data": _prof_out(db, p)}


@router.delete("/professionals/{professional_id}")
def delete_professional(professional_id: UUID, db: Session = Depends(get_db)):
    p = db.get(Professional, professional_id)
    if not p:
        raise HTTPException(404, "Profesional no encontrado")
    p.is_active = False
    db.commit()
    return {"data": {"id": str(professional_id), "deleted": True}}


@router.get("/professionals/{professional_id}/schedule")
def get_schedule(professional_id: UUID, branch_id: UUID | None = None, db: Session = Depends(get_db)):
    q = db.query(WeeklySchedule).filter(WeeklySchedule.professional_id == professional_id)
    if branch_id:
        q = q.filter(WeeklySchedule.branch_id == branch_id)
    blocks = q.all()
    return {
        "data": [
            {
                "id": str(b.id),
                "branchId": str(b.branch_id),
                "dayOfWeek": b.day_of_week,
                "startTime": b.start_time.strftime("%H:%M"),
                "endTime": b.end_time.strftime("%H:%M"),
            }
            for b in blocks
        ]
    }


@router.put("/professionals/{professional_id}/schedule")
def put_schedule(
    professional_id: UUID, body: ScheduleUpdate, db: Session = Depends(get_db)
):
    p = db.get(Professional, professional_id)
    if not p:
        raise HTTPException(404, "Profesional no encontrado")
    branch_ids = {b.branch_id for b in body.blocks}
    db.query(WeeklySchedule).filter(
        WeeklySchedule.professional_id == professional_id,
        WeeklySchedule.branch_id.in_(branch_ids),
    ).delete(synchronize_session=False)
    for b in body.blocks:
        db.add(
            WeeklySchedule(
                professional_id=professional_id,
                branch_id=b.branch_id,
                day_of_week=b.day_of_week,
                start_time=b.start_time,
                end_time=b.end_time,
            )
        )
    db.commit()
    return get_schedule(professional_id, db=db)


@router.get("/availability")
def public_availability(
    professionalId: UUID = Query(...),
    branchId: UUID = Query(...),
    date: date = Query(...),
    db: Session = Depends(get_db),
):
    slots = generate_slots(db, professionalId, branchId, date)
    prof = db.get(Professional, professionalId)
    return {
        "date": str(date),
        "professionalId": str(professionalId),
        "branchId": str(branchId),
        "slotMinutes": prof.default_slot_minutes if prof else 30,
        "slots": slots,
    }


@internal.get("/professionals/{professional_id}")
def internal_get_professional(professional_id: UUID, db: Session = Depends(get_db)):
    p = db.get(Professional, professional_id)
    if not p:
        raise HTTPException(404, "Profesional no encontrado")
    return {
        "data": {
            "id": str(p.id),
            "defaultSlotMinutes": p.default_slot_minutes,
            "firstName": p.first_name,
            "lastName": p.last_name,
        }
    }


@internal.get("/availability")
def internal_availability(
    professionalId: UUID = Query(...),
    branchId: UUID = Query(...),
    date: date = Query(...),
    db: Session = Depends(get_db),
):
    return public_availability(professionalId, branchId, date, db)
