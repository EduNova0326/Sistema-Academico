import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../services/supabaseClient.js'
import { isDirector } from '../services/accessControl.js'

export default function TopBar({ onToggleSidebar, showToast }) {
  const { user, profile, logout } = useAuth()
  const [pendingUsers, setPendingUsers] = useState([])

  const initials = (profile?.full_name || user?.email || 'Usuario')
    .split(' ')
    .map(chunk => chunk[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  useEffect(() => {
    let active = true

    const fetchPendingUsers = async () => {
      if (!isDirector(profile)) {
        if (active) setPendingUsers([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at, role, status')
          .or('role.is.null,role.eq.pending,status.eq.pending')
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error
        if (active) setPendingUsers(data || [])
      } catch (error) {
        console.error(error)
      }
    }

    fetchPendingUsers()
    const intervalId = window.setInterval(fetchPendingUsers, 20000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [profile])

  const handleNotifications = () => {
    if (!isDirector(profile)) {
      showToast('success', 'No hay notificaciones nuevas')
      return
    }

    if (pendingUsers.length === 0) {
      showToast('success', 'No hay usuarios pendientes por aprobar')
      return
    }

    const names = pendingUsers
      .map(item => item.full_name || item.email || 'Usuario')
      .slice(0, 2)
      .join(', ')

    const extraCount = pendingUsers.length - Math.min(pendingUsers.length, 2)
    showToast(
      'success',
      pendingUsers.length === 1
        ? `${names} esta esperando que le asignes un rol`
        : extraCount > 0
          ? `${names} y ${extraCount} mas estan esperando que les asignes un rol`
          : `${names} estan esperando que les asignes un rol`
    )
  }

  return (
    <header className="top-bar">
      <button className="menu-toggle" onClick={onToggleSidebar}>
        <i className="fas fa-bars" />
      </button>

      <div className="search-box">
        <i className="fas fa-search" style={{ color: '#9ca3af' }} />
        <input type="text" placeholder="Buscar estudiantes, cursos, planificaciones..." />
      </div>

      <div className="top-bar-actions">
        <button className="icon-btn" onClick={handleNotifications} title="Notificaciones">
          <i className="fas fa-bell" />
          {isDirector(profile) && pendingUsers.length > 0 && <span className="notification-dot" />}
        </button>

        <div className="user-profile" onClick={logout} title="Cerrar sesion">
          <div className="user-avatar"><span>{initials}</span></div>
          <div className="user-info">
            <div className="name">{profile?.full_name || user?.email || 'Usuario'}</div>
            <div className="role">{profile?.role || 'Sin rol'}</div>
          </div>
          <i className="fas fa-sign-out-alt" style={{ color: '#9ca3af', fontSize: '0.85rem' }} />
        </div>
      </div>
    </header>
  )
}
