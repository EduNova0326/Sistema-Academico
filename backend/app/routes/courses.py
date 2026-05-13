from fastapi import APIRouter, HTTPException
from app.config import settings
from supabase import create_client

router = APIRouter(prefix="/api/courses", tags=["Courses"])

# API de cursos (CRUD simple).
# Nota: la app usa Supabase directo desde el frontend para la mayor parte del CRUD.
# Este router queda como capa auxiliar para cursos (ejemplo de API propia).

# conectar con Supabase
supabase = create_client(settings.supabase_url, settings.supabase_key)


# obtener todos los cursos
@router.get("/")
def get_courses():
    response = supabase.table("courses").select("*").execute()
    return response.data


# crear un curso
@router.post("/")
def create_course(course: dict):
    response = supabase.table("courses").insert({
        "code": course.get("code"),
        "name": course.get("name"),
        "students": course.get("students"),
        "subjects": course.get("subjects"),
        "teacher": course.get("teacher"),
        "status": course.get("status", "active")
    }).execute()

    if response.data is None:
        raise HTTPException(status_code=400, detail="No se pudo crear el curso")

    return {
        "message": "Curso creado correctamente",
        "data": response.data
    }


# eliminar curso
@router.delete("/{course_id}")
def delete_course(course_id: int):
    response = supabase.table("courses").delete().eq("id", course_id).execute()

    return {
        "message": "Curso eliminado",
        "data": response.data
    }
