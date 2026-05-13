import { useEffect, useMemo, useState } from 'react'
import {
  exportAuditEntries,
  formatAuditTime,
  getAuditInitials,
  getAuditTypeMeta,
  loadAuditEntries,
} from '../services/auditLogger.js'

const TYPE_OPTIONS = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'auth', label: 'Acceso' },
  { value: 'create', label: 'Creacion' },
  { value: 'update', label: 'Actualizacion' },
  { value: 'delete', label: 'Eliminacion' },
  { value: 'grade', label: 'Calificaciones' },
  { value: 'attendance', label: 'Asistencia' },
  { value: 'report', label: 'Reportes' },
  { value: 'planning', label: 'Planificacion' },
  { value: 'backup', label: 'Respaldos' },
  { value: 'system', label: 'Sistema' },
]

export function Audit({ showToast, onNavigate }) {
  const [logs, setLogs] = useState([])
  const [typeF, setTypeF] = useState('Todos')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PER = 12

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      if (active) setLoading(true)
      try {
        const auditData = await loadAuditEntries()
        if (!active) return
        setLogs(auditData)
      } catch (error) {
        console.error(error)
        if (active) showToast('error', 'Error al cargar auditoria')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()

    const intervalId = window.setInterval(fetchData, 15000)
    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [showToast])

  useEffect(() => {
    setPage(1)
  }, [typeF, query])

  const filteredLogs = useMemo(
    () => {
      const q = query.trim().toLowerCase()
      return logs.filter(log => {
        if (typeF !== 'Todos' && log.event_type !== typeF) return false
        if (!q) return true
        const hay = `${log.actor_name || ''} ${log.actor_email || ''} ${log.module || ''} ${log.action || ''} ${log.details || ''}`.toLowerCase()
        return hay.includes(q)
      })
    },
    [logs, typeF, query],
  )

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PER))
  const safePage = Math.min(page, totalPages)
  const paged = filteredLogs.slice((safePage - 1) * PER, safePage * PER)

  const handleExport = () => {
    exportAuditEntries(filteredLogs)
    showToast('success', 'PDF de auditoria exportado')
  }

  const stats = useMemo(() => {
    const total = logs.length
    const filtered = filteredLogs.length
    const uniqueUsers = new Set(logs.map(l => l.actor_email || l.actor_name || '')).size
    const localOnly = logs.filter(l => String(l.id || '').startsWith('local-')).length
    return { total, filtered, uniqueUsers, localOnly }
  }, [logs, filteredLogs])

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Auditoria</span>
        </div>
        <h2>Registro de Auditoria</h2>
        <p>Historial de acciones registradas dentro del sistema. Puedes filtrar y exportar a PDF.</p>
      </div>

      <div className="stats-grid-3">
        {[
          { i: 'fa-clipboard-list', c: 'blue', v: stats.total, l: 'Registros totales' },
          { i: 'fa-filter', c: 'purple', v: stats.filtered, l: 'Registros filtrados' },
          { i: 'fa-user-group', c: 'green', v: stats.uniqueUsers, l: 'Usuarios en log' },
        ].map(item => (
          <div className="stat-card" key={item.l}>
            <div className={`icon ${item.c}`}><i className={`fas ${item.i}`} /></div>
            <div className="value">{item.v}</div>
            <div className="label">{item.l}</div>
            {item.l === 'Registros totales' && stats.localOnly > 0 ? (
              <div className="trend down" style={{ marginTop: '0.65rem' }}>
                <i className="fas fa-triangle-exclamation" /> {stats.localOnly} guardados localmente (sin Supabase)
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Tipo</label>
            <select
              className="input"
              value={typeF}
              onChange={(e) => setTypeF(e.target.value)}
              style={{ minWidth: 220 }}
            >
              {TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Buscar</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f3f4f6',
              borderRadius: 12,
              padding: '0.55rem 0.9rem',
              minWidth: 280,
            }}>
              <i className="fas fa-magnifying-glass" style={{ color: '#9ca3af' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Usuario, modulo, accion..."
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.92rem' }}
              />
              {query ? (
                <button
                  className="icon-btn"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setQuery('')}
                  title="Limpiar"
                >
                  <i className="fas fa-xmark" />
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <button className="btn btn-secondary" onClick={handleExport} disabled={loading || filteredLogs.length === 0}>
            <i className="fas fa-file-pdf" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div style={{ padding: '1rem', color: '#6b7280' }}>Cargando auditoria...</div>
          ) : paged.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-clipboard-check" />
              <h3>No hay registros</h3>
              <p>No hay eventos de auditoria para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="audit-log" style={{ maxHeight: 520 }}>
              {paged.map(log => {
                const meta = getAuditTypeMeta(log.event_type)
                return (
                  <div key={log.id} className="audit-item" style={{ alignItems: 'flex-start', padding: '0.95rem 0' }}>
                    <div className="avatar" style={{ background: meta.gradient }}>
                      {getAuditInitials(log.actor_name || 'U')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="action" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ color: '#111827' }}>{log.action || 'Accion'}</strong>
                          <div style={{ marginTop: 4, color: '#6b7280', fontSize: '0.86rem' }}>
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>{log.module || 'Sistema'}</span>
                            {log.details ? <span> - {log.details}</span> : null}
                          </div>
                        </div>
                        <span style={{
                          padding: '0.28rem 0.55rem',
                          borderRadius: 999,
                          background: meta.gradient,
                          color: '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          letterSpacing: 0.2,
                          alignSelf: 'flex-start',
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="timestamp">
                        <i className="fas fa-clock" /> {formatAuditTime(log.created_at)}
                        {log.actor_email ? <span style={{ color: '#9ca3af' }}> &nbsp;|&nbsp; {log.actor_email}</span> : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={safePage === 1}
                onClick={() => setPage(current => Math.max(1, current - 1))}
              >
                <i className="fas fa-chevron-left" />
              </button>
              <span style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                Pagina {safePage} de {totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={safePage === totalPages}
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
