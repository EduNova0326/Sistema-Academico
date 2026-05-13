import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  BACKUP_TYPE_OPTIONS,
  buildBackupLabel,
  createSystemBackup,
  deleteSystemBackup,
  downloadBackupFile,
  fetchSystemBackupDetail,
  fetchSystemBackups,
  formatBackupSize,
  getBackupTypeLabel,
  resolveBackupTables,
  restoreSystemBackup,
} from '../services/backupService.js'

const TABLE_LABELS = {
  profiles: 'Perfiles y roles',
  teachers: 'Docentes',
  courses: 'Cursos',
  students: 'Estudiantes',
  annual_plans: 'Planificacion anual',
  ra_items: 'Items RA',
  weekly_planning: 'Planificacion semanal',
  templates: 'Plantillas',
  resources: 'Recursos',
  events: 'Eventos',
  activities: 'Actividades evaluativas',
  grades: 'Calificaciones',
  reports: 'Reportes',
  rubrics: 'Rubricas',
  rubric_criteria: 'Criterios de rubrica',
  tests: 'Pruebas',
  checklists: 'Listas de cotejo',
  checklist_items: 'Items de cotejo',
  attendance: 'Asistencia',
}

const formatDateTime = (value) => {
  if (!value) return 'No disponible'
  return new Date(value).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getSummaryEntries = (backup) => {
  return Object.entries(backup?.summary || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
}

export function Backup({ showToast, onNavigate }) {
  const { user, profile, refreshProfile } = useAuth()
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [restoreModal, setRestoreModal] = useState(null)
  const [detailsModal, setDetailsModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({
    type: 'full',
    label: buildBackupLabel('full'),
    description: '',
  })

  const loadBackups = async () => {
    setLoading(true)
    try {
      const data = await fetchSystemBackups()
      setBackups(data)
      setPageError('')
    } catch (error) {
      console.error(error)
      setPageError(error.message || 'No se pudo cargar el historial de respaldos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const activeBackup = useMemo(
    () => backups.find((backup) => backup.is_active) || null,
    [backups]
  )

  const totalStoredSize = useMemo(
    () => backups.reduce((sum, backup) => sum + Number(backup.size_bytes || 0), 0),
    [backups]
  )

  const totalStoredRecords = useMemo(
    () => backups.reduce((sum, backup) => sum + Number(backup.total_records || 0), 0),
    [backups]
  )

  const selectedTables = useMemo(
    () => resolveBackupTables(form.type),
    [form.type]
  )

  const handleTypeChange = (nextType) => {
    setForm((current) => ({
      ...current,
      type: nextType,
      label: current.label.trim() ? current.label : buildBackupLabel(nextType),
    }))
  }

  const handleCreate = async () => {
    const nextLabel = form.label.trim() || buildBackupLabel(form.type)

    setSaving(true)
    try {
      const created = await createSystemBackup({
        type: form.type,
        label: nextLabel,
        description: form.description.trim(),
        user,
        profile,
      })

      setBackups((current) => [created, ...current])
      setForm({
        type: form.type,
        label: buildBackupLabel(form.type),
        description: '',
      })
      showToast('success', `Respaldo "${created.label}" creado correctamente`)
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo crear el respaldo')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (backup) => {
    setDownloadingId(backup.id)
    try {
      const fullBackup = backup.payload ? backup : await fetchSystemBackupDetail(backup.id)
      downloadBackupFile(fullBackup)
      showToast('success', `Respaldo "${backup.label}" descargado`)
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo descargar el respaldo')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleOpenDetails = async (backup) => {
    try {
      const fullBackup = backup.payload ? backup : await fetchSystemBackupDetail(backup.id)
      setDetailsModal(fullBackup)
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudieron cargar los detalles del respaldo')
    }
  }

  const handleRestore = async () => {
    if (!restoreModal) return

    setRestoringId(restoreModal.id)
    try {
      await restoreSystemBackup(restoreModal.id)
      await refreshProfile()
      await loadBackups()
      showToast('success', `Sistema restaurado desde "${restoreModal.label}"`)
      setRestoreModal(null)
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo restaurar el respaldo')
    } finally {
      setRestoringId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return

    setDeletingId(deleteModal.id)
    try {
      await deleteSystemBackup(deleteModal.id)
      setBackups((current) => current.filter((backup) => backup.id !== deleteModal.id))
      setDeleteModal(null)
      showToast('success', `Respaldo "${deleteModal.label}" eliminado`)
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo eliminar el respaldo')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Respaldo</span>
        </div>
        <h2>Respaldo y Recuperacion</h2>
        <p>
          Crea instantaneas reales del sistema, descargalas en JSON y restaura informacion
          desde un punto seguro cuando lo necesites.
        </p>
      </div>

      <div className="stats-grid">
        {[
          {
            icon: 'fa-database',
            color: 'blue',
            value: backups.length,
            label: 'Respaldos guardados',
          },
          {
            icon: 'fa-hdd',
            color: 'green',
            value: formatBackupSize(totalStoredSize),
            label: 'Espacio estimado',
          },
          {
            icon: 'fa-layer-group',
            color: 'purple',
            value: totalStoredRecords,
            label: 'Registros respaldados',
          },
          {
            icon: 'fa-clock-rotate-left',
            color: 'orange',
            value: activeBackup ? formatDateTime(activeBackup.restored_at || activeBackup.created_at) : 'Sin restaurar',
            label: 'Ultimo punto activo',
          },
        ].map((item) => (
          <div className="stat-card" key={item.label}>
            <div className={`icon ${item.color}`}><i className={`fas ${item.icon}`} /></div>
            <div className="value" style={{ fontSize: item.value?.length > 18 ? '1rem' : undefined }}>
              {item.value}
            </div>
            <div className="label">{item.label}</div>
          </div>
        ))}
      </div>

      {pageError && (
        <div className="alert-card warning" style={{ marginBottom: '1rem' }}>
          <i className="fas fa-triangle-exclamation icon" />
          <div>
            <strong>No se pudo leer la infraestructura de respaldos</strong>
            <p style={{ fontSize: '0.88rem' }}>
              {pageError}. Ejecuta el archivo SQL de respaldo en Supabase y luego vuelve a cargar la pagina.
            </p>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Crear nuevo respaldo</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Tipo de respaldo</label>
              <select
                className="form-control"
                value={form.type}
                onChange={(event) => handleTypeChange(event.target.value)}
              >
                {BACKUP_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Nombre del respaldo</label>
              <input
                className="form-control"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Ej: cierre antes de boletas"
              />
            </div>

            <div className="form-group">
              <label>Descripcion</label>
              <textarea
                className="form-control"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Opcional: explica para que sirve este respaldo"
              />
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#0f172a' }}>{getBackupTypeLabel(form.type)}</p>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Este respaldo incluira {selectedTables.length} bloques de informacion.
                  </p>
                </div>
                <div style={{
                  minWidth: 54,
                  height: 54,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(37,99,235,0.08)',
                  color: 'var(--primary)',
                  fontSize: '1.2rem',
                }}>
                  <i className="fas fa-shield-heart" />
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {selectedTables.map((tableName) => (
                  <span
                    key={tableName}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 999,
                      background: '#eef2ff',
                      color: '#3730a3',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    {TABLE_LABELS[tableName] || tableName}
                  </span>
                ))}
              </div>
            </div>

            <div className="alert-card success" style={{ marginBottom: '1rem' }}>
              <i className="fas fa-circle-info icon" />
              <div>
                <strong>Respaldos reales guardados en Supabase</strong>
                <p style={{ fontSize: '0.86rem' }}>
                  Cada respaldo guarda una instantanea completa del grupo de tablas elegido y luego puedes
                  descargarla o restaurarla.
                </p>
              </div>
            </div>

            <button className="btn btn-success" disabled={saving || !!pageError} onClick={handleCreate}>
              {saving
                ? <><i className="fas fa-spinner fa-spin" />Creando respaldo...</>
                : <><i className="fas fa-download" />Crear respaldo ahora</>}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Estado actual</h3>
          </div>
          <div className="card-body">
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: '1rem',
              background: activeBackup ? '#f0fdf4' : '#fff7ed',
              marginBottom: '1rem',
            }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: activeBackup ? '#166534' : '#9a3412', marginBottom: '0.35rem' }}>
                {activeBackup ? 'PUNTO ACTIVO DEL SISTEMA' : 'AUN NO HAY UN PUNTO RESTAURADO'}
              </p>
              <h4 style={{ marginBottom: '0.35rem', color: '#0f172a' }}>
                {activeBackup ? activeBackup.label : 'Todavia no has restaurado un respaldo guardado'}
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                {activeBackup
                  ? `Ultima restauracion: ${formatDateTime(activeBackup.restored_at || activeBackup.created_at)}`
                  : 'El sistema sigue operando con los datos actuales. Cuando restaures un respaldo, aqui quedara marcado.'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="btn btn-sm btn-secondary" style={{ cursor: 'default' }}>
                  <i className="fas fa-box-archive" />{backups.length} disponibles
                </span>
                <span className="btn btn-sm btn-secondary" style={{ cursor: 'default' }}>
                  <i className="fas fa-weight-hanging" />{formatBackupSize(totalStoredSize)}
                </span>
              </div>
            </div>

            <div className="alert-card warning" style={{ marginBottom: '0.8rem' }}>
              <i className="fas fa-triangle-exclamation icon" />
              <div>
                <strong>Restaurar reemplaza datos reales</strong>
                <p style={{ fontSize: '0.85rem' }}>
                  Al restaurar un respaldo, las tablas incluidas en ese paquete vuelven al estado exacto
                  que tenian cuando se creo la copia.
                </p>
              </div>
            </div>

            <div className="alert-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <i className="fas fa-file-arrow-down icon" style={{ color: '#2563eb' }} />
              <div>
                <strong>Descarga externa</strong>
                <p style={{ fontSize: '0.85rem' }}>
                  Puedes bajar cualquier respaldo como archivo JSON para guardarlo fuera del sistema o revisarlo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h3>Historial de respaldos</h3>
          <button className="btn btn-secondary" onClick={loadBackups} disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin" />Actualizando...</> : <><i className="fas fa-rotate" />Actualizar</>}
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.5rem' }} />
              Cargando respaldos reales...
            </div>
          ) : backups.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#6b7280',
              border: '1px dashed #d1d5db',
              borderRadius: 18,
            }}>
              <i className="fas fa-box-open" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }} />
              Aun no existen respaldos guardados. Crea el primero desde el formulario superior.
            </div>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.id}
                className={`version-item${backup.is_active ? ' current' : ''}`}
                style={{ alignItems: 'flex-start' }}
              >
                <div className="info" style={{ flex: 1 }}>
                  <div className="version-num">
                    {backup.is_active ? <i className="fas fa-check" /> : <i className="fas fa-box-archive" />}
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem' }}>{backup.label}</strong>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                          {formatDateTime(backup.created_at)} - {getBackupTypeLabel(backup.backup_type)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="btn btn-sm btn-secondary" style={{ cursor: 'default' }}>
                          <i className="fas fa-layer-group" />{backup.total_records || 0} registros
                        </span>
                        <span className="btn btn-sm btn-secondary" style={{ cursor: 'default' }}>
                          <i className="fas fa-hdd" />{formatBackupSize(backup.size_bytes)}
                        </span>
                        {backup.is_active && (
                          <span className="btn btn-sm btn-success" style={{ cursor: 'default' }}>
                            <i className="fas fa-check-circle" />Activo
                          </span>
                        )}
                      </div>
                    </div>

                    {backup.description && (
                      <p style={{ fontSize: '0.84rem', color: '#374151', margin: '0.55rem 0 0.7rem' }}>
                        {backup.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
                      {(backup.included_tables || []).map((tableName) => (
                        <span
                          key={`${backup.id}-${tableName}`}
                          style={{
                            padding: '0.28rem 0.55rem',
                            borderRadius: 999,
                            background: '#f3f4f6',
                            color: '#4b5563',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                          }}
                        >
                          {TABLE_LABELS[tableName] || tableName}
                        </span>
                      ))}
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      Creado por {backup.created_by_name || backup.created_by_email || 'Usuario'}.
                      {backup.restored_at ? ` Restaurado por ultima vez el ${formatDateTime(backup.restored_at)}.` : ' Aun no ha sido restaurado.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetails(backup)}>
                    <i className="fas fa-eye" />Detalle
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDownload(backup)}
                    disabled={downloadingId === backup.id}
                  >
                    {downloadingId === backup.id
                      ? <><i className="fas fa-spinner fa-spin" />Descargando...</>
                      : <><i className="fas fa-download" />Descargar</>}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setRestoreModal(backup)}
                    disabled={restoringId === backup.id}
                  >
                    {restoringId === backup.id
                      ? <><i className="fas fa-spinner fa-spin" />Restaurando...</>
                      : <><i className="fas fa-rotate-left" />Restaurar</>}
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setDeleteModal(backup)}
                    disabled={backup.is_active}
                  >
                    <i className="fas fa-trash" />Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {restoreModal && (
        <Modal
          title="Restaurar respaldo"
          icon="fa-rotate-left"
          iconColor="var(--warning)"
          onClose={() => setRestoreModal(null)}
          maxWidth="560px"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setRestoreModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleRestore} disabled={restoringId === restoreModal.id}>
                {restoringId === restoreModal.id
                  ? <><i className="fas fa-spinner fa-spin" />Restaurando...</>
                  : <><i className="fas fa-rotate-left" />Si, restaurar</>}
              </button>
            </>
          )}
        >
          <p>
            Vas a devolver el sistema al estado guardado en <strong>{restoreModal.label}</strong>.
            Las tablas incluidas reemplazaran su contenido actual.
          </p>

          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: '0.9rem', marginTop: '0.85rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{getBackupTypeLabel(restoreModal.backup_type)}</p>
            <p style={{ fontSize: '0.82rem', color: '#7c2d12' }}>
              {restoreModal.total_records || 0} registros - {formatBackupSize(restoreModal.size_bytes)}
            </p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.45rem' }}>Tablas que seran restauradas</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {(restoreModal.included_tables || []).map((tableName) => (
                <span
                  key={tableName}
                  style={{
                    padding: '0.32rem 0.58rem',
                    borderRadius: 999,
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                  }}
                >
                  {TABLE_LABELS[tableName] || tableName}
                </span>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {detailsModal && (
        <Modal
          title="Detalle del respaldo"
          icon="fa-eye"
          iconColor="var(--primary)"
          onClose={() => setDetailsModal(null)}
          maxWidth="700px"
          footer={<button className="btn btn-primary" onClick={() => setDetailsModal(null)}>Cerrar</button>}
        >
          <div className="grid-2">
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.9rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Nombre</p>
              <p style={{ fontWeight: 700 }}>{detailsModal.label}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.9rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Tipo</p>
              <p style={{ fontWeight: 700 }}>{getBackupTypeLabel(detailsModal.backup_type)}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.9rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Creado</p>
              <p style={{ fontWeight: 700 }}>{formatDateTime(detailsModal.created_at)}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '0.9rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>Tamano</p>
              <p style={{ fontWeight: 700 }}>{formatBackupSize(detailsModal.size_bytes)}</p>
            </div>
          </div>

          {detailsModal.description && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Descripcion</p>
              <p style={{ color: '#4b5563' }}>{detailsModal.description}</p>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.45rem' }}>Resumen por tabla</p>
            <div style={{
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
            }}>
              {getSummaryEntries(detailsModal).map(([tableName, count]) => (
                <div
                  key={tableName}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span>{TABLE_LABELS[tableName] || tableName}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal
          title="Eliminar respaldo"
          icon="fa-trash"
          iconColor="var(--danger)"
          onClose={() => setDeleteModal(null)}
          maxWidth="480px"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deletingId === deleteModal.id}>
                {deletingId === deleteModal.id
                  ? <><i className="fas fa-spinner fa-spin" />Eliminando...</>
                  : <><i className="fas fa-trash" />Eliminar</>}
              </button>
            </>
          )}
        >
          <p>
            Se eliminara el respaldo <strong>{deleteModal.label}</strong> del historial guardado en Supabase.
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            Esta accion no modifica los datos activos del sistema; solo borra la copia almacenada.
          </p>
        </Modal>
      )}
    </section>
  )
}
