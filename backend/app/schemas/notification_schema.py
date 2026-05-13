from pydantic import BaseModel, EmailStr
from typing import Optional


# Request: datos para notificar registro por correo.
class RegistrationNotificationRequest(BaseModel):
    name: str
    email: EmailStr


# Request: datos para notificar rol asignado por correo.
class RoleAssignedNotificationRequest(BaseModel):
    user_name: str
    user_email: EmailStr
    role: str
    assigned_by_name: Optional[str] = None
    assigned_by_email: Optional[EmailStr] = None


# Response estandar que devuelven los endpoints /notifications.
class EmailNotificationResponse(BaseModel):
    ok: bool
    message: str
    sent_count: int = 0
