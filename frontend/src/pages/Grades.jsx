import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import { ACADEMIC_SUBJECT_OPTIONS, buildAcademicCourse } from '../data/projectOptions.js'
import { studentsService } from '../services/academicServices.js'
import { fetchSystemSettings } from '../services/settingsService.js'
import { formatGradeForScale, getDefaultGradeScale, getPerformanceMeta } from '../services/gradingScaleUtils.js'
import { recordAuditEvent } from '../services/auditLogger.js'

const PERIODS = ['Período 1', 'Período 2', 'Período 3', 'Período 4']

const DEFAULT_ACTIVITIES = [
  { name: 'Tarea 1', type: 'Tarea', weight: 20, due_date: null, description: '' },
  { name: 'Quiz 1', type: 'Quiz', weight: 15, due_date: null, description: '' },
  { name: 'Parcial 1', type: 'Parcial', weight: 30, due_date: null, description: '' },
  { name: 'Proyecto', type: 'Proyecto', weight: 35, due_date: null, description: '' },
]

const clsColor = v => v >= 70 ? 'var(--success)' : v >= 60 ? 'var(--warning)' : 'var(--danger)'
const clsClass = v => v >= 70 ? 'high' : v >= 60 ? 'medium' : 'low'
const inits = n => (n || '').split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('')

const weighted = (gs, acts) => {
  const total = acts.reduce((s, a) => s + Number(a.weight || 0), 0)
  if (total === 0) return 0
  return gs.reduce((t, g, i) => t + (Number(g) || 0) * (Number(acts[i]?.weight) || 0) / total, 0)
}

const cloneMap = (value = {}) => JSON.parse(JSON.stringify(value || {}))

