from fastapi import APIRouter, HTTPException, Depends
from app.schemas.user_schema import LoginRequest, TokenResponse
from app.services.supabase_service import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """
    Inicia sesión con email y contraseña usando Supabase Auth.
    Devuelve el token JWT de Supabase.
    """
    # Paso 1: autenticar en Supabase Auth con email y contrasena.
    response = supabase.auth.sign_in_with_password({
        "email":    body.email,
        "password": body.password,
    })

    if not response.session:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    user = response.user
    session = response.session

    # Paso 2: buscar datos extra del usuario en la tabla de la app (users).
    # Supabase Auth guarda credenciales; esta tabla guarda rol, materia, activo, etc.
    db_user = supabase.table("users").select("*").eq("id", user.id).single().execute()
    user_data = db_user.data or {}

    return TokenResponse(
        access_token=session.access_token,
        user={
            "id":        user.id,
            "email":     user.email,
            "full_name": user_data.get("full_name", ""),
            "role":      user_data.get("role", "teacher"),
            "subject":   user_data.get("subject"),
            "active":    user_data.get("active", True),
        }
    )


@router.post("/logout")
async def logout():
    """Cierra la sesión del usuario actual."""
    # Cierra la sesion actual en Supabase (del lado del backend).
    supabase.auth.sign_out()
    return {"message": "Sesión cerrada"}


@router.get("/me")
async def me():
    """
    Devuelve el usuario autenticado actualmente.
    (El token llega en el header Authorization via el interceptor de axios)
    """
    # Devuelve el usuario autenticado si el request trae un token/sesion valido.
    user = supabase.auth.get_user()
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return {"user": user}
