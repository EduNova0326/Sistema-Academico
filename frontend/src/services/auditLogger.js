import { supabase } from './supabaseClient.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AUDIT_TABLE = 'audit_logs'
const AUDIT_STORAGE_KEY = 'edunova_audit_logs'
const MAX_LOCAL_LOGS = 250

const TYPE_META = {
  auth: { label: 'Acceso', color: 'var(--secondary)', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  create: { label: 'Creacion', color: 'var(--success)', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  update: { label: 'Actualizacion', color: 'var(--warning)', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  delete: { label: 'Eliminacion', color: 'var(--danger)', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  export: { label: 'Exportacion', color: 'var(--primary)', gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
  backup: { label: 'Respaldo', color: 'var(--danger)', gradient: 'linear-gradient(135deg,#dc2626,#991b1b)' },
  attendance: { label: 'Asistencia', color: 'var(--primary)', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  grade: { label: 'Calificaciones', color: 'var(--warning)', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  planning: { label: 'Planificacion', color: 'var(--primary)', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  report: { label: 'Reporte', color: 'var(--primary)', gradient: 'linear-gradient(135deg,#2563eb,#4f46e5)' },
  system: { label: 'Sistema', color: 'var(--secondary)', gradient: 'linear-gradient(135deg,#64748b,#475569)' },
}

const safeJsonParse = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const getLocalLogs = () => {
  if (typeof window === 'undefined') return []
  const parsed = safeJsonParse(window.localStorage.getItem(AUDIT_STORAGE_KEY), [])
  return Array.isArray(parsed) ? parsed : []
}

const saveLocalLogs = (logs) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOCAL_LOGS)))
}

export const getAuditActorName = (user) => {
  if (!user) return 'Usuario desconocido'
  return user.user_metadata?.full_name || user.email || 'Usuario sin nombre'
}

export const getAuditInitials = (name = '') => {
  return String(name)
    .split(' ')
    .map(chunk => chunk[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const resolveAuditType = ({ module = '', action = '' } = {}) => {
  const base = `${module} ${action}`.toLowerCase()

  if (base.includes('login') || base.includes('sesion') || base.includes('acceso') || base.includes('registro')) return 'auth'
  if (base.includes('respaldo') || base.includes('backup') || base.includes('restaur')) return 'backup'
  if (base.includes('export') || base.includes('pdf') || base.includes('excel') || base.includes('descarg')) return 'export'
  if (base.includes('asistencia')) return 'attendance'
  if (base.includes('nota') || base.includes('calificacion') || base.includes('actividad')) return 'grade'
  if (base.includes('planificacion') || base.includes('planifica') || base.includes('ra ')) return 'planning'
  if (base.includes('reporte') || base.includes('boletin')) return 'report'
  if (base.includes('elimin')) return 'delete'
  if (base.includes('cre') || base.includes('agreg') || base.includes('registr')) return 'create'
  if (base.includes('actualiz') || base.includes('edit') || base.includes('modific') || base.includes('guard')) return 'update'
  return 'system'
}

const buildPayload = ({ user, action, module, details = '', type }) => {
  const actorName = getAuditActorName(user)

  return {
    actor_id: user?.id || null,
    actor_name: actorName,
    actor_email: user?.email || null,
    module: module || 'Sistema',
    action: action || 'Accion realizada',
    details,
    event_type: type || resolveAuditType({ module, action }),
    created_at: new Date().toISOString(),
  }
}

export const recordAuditEvent = async ({ user, action, module, details = '', type } = {}) => {
  if (!action) return

  const payload = buildPayload({ user, action, module, details, type })

  try {
    const { error } = await supabase.from(AUDIT_TABLE).insert([payload])
    if (error) throw error
  } catch {
    const localEntry = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...payload }
    saveLocalLogs([localEntry, ...getLocalLogs()])
  }
}

export const loadAuditEntries = async () => {
  try {
    const { data, error } = await supabase
      .from(AUDIT_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return data || []
  } catch {
    const localLogs = getLocalLogs()
    return Array.isArray(localLogs)
      ? localLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : []
  }
}

export const getAuditTypeMeta = (type) => TYPE_META[type] || TYPE_META.system

export const formatAuditTime = (value) => {
  const timestamp = new Date(value)
  const diffMs = Date.now() - timestamp.getTime()

  if (Number.isNaN(timestamp.getTime())) return 'Sin fecha'

  const minutes = Math.max(1, Math.floor(diffMs / 60000))
  if (minutes < 60) return `Hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} dia${days === 1 ? '' : 's'}`

  return timestamp.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const exportAuditEntries = (entries = []) => {
  if (typeof window === 'undefined') return

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const now = new Date()

  // Header bar
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('EduNova - Registro de Auditoria', 18, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generado: ${now.toLocaleString('es')}`, doc.internal.pageSize.getWidth() - 18, 22, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  const headers = ['Fecha', 'Usuario', 'Correo', 'Modulo', 'Tipo', 'Accion', 'Detalle']
  const rows = entries.map(entry => ([
    entry.created_at ? new Date(entry.created_at).toLocaleString('es') : '',
    entry.actor_name || '',
    entry.actor_email || '',
    entry.module || '',
    getAuditTypeMeta(entry.event_type).label,
    entry.action || '',
    entry.details || '',
  ]))

  autoTable(doc, {
    startY: 48,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'top',
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 110 },
      2: { cellWidth: 150 },
      3: { cellWidth: 110 },
      4: { cellWidth: 80 },
      5: { cellWidth: 140 },
      6: { cellWidth: 210 },
    },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(
        `Total registros: ${entries.length}`,
        18,
        doc.internal.pageSize.getHeight() - 14
      )
      doc.text(
        `Pagina ${doc.getCurrentPageInfo().pageNumber}`,
        doc.internal.pageSize.getWidth() - 18,
        doc.internal.pageSize.getHeight() - 14,
        { align: 'right' }
      )
      doc.setTextColor(0, 0, 0)
    },
  })

  const filename = `auditoria_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
