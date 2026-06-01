from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.api.routes import internal, router
from app.core.config import settings
from app.db.bootstrap import ensure_database_initialized
from app.db.session import Base, engine, ensure_schema
from app.models import models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_database_initialized()
    ensure_schema()
    with engine.connect() as conn:
        conn.execute(text(f"SET search_path TO {settings.db_schema}, public"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    # seed specialties if empty
    from app.db.session import SessionLocal
    from app.models.models import Specialty

    db = SessionLocal()
    try:
        if db.query(Specialty).count() == 0:
            seeds = [
                ("CLINICA", "Clínica médica"),
                ("PEDIATRIA", "Pediatría"),
                ("GINECOLOGIA", "Ginecología"),
                ("CARDIOLOGIA", "Cardiología"),
                ("DERMATOLOGIA", "Dermatología"),
                ("TRAUMATOLOGIA", "Traumatología"),
                ("PSIQUIATRIA", "Psiquiatría"),
                ("ODONTOLOGIA", "Odontología"),
            ]
            for code, name in seeds:
                db.add(Specialty(code=code, name=name))
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="Professionals Service", lifespan=lifespan)
app.include_router(router)
app.include_router(internal)
