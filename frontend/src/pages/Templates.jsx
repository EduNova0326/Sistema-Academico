import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import {
  DEFAULT_ANNUAL_TEMPLATE,
  normalizePlanningTemplate,
  TEMPLATE_TYPE_META,
} from '../services/planningTemplateService.js'
import { templatesService } from '../services/planningCrudServices.js'
import { startOfWeekMondayLocal, toISODateLocal } from '../utils/dateUtils.js'

const ICONS = [
  { i: 'fa-file-alt', c: 'var(--primary)', label: 'Clase' },
  { i: 'fa-flask', c: 'var(--success)', label: 'Lab' },
  { i: 'fa-users', c: 'var(--secondary)', label: 'Grupo' },
  { i: 'fa-clipboard-check', c: 'var(--warning)', label: 'Eval' },
  { i: 'fa-book', c: 'var(--danger)', label: 'Lectura' },
  { i: 'fa-sitemap', c: 'var(--secondary)', label: 'RA' },
]

const SLOTS = ['08:00-09:30', '10:00-11:30', '14:00-15:30']
const WEEK_DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']

const EXAMPLE_TEMPLATES = [
  {
    name: 'Clase Magistral',
    description: 'Plantilla estandar para clases teoricas expositivas.',
    content:
      '1. Saludo y revision de tarea anterior\n2. Introduccion al nuevo tema\n3. Desarrollo teorico con ejemplos\n4. Practica guiada\n5. Cierre y tarea',
    icon: 'fa-file-alt',
    color: 'var(--primary)',
    uses: 0,
    template_type: 'weekly',
    structure_json: null,
    is_system_template: false,
  },
  {
    name: 'Laboratorio',
    description: 'Estructura para practicas experimentales de laboratorio.',
    content:
      '1. Objetivos del laboratorio\n2. Normas de seguridad\n3. Materiales\n4. Procedimiento\n5. Registro de observaciones\n6. Analisis y conclusiones',
    icon: 'fa-flask',
    color: 'var(--success)',
    uses: 0,
    template_type: 'weekly',
    structure_json: null,
    is_system_template: false,
  },
]

const emptyForm = {
  name: '',
  description: '',
  content: '',
  icon: 'fa-file-alt',
  color: 'var(--primary)',
  type: 'weekly',
}

