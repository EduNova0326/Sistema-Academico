from fastapi import APIRouter
from app.services.supabase_service import supabase

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# API del dashboard.
# Sirve para devolver metricas rapidas (contadores y alertas).
# No crea datos: solo consulta tablas en Supabase y devuelve un resumen.

@router.get("/stats")
async def get_stats():
    """
    Devuelve las estadísticas principales para el dashboard:
    - Total de estudiantes activos
    - Cursos asignados
    - Planificaciones creadas
    - Alertas pendientes (estudiantes con promedio < 60)
    """
    # Students: count active students.
    students_res = supabase.table("students").select("id", count="exact").eq("active", True).execute()
    total_students = students_res.count or 0

    # Courses: count total courses.
    courses_res = supabase.table("courses").select("id", count="exact").execute()
    total_courses = courses_res.count or 0

    # Plannings: count annual plan headers.
    plans_res = supabase.table("annual_plans").select("id", count="exact").execute()
    total_plans = plans_res.count or 0

    # Alerts: students with low average.
    alerts_res = supabase.table("students").select("id", count="exact").lt("average", 60).execute()
    total_alerts = alerts_res.count or 0

    return {
        "students":     total_students,
        "courses":      total_courses,
        "plannings":    total_plans,
        "alerts":       total_alerts,
    }
