import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { recordAuditEvent, resolveAuditType } from './services/auditLogger.js'
import { canAccessSection, getDefaultSection } from './services/accessControl.js'

import Login from './pages/Login.jsx'
import Register from './pages/register.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import PendingScreen from './components/PendingScreen.jsx'

import Dashboard from './pages/Dashboard.jsx'
import Teachers from './pages/Teachers.jsx'
import Students from './pages/Students.jsx'
import Grades from './pages/Grades.jsx'
import {
  Courses, AnnualPlanning, WeeklyPlanning, Templates, Resources,
  Instruments, Reports, CalendarSection, Attendance,
  Users, Audit, Backup, Settings,
} from './pages/OtherPages.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AccessDenied({ onNavigate }) {
  return (
    <section>
      <div className="card" style={{ maxWidth: 720, margin: '3rem auto' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: '50%',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239,68,68,0.08)',
              color: 'var(--danger)',
              fontSize: '2rem',
            }}
          >
            <i className="fas fa-lock" />
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>No tienes permiso para entrar aqui</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Esta seccion no esta incluida dentro de tu rol actual.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
            <i className="fas fa-arrow-left" />Volver al dashboard
          </button>
        </div>
      </div>
    </section>
  )
}

function AppLayout() {
  const { logout, user, profile, isPending, isInactive, profileLoading } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  const SECTION_LABELS = {
    dashboard: 'Dashboard',
    teachers: 'Docentes',
    students: 'Estudiantes',
    courses: 'Cursos',
    'annual-planning': 'Planificacion Anual',
    'weekly-planning': 'Planificacion Semanal',
    templates: 'Plantillas',
    resources: 'Recursos',
    instruments: 'Instrumentos',
    grades: 'Calificaciones',
    reports: 'Reportes',
    calendar: 'Calendario',
    attendance: 'Asistencia',
    users: 'Usuarios',
    audit: 'Auditoria',
    backup: 'Respaldos',
    settings: 'Configuracion',
  }

  useEffect(() => {
    if (!profile || isPending || isInactive) return
    if (!canAccessSection(profile, activeSection)) {
      setActiveSection(getDefaultSection(profile))
    }
  }, [activeSection, profile, isPending, isInactive])

  const showToast = (type, message) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 4000)

    const ignoredMessages = ['No hay notificaciones nuevas']
    if (type === 'success' && !ignoredMessages.includes(message)) {
      const module = SECTION_LABELS[activeSection] || 'Sistema'
      recordAuditEvent({
        user,
        module,
        action: message,
        details: `Seccion activa: ${module}`,
        type: resolveAuditType({ module, action: message }),
      }).catch(() => {})
    }
  }

  const navigate = (section) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  const props = { showToast, onNavigate: navigate }

  const renderPage = () => {
    if (!canAccessSection(profile, activeSection)) {
      return <AccessDenied onNavigate={navigate} />
    }

    switch (activeSection) {
      case 'dashboard': return <Dashboard {...props} />
      case 'teachers': return <Teachers {...props} />
      case 'students': return <Students {...props} />
      case 'courses': return <Courses {...props} />
      case 'annual-planning': return <AnnualPlanning {...props} />
      case 'weekly-planning': return <WeeklyPlanning {...props} />
      case 'templates': return <Templates {...props} />
      case 'resources': return <Resources {...props} />
      case 'instruments': return <Instruments {...props} />
      case 'grades': return <Grades {...props} />
      case 'reports': return <Reports {...props} />
      case 'calendar': return <CalendarSection {...props} />
      case 'attendance': return <Attendance {...props} />
      case 'users': return <Users {...props} />
      case 'audit': return <Audit {...props} />
      case 'backup': return <Backup {...props} />
      case 'settings': return <Settings {...props} />
      default: return <Dashboard {...props} />
    }
  }

  if (profileLoading && user) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando perfil...</div>
  }

  if (isPending || isInactive) {
    return <PendingScreen onLogout={logout} profile={profile} />
  }

  return (
    <>
      <Sidebar
        activeSection={activeSection}
        onNavigate={navigate}
        sidebarOpen={sidebarOpen}
        profile={profile}
      />
      <main className="main-content">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          showToast={showToast}
        />
        <div className="content-area">{renderPage()}</div>
      </main>
      <ToastContainer toasts={toasts} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={<PrivateRoute><AppLayout /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
