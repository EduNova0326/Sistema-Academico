from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import RoleEnum


# ── Request schemas (lo que llega del frontend) ───────────────

# Esquemas de request: lo que llega desde el frontend.
class UserCreate(BaseModel):
    email:      EmailStr
    password:   str
    full_name:  str
    role:       RoleEnum = RoleEnum.teacher
    subject:    Optional[str] = None


class UserUpdate(BaseModel):
    full_name:  Optional[str] = None
    role:       Optional[RoleEnum] = None
    subject:    Optional[str] = None
    active:     Optional[bool] = None


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


# ── Response schemas (lo que devuelve la API) ─────────────────

# Esquemas de response: lo que devuelve la API al frontend.
class UserResponse(BaseModel):
    id:         str
    email:      EmailStr
    full_name:  str
    role:       str
    subject:    Optional[str] = None
    active:     bool


class TokenResponse(BaseModel):
    access_token:  str
    token_type:    str = "bearer"
    user:          UserResponse
