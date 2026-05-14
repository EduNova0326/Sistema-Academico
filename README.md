# EduNova

## Nombre del Proyecto

**EduNova: Planificaciones Docentes y Control de Calificaciones**

## Descripcion del Proyecto

EduNova es un sistema academico web para centros educativos (politecnico) que centraliza:

- Planificacion docente (Matriz institucional anual por Resultados de Aprendizaje - RA)
- Planificacion semanal/diaria (agenda de clases y actividades)
- Control de calificaciones (actividades, pesos, promedios por periodo)
- Control de asistencia (registro diario y exportaciones)
- Reportes administrativos (notas, boletin, rendimiento, asistencia)
- Seguridad por roles (Docente, Coordinador, Director) con flujo de aprobacion
- Auditoria (registro de acciones relevantes)
- Respaldo y recuperacion (snapshots del sistema)

Problema que resuelve:

En muchos centros, la planificacion y las notas se manejan en Word/Excel dispersos, sin estandar, sin trazabilidad y sin reportes consistentes. EduNova los organiza en un solo sistema, con acceso seguro, exportaciones y evidencias administrativas.

## Tecnologias Utilizadas

Frontend (carpeta `frontend/`):

- React 18 + Vite 5
- CSS (estilos globales y componentes)
- TailwindCSS (configurado en el proyecto)
- FontAwesome (iconos)
- xlsx-js-style (Excel con formato profesional)
- jsPDF + jspdf-autotable (PDF)
- Axios (HTTP)
- Supabase JS (Auth + Database)

Backend (carpeta `backend/`):

- Python 3.10+ (recomendado 3.11)
- FastAPI (API REST)
- Uvicorn (servidor ASGI)
- python-dotenv / pydantic-settings (carga de variables .env)
- Supabase Python SDK (server-side)
- SMTP (Gmail App Password) para envio de correos reales

Base de datos / servicios (Supabase):

- Postgres (tablas, indices)
- Auth (usuarios, sesiones)
- RLS (Row Level Security) y politicas por rol/usuario
- RPC (funciones/procedimientos) para operaciones especiales (ej. backups)
- Storage (opcional, si se usa en banco de recursos)

Nota de honestidad tecnica:

- En este repositorio el backend esta implementado con **FastAPI**.
- No hay implementacion de Flask u Odoo dentro de este codigo.

## Caracteristicas del Sistema

Autenticacion y control de acceso por roles:

- Registro de usuarios con estado pendiente.
- Aprobacion por Director: asigna rol (Docente / Coordinador / Director) y habilita acceso.
- Bloqueo por estado (activo / inactivo / pendiente).

Gestion academica (CRUD):

- Docentes (catalogo)
- Cursos y secciones (catalogo)
- Estudiantes (catalogo por curso)

Planificacion:

- Planificacion Anual - Matriz institucional por RA (campos institucionales, EC, dominio, actividades, evaluacion y contenidos).
- Planificacion Semanal/Diario (agenda de clases para alimentar "Actividades de hoy" del Dashboard).
- Plantillas de planificacion (para aplicar estructura y no empezar desde cero).

Evaluacion:

- Instrumentos (rubricas, listas de cotejo, pruebas).
- Calificaciones por actividades con pesos.
- Promedios por periodo y escala de calificacion configurable.

Asistencia:

- Registro por fecha y curso.
- Exportacion a Excel y PDF.

Reportes:

- Reporte de notas por curso.
- Boletin individual.
- Analisis de rendimiento.
- Reporte de asistencia.
- Historial de reportes generados (evidencia administrativa).

Auditoria:

- Registro de eventos: accesos, creacion, actualizacion, eliminacion, exportaciones, respaldos, etc.

Respaldo/Recuperacion:

- Creacion de respaldos (snapshots) desde la app.
- Restauracion de respaldos (segun las tablas incluidas).

Configuracion del sistema:

- Periodos academicos.
- Escalas de calificacion.
- Preferencias institucionales.

