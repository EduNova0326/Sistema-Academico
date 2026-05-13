from fastapi import APIRouter, HTTPException
from app.schemas.user_schema import UserCreate, UserUpdate, UserResponse
from app.services.supabase_service import supabase, fetch_all, fetch_one, update, delete

router = APIRouter(prefix="/users", tags=["Users"])

# API de usuarios (administracion).
# Diferencia importante dentro del sistema:
# - Supabase Auth: guarda credenciales (email, contrasena, sesion)
# - Tabla users: guarda campos del negocio (nombre, rol, materia, activo)

@router.get("/", response_model=list[UserResponse])
async def get_users():
    """Lista todos los usuarios/docentes del sistema."""
    data = fetch_all("users")
    return data


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Obtiene un usuario por su ID."""
    data = fetch_one("users", user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(body: UserCreate):
    """
    Crea un nuevo usuario:
    1) Lo registra en Supabase Auth
    2) Guarda sus datos en la tabla 'users'
    """
    # Paso 1: crear cuenta en Supabase Auth (credenciales).
    auth_response = supabase.auth.admin.create_user({
        "email":    body.email,
        "password": body.password,
        "email_confirm": True,
    })
    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Error al crear el usuario en Auth")

    uid = auth_response.user.id

    # Paso 2: guardar datos extra en la tabla users (campos del sistema).
    user_row = {
        "id":        uid,
        "email":     body.email,
        "full_name": body.full_name,
        "role":      body.role,
        "subject":   body.subject,
        "active":    True,
    }
    result = supabase.table("users").insert(user_row).execute()
    return result.data[0]


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, body: UserUpdate):
    """Actualiza los datos de un usuario."""
    data = body.model_dump(exclude_none=True)
    result = update("users", user_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return result


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Elimina un usuario del sistema."""
    # Se elimina en los dos lados para que no queden cuentas huerfanas:
    # 1) tabla users
    # 2) Supabase Auth
    delete("users", user_id)
    supabase.auth.admin.delete_user(user_id)
    return {"message": "Usuario eliminado"}
