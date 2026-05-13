import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import {
  ACADEMIC_SUBJECT_OPTIONS,
  buildAcademicCourse,
  EXTRA_WEEKLY_ACTIVITY_OPTIONS,
  splitAcademicCourse,
} from '../data/projectOptions.js'
import { getDayIndexMonday0, startOfWeekMondayLocal, toISODateLocal } from '../utils/dateUtils.js'

const COLORS = [
  { bg: 'rgba(37,99,235,0.1)', b: 'var(--primary)', label: 'Clase' },
  { bg: 'rgba(124,58,237,0.1)', b: 'var(--secondary)', label: 'Laboratorio' },
  { bg: 'rgba(16,185,129,0.1)', b: 'var(--success)', label: 'Práctica' },
  { bg: 'rgba(245,158,11,0.1)', b: 'var(--warning)', label: 'Evaluación' },
  { bg: 'rgba(107,114,128,0.1)', b: '#6b7280', label: 'Reunión' },
]

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

const TIME_SLOTS = ['08:00-09:30','10:00-11:30','14:00-15:30']

const EMPTY_DAYS = () => [
  {l:'',s:'',bg:'',b:''},
  {l:'',s:'',bg:'',b:''},
  {l:'',s:'',bg:'',b:''},
  {l:'',s:'',bg:'',b:''},
  {l:'',s:'',bg:'',b:''},
]

const INIT_ROWS = TIME_SLOTS.map((t) => ({ t, days: EMPTY_DAYS() }))