## Requisitos del Sistema

Para ejecutar en local (Windows recomendado):

- Node.js 18/20+
- npm
- Python 3.10+ (recomendado 3.11)
- Un proyecto de Supabase (URL + keys)
- (Opcional) Un Gmail con App Password para correos reales

## Instalacion del Proyecto

### 1) Clonar repositorio de GitHub

```bash
git clone <URL_DEL_REPOSITORIO_GITHUB>
cd mi-proyecto
```

Si no tienes Git:

- Instala Git for Windows y reinicia la terminal.

### 2) Instalar dependencias del Frontend

```bash
cd frontend
npm install
```

### 3) Instalar dependencias del Backend

Recomendado: usar entorno virtual (venv).

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Configuracion

### Frontend (.env)

Archivo real:

- `frontend/.env`

Ejemplo recomendado (NO pegues claves privadas):

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<tu_publishable_anon_key>
VITE_BACKEND_URL=http://127.0.0.1:8000
```

Donde consigo los valores:

- Supabase Dashboard -> Project Settings -> API:
  - Project URL -> `VITE_SUPABASE_URL`
  - anon/public key (publishable) -> `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Backend (.env)

Archivo real:

- `backend/.env`

Usa como base:

- `backend/.env.example`

IMPORTANTE (seguridad):

- Nunca subas al repositorio la `SUPABASE_SERVICE_KEY` (service role) si el repo es publico.
- La `SMTP_PASSWORD` NO es tu clave normal de Gmail: es una **App Password**.

Ejemplo recomendado (sin secretos reales):

```bash
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_KEY=<tu_publishable_anon_key_o_backend_key>
SUPABASE_SERVICE_KEY=<tu_service_role_key_solo_backend>
JWT_SECRET=<tu_jwt_secret_de_supabase>
JWT_ALGORITHM=HS256
APP_NAME=EduNova
ENVIRONMENT=development

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<tu_correo_gmail_real>
SMTP_PASSWORD=<tu_app_password_16_caracteres>
SMTP_FROM_EMAIL=<tu_correo_gmail_real>
SMTP_FROM_NAME=EduNova
SMTP_USE_TLS=true
SMTP_USE_SSL=false
DIRECTOR_EMAIL=<correo_real_del_director_que_recibe_alertas>
FRONTEND_URL=http://localhost:3000
```

## Paso de ejecucion del proyecto (paso a paso)

Abre 2 terminales (Frontend y Backend).

### A) Ejecutar Frontend

```bash
cd frontend
npm run dev
```

Abre:

- http://localhost:3000

### B) Ejecutar Backend

```bash
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Health check:

- http://127.0.0.1:8000/ -> debe responder `{ "status": "ok", ... }`

## Estructura del Proyecto

Carpetas reales dentro de este repo:

```text
mi-proyecto/
  README.md
  backend/
    app/
      main.py
      config.py
      routes/
        auth.py
        users.py
        dashboard.py
        courses.py
        notifications.py
      services/
        supabase_service.py
        email_service.py
      schemas/
      models/
    requirements.txt
    .env
    .env.example
  frontend/
    public/
      minerd_logo.png
    src/
      App.jsx
      index.css
      components/
      context/
      pages/
      services/
      data/
      utils/
    package.json
    vite.config.js
    tailwind.config.cjs
