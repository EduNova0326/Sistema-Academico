from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Configuracion central del backend. Los valores se cargan desde backend/.env
    # Asi puedes cambiar claves, SMTP, etc. sin tocar el codigo.
    supabase_url:   str
    supabase_key:   str
    # Recomendado: usar la service role key en backend para poder escribir logs
    # sin pelear con RLS. Si no se define, se usa `supabase_key`.
    supabase_service_key: str = ""
    jwt_secret:     str
    jwt_algorithm:  str = "HS256"
    app_name:       str = "EduNova"
    environment:    str = "development"

    # Configuracion SMTP (la usa app/services/email_service.py)
    smtp_host:      str = ""
    smtp_port:      int = 587
    smtp_username:  str = ""
    smtp_password:  str = ""
    smtp_from_email:str = ""
    smtp_from_name: str = "EduNova"
    smtp_use_tls:   bool = True
    smtp_use_ssl:   bool = False

    # Correo del director/administrador que recibe avisos (registro pendiente, etc.)
    director_email: str = "yo@gmail.com"
    frontend_url:   str = "http://localhost:3000"

    # Carga SIEMPRE el `.env` del backend, aunque ejecutes uvicorn desde otra carpeta.
    model_config = SettingsConfigDict(
        # Fuerza a cargar el .env del backend aunque ejecutes uvicorn desde otra carpeta.
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        case_sensitive=False,
        extra="ignore",
    )

# Instancia unica de configuracion usada por todo el backend.
settings = Settings()
