from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.schemas.notification_schema import (
    EmailNotificationResponse,
    RegistrationNotificationRequest,
    RoleAssignedNotificationRequest,
)
from app.services.email_service import (
    email_service,
    send_registration_notifications,
    send_role_assigned_notification,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# API de notificaciones por correo.
# Estos endpoints se llaman desde el sistema cuando pasa algo importante:
# - Registro de usuario: se avisa al usuario y al director
# - Asignacion de rol: se avisa al usuario que ya puede entrar
# - Prueba SMTP: sirve para comprobar la configuracion del correo

class TestEmailRequest(BaseModel):
    to: EmailStr

@router.post("/test", response_model=EmailNotificationResponse)
async def test_email(body: TestEmailRequest):
    """
    Endpoint rapido para verificar SMTP sin depender del flujo de registro/roles.
    """
    try:
        # Prueba directa de SMTP. Si esto funciona, backend/.env esta bien configurado.
        result = email_service.send_email(
            recipient_email=str(body.to),
            subject="Prueba SMTP EduNova",
            html_body="<p>Si recibes este correo, SMTP ya esta funcionando.</p>",
        )
        return EmailNotificationResponse(**result)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"No se pudo enviar el correo de prueba: {error}")


@router.post("/register", response_model=EmailNotificationResponse)
async def notify_registration(body: RegistrationNotificationRequest):
    try:
        # Evento del sistema: registro pendiente de aprobacion.
        result = send_registration_notifications(body.name, body.email)
        return EmailNotificationResponse(**result)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"No se pudo procesar el correo de registro: {error}")


@router.post("/role-assigned", response_model=EmailNotificationResponse)
async def notify_role_assigned(body: RoleAssignedNotificationRequest):
    try:
        # Evento del sistema: rol asignado/activado por director o coordinador.
        result = send_role_assigned_notification(
            user_name=body.user_name,
            user_email=body.user_email,
            role=body.role,
            assigned_by_name=body.assigned_by_name or "Director",
            assigned_by_email=body.assigned_by_email or "",
        )
        return EmailNotificationResponse(**result)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"No se pudo procesar el correo de rol asignado: {error}")