```

## Uso del Sistema

Menu lateral (en orden):

1. Dashboard
2. Calendario Academico
3. Docentes
4. Cursos y Secciones
5. Estudiantes
6. Plan Anual (RA)
7. Plan Semanal/Diario
8. Plantillas
9. Banco de Recursos
10. Instrumentos
11. Calificaciones
12. Reportes
13. Asistencia
14. Usuarios y Permisos
15. Auditoria
16. Respaldo
17. Configuracion

Flujo recomendado de uso (real):

1) Usuario se registra:

- Se crea el usuario en Supabase Auth.
- Se crea/actualiza su perfil (tabla `profiles`) con estado pendiente.
- El usuario no puede entrar hasta que el Director asigne rol.

2) Director aprueba:

- En "Usuarios y Permisos" ve el usuario nuevo.
- Asigna rol (Docente / Coordinador / Director).
- Activa el usuario.

3) Docente trabaja:

- En "Plan Anual (RA)" llena Datos generales y luego agrega RA con EC, dominio, actividades, evaluacion y contenidos.
- En "Plan Semanal/Diario" agenda clases.
- En "Instrumentos" crea rubricas/listas/pruebas.
- En "Calificaciones" registra actividades y notas.
- En "Asistencia" registra la asistencia diaria.
- En "Reportes" genera reportes oficiales.

4) Auditoria y respaldos:

- "Auditoria" mantiene trazabilidad.
- "Respaldo" permite snapshots y restauracion.

## Credenciales relevantes

- Para demo, registra usuarios con correos reales si quieres recibir notificaciones.
- No se incluyen contrasenas reales en este repositorio por seguridad.
- `DIRECTOR_EMAIL` debe ser un correo real si quieres recibir alertas.

## API utilizada y su implementacion paso a paso

### 1) Supabase Auth (Frontend)

Objetivo:

- Registro y login seguro.
- Sesion persistente.

Flujo real:

1. Frontend llama a `supabase.auth.signUp(...)`.
2. Supabase crea el usuario en `auth.users`.
3. En Postgres se crea/actualiza `public.profiles` (perfil, rol, estado).
4. El usuario queda pendiente hasta aprobacion.
5. En login, el frontend valida perfil/rol antes de permitir acceso total.

### 2) Supabase Database (Frontend)

Objetivo:

- CRUD desde el frontend usando `@supabase/supabase-js`.

Patron CRUD (ejemplo):

1. Leer: `supabase.from('students').select(...)`
2. Crear: `supabase.from('students').insert(...)`
3. Editar: `supabase.from('students').update(...).eq('id', ...)`
4. Eliminar: `supabase.from('students').delete().eq('id', ...)`

Seguridad:

- RLS + politicas (por rol/usuario) evitan accesos indebidos.

### 3) FastAPI (Backend)

Objetivo:

- Procesos server-side:
  - Notificaciones por correo (SMTP)
  - Endpoints administrativos del sistema

Archivos clave:

- `backend/app/main.py`: crea la app, CORS, registra routers.
- `backend/app/routes/*.py`: endpoints (auth, usuarios, dashboard, cursos, notificaciones).
- `backend/app/services/email_service.py`: envio de correos reales por SMTP.
- `backend/app/services/supabase_service.py`: conexion server-side a Supabase.
- `backend/app/config.py`: lectura de variables `.env`.

### 4) Exportaciones (PDF/Excel)

- PDF: jsPDF + autoTable (frontend)
- Excel: xlsx-js-style (frontend) para bordes, encabezados y colores.

## Autor del desarrollado y Administrador del proyecto

- Autor del desarrollo: **Jose Luis Rijo Rodriguez**
- Administrador del proyecto: **Jose Luis Rijo Rodriguez**

## Entregables (lo que se entrega en USB)

Proyecto completo:

- Carpeta `frontend/`
- Carpeta `backend/`
- `README.md`

Base de datos (Supabase) - archivos a exportar y entregar:

- Backup (export de base de datos)
- Script completo:
  - tablas
  - indices
  - RPC (funciones / procedimientos)
  - Realtime (si aplica)
  - Edge Functions (si aplica)
- Diagrama de base de datos (exportado desde Supabase o herramienta de diagramas)

Documentacion requerida:

- Acta de proyecto
- Cronograma de actividades
- Manual de usuario
- Manual tecnico
- Analisis y diseno del sistema

Presentacion:

- Presentacion tipo propuesta del proyecto (Canva / PDF / PPTX)

## Presentacion (Canva)

- https://www.canva.com/d/_SuLJCe8cgU8vMQ
