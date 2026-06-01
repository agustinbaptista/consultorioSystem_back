"""Ejecuta init-db.sql si los schemas aún no existen (arranque sin auth-service)."""
import os
from pathlib import Path

from sqlalchemy import text

from app.db.session import engine


def _resolve_init_sql() -> Path:
    for candidate in (
        Path.cwd() / "scripts" / "init-db.sql",
        Path.cwd().parent / "scripts" / "init-db.sql",
    ):
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("init-db.sql no encontrado")


def _split_statements(sql: str) -> list[str]:
    lines = [ln for ln in sql.split("\n") if not ln.strip().startswith("--")]
    body = "\n".join(lines)
    return [s.strip() for s in body.split(";") if s.strip()]


def ensure_database_initialized() -> None:
    if os.getenv("DB_AUTO_INIT", "true").lower() == "false":
        return

    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'app_auth' LIMIT 1"
            )
        ).fetchone()
        if row:
            return

    sql_path = _resolve_init_sql()
    sql = sql_path.read_text(encoding="utf-8")
    statements = _split_statements(sql)

    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as exc:  # noqa: BLE001
                msg = str(exc).lower()
                if "already exists" in msg or "duplicate key" in msg:
                    continue
                raise

    print("[db-init] PostgreSQL inicializado desde professionals-service")
