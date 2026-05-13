import re
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.services.supabase_service import supabase

# Subsistema de correos (SMTP) para EduNova.
# Este archivo cubre 3 cosas dentro del sistema:
# 1) Enviar correos reales por SMTP (Gmail con App Password recomendado)
# 2) Plantillas de correo para eventos del sistema (registro, rol asignado)
# 3) Intentar registrar un log en la tabla email_notifications (si falla, no rompe el flujo)

def _html_to_text(html: str) -> str:
    # Convierte un HTML basico a texto plano (por compatibilidad con clientes que no renderizan HTML).
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


class SMTPEmailService:
    def __init__(self):
        # Esta parte carga la configuracion SMTP desde backend/.env (a traves de app/config.py).
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.from_name = settings.smtp_from_name
        self.use_tls = settings.smtp_use_tls
        self.use_ssl = settings.smtp_use_ssl

    @property
    def is_configured(self) -> bool:
        # Para Gmail casi siempre se requiere usuario/clave (App Password).
        return bool(self.host and self.from_email and self.port)

    def _validate(self) -> Optional[str]:
        if not self.host:
            return "Falta SMTP_HOST"
        if not self.port:
            return "Falta SMTP_PORT"
        if not self.from_email:
            return "Falta SMTP_FROM_EMAIL"
        # Reglas recomendadas para Gmail
        if "gmail.com" in (self.host or "").lower():
            if not self.username:
                return "Falta SMTP_USERNAME (correo de Gmail)"
            if not self.password:
                return "Falta SMTP_PASSWORD (App Password de Google, no tu clave normal)"
        return None

    def _normalized_password(self) -> str:
        # Google muestra App Password con espacios: "abcd efgh ijkl mnop"
        # A SMTP le sirve sin espacios.
        return (self.password or "").replace(" ", "")

    def send_email(
        self,
        recipient_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> dict:
        # Esta es la funcion base de envio. Las notificaciones del sistema llaman a esta funcion.
        error = self._validate()
        if error:
            return {
                "ok": False,
                "message": f"SMTP no configurado: {error}. Revisa backend/.env",
            }

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = recipient_email
        message.set_content(text_body or _html_to_text(html_body))
        message.add_alternative(html_body, subtype="html")

        try:
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=20)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=20)

            with server:
                server.ehlo()
                if self.use_tls and not self.use_ssl:
                    server.starttls()
                    server.ehlo()
                if self.username:
                    server.login(self.username, self._normalized_password())
                server.send_message(message)

            return {"ok": True, "message": "Correo enviado correctamente"}
        except Exception as error:
            return {"ok": False, "message": str(error)}


email_service = SMTPEmailService()


def _log_email_notification(
    *,
    template_key: str,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    status: str,
    actor_name: str = "",
    actor_email: str = "",
    metadata: Optional[dict] = None,
    error_message: Optional[str] = None,
):
    # Log no bloqueante: intenta guardar un registro del correo en Supabase.
    # Si Supabase lo rechaza (RLS, tabla no existe, etc.) no se cae el envio del correo.
    try:
        payload = {
            "template_key": template_key,
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "subject": subject,
            "status": status,
            "actor_name": actor_name or None,
            "actor_email": actor_email or None,
            "metadata": metadata or {},
            "error_message": error_message,
            "sent_at": datetime.now(timezone.utc).isoformat() if status == "sent" else None,
        }
        supabase.table("email_notifications").insert(payload).execute()
    except Exception as error:
        # No cortamos el flujo de negocio por errores de auditoria,
        # pero dejamos un rastro claro en logs para poder diagnosticar.
        print("[email_notifications] No se pudo registrar en Supabase:", error)


def _registration_user_template(name: str) -> tuple[str, str]:
    # Plantilla: correo al usuario nuevo (su cuenta queda pendiente hasta asignacion de rol).
    subject = "Tu cuenta fue creada en EduNova"
    html = f"""
    <h2>Hola, {name}</h2>
    <p>Tu cuenta fue creada correctamente en <strong>EduNova</strong>.</p>
    <p>Ahora mismo tu acceso esta <strong>pendiente de aprobacion</strong>. El director debe asignarte un rol para que puedas entrar al sistema.</p>
    <p>Cuando tu rol sea asignado, recibiras una nueva notificacion.</p>
    <p>Equipo EduNova</p>
    """
    return subject, html


