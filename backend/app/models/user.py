from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class RoleEnum(str, Enum):
    # Business roles used by the system for access control.
    director    = "director"
    coordinator = "coordinator"
    teacher     = "teacher"


class User(BaseModel):
    """Representa un usuario del sistema tal como viene de Supabase."""
    id:         str
    email:      EmailStr
    full_name:  str
    role:       RoleEnum
    subject:    Optional[str] = None
    active:     bool = True

    class Config:
        use_enum_values = True
