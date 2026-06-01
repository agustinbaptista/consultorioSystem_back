from fastapi import Header, HTTPException, status

from app.core.config import settings


def verify_internal_key(x_internal_service_key: str = Header(default="")):
    if x_internal_service_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
