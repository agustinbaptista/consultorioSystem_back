from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from app.core.config import settings

def _database_url() -> str:
    url = settings.database_url
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    # `uselibpqcompat` is used by some Node clients; psycopg2 rejects it.
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "uselibpqcompat"]
    url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return url


_connect_args = (
    {"sslmode": "require"}
    if "supabase" in settings.database_url or "sslmode=require" in settings.database_url
    else {}
)
engine = create_engine(
    _database_url(),
    pool_pre_ping=True,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {settings.db_schema}"))
        conn.commit()
