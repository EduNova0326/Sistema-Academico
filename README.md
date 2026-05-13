# EduNova

## Nombre del Proyecto

**EduNova: Planificaciones Docentes y Control de Calificaciones**

## Descripción del Proyecto

EduNova es un sistema académico web que centraliza la **planificación docente** (matriz institucional anual y planificación semanal/diaria) y el **control de calificaciones y asistencia**, con **seguridad por roles**, **auditoría** y **respaldo/recuperación** de información.

El objetivo es resolver el problema típico de instituciones donde la planificación y notas se manejan en Word/Excel dispersos, sin trazabilidad ni reportes consistentes.

## Tecnologías Utilizadas

- Frontend: **React + Vite**
- Estilos: **CSS + Tailwind (utilizado para componentes reutilizables)**
- Backend: **Python + FastAPI**
- Base de datos y autenticación: **Supabase (Postgres + Auth + RLS)**
- Exportaciones: **jsPDF**, **xlsx/xlsx-js-style**
- Nota: En este repositorio **no se utiliza Flask ni Odoo** (la API se implementa en FastAPI).

## Características del Sistema

- Autenticación segura con Supabase Auth
- Control de acceso por roles: Docente, Coordinador, Director (flujo de aprobación)
- CRUD académico: Docentes, Cursos/Secciones, Estudiantes
- Planificación anual: Matriz institucional por RA (Resultados de Aprendizaje)
- Planificación semanal/diaria y uso de plantillas
- Banco de recursos
- Instrumentos de evaluación (rúbricas, listas, pruebas)
- Calificaciones por actividad + promedios por periodo
- Asistencia y exportación profesional a Excel/PDF
- Reportes administrativos (historial de reportes generados)
- Auditoría de acciones clave
- Respaldo y recuperación (snapshots) desde la app
- Configuración institucional (periodos, escalas, preferencias)

## Requisitos del Sistema

- Node.js 18+ (recomendado 18/20)
- NPM
- Python 3.10+ (recomendado 3.11+)
- Cuenta/proyecto en Supabase
- Variables `.env` configuradas (frontend y backend)

## Instalación del Proyecto

### Clonar repositorio

```bash
git clone <URL_DEL_REPOSITORIO_GITHUB>
cd mi-proyecto
```

### Instalar dependencias

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
pip install -r requirements.txt
```

## Configuración

### Frontend (.env)

Archivo: [frontend/.env](/C:/Users/ENMANUEL/Downloads/mi-proyecto/frontend/.env)

Ejemplo (sin claves reales):

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_BACKEND_URL=http://127.0.0.1:8000
```

### Backend (.env)

Usa [backend/.env.example](/C:/Users/ENMANUEL/Downloads/mi-proyecto/backend/.env.example) como referencia.

Variables principales:

- `SUPABASE_URL`
- `SUPABASE_KEY` (anon o service role según tu caso)
- `SUPABASE_SERVICE_KEY` (recomendado para backend)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_USE_TLS`, `SMTP_USE_SSL`
- `DIRECTOR_EMAIL`
- `FRONTEND_URL`

## Paso de Ejecución del Proyecto (Paso a Paso)

### 1) Levantar Frontend

```bash
cd frontend
npm run dev
```

### 2) Levantar Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

## Base de Datos (Supabase)

### Script completo (tablas + índices + RPC + RLS + grants + Realtime opcional)

Ejecuta en Supabase SQL Editor (una sola vez):

- [supabase_setup_all.sql](/C:/Users/ENMANUEL/Downloads/mi-proyecto/database/supabase_setup_all.sql)

Script adicional con solo tablas académicas (si lo quieres por separado):

- [academic_tables.sql](/C:/Users/ENMANUEL/Downloads/mi-proyecto/database/academic_tables.sql)

### Diagrama de Base de Datos

- [diagrama_bd.mmd](/C:/Users/ENMANUEL/Downloads/mi-proyecto/database/diagrama_bd.mmd)
- [diagrama_bd.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/diagrama_bd.md)

## Estructura del Proyecto

- [frontend](/C:/Users/ENMANUEL/Downloads/mi-proyecto/frontend)
- [backend](/C:/Users/ENMANUEL/Downloads/mi-proyecto/backend)
- [database](/C:/Users/ENMANUEL/Downloads/mi-proyecto/database)
- [docs](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs)
- [supabase](/C:/Users/ENMANUEL/Downloads/mi-proyecto/supabase)

## Uso del Sistema (Resumen)

1. Registro: el usuario se crea en estado pendiente.
2. Director: entra a “Usuarios y Permisos”, asigna rol y habilita el acceso.
3. Docente: crea Planificación Anual (matriz), plan semanal, calificaciones y asistencia.
4. Reportes: genera reportes y exporta evidencia.
5. Auditoría y Respaldo: control y protección de información.

## Credenciales Relevantes

- Para la demo, usa un correo real al registrar usuarios (para recibir notificaciones).
- No se incluyen contraseñas reales en este repositorio por seguridad.

## API Utilizada y su Implementación (Paso a Paso)

1. **Supabase Auth**:
   - Login/registro desde el frontend con `@supabase/supabase-js`.
   - Perfil y roles en tabla `profiles` con RLS.
2. **Supabase Database**:
   - CRUD desde el frontend con `supabase.from('<tabla>')...`.
3. **FastAPI** (backend):
   - Endpoints para procesos administrativos/notificaciones.
   - Envío de correos SMTP en `backend/app/services/email_service.py`.

## Autor(es)

- Autor del desarrollo: **Jose Emmanuel Pichardo Alvarez**
- Autor / administrador del proyecto (según profesor): **Rijo**

## Acta de Proyecto

- [docs/acta_proyecto.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/acta_proyecto.md)

## Manual Técnico

- [docs/manual_tecnico.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/manual_tecnico.md)

## Manual de Usuario

- [docs/manual_usuario.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/manual_usuario.md)

## Cronograma de Actividades

- [docs/cronograma_actividades.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/cronograma_actividades.md)

## Análisis y Diseño del Sistema

- [docs/analisis_y_diseno.md](/C:/Users/ENMANUEL/Downloads/mi-proyecto/docs/analisis_y_diseno.md)

## Presentación (Propuesta del Proyecto)

Presentación en Canva (exportable a PDF/PPTX):

- https://www.canva.com/d/_SuLJCe8cgU8vMQ
