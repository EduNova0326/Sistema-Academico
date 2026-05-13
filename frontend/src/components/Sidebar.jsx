import { canAccessSection } from '../services/accessControl.js'

const NAV = [
  { section: 'dashboard', icon: 'fa-th-large', label: 'Dashboard', group: 'Principal' },
  { section: 'calendar', icon: 'fa-calendar-alt', label: 'Calendario Academico', group: 'Principal' },
  { section: 'teachers', icon: 'fa-chalkboard-teacher', label: 'Docentes', group: 'Gestion Academica' },
  { section: 'courses', icon: 'fa-book-open', label: 'Cursos y Secciones', group: 'Gestion Academica' },
  { section: 'students', icon: 'fa-users', label: 'Estudiantes', group: 'Gestion Academica' },
  { section: 'annual-planning', icon: 'fa-sitemap', label: 'Plan Anual (RA)', group: 'Planificacion' },
  { section: 'weekly-planning', icon: 'fa-calendar-week', label: 'Plan Semanal/Diario', group: 'Planificacion' },
  { section: 'templates', icon: 'fa-copy', label: 'Plantillas', group: 'Planificacion' },
  { section: 'resources', icon: 'fa-folder-open', label: 'Banco de Recursos', group: 'Planificacion' },
  { section: 'instruments', icon: 'fa-tasks', label: 'Instrumentos', group: 'Evaluacion' },
  { section: 'grades', icon: 'fa-star', label: 'Calificaciones', group: 'Evaluacion' },
  { section: 'reports', icon: 'fa-chart-bar', label: 'Reportes', group: 'Evaluacion' },
  { section: 'attendance', icon: 'fa-clipboard-check', label: 'Asistencia', group: 'Evaluacion' },
  { section: 'users', icon: 'fa-user-shield', label: 'Usuarios y Permisos', group: 'Administracion' },
  { section: 'audit', icon: 'fa-history', label: 'Auditoria', group: 'Administracion' },
  { section: 'backup', icon: 'fa-database', label: 'Respaldo', group: 'Administracion' },
  { section: 'settings', icon: 'fa-cog', label: 'Configuracion', group: 'Administracion' },
]

const GROUPS = ['Principal', 'Gestion Academica', 'Planificacion', 'Evaluacion', 'Administracion']

export default function Sidebar({ activeSection, onNavigate, sidebarOpen, profile }) {
  const visibleItems = NAV.filter(item => canAccessSection(profile, item.section))

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <i className="fas fa-graduation-cap" style={{ color: 'white', fontSize: '1.25rem' }} />
        </div>
        <div>
          <h1>EduNova</h1>
          <span>Sistema Academico v2.0</span>
        </div>
      </div>

      {GROUPS.map(group => {
        const groupItems = visibleItems.filter(item => item.group === group)
        if (groupItems.length === 0) return null

        return (
          <nav className="nav-section" key={group}>
            <div className="nav-section-title">{group}</div>
            {groupItems.map(item => (
              <div
                key={item.section}
                className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
                onClick={() => onNavigate(item.section)}
              >
                <i className={`fas ${item.icon}`} />
                <span>{item.label}</span>
                {item.badge && <span className="badge">{item.badge}</span>}
              </div>
            ))}
          </nav>
        )
      })}
    </aside>
  )
}