def _registration_director_template(name: str, email: str) -> tuple[str, str]:
    # Plantilla: correo al director para avisar que hay un registro pendiente.
    subject = "Nuevo usuario registrado en EduNova"
    html = f"""
    <h2>Nuevo registro pendiente</h2>
    <p>Se registro un nuevo usuario en <strong>EduNova</strong> y esta esperando asignacion de rol.</p>
    <ul>
      <li><strong>Nombre:</strong> {name}</li>
      <li><strong>Correo:</strong> {email}</li>
    </ul>
    <p>Entra a <strong>Usuarios y Permisos</strong> para asignarle su rol.</p>
    """
    return subject, html


def _role_assigned_template(user_name: str, role: str, assigned_by_name: str) -> tuple[str, str]:
    # Plantilla: correo al usuario cuando ya le asignaron un rol y puede entrar al sistema.
    subject = "Tu cuenta ya fue habilitada en EduNova"
    html = f"""
    <h2>Hola, {user_name}</h2>
    <p>Tu cuenta ya fue actualizada en <strong>EduNova</strong>.</p>
    <p>Rol asignado: <strong>{role}</strong></p>
    <p>Asignado por: <strong>{assigned_by_name}</strong></p>
    <p>Ya puedes iniciar sesion e ingresar al sistema con los permisos de tu rol.</p>
    """
    return subject, html


def send_registration_notifications(name: str, email: str) -> dict:
    # Caso de uso: cuando un usuario se registra, el sistema envia:
    # 1) correo al usuario (pendiente de aprobacion)
    # 2) correo al director (nuevo registro pendiente)
    sent_count = 0

    subject, html = _registration_user_template(name)
    user_result = email_service.send_email(email, subject, html)
    _log_email_notification(
        template_key="registration_user",
        recipient_email=email,
        recipient_name=name,
        subject=subject,
        status="sent" if user_result["ok"] else "failed",
        metadata={"kind": "registration"},
        error_message=None if user_result["ok"] else user_result["message"],
    )
    if user_result["ok"]:
        sent_count += 1

    director_subject, director_html = _registration_director_template(name, email)
    director_result = email_service.send_email(settings.director_email, director_subject, director_html)
    _log_email_notification(
        template_key="registration_director",
        recipient_email=settings.director_email,
        recipient_name="Director",
        subject=director_subject,
        status="sent" if director_result["ok"] else "failed",
        metadata={"registered_name": name, "registered_email": email},
        error_message=None if director_result["ok"] else director_result["message"],
    )
    if director_result["ok"]:
        sent_count += 1

    if sent_count == 2:
        return {"ok": True, "message": "Correos de registro enviados", "sent_count": sent_count}

    if sent_count > 0:
        return {"ok": True, "message": "Se enviaron algunos correos, pero otros fallaron", "sent_count": sent_count}

    return {"ok": False, "message": user_result["message"], "sent_count": sent_count}


def send_role_assigned_notification(
    *,
    user_name: str,
    user_email: str,
    role: str,
    assigned_by_name: str,
    assigned_by_email: str,
) -> dict:
    # Caso de uso: cuando el director asigna rol, se notifica al usuario por correo.
    subject, html = _role_assigned_template(user_name, role, assigned_by_name)
    result = email_service.send_email(user_email, subject, html)

    _log_email_notification(
        template_key="role_assigned",
        recipient_email=user_email,
        recipient_name=user_name,
        subject=subject,
        status="sent" if result["ok"] else "failed",
        actor_name=assigned_by_name,
        actor_email=assigned_by_email,
        metadata={"role": role},
        error_message=None if result["ok"] else result["message"],
    )

    return {
        "ok": result["ok"],
        "message": "Correo de rol asignado enviado" if result["ok"] else result["message"],
        "sent_count": 1 if result["ok"] else 0,
    }