export default function Grades({ showToast, onNavigate }) {
  const [subject, setSubject] = useState(ACADEMIC_SUBJECT_OPTIONS[0] || '')
  const [courseOptions, setCourseOptions] = useState([])
  const [section, setSection] = useState('')
  const [period, setPeriod] = useState(PERIODS[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [students, setStudents] = useState([])
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES)
  const [grades, setGrades] = useState({})
  const [comments, setComments] = useState({})
  const [originalGrades, setOriginalGrades] = useState({})
  const [originalComments, setOriginalComments] = useState({})
  const [settings, setSettings] = useState(null)

  const [commentModal, setCommentModal] = useState(false)
  const [activityModal, setActivityModal] = useState(false)
  const [delActModal, setDelActModal] = useState(false)
  const [selStudent, setSelStudent] = useState(null)
  const [selActIdx, setSelActIdx] = useState(null)

  const [actName, setActName] = useState('')
  const [actType, setActType] = useState('Tarea')
  const [actWeight, setActWeight] = useState(20)
  const [actDate, setActDate] = useState('')
  const [actDesc, setActDesc] = useState('')
  const [weightError, setWeightError] = useState('')

  const [commentText, setCommentText] = useState('')
  const [commentVisibility, setCommentVisibility] = useState('Visible en boletín')
  const course = buildAcademicCourse(subject, section)

useEffect(() => {
  ;(async () => {
    try {
      const codes = await studentsService.fetchCourseOptions()
      setCourseOptions(codes)
      setSection((current) => current || codes[0] || '')
    } catch (err) {
      console.error(err)
    }
  })()
}, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')
      if (!String(section || '').trim()) {
        setStudents([])
        setGrades({})
        setComments({})
        setActivities(DEFAULT_ACTIVITIES)
        return
      }

      const courseParts = course.split(' - ')
      const courseCode = courseParts[1] || course

      const { data: studentsData, error: sErr } = await supabase
        .from('students')
        .select('id, name')
        .eq('course', courseCode)
        .order('name', { ascending: true })
      if (sErr) throw sErr

      const realStudents = studentsData || []
      setStudents(realStudents)

      const { data: acts, error: aErr } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('course', course)
        .eq('period', period)
        .order('created_at', { ascending: true })
      if (aErr) throw aErr

      const loadedActs = acts && acts.length > 0
        ? acts.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            weight: Number(a.weight) || 0,
            due_date: a.due_date,
            description: a.description || '',
          }))
        : DEFAULT_ACTIVITIES

      if (!acts || acts.length === 0) {
        const { error: insErr } = await supabase.from('activities').insert(
          DEFAULT_ACTIVITIES.map(a => ({ user_id: user.id, course, period, ...a }))
        )
        if (insErr) {
          console.warn('No se pudieron insertar actividades default:', insErr)
        }
      }

      setActivities(loadedActs)

      const { data: gradesData, error: gErr } = await supabase
        .from('grades')
        .select('*')
        .eq('user_id', user.id)
        .eq('course', course)
        .eq('period', period)
      if (gErr) throw gErr

      const safeGrades = gradesData || []
      const gradesMap = {}
      const commentsMap = {}

      realStudents.forEach(s => {
        gradesMap[s.name] = loadedActs.map(a => {
          const rec = safeGrades.find(g => g.student_name === s.name && g.activity === a.name)
          return rec ? Number(rec.grade) : 0
        })

        const commentRec = safeGrades.find(g => g.student_name === s.name && g.comment)
        if (commentRec) commentsMap[s.name] = commentRec.comment
      })

      setGrades(gradesMap)
      setComments(commentsMap)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar calificaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [course, period])

  const updateGrade = (studentName, idx, val) => {
    const num = Math.min(100, Math.max(0, parseInt(val, 10) || 0))
    setGrades(prev => ({
      ...prev,
      [studentName]: (prev[studentName] || activities.map(() => 0)).map((g, i) => i === idx ? num : g),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const upserts = []
      students.forEach(s => {
        const gs = grades[s.name] || []
        activities.forEach((a, i) => {
          upserts.push({
            user_id: user.id,
            course,
            period,
            student_name: s.name,
            activity: a.name,
            weight: a.weight,
            grade: gs[i] || 0,
            comment: comments[s.name] || null,
            updated_at: new Date().toISOString(),
          })
        })
      })

      const { error } = await supabase
        .from('grades')
        .upsert(upserts, { onConflict: 'user_id,course,period,student_name,activity' })
      if (error) throw error

      showToast('success', 'Calificaciones guardadas correctamente')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar calificaciones')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveComment = () => {
    if (!selStudent) return
    setComments(prev => ({ ...prev, [selStudent.name]: commentText }))
    setCommentModal(false)
    showToast('success', 'Comentario guardado, recuerda guardar las notas')
  }

  const openComment = s => {
    setSelStudent(s)
    setCommentText(comments[s.name] || '')
    setCommentVisibility('Visible en boletín')
    setCommentModal(true)
  }

  const totalWeight = activities.reduce((s, a) => s + Number(a.weight || 0), 0)

  const openAddActivity = () => {
    setActName('')
    setActType('Tarea')
    setActWeight(20)
    setActDate('')
    setActDesc('')
    setWeightError('')
    setActivityModal(true)
  }

  const handleAddActivity = async () => {
    if (!actName.trim()) {
      showToast('warning', 'El nombre es requerido')
      return
    }

    const nextWeight = Number(actWeight) || 0
    const newTotal = totalWeight + nextWeight
    if (newTotal > 100) {
      setWeightError(`El total sería ${newTotal}%. Ajusta los pesos para no superar 100%`)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const { data, error } = await supabase
        .from('activities')
        .insert([{
          user_id: user.id,
          course,
          period,
          name: actName.trim(),
          type: actType,
          weight: nextWeight,
          due_date: actDate || null,
          description: actDesc,
        }])
        .select()
        .single()
      if (error) throw error

      const newAct = {
        id: data.id,
        name: data.name,
        type: data.type,
        weight: Number(data.weight) || 0,
        due_date: data.due_date,
        description: data.description || '',
      }

      setActivities(prev => [...prev, newAct])
      setGrades(prev => {
        const updated = { ...prev }
        students.forEach(s => {
          updated[s.name] = [...(prev[s.name] || []), 0]
        })
        return updated
      })

      setActivityModal(false)
      showToast('success', `Actividad "${actName.trim()}" agregada`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al crear la actividad')
    }
  }

  const openDeleteAct = idx => {
    setSelActIdx(idx)
    setDelActModal(true)
  }

  const handleDeleteActivity = async () => {
    const act = activities[selActIdx]
    if (!act) return

    try {
      if (act.id) {
        const { error: actErr } = await supabase.from('activities').delete().eq('id', act.id)
        if (actErr) throw actErr

        const { error: gradeErr } = await supabase
          .from('grades')
          .delete()
          .eq('course', course)
          .eq('period', period)
          .eq('activity', act.name)
        if (gradeErr) throw gradeErr
      }

      setActivities(prev => prev.filter((_, i) => i !== selActIdx))
      setGrades(prev => {
        const updated = {}
        students.forEach(s => {
          updated[s.name] = (prev[s.name] || []).filter((_, i) => i !== selActIdx)
        })
        return updated
      })

      setDelActModal(false)
      showToast('success', `Actividad "${act.name}" eliminada`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar actividad')
    }
  }

  const allAverages = students.map(s => weighted(grades[s.name] || [], activities))
  const classAvg = allAverages.length ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length : 0
  const passing = allAverages.filter(a => a >= 60).length
  const failing = allAverages.filter(a => a < 60).length

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Calificaciones</span>
        </div>
        <h2>Control de Calificaciones</h2>
        <p>Registra y gestiona las calificaciones de tus estudiantes</p>
      </div>

      <div className="stats-grid">
        {[
          { i: 'fa-users', c: 'blue', v: students.length, l: 'Estudiantes' },
          { i: 'fa-chart-line', c: 'green', v: classAvg.toFixed(1), l: 'Promedio clase' },
          { i: 'fa-check-circle', c: 'purple', v: passing, l: 'Aprobados' },
          { i: 'fa-times-circle', c: 'orange', v: failing, l: 'En riesgo' },
        ].map(s => (
          <div className="stat-card" key={s.l}>
            <div className={`icon ${s.c}`}><i className={`fas ${s.i}`} /></div>
            <div className="value">{s.v}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto' }} value={subject} onChange={e => setSubject(e.target.value)}>
              {ACADEMIC_SUBJECT_OPTIONS.map(option => <option key={option}>{option}</option>)}
            </select>

            <select className="form-control" style={{ width: 'auto' }} value={section} onChange={e => setSection(e.target.value)} disabled={courseOptions.length === 0}>
              {courseOptions.length === 0 ? (
                <option value="">No hay cursos</option>
              ) : (
                courseOptions.map(option => <option key={option}>{option}</option>)
              )}
            </select>

            <select className="form-control" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
              {PERIODS.map(p => <option key={p}>{p}</option>)}
            </select>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.4rem 0.75rem',
                background: totalWeight === 100
                  ? 'rgba(16,185,129,0.1)'
                  : totalWeight > 100
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(245,158,11,0.1)',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                color: totalWeight === 100
                  ? 'var(--success)'
                  : totalWeight > 100
                    ? 'var(--danger)'
                    : 'var(--warning)',
              }}
            >
              <i className="fas fa-weight-hanging" />
              Pesos: {totalWeight}% {totalWeight === 100 ? '✓' : totalWeight > 100 ? '⚠ excede' : '⚠ incompleto'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={openAddActivity}>
              <i className="fas fa-plus" />Nueva Actividad
            </button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving || loading}>
              {saving
                ? <><i className="fas fa-spinner fa-spin" />Guardando...</>
                : <><i className="fas fa-save" />Guardar</>
              }
            </button>
          </div>
        </div>

        <div className="card-body" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }} />
              Cargando calificaciones...
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-graduate" />
              <h3>No hay estudiantes para este curso</h3>
              <p>Verifica que la tabla `students` tenga registros con el curso seleccionado.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Estudiante</th>
                  {activities.map((a, i) => (
                    <th key={`${a.name}-${i}`} style={{ textAlign: 'center', minWidth: 100 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>{a.name}</span>
                        <span style={{ fontWeight: 'normal', color: '#6b7280', fontSize: '0.75rem' }}>{a.weight}%</span>
                        <button
                          onClick={() => openDeleteAct(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '0.65rem', padding: 0 }}
                          title={`Eliminar ${a.name}`}
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', minWidth: 90 }}>Promedio</th>
                  <th style={{ textAlign: 'center' }}>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const gs = grades[s.name] || activities.map(() => 0)
                  const avg = weighted(gs, activities)
                  const hasComment = !!comments[s.name]

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>
                            {inits(s.name)}
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{s.name}</span>
                        </div>
                      </td>

                      {gs.map((g, i) => (
                        <td key={`${s.id}-${i}`} style={{ textAlign: 'center', padding: '0.4rem' }}>
                          <input
                            type="number"
                            className={`grade-input ${clsClass(g)}`}
                            value={g}
                            min="0"
                            max="100"
                            onChange={e => updateGrade(s.name, i, e.target.value)}
                            style={{
                              width: 60,
                              textAlign: 'center',
                              border: 'none',
                              borderRadius: 6,
                              padding: '0.3rem',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              background: g >= 70
                                ? 'rgba(16,185,129,0.1)'
                                : g >= 60
                                  ? 'rgba(245,158,11,0.1)'
                                  : 'rgba(239,68,68,0.1)',
                              color: clsColor(g),
                            }}
                          />
                        </td>
                      ))}

                      <td style={{ textAlign: 'center', background: '#f8fafc' }}>
                        <strong style={{ fontSize: '1.05rem', color: clsColor(avg) }}>
                          {avg.toFixed(1)}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                          {avg >= 70 ? 'Aprobado' : avg >= 60 ? 'En riesgo' : 'Reprobado'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={`btn btn-sm ${hasComment ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => openComment(s)}
                          title={hasComment ? 'Ver/editar comentario' : 'Agregar comentario'}
                        >
                          <i className={`fas ${hasComment ? 'fa-comment-dots' : 'fa-comment'}`} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f3f4f6', fontWeight: 600 }}>
                  <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>Promedio clase</td>
                  {activities.map((a, i) => {
                    const actAvg = students.reduce((sum, s) => sum + (grades[s.name]?.[i] || 0), 0) / (students.length || 1)
                    return (
                      <td key={`avg-${a.name}-${i}`} style={{ textAlign: 'center', fontSize: '0.85rem', color: clsColor(actAvg) }}>
                        {actAvg.toFixed(1)}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'center', color: clsColor(classAvg) }}>
                    {classAvg.toFixed(1)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {commentModal && selStudent && (
        <Modal
          title={`Observación - ${selStudent.name}`}
          icon="fa-comment-alt"
          onClose={() => setCommentModal(false)}
          maxWidth="500px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCommentModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveComment}>
                <i className="fas fa-save" />Guardar
              </button>
            </>
          }
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '1.25rem',
              padding: '0.875rem',
              background: '#f3f4f6',
              borderRadius: 10,
            }}
          >
            <div className="user-avatar" style={{ width: 40, height: 40 }}>
              {inits(selStudent.name)}
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>{selStudent.name}</p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                Promedio actual:{' '}
                <strong style={{ color: clsColor(weighted(grades[selStudent.name] || [], activities)) }}>
                  {weighted(grades[selStudent.name] || [], activities).toFixed(1)}
                </strong>
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Observación del Docente</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Ej: Estudiante con excelente desempeño. Participativo y puntual en entregas..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Visibilidad</label>
            <select className="form-control" value={commentVisibility} onChange={e => setCommentVisibility(e.target.value)}>
              <option>Visible en boletín</option>
              <option>Solo interno</option>
            </select>
          </div>
        </Modal>
      )}

      {activityModal && (
        <Modal
          title="Nueva Actividad Evaluativa"
          icon="fa-plus-circle"
          iconColor="var(--success)"
          onClose={() => setActivityModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setActivityModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddActivity}>
                <i className="fas fa-save" />Crear
              </button>
            </>
          }
        >
          <div className="grid-2">
            <div className="form-group">
              <label>Nombre *</label>
              <input className="form-control" placeholder="Ej: Tarea 2" value={actName} onChange={e => setActName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select className="form-control" value={actType} onChange={e => setActType(e.target.value)}>
                {['Tarea', 'Quiz', 'Parcial', 'Proyecto', 'Examen Final', 'Laboratorio'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Peso (%) - Disponible: {100 - totalWeight}%</label>
              <input
                type="number"
                className="form-control"
                min="0"
                max={Math.max(0, 100 - totalWeight)}
                value={actWeight}
                onChange={e => {
                  setActWeight(e.target.value)
                  setWeightError('')
                }}
              />
              {weightError && <small style={{ color: 'var(--danger)' }}>{weightError}</small>}
            </div>

            <div className="form-group">
              <label>Fecha de entrega</label>
              <input type="date" className="form-control" value={actDate} onChange={e => setActDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Describe la actividad..."
              value={actDesc}
              onChange={e => setActDesc(e.target.value)}
            />
          </div>

          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '0.75rem', fontSize: '0.82rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Distribución de pesos:</p>
            {activities.map(a => (
              <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: 2 }}>
                <span>{a.name}</span><span>{a.weight}%</span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600,
                borderTop: '1px solid #e5e7eb',
                marginTop: '0.4rem',
                paddingTop: '0.4rem',
                color: totalWeight + Number(actWeight) > 100 ? 'var(--danger)' : 'var(--success)',
              }}
            >
              <span>Nueva actividad</span><span>+{Number(actWeight) || 0}%</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                color: totalWeight + Number(actWeight) > 100 ? 'var(--danger)' : 'var(--primary)',
              }}
            >
              <span>Total</span><span>{totalWeight + (Number(actWeight) || 0)}%</span>
            </div>
          </div>
        </Modal>
      )}

      {delActModal && selActIdx !== null && (
        <Modal
          title="Eliminar Actividad"
          icon="fa-trash"
          iconColor="var(--danger)"
          onClose={() => setDelActModal(false)}
          maxWidth="480px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDelActModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDeleteActivity}>
                <i className="fas fa-trash" />Eliminar
              </button>
            </>
          }
        >
          <p>¿Seguro que deseas eliminar la actividad <strong>"{activities[selActIdx]?.name}"</strong>?</p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }} />
            Se eliminarán todas las notas registradas en esta actividad.
          </p>
        </Modal>
      )}
    </section>
  )
}