export function Templates({ showToast, onNavigate }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [courseOptions, setCourseOptions] = useState([])

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [viewModal, setViewModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [useModal, setUseModal] = useState(false)
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState(emptyForm)

  const [useWeek, setUseWeek] = useState(0)
  const [useDay, setUseDay] = useState(0)
  const [useSlot, setUseSlot] = useState('08:00-09:30')
  const [useCourse, setUseCourse] = useState('')

  useEffect(() => {
    fetchTemplates()
    loadCourses()
  }, [])

  const loadCourses = async () => {
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
      setUseCourse((current) => current || codes[0] || '')
    } catch (err) {
      console.error(err)
    }
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const rows = await templatesService.list({ orderBy: 'created_at', ascending: true })
      if (rows.length === 0) {
        await seedExamples()
        return
      }

      setTemplates(rows)
      await ensureInstitutionalTemplate(rows)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }

  const ensureInstitutionalTemplate = async (currentTemplates = []) => {
    if (currentTemplates.some(template => template.type === 'annual_ra')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await templatesService.create({
        toRow: () => ({ ...DEFAULT_ANNUAL_TEMPLATE, user_id: user?.id || null }),
      })
      setTemplates(prev => [...prev, normalizePlanningTemplate(created)])
    } catch (error) {
      console.error(error)
    }
  }

  const seedExamples = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await templatesService.createMany(
        [...EXAMPLE_TEMPLATES, { ...DEFAULT_ANNUAL_TEMPLATE, user_id: user?.id || null }].map(row => ({
          ...row,
          user_id: user?.id || null,
        }))
      )
      setTemplates(created.map(normalizePlanningTemplate))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    return typeFilter === 'all'
      ? templates
      : templates.filter(template => template.type === typeFilter)
  }, [templates, typeFilter])

  const setF = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const openAdd = () => {
    setForm(emptyForm)
    setAddModal(true)
  }

  const openEdit = (template) => {
    setSelected(template)
    setForm({
      name: template.n,
      description: template.d,
      content: template.content,
      icon: template.i,
      color: template.c,
      type: template.type,
    })
    setEditModal(true)
  }

  const saveTemplate = async (mode = 'create') => {
    if (!form.name.trim()) {
      showToast('warning', 'El nombre es requerido')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (mode === 'create') {
        const created = await templatesService.createFromForm(form, user?.id, DEFAULT_ANNUAL_TEMPLATE.structure_json)
        setTemplates(prev => [...prev, created])
        setAddModal(false)
        showToast('success', `Plantilla "${form.name}" creada`)
      } else {
        const updated = await templatesService.updateFromForm(selected.id, form, DEFAULT_ANNUAL_TEMPLATE.structure_json)
        setTemplates(prev => prev.map(item => item.id === selected.id ? updated : item))
        setEditModal(false)
        showToast('success', 'Plantilla actualizada')
      }
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar la plantilla')
    }
  }

  const openUse = (template) => {
    setSelected(template)
    setUseWeek(0)
    setUseDay(0)
    setUseSlot(SLOTS[0])
    setUseCourse(courseOptions[0] || '')
    setUseModal(true)
  }

  const handleUse = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await templatesService.incrementUses(selected.id, selected.uses + 1)

      setTemplates(prev => prev.map(item => item.id === selected.id ? { ...item, uses: item.uses + 1 } : item))

      if (selected.type === 'annual_ra') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('edunovaAnnualTemplateId', String(selected.id))
        }
        showToast('success', 'Plantilla institucional disponible en Planificacion Anual')
        setUseModal(false)
        onNavigate('annual-planning')
        return
      }

      const base = startOfWeekMondayLocal()
      base.setDate(base.getDate() + useWeek * 7)
      const weekStart = toISODateLocal(base)

      const { data: { user } } = await supabase.auth.getUser()
      const { error: wpErr } = await supabase
        .from('weekly_planning')
        .upsert({
          user_id: user.id,
          week_start: weekStart,
          time_slot: useSlot,
          day_index: useDay,
          subject: `${selected.n} - ${useCourse}`,
          description: selected.content?.split('\n')[0] || '',
          color_bg: 'rgba(37,99,235,0.1)',
          color_border: 'var(--primary)',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,week_start,time_slot,day_index' })
      if (wpErr) throw wpErr

      setUseModal(false)
      showToast('success', `Plantilla aplicada el ${WEEK_DAYS[useDay]} - ${useSlot}`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al aplicar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await templatesService.createFromForm({
        name: `${template.n} (copia)`,
        description: template.d,
        content: template.content,
        icon: template.i,
        color: template.c,
        type: template.type,
        structure_json: template.structure,
      }, user?.id, template.structure)
      setTemplates(prev => [...prev, created])
      showToast('success', 'Plantilla duplicada')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al duplicar la plantilla')
    }
  }

  const handleDelete = async () => {
    try {
      await templatesService.delete(selected.id)
      setTemplates(prev => prev.filter(item => item.id !== selected.id))
      setDeleteModal(false)
      showToast('success', 'Plantilla eliminada')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar')
    }
  }

  const iconSelector = (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {ICONS.map(icon => (
        <div
          key={icon.i}
          onClick={() => { setF('icon', icon.i); setF('color', icon.c) }}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            cursor: 'pointer',
            border: form.icon === icon.i ? `2px solid ${icon.c}` : '2px solid #e5e7eb',
            background: form.icon === icon.i ? 'rgba(37,99,235,0.05)' : '#fff',
          }}
        >
          <i className={`fas ${icon.i}`} style={{ color: icon.c, marginRight: 5 }} />
          {icon.label}
        </div>
      ))}
    </div>
  )

  const renderAnnualStructure = (template) => {
    const structure = template.structure
    if (!structure) return null
    return (
      <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
        {structure.sections.map(section => (
          <div key={section.title} style={{ background: '#f8fafc', borderRadius: 12, padding: '0.9rem 1rem', border: '1px solid #e5e7eb' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{section.title}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {section.items.map(item => (
                <span key={item} className="status-badge pending">{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Plantillas</span>
        </div>
        <h2>Plantillas de Planificacion</h2>
        <p>Crea, organiza y reutiliza plantillas semanales y la matriz institucional por resultado de aprendizaje.</p>
      </div>

      <div className="stats-grid">
        {[
          { i: 'fa-copy', c: 'blue', v: templates.length, l: 'Plantillas totales' },
          { i: 'fa-calendar-week', c: 'green', v: templates.filter(t => t.type === 'weekly').length, l: 'Semanales' },
          { i: 'fa-sitemap', c: 'purple', v: templates.filter(t => t.type === 'annual_ra').length, l: 'Institucionales' },
          { i: 'fa-play-circle', c: 'orange', v: templates.reduce((sum, item) => sum + item.uses, 0), l: 'Usos acumulados' },
        ].map(item => (
          <div className="stat-card" key={item.l}>
            <div className={`icon ${item.c}`}><i className={`fas ${item.i}`} /></div>
            <div className="value">{item.v}</div>
            <div className="label">{item.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('all')}>Todas</button>
            <button className={`btn btn-sm ${typeFilter === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('weekly')}>Semanales</button>
            <button className={`btn btn-sm ${typeFilter === 'annual_ra' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('annual_ra')}>Institucional RA</button>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus" />Nueva Plantilla
          </button>
        </div>

        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
              Cargando plantillas...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-copy" />
              <h3>No hay plantillas</h3>
              <p>Crea tu primera plantilla para reutilizar tus planificaciones.</p>
              <button className="btn btn-primary" onClick={openAdd}>
                <i className="fas fa-plus" />Nueva Plantilla
              </button>
            </div>
          ) : (
            <div className="grid-3">
              {filteredTemplates.map(template => {
                const meta = TEMPLATE_TYPE_META[template.type] || TEMPLATE_TYPE_META.weekly
                return (
                  <div className="competency-item" key={template.id}>
                    <div className="header">
                      <h4><i className={`fas ${template.i}`} style={{ color: template.c }} /> {template.n}</h4>
                      <span className={`status-badge ${template.type === 'annual_ra' ? 'pending' : 'active'}`}>{meta.label}</span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{template.d}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginBottom: '0.35rem' }}>{meta.description}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginBottom: '1rem' }}>
                      <i className="fas fa-play-circle" style={{ marginRight: 5 }} />{template.uses} usos
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => openUse(template)}>
                        <i className={`fas ${template.type === 'annual_ra' ? 'fa-sitemap' : 'fa-play'}`} />
                        {template.type === 'annual_ra' ? 'Usar en anual' : 'Usar'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setSelected(template); setViewModal(true) }}>
                        <i className="fas fa-eye" />
                      </button>
                      {!template.isSystem && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(template)}>
                          <i className="fas fa-edit" />
                        </button>
                      )}
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDuplicate(template)}>
                        <i className="fas fa-copy" />
                      </button>
                      {!template.isSystem && (
                        <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => { setSelected(template); setDeleteModal(true) }}>
                          <i className="fas fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {addModal && (
        <Modal
          title="Nueva Plantilla"
          icon="fa-plus-circle"
          onClose={() => setAddModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => saveTemplate('create')}><i className="fas fa-save" />Guardar</button>
          </>}
        >
          <div className="form-group">
            <label>Tipo de plantilla</label>
            <select className="form-control" value={form.type} onChange={e => setF('type', e.target.value)}>
              {Object.values(TEMPLATE_TYPE_META).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nombre *</label>
            <input className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Descripcion</label>
            <input className="form-control" value={form.description} onChange={e => setF('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Icono</label>
            {iconSelector}
          </div>
          <div className="form-group">
            <label>{form.type === 'annual_ra' ? 'Orientacion de uso' : 'Estructura de la clase'}</label>
            <textarea className="form-control" rows={5} value={form.content} onChange={e => setF('content', e.target.value)} />
          </div>
          {form.type === 'annual_ra' && (
            <div className="alert-card success">
              <i className="fas fa-circle-info icon" />
              <div>
                <strong>Nota</strong>
                <p style={{ fontSize: '0.82rem' }}>
                  Las plantillas institucionales por RA incluyen automaticamente la estructura de datos generales, RA, EC, actividades, evaluacion y contenidos.
                </p>
              </div>
            </div>
          )}
        </Modal>
      )}

      {editModal && selected && (
        <Modal
          title="Editar Plantilla"
          icon="fa-edit"
          iconColor="var(--warning)"
          onClose={() => setEditModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => saveTemplate('edit')}><i className="fas fa-save" />Actualizar</button>
          </>}
        >
          <div className="form-group">
            <label>Tipo de plantilla</label>
            <select className="form-control" value={form.type} onChange={e => setF('type', e.target.value)}>
              {Object.values(TEMPLATE_TYPE_META).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nombre *</label>
            <input className="form-control" value={form.name} onChange={e => setF('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Descripcion</label>
            <input className="form-control" value={form.description} onChange={e => setF('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Icono</label>
            {iconSelector}
          </div>
          <div className="form-group">
            <label>{form.type === 'annual_ra' ? 'Orientacion de uso' : 'Estructura de la clase'}</label>
            <textarea className="form-control" rows={5} value={form.content} onChange={e => setF('content', e.target.value)} />
          </div>
        </Modal>
      )}

      {viewModal && selected && (
        <Modal
          title={selected.n}
          icon={selected.i}
          iconColor={selected.c}
          onClose={() => setViewModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setViewModal(false)}>Cerrar</button>
            {!selected.isSystem && (
              <button className="btn btn-secondary" onClick={() => { setViewModal(false); openEdit(selected) }}>
                <i className="fas fa-edit" />Editar
              </button>
            )}
            <button className="btn btn-primary" onClick={() => { setViewModal(false); openUse(selected) }}>
              <i className={`fas ${selected.type === 'annual_ra' ? 'fa-sitemap' : 'fa-play'}`} />
              {selected.type === 'annual_ra' ? 'Usar en anual' : 'Usar plantilla'}
            </button>
          </>}
        >
          <p style={{ color: '#6b7280', marginBottom: '0.75rem' }}>{selected.d}</p>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: 10 }}>
            <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <i className="fas fa-list" style={{ marginRight: 6, color: 'var(--primary)' }} />
              {selected.type === 'annual_ra' ? 'Orientacion institucional' : 'Estructura de la clase'}
            </p>
            {(selected.content || '').split('\n').filter(Boolean).map((line, index) => (
              <p key={index} style={{ fontSize: '0.875rem', color: '#374151', padding: '0.2rem 0' }}>{line}</p>
            ))}
          </div>
          {selected.type === 'annual_ra' && renderAnnualStructure(selected)}
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '1rem' }}>
            <i className="fas fa-play-circle" style={{ marginRight: 5 }} />{selected.uses} usos registrados
          </p>
        </Modal>
      )}

      {useModal && selected && (
        <Modal
          title={selected.type === 'annual_ra' ? `Activar - ${selected.n}` : `Aplicar - ${selected.n}`}
          icon={selected.type === 'annual_ra' ? 'fa-sitemap' : 'fa-play'}
          iconColor="var(--success)"
          onClose={() => setUseModal(false)}
          maxWidth="500px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setUseModal(false)}>Cancelar</button>
            <button className="btn btn-success" onClick={handleUse} disabled={saving}>
              {saving
                ? <><i className="fas fa-spinner fa-spin" />Aplicando...</>
                : <><i className={`fas ${selected.type === 'annual_ra' ? 'fa-check' : 'fa-play'}`} />{selected.type === 'annual_ra' ? 'Ir a plan anual' : 'Aplicar al horario'}</>}
            </button>
          </>}
        >
          <div style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '0.875rem', marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              <i className={`fas ${selected.i}`} style={{ color: selected.c, marginRight: 6 }} />{selected.n}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{selected.d}</p>
          </div>

          {selected.type === 'annual_ra' ? (
            <div className="alert-card success">
              <i className="fas fa-circle-info icon" />
              <div>
                <strong>Que hara esta accion</strong>
                <p style={{ fontSize: '0.82rem' }}>
                  Abrira la Planificacion Anual para que apliques esta matriz institucional al curso y ano que selecciones.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Curso</label>
                <select className="form-control" value={useCourse} onChange={e => setUseCourse(e.target.value)} disabled={courseOptions.length === 0}>
                  {courseOptions.length === 0 ? (
                    <option value="">No hay cursos</option>
                  ) : (
                    courseOptions.map(course => <option key={course}>{course}</option>)
                  )}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Semana</label>
                  <select className="form-control" value={useWeek} onChange={e => setUseWeek(Number(e.target.value))}>
                    <option value={0}>Esta semana</option>
                    <option value={1}>Proxima semana</option>
                    <option value={2}>En 2 semanas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bloque horario</label>
                  <select className="form-control" value={useSlot} onChange={e => setUseSlot(e.target.value)}>
                    {SLOTS.map(slot => <option key={slot}>{slot}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Dia de la semana</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {WEEK_DAYS.map((day, index) => (
                    <div
                      key={day}
                      onClick={() => setUseDay(index)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: useDay === index ? 600 : 400,
                        background: useDay === index ? 'var(--primary)' : '#f3f4f6',
                        color: useDay === index ? '#fff' : '#374151',
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      {deleteModal && selected && (
        <Modal
          title="Eliminar Plantilla"
          icon="fa-trash"
          iconColor="var(--danger)"
          onClose={() => setDeleteModal(false)}
          maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}><i className="fas fa-trash" />Eliminar</button>
          </>}
        >
          <p>¿Seguro que deseas eliminar <strong>"{selected?.n}"</strong>?</p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }} />Esta accion no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  )
}
