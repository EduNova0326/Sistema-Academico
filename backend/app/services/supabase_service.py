from supabase import create_client, Client
from app.config import settings

# Cliente Supabase compartido por toda la app.
# Nota: en backend es mejor usar SUPABASE_SERVICE_KEY para poder:
# - escribir logs y auditorias sin chocar con RLS
# - ejecutar acciones administrativas desde el servidor
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_key or settings.supabase_key,
)


def get_supabase() -> Client:
    """Dependencia de FastAPI para inyectar el cliente Supabase."""
    return supabase


# ── Helpers genéricos ─────────────────────────────────────────

def fetch_all(table: str, filters: dict = None):
    # Sirve para listar registros de una tabla con filtros opcionales.
    """Obtiene todos los registros de una tabla con filtros opcionales."""
    query = supabase.table(table).select("*")
    if filters:
        for key, value in filters.items():
            query = query.eq(key, value)
    response = query.execute()
    return response.data


def fetch_one(table: str, id: str):
    """Obtiene un registro por su id."""
    response = supabase.table(table).select("*").eq("id", id).single().execute()
    return response.data


def insert(table: str, data: dict):
    """Inserta un nuevo registro."""
    response = supabase.table(table).insert(data).execute()
    return response.data[0] if response.data else None


def update(table: str, id: str, data: dict):
    """Actualiza un registro por id."""
    response = supabase.table(table).update(data).eq("id", id).execute()
    return response.data[0] if response.data else None


def delete(table: str, id: str):
    """Elimina un registro por id."""
    response = supabase.table(table).delete().eq("id", id).execute()
    return response.data
