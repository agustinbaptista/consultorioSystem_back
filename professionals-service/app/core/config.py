from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/consultorio"
    db_schema: str = "professionals"
    internal_api_key: str = "internal-dev-key"
    port: int = 8000


settings = Settings()
