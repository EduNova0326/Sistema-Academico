import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_GRADING_SCALES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PERIODS,
  fetchSystemSettings,
  formatSettingsDate,
  LANGUAGE_OPTIONS,
  saveAcademicPeriods,
  saveGeneralSettings,
  saveGradingScales,
  saveNotificationPreferences,
  TIMEZONE_OPTIONS,
  YEAR_OPTIONS,
} from '../services/settingsService.js'
import {
  buildScaleDraft,
  ensureDefaultGradeScale,
  generateScaleId,
  getScaleDisplayLabel,
  normalizeScale,
} from '../services/gradingScaleUtils.js'

const formatShortDate = (value) => {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const normalizeWeight = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

const normalizeScaleNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function Settings({ showToast, onNavigate }) {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState('')
  const [pageError, setPageError] = useState('')
  const [settingsMeta, setSettingsMeta] = useState({
    updated_at: null,
    updated_by_name: '',
    updated_by_email: '',
  })
  const [general, setGeneral] = useState({ ...DEFAULT_GENERAL_SETTINGS })
  const [scales, setScales] = useState(DEFAULT_GRADING_SCALES.map((item) => ({ ...item })))
  const [periods, setPeriods] = useState(DEFAULT_PERIODS.map((item) => ({ ...item })))
  const [notifications, setNotifications] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES.map((item) => ({ ...item }))
  )
  const [scaleModal, setScaleModal] = useState(false)
  const [editingScaleId, setEditingScaleId] = useState('')
  const [scaleDraft, setScaleDraft] = useState(buildScaleDraft())

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await fetchSystemSettings()
      setGeneral(data.general)
      setScales(ensureDefaultGradeScale(data.grading_scales))
      setPeriods(data.academic_periods)
      setNotifications(data.notification_preferences)
      setSettingsMeta({
        updated_at: data.updated_at,
        updated_by_name: data.updated_by_name,
        updated_by_email: data.updated_by_email,
      })
      setPageError('')
    } catch (error) {
      console.error(error)
      setPageError(error.message || 'No se pudo cargar la configuracion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const totalWeight = useMemo(
    () => periods.reduce((sum, item) => sum + Number(item.weight || 0), 0),
    [periods]
  )

  const activePeriod = useMemo(
    () => periods.find((item) => item.is_active) || null,
    [periods]
  )

  const handleSaveGeneral = async () => {
    if (!general.institution_name.trim()) {
      showToast('warning', 'El nombre de la institucion es obligatorio')
      return
    }

    setSavingSection('general')
    try {
      const updated = await saveGeneralSettings({ general, user, profile })
      setGeneral(updated.general)
      setSettingsMeta({
        updated_at: updated.updated_at,
        updated_by_name: updated.updated_by_name,
        updated_by_email: updated.updated_by_email,
      })
      showToast('success', 'Configuracion general guardada correctamente')
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo guardar la configuracion general')
    } finally {
      setSavingSection('')
    }
  }

  const handleSelectScale = (id) => {
    setScales((current) => current.map((item) => ({
      ...item,
      is_default: item.id === id,
    })))
  }

  const openNewScaleModal = () => {
    setEditingScaleId('')
    setScaleDraft({
      ...buildScaleDraft(),
      id: generateScaleId(),
      is_default: scales.length === 0,
    })
    setScaleModal(true)
  }

  const openEditScaleModal = (scale) => {
    setEditingScaleId(scale.id)
    setScaleDraft({ ...normalizeScale(scale) })
    setScaleModal(true)
  }

  const closeScaleModal = () => {
    setScaleModal(false)
    setEditingScaleId('')
    setScaleDraft(buildScaleDraft())
  }

  const handleSaveScaleDraft = () => {
    const normalized = normalizeScale({
      ...scaleDraft,
      name: scaleDraft.name?.trim(),
      description: scaleDraft.description?.trim(),
    })

    if (!normalized.name) {
      showToast('warning', 'El nombre de la escala es obligatorio')
      return
    }

    if (normalized.mode === 'numeric') {
      if (normalized.max_value <= 0) {
        showToast('warning', 'El valor maximo debe ser mayor que cero')
        return
      }
      if (normalized.passing_score > normalized.max_value || normalized.excellence_score > normalized.max_value) {
        showToast('warning', 'Los umbrales no pueden superar el valor maximo de la escala')
        return
      }
      if (normalized.excellence_score < normalized.passing_score) {
        showToast('warning', 'El umbral de excelencia debe ser mayor o igual al aprobatorio')
        return
      }
    }

    setScales((current) => {
      const next = editingScaleId
        ? current.map((item) => (item.id === editingScaleId ? normalized : item))
        : [...current, normalized]
      return ensureDefaultGradeScale(next)
    })

    closeScaleModal()
    showToast('success', editingScaleId ? 'Escala actualizada en memoria' : 'Escala agregada. Recuerda guardar la seccion.')
  }

  const handleDeleteScale = (scaleId) => {
    if (scales.length <= 1) {
      showToast('warning', 'Debe existir al menos una escala de calificacion')
      return
    }
    setScales((current) => ensureDefaultGradeScale(current.filter((item) => item.id !== scaleId)))
    showToast('success', 'Escala eliminada. Recuerda guardar la seccion.')
  }

  const handleSaveScales = async () => {
    setSavingSection('scales')
    try {
      const updated = await saveGradingScales({ grading_scales: scales, user, profile })
      setScales(updated.grading_scales)
      setSettingsMeta({
        updated_at: updated.updated_at,
        updated_by_name: updated.updated_by_name,
        updated_by_email: updated.updated_by_email,
      })
      showToast('success', 'Escala de notas actualizada')
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudo guardar la escala de notas')
    } finally {
      setSavingSection('')
    }
  }

  const updatePeriod = (periodId, patch) => {
    setPeriods((current) => current.map((item) => (
      item.id === periodId ? { ...item, ...patch } : item
    )))
  }

  const activatePeriod = (periodId) => {
    setPeriods((current) => current.map((item) => ({
      ...item,
      is_active: item.id === periodId,
    })))
  }

  const handleSavePeriods = async () => {
    const invalidDate = periods.some((item) => !item.start_date || !item.end_date || item.end_date < item.start_date)
    if (invalidDate) {
      showToast('warning', 'Revisa las fechas de los periodos antes de guardar')
      return
    }

    if (totalWeight !== 100) {
      showToast('warning', 'El peso total de los periodos debe sumar exactamente 100%')
      return
    }

    setSavingSection('periods')
    try {
      const updated = await saveAcademicPeriods({ academic_periods: periods, user, profile })
      setPeriods(updated.academic_periods)
      setSettingsMeta({
        updated_at: updated.updated_at,
        updated_by_name: updated.updated_by_name,
        updated_by_email: updated.updated_by_email,
      })
      showToast('success', 'Periodos academicos guardados correctamente')
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudieron guardar los periodos')
    } finally {
      setSavingSection('')
    }
  }

  const toggleNotification = (notificationId) => {
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, enabled: !item.enabled } : item
    )))
  }

  const handleSaveNotifications = async () => {
    setSavingSection('notifications')
    try {
      const updated = await saveNotificationPreferences({
        notification_preferences: notifications,
        user,
        profile,
      })
      setNotifications(updated.notification_preferences)
      setSettingsMeta({
        updated_at: updated.updated_at,
        updated_by_name: updated.updated_by_name,
        updated_by_email: updated.updated_by_email,
      })
      showToast('success', 'Preferencias de notificacion guardadas')
    } catch (error) {
      console.error(error)
      showToast('error', error.message || 'No se pudieron guardar las notificaciones')
    } finally {
      setSavingSection('')
    }
  }

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Configuracion</span>
        </div>
        <h2>Configuracion del Sistema</h2>
        <p>Define la identidad institucional, escala de notas, periodos y alertas globales de EduNova.</p>
      </div>

      <div className="stats-grid">
        {[
          {
            icon: 'fa-building',
            color: 'blue',
            value: general.institution_name,
            label: 'Institucion activa',
          },
          {
            icon: 'fa-calendar-days',
            color: 'green',
            value: general.academic_year,
            label: 'Ano academico',
          },
          {
            icon: 'fa-chart-line',
            color: 'purple',
            value: scales.find((item) => item.is_default)?.name || 'Sin escala',
            label: 'Escala predeterminada',
          },
          {
            icon: 'fa-bell',
            color: 'orange',
            value: `${notifications.filter((item) => item.enabled).length}/${notifications.length}`,
            label: 'Alertas activas',
          },
        ].map((item) => (
          <div className="stat-card" key={item.label}>
            <div className={`icon ${item.color}`}><i className={`fas ${item.icon}`} /></div>
            <div className="value" style={{ fontSize: String(item.value).length > 18 ? '1rem' : undefined }}>
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
            <strong>No se pudo cargar la configuracion real</strong>
            <p style={{ fontSize: '0.88rem' }}>
              {pageError}. Ejecuta el SQL de `system_settings` en Supabase y vuelve a cargar la pagina.
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>Estado de configuracion</p>
            <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>
              Ultima actualizacion: {formatSettingsDate(settingsMeta.updated_at)}
            </p>
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            Responsable: {settingsMeta.updated_by_name || settingsMeta.updated_by_email || 'Sin registro'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="tab-nav">
            {[
              ['general', 'General'],
              ['scales', 'Escalas de Notas'],
              ['periods', 'Periodos'],
              ['notifications', 'Notificaciones'],
            ].map(([id, label]) => (
              <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.5rem' }} />
              Cargando configuracion real...
            </div>
          ) : (
            <>
              {tab === 'general' && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Nombre de la institucion</label>
                      <input
                        className="form-control"
                        value={general.institution_name}
                        onChange={(event) => setGeneral((current) => ({
                          ...current,
                          institution_name: event.target.value,
                        }))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Ano academico</label>
                      <select
                        className="form-control"
                        value={general.academic_year}
                        onChange={(event) => setGeneral((current) => ({
                          ...current,
                          academic_year: event.target.value,
                        }))}
                      >
                        {YEAR_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Zona horaria</label>
                      <select
                        className="form-control"
                        value={general.timezone}
                        onChange={(event) => setGeneral((current) => ({
                          ...current,
                          timezone: event.target.value,
                        }))}
                      >
                        {TIMEZONE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Idioma del sistema</label>
                      <select
                        className="form-control"
                        value={general.language}
                        onChange={(event) => setGeneral((current) => ({
                          ...current,
                          language: event.target.value,
                        }))}
                      >
                        {LANGUAGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="alert-card success" style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-circle-info icon" />
                    <div>
                      <strong>Configuracion institucional persistente</strong>
                      <p style={{ fontSize: '0.85rem' }}>
                        Estos datos quedan guardados en Supabase y permanecen al cerrar o volver a abrir el sistema.
                      </p>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleSaveGeneral} disabled={savingSection === 'general' || !!pageError}>
                    {savingSection === 'general'
                      ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
                      : <><i className="fas fa-save" />Guardar cambios</>}
                  </button>
                </>
              )}

              {tab === 'scales' && (
                <>
                  <div className="alert-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                    <i className="fas fa-ruler-combined icon" style={{ color: '#2563eb' }} />
                    <div>
                      <strong>Escalas personalizadas persistentes</strong>
                      <p style={{ fontSize: '0.85rem' }}>
                        Puedes crear escalas numericas propias y dejar una como predeterminada para calificaciones, reportes y boletines.
                      </p>
                    </div>
                  </div>

                  <div className="grid-2">
                    {scales.map((scale) => (
                      <div
                        className="competency-item"
                        key={scale.id}
                        style={{
                          cursor: 'pointer',
                          border: scale.is_default ? '1px solid rgba(37,99,235,0.35)' : undefined,
                          background: scale.is_default ? 'rgba(37,99,235,0.04)' : undefined,
                        }}
                        onClick={() => handleSelectScale(scale.id)}
                      >
                        <div className="header">
                          <h4>{scale.name}</h4>
                          <span className={`status-badge ${scale.is_default ? 'active' : 'inactive'}`}>
                            {scale.is_default ? 'Predeterminada' : 'Alternativa'}
                          </span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{scale.description}</p>
                        <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.35rem' }}>
                          <i className="fas fa-sliders" style={{ marginRight: 5 }} />
                          {getScaleDisplayLabel(scale)}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: scale.is_default ? 'var(--primary)' : '#9ca3af', marginTop: '0.5rem' }}>
                          <i className={`fas ${scale.is_default ? 'fa-circle-check' : 'fa-hand-pointer'}`} style={{ marginRight: 5 }} />
                          {scale.is_default ? 'Escala activa en configuracion' : 'Haz clic para dejarla como predeterminada'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEditScaleModal(scale)
                            }}
                          >
                            <i className="fas fa-edit" />Editar
                          </button>
                          {!scale.is_default && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--danger)' }}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDeleteScale(scale.id)
                              }}
                            >
                              <i className="fas fa-trash" />Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={openNewScaleModal}>
                      <i className="fas fa-plus" />Nueva escala personalizada
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveScales} disabled={savingSection === 'scales' || !!pageError}>
                      {savingSection === 'scales'
                        ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
                        : <><i className="fas fa-save" />Guardar escalas</>}
                    </button>
                  </div>
                </>
              )}

              {tab === 'periods' && (
                <>
                  <div className="alert-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                    <i className="fas fa-calendar-check icon" style={{ color: '#2563eb' }} />
                    <div>
                      <strong>Periodo activo: {activePeriod?.name || 'Sin periodo activo'}</strong>
                      <p style={{ fontSize: '0.85rem' }}>
                        El peso total actual es {totalWeight}%. Debe sumar exactamente 100% antes de guardar.
                      </p>
                    </div>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Periodo</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Peso</th>
                        <th>Estado</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period) => (
                        <tr key={period.id}>
                          <td>
                            <input
                              className="form-control"
                              value={period.name}
                              onChange={(event) => updatePeriod(period.id, { name: event.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="form-control"
                              value={period.start_date}
                              onChange={(event) => updatePeriod(period.id, { start_date: event.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="form-control"
                              value={period.end_date}
                              onChange={(event) => updatePeriod(period.id, { end_date: event.target.value })}
                            />
                          </td>
                          <td style={{ minWidth: 120 }}>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={period.weight}
                              onChange={(event) => updatePeriod(period.id, { weight: normalizeWeight(event.target.value) })}
                            />
                          </td>
                          <td>
                            <span className={`status-badge ${period.is_active ? 'active' : 'inactive'}`}>
                              {period.is_active ? 'Activo' : 'Disponible'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.35rem' }}>
                              {formatShortDate(period.start_date)} - {formatShortDate(period.end_date)}
                            </div>
                          </td>
                          <td>
                            {!period.is_active && (
                              <button className="btn btn-sm btn-secondary" onClick={() => activatePeriod(period.id)}>
                                <i className="fas fa-play" />Activar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSavePeriods} disabled={savingSection === 'periods' || !!pageError}>
                    {savingSection === 'periods'
                      ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
                      : <><i className="fas fa-save" />Guardar periodos</>}
                  </button>
                </>
              )}

              {tab === 'notifications' && (
                <>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.95rem 1rem',
                          borderBottom: '1px solid #e5e7eb',
                          background: notification.enabled ? '#f8fafc' : '#ffffff',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 500 }}>
                            {notification.label}
                          </span>
                          <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {notification.enabled ? 'Activa actualmente' : 'Desactivada actualmente'}
                          </p>
                        </div>

                        <div
                          onClick={() => toggleNotification(notification.id)}
                          style={{
                            width: 48,
                            height: 26,
                            borderRadius: 999,
                            background: notification.enabled ? 'var(--primary)' : '#d1d5db',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background .2s',
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              background: '#fff',
                              borderRadius: '50%',
                              position: 'absolute',
                              top: 2,
                              left: notification.enabled ? 24 : 2,
                              transition: 'left .2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSaveNotifications} disabled={savingSection === 'notifications' || !!pageError}>
                    {savingSection === 'notifications'
                      ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
                      : <><i className="fas fa-save" />Guardar preferencias</>}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {scaleModal && (
        <Modal
          title={editingScaleId ? 'Editar Escala de Calificacion' : 'Nueva Escala de Calificacion'}
          icon="fa-ruler-combined"
          onClose={closeScaleModal}
          maxWidth="620px"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={closeScaleModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveScaleDraft}>
                <i className="fas fa-save" />Guardar en la lista
              </button>
            </>
          )}
        >
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre de la escala</label>
              <input
                className="form-control"
                value={scaleDraft.name}
                onChange={(event) => setScaleDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select
                className="form-control"
                value={scaleDraft.mode}
                onChange={(event) => setScaleDraft((current) => ({
                  ...current,
                  mode: event.target.value,
                }))}
              >
                <option value="numeric">Numerica</option>
                <option value="letters">Letras</option>
              </select>
            </div>

            <div className="form-group">
              <label>Precision decimal</label>
              <input
                type="number"
                className="form-control"
                min="0"
                max="2"
                value={scaleDraft.precision}
                onChange={(event) => setScaleDraft((current) => ({
                  ...current,
                  precision: Math.max(0, Math.min(2, normalizeScaleNumber(event.target.value, 1))),
                }))}
              />
            </div>

            {scaleDraft.mode === 'numeric' ? (
              <>
                <div className="form-group">
                  <label>Valor maximo</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    step="0.1"
                    value={scaleDraft.max_value}
                    onChange={(event) => setScaleDraft((current) => ({
                      ...current,
                      max_value: normalizeScaleNumber(event.target.value, current.max_value),
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Nota aprobatoria</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.1"
                    value={scaleDraft.passing_score}
                    onChange={(event) => setScaleDraft((current) => ({
                      ...current,
                      passing_score: normalizeScaleNumber(event.target.value, current.passing_score),
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Umbral de excelencia</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.1"
                    value={scaleDraft.excellence_score}
                    onChange={(event) => setScaleDraft((current) => ({
                      ...current,
                      excellence_score: normalizeScaleNumber(event.target.value, current.excellence_score),
                    }))}
                  />
                </div>
              </>
            ) : (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Rangos de letras</label>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {scaleDraft.letter_ranges.map((range, index) => (
                    <div key={`${range.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '0.5rem' }}>
                      <input
                        className="form-control"
                        value={range.label}
                        onChange={(event) => setScaleDraft((current) => ({
                          ...current,
                          letter_ranges: current.letter_ranges.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, label: event.target.value } : item
                          )),
                        }))}
                      />
                      <input
                        type="number"
                        className="form-control"
                        value={range.min}
                        onChange={(event) => setScaleDraft((current) => ({
                          ...current,
                          letter_ranges: current.letter_ranges.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, min: normalizeScaleNumber(event.target.value, item.min) } : item
                          )),
                        }))}
                      />
                      <input
                        type="number"
                        className="form-control"
                        value={range.max}
                        onChange={(event) => setScaleDraft((current) => ({
                          ...current,
                          letter_ranges: current.letter_ranges.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, max: normalizeScaleNumber(event.target.value, item.max) } : item
                          )),
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Descripcion</label>
              <textarea
                className="form-control"
                rows={3}
                value={scaleDraft.description}
                onChange={(event) => setScaleDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Ej: Aprobatorio >= 12 | Excelente >= 18"
              />
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