export function WeeklyPlanning({ showToast, onNavigate }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [rows,       setRows]       = useState(INIT_ROWS)
  const [loading,    setLoading]    = useState(false)
  const [courseOptions, setCourseOptions] = useState([])
  const [addModal,   setAddModal]   = useState(false)
  const [editModal,  setEditModal]  = useState(false)
  const [cellTarget, setCellTarget] = useState(null)
  const [formKind,   setFormKind]   = useState('course') // course | activity
  const [formSubject, setFormSubject] = useState(ACADEMIC_SUBJECT_OPTIONS[0] || '')
  const [formSection, setFormSection] = useState('')
  const [formActivity, setFormActivity] = useState(EXTRA_WEEKLY_ACTIVITY_OPTIONS[0] || 'Evaluación')
  const [formS,      setFormS]      = useState('')
  const [formColor,  setFormColor]  = useState(0)

  // Base dinámica: inicio de la semana actual (lunes) según la fecha real del sistema.
  // Esto evita que el plan semanal quede “pegado” a una fecha fija.
  const getBaseWeek = () => startOfWeekMondayLocal()

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('code')
          .order('created_at', { ascending: true })
        if (error) throw error
        const codes = Array.from(
          new Set((data || []).map((row) => String(row.code || '').trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'es'))
        setCourseOptions(codes)
        setFormSection((current) => current || codes[0] || '')
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  const getWeekStart = () => {
    const d = getBaseWeek()
    d.setDate(d.getDate() + weekOffset * 7)
    return toISODateLocal(d)
  }

  const getWeekLabel = () => {
    const start = getBaseWeek()
    start.setDate(start.getDate() + weekOffset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 4)
    const fmt = d => d.toLocaleDateString('es', { day:'numeric', month:'long' })
    return `${fmt(start)} - ${fmt(end)}, ${start.getFullYear()}`
  }

  const getDateForDay = di => {
    const d = getBaseWeek()
    d.setDate(d.getDate() + weekOffset * 7 + di)
    return d.getDate()
  }

  const getDateObjForDay = (di) => {
    const d = getBaseWeek()
    d.setDate(d.getDate() + weekOffset * 7 + di)
    return d
  }

  const formatDayHeader = (di) => {
    const d = getDateObjForDay(di)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${DAYS[di]} ${dd}/${mm}`
  }

  // ── CARGAR DESDE SUPABASE ────────────────────────────────
  useEffect(() => { fetchWeek() }, [weekOffset])

  const fetchWeek = async () => {
    setLoading(true)
    try {
      const weekStart = getWeekStart()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')
      const { data, error } = await supabase
        .from('weekly_planning')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)

      if (error) throw error

      if (data && data.length > 0) {
        // Reconstruir rows desde BD
        const newRows = TIME_SLOTS.map(t => ({
          t,
          days: DAYS.map((_, di) => {
            const rec = data.find(r => r.time_slot === t && r.day_index === di)
            if (rec && rec.subject) {
              return { l: rec.subject, s: rec.description || '', bg: rec.color_bg, b: rec.color_border }
            }
            return { l:'', s:'', bg:'', b:'' }
          })
        }))
        setRows(newRows)
      } else {
        // Semana sin datos: mantener la tabla vacía (sin datos de ejemplo).
        setRows(TIME_SLOTS.map(t => ({ t, days: EMPTY_DAYS() })))
      }
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar el horario')
    } finally {
      setLoading(false)
    }
  }

  // ── GUARDAR CELDA EN SUPABASE ────────────────────────────
  const saveCell = async (ri, di, cellData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const weekStart = getWeekStart()
      const timeSlot  = TIME_SLOTS[ri]

      if (cellData.l) {
        // Upsert — insertar o actualizar
        const { error } = await supabase
          .from('weekly_planning')
          .upsert({
            user_id:      user.id,
            week_start:   weekStart,
            time_slot:    timeSlot,
            day_index:    di,
            subject:      cellData.l,
            description:  cellData.s,
            color_bg:     cellData.bg,
            color_border: cellData.b,
            updated_at:   new Date().toISOString(),
          }, { onConflict: 'user_id,week_start,time_slot,day_index' })
        if (error) throw error
      } else {
        // Eliminar registro si la celda queda vacía
        const { error } = await supabase
          .from('weekly_planning')
          .delete()
          .eq('user_id', user.id)
          .eq('week_start', weekStart)
          .eq('time_slot', timeSlot)
          .eq('day_index', di)
        if (error) throw error
      }
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar en base de datos')
    }
  }

  // ── ABRIR MODAL AGREGAR ──────────────────────────────────
  const openAdd = (ri, di) => {
    setCellTarget({ ri, di })
    setFormKind('course')
    setFormSubject(ACADEMIC_SUBJECT_OPTIONS[0] || '')
    setFormSection(courseOptions[0] || '')
    setFormActivity(EXTRA_WEEKLY_ACTIVITY_OPTIONS[0] || 'Evaluación')
    setFormS('')
    setFormColor(0)
    setAddModal(true)
  }

  const handleAdd = async () => {
    const label = formKind === 'course'
      ? buildAcademicCourse(formSubject, formSection)
      : String(formActivity || '').trim()

    if (!label.trim()) return
    if (formKind === 'course' && !String(formSection || '').trim()) {
      showToast('warning', 'Primero crea cursos en "Cursos y Secciones" para poder planificar clases.')
      return
    }
    const col = COLORS[formColor]
    const cellData = { l: label, s: formS, bg: col.bg, b: col.b }

    setRows(p => p.map((r, i) => i !== cellTarget.ri ? r : {
      ...r, days: r.days.map((d, j) => j !== cellTarget.di ? d : cellData)
    }))

    await saveCell(cellTarget.ri, cellTarget.di, cellData)
    setAddModal(false)
    showToast('success', 'Clase agregada')
  }

  // ── ABRIR MODAL EDITAR ───────────────────────────────────
  const openEdit = (ri, di, cell) => {
    if (!cell.l) return
    setCellTarget({ ri, di })

    const rawLabel = String(cell.l || '').trim()
    const looksLikeCourse = rawLabel.includes(' - ')

    if (looksLikeCourse) {
      const parts = splitAcademicCourse(rawLabel)
      setFormKind('course')
      setFormSubject(parts.subject || ACADEMIC_SUBJECT_OPTIONS[0] || '')
      setFormSection(parts.section || courseOptions[0] || '')
      setFormActivity(EXTRA_WEEKLY_ACTIVITY_OPTIONS[0] || 'Evaluación')
    } else {
      setFormKind('activity')
      setFormActivity(rawLabel || (EXTRA_WEEKLY_ACTIVITY_OPTIONS[0] || 'Evaluación'))
      setFormSubject(ACADEMIC_SUBJECT_OPTIONS[0] || '')
      setFormSection(courseOptions[0] || '')
    }

    setFormS(cell.s)
    const ci = COLORS.findIndex(c => c.b === cell.b)
    setFormColor(ci >= 0 ? ci : 0)
    setEditModal(true)
  }

  const handleEdit = async () => {
    const col = COLORS[formColor]
    const label = formKind === 'course'
      ? buildAcademicCourse(formSubject, formSection)
      : String(formActivity || '').trim()

    if (!label.trim()) return
    if (formKind === 'course' && !String(formSection || '').trim()) {
      showToast('warning', 'Primero crea cursos en "Cursos y Secciones" para poder planificar clases.')
      return
    }

    const cellData = { l: label, s: formS, bg: col.bg, b: col.b }

    setRows(p => p.map((r, i) => i !== cellTarget.ri ? r : {
      ...r, days: r.days.map((d, j) => j !== cellTarget.di ? d : cellData)
    }))

    await saveCell(cellTarget.ri, cellTarget.di, cellData)
    setEditModal(false)
    showToast('success', 'Clase actualizada')
  }

  // ── ELIMINAR CELDA ───────────────────────────────────────
  const clearCell = async (ri, di) => {
    setRows(p => p.map((r, i) => i !== ri ? r : {
      ...r, days: r.days.map((d, j) => j !== di ? d : { l:'', s:'', bg:'', b:'' })
    }))
    await saveCell(ri, di, { l:'', s:'', bg:'', b:'' })
    showToast('success', 'Clase eliminada')
  }

  // ── EXPORTAR HORARIO ─────────────────────────────────────
  const handleExport = () => {
    const lines = [`HORARIO SEMANAL — ${getWeekLabel()}`, '']
    rows.forEach(row => {
      lines.push(`\n${row.t}`)
      row.days.forEach((d, i) => {
        lines.push(`  ${DAYS[i]}: ${d.l ? `${d.l} — ${d.s}` : '(libre)'}`)
      })
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `horario_${getWeekStart()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', 'Horario exportado correctamente')
  }

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Planificación Semanal</span>
        </div>
        <h2>Planificación Semanal y Diaria</h2>
        <p>Clic en celda vacía para agregar clase. Clic en bloque para editar.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(o => o-1)}>
              <i className="fas fa-chevron-left"/>
            </button>
            <span style={{fontWeight:600}}>{getWeekLabel()}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(o => o+1)}>
              <i className="fas fa-chevron-right"/>
            </button>
            {weekOffset !== 0 && (
              <button className="btn btn-sm btn-secondary" onClick={() => setWeekOffset(0)}>Hoy</button>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <i className="fas fa-download"/>Exportar
          </button>
        </div>

        <div className="card-body" style={{overflowX:'auto'}}>
          {loading ? (
            <div style={{textAlign:'center', padding:'2rem', color:'#6b7280'}}>
              <i className="fas fa-spinner fa-spin" style={{fontSize:'1.5rem', marginBottom:'0.5rem', display:'block'}}/>
              Cargando horario...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:'110px'}}>Hora</th>
                  {DAYS.map((d, i) => {
                    const todayIndex = weekOffset === 0 ? getDayIndexMonday0(new Date()) : -1
                    const isToday = i === todayIndex
                    return (
                      <th
                        key={d}
                        style={{
                          background: isToday ? 'rgba(37,99,235,0.08)' : undefined,
                          color: isToday ? 'var(--primary)' : undefined,
                          fontWeight: isToday ? 700 : undefined,
                        }}
                      >
                        {formatDayHeader(i)}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.t}>
                    <td style={{fontWeight:600, color:'#6b7280', fontSize:'0.85rem'}}>{row.t}</td>
                    {row.days.map((d, di) => (
                      <td
                        key={di}
                        style={{
                          padding: '0.5rem',
                          background:
                            weekOffset === 0 && di === getDayIndexMonday0(new Date())
                              ? 'rgba(37,99,235,0.03)'
                              : undefined,
                        }}
                      >
                        {d.l ? (
                          <div
                            style={{background:d.bg, padding:'0.75rem', borderRadius:8, borderLeft:`3px solid ${d.b}`, position:'relative', cursor:'pointer'}}
                            onClick={() => openEdit(ri, di, d)}>
                            <div style={{fontWeight:600, fontSize:'0.85rem'}}>{d.l}</div>
                            <div style={{fontSize:'0.75rem', color:'#6b7280'}}>{d.s}</div>
                            <button
                              onClick={e => { e.stopPropagation(); clearCell(ri, di) }}
                              style={{position:'absolute', top:4, right:4, background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'0.7rem'}}>
                              <i className="fas fa-times"/>
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => openAdd(ri, di)}
                            style={{height:60, border:'2px dashed #e5e7eb', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#d1d5db', transition:'all .2s'}}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
                            <i className="fas fa-plus"/>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal AGREGAR ── */}
      {addModal && (
        <Modal title="Agregar Clase" icon="fa-plus-circle"
          onClose={() => setAddModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd}><i className="fas fa-save"/>Agregar</button>
          </>}>
            <div className="form-group">
              <label>Tipo *</label>
              <select className="form-control" value={formKind} onChange={e => setFormKind(e.target.value)}>
                <option value="course">Clase (Materia)</option>
                <option value="activity">Actividad</option>
              </select>
            </div>

            {formKind === 'course' ? (
              <>
                <div className="form-group">
                  <label>Materia *</label>
                  <select className="form-control" value={formSubject} onChange={e => setFormSubject(e.target.value)}>
                    {ACADEMIC_SUBJECT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Curso (Sección) *</label>
                  <select
                    className="form-control"
                    value={formSection}
                    onChange={e => setFormSection(e.target.value)}
                    disabled={courseOptions.length === 0}
                  >
                    {courseOptions.length === 0 ? (
                      <option value="">No hay cursos creados</option>
                    ) : (
                      courseOptions.map(option => <option key={option}>{option}</option>)
                    )}
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Actividad *</label>
                <select className="form-control" value={formActivity} onChange={e => setFormActivity(e.target.value)}>
                  {Array.from(new Set([formActivity, ...EXTRA_WEEKLY_ACTIVITY_OPTIONS].filter(Boolean))).map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}
          <div className="form-group">
            <label>Descripción / Aula</label>
            <input className="form-control" placeholder="Ej: Ecuaciones - Aula 201"
              value={formS} onChange={e => setFormS(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Color / Tipo</label>
            <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
              {COLORS.map((c, i) => (
                <div key={i} onClick={() => setFormColor(i)}
                  style={{padding:'0.4rem 0.75rem', borderRadius:8, background:c.bg, borderLeft:`3px solid ${c.b}`, cursor:'pointer', fontSize:'0.8rem', outline: formColor === i ? `2px solid ${c.b}` : '2px solid transparent'}}>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal EDITAR ── */}
      {editModal && (
        <Modal title="Editar Clase" icon="fa-edit" iconColor="var(--warning)"
          onClose={() => setEditModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEdit}><i className="fas fa-save"/>Guardar</button>
          </>}>
            <div className="form-group">
              <label>Tipo *</label>
              <select className="form-control" value={formKind} onChange={e => setFormKind(e.target.value)}>
                <option value="course">Clase (Materia)</option>
                <option value="activity">Actividad</option>
              </select>
            </div>

            {formKind === 'course' ? (
              <>
                <div className="form-group">
                  <label>Materia *</label>
                  <select className="form-control" value={formSubject} onChange={e => setFormSubject(e.target.value)}>
                    {ACADEMIC_SUBJECT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Curso (Sección) *</label>
                  <select
                    className="form-control"
                    value={formSection}
                    onChange={e => setFormSection(e.target.value)}
                    disabled={courseOptions.length === 0}
                  >
                    {courseOptions.length === 0 ? (
                      <option value="">No hay cursos creados</option>
                    ) : (
                      Array.from(new Set([formSection, ...courseOptions].filter(Boolean))).map(option => (
                        <option key={option}>{option}</option>
                      ))
                    )}
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Actividad *</label>
                <select className="form-control" value={formActivity} onChange={e => setFormActivity(e.target.value)}>
                  {Array.from(new Set([formActivity, ...EXTRA_WEEKLY_ACTIVITY_OPTIONS].filter(Boolean))).map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}
          <div className="form-group">
            <label>Descripción / Aula</label>
            <input className="form-control" placeholder="Ej: Ecuaciones - Aula 201"
              value={formS} onChange={e => setFormS(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Color / Tipo</label>
            <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
              {COLORS.map((c, i) => (
                <div key={i} onClick={() => setFormColor(i)}
                  style={{padding:'0.4rem 0.75rem', borderRadius:8, background:c.bg, borderLeft:`3px solid ${c.b}`, cursor:'pointer', fontSize:'0.8rem', outline: formColor === i ? `2px solid ${c.b}` : '2px solid transparent'}}>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
