import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { buildTeacherOptions } from '../data/projectOptions.js'
import {
  coursesService,
  teachersService,
} from '../services/academicServices.js'
import {
  buildCourseName,
  CourseEntity,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  splitCourseCode,
} from '../domain/entities/CourseEntity.js'

const initials = (name = '') => name.split(' ').map(word => word[0]).slice(0, 2).join('')

export function Courses({ showToast, onNavigate }) {
  const [courses, setCourses] = useState([])
  const [teacherOptions, setTeacherOptions] = useState([])
  const [courseStudents, setCourseStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [viewModal, setViewModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(CourseEntity.buildForm())
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchCourses()
    fetchTeacherOptions()
  }, [])

  const fetchTeacherOptions = async () => {
    try {
      const options = await teachersService.fetchTeacherOptions()
      setTeacherOptions(buildTeacherOptions(options.map(name => ({ name }))))
    } catch (error) {
      console.error(error)
    }
  }

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const data = await coursesService.list({ ascending: true })
      setCourses(data)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar los cursos')
    } finally {
      setLoading(false)
    }
  }

  const syncCourseIdentity = (nextGradeCode, nextSection) => {
    setForm(prev => ({
      ...prev,
      gradeCode: nextGradeCode,
      section: nextSection,
      c: `${nextGradeCode}${nextSection}`,
      n: buildCourseName(nextGradeCode, nextSection),
    }))
  }

  const setF = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.gradeCode) nextErrors.gradeCode = 'Selecciona el grado'
    if (!form.section) nextErrors.section = 'Selecciona la seccion'
    if (!form.s || Number(form.s) <= 0) nextErrors.s = 'Numero valido'
    if (!form.sub || Number(form.sub) <= 0) nextErrors.sub = 'Numero valido'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const openAdd = () => {
    setForm(CourseEntity.buildForm())
    setErrors({})
    setAddModal(true)
  }

  const handleAdd = async () => {
    if (!validate()) return

    try {
      const course = await coursesService.createFromForm(form)
      setCourses(prev => [...prev, course])
      setAddModal(false)
      showToast('success', `Curso ${form.c} creado correctamente`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al crear el curso')
    }
  }

  const openEdit = (courseItem) => {
    const identity = splitCourseCode(courseItem.c)
    setSelected(courseItem)
    setForm(CourseEntity.buildForm({
      c: courseItem.c,
      n: courseItem.n,
      gradeCode: identity.gradeCode,
      section: identity.section,
      s: courseItem.s,
      sub: courseItem.sub,
      teacher: courseItem.teacher || '',
      status: courseItem.status || 'active',
    }))
    setErrors({})
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!validate()) return

    try {
      const updated = await coursesService.updateFromForm(selected.id, form)
      setCourses(prev => prev.map(course => (
        course.id === selected.id ? updated : course
      )))
      setEditModal(false)
      showToast('success', 'Curso actualizado correctamente')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al actualizar el curso')
    }
  }

  const openView = async (courseItem) => {
    setSelected(courseItem)
    setViewModal(true)
    setLoadingStudents(true)

    try {
      const data = await coursesService.listStudents(courseItem.c, { ownerUserId: courseItem.user_id || null })
      setCourseStudents(data)
    } catch (error) {
      console.error(error)
      setCourseStudents([])
      showToast('error', 'Error al cargar estudiantes del curso')
    } finally {
      setLoadingStudents(false)
    }
  }

  const openDelete = (courseItem) => {
    setSelected(courseItem)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    try {
      await coursesService.delete(selected.id)
      setCourses(prev => prev.filter(course => course.id !== selected.id))
      setDeleteModal(false)
      showToast('success', 'Curso eliminado correctamente')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar el curso')
    }
  }

  const renderCourseForm = (action) => (
    <div className="grid-2">
      <div className="form-group">
        <label>Grado *</label>
        <select
          className="form-control"
          value={form.gradeCode}
          onChange={event => syncCourseIdentity(event.target.value, form.section)}
        >
          {GRADE_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        {errors.gradeCode && <small style={{ color: 'var(--danger)' }}>{errors.gradeCode}</small>}
      </div>
      <div className="form-group">
        <label>Seccion *</label>
        <select
          className="form-control"
          value={form.section}
          onChange={event => syncCourseIdentity(form.gradeCode, event.target.value)}
        >
          {SECTION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        {errors.section && <small style={{ color: 'var(--danger)' }}>{errors.section}</small>}
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label>Curso generado</label>
        <div
          style={{
            background: '#f3f4f6',
            borderRadius: 10,
            padding: '0.9rem 1rem',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--primary)' }}>{form.c}</p>
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{form.n}</p>
        </div>
      </div>
      <div className="form-group">
        <label>No. estudiantes *</label>
        <input
          type="number"
          className="form-control"
          min="1"
          value={form.s}
          onChange={event => setF('s', event.target.value)}
        />
        {errors.s && <small style={{ color: 'var(--danger)' }}>{errors.s}</small>}
      </div>
      <div className="form-group">
        <label>No. asignaturas *</label>
        <input
          type="number"
          className="form-control"
          min="1"
          value={form.sub}
          onChange={event => setF('sub', event.target.value)}
        />
        {errors.sub && <small style={{ color: 'var(--danger)' }}>{errors.sub}</small>}
      </div>
      <div className="form-group">
        <label>Docente tutor</label>
        <select className="form-control" value={form.teacher} onChange={event => setF('teacher', event.target.value)}>
          <option value="">Seleccionar docente</option>
          {Array.from(new Set([form.teacher, ...teacherOptions].filter(Boolean))).map(teacher => (
            <option key={teacher} value={teacher}>{teacher}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Estado</label>
        <select className="form-control" value={form.status} onChange={event => setF('status', event.target.value)}>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.7rem 0.9rem',
            borderRadius: 8,
            background: 'rgba(37,99,235,0.08)',
            color: '#1d4ed8',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          <i className={`fas ${action === 'add' ? 'fa-plus-circle' : 'fa-edit'}`} />
          El curso se guarda con el grado y la seccion que selecciones arriba.
        </div>
      </div>
    </div>
  )

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Cursos y Secciones</span>
        </div>
        <h2>Catalogo de Cursos</h2>
        <p>Gestiona los cursos, secciones y sus asignaciones</p>
      </div>

      <div className="stats-grid-3">
        {[
          { i: 'fa-school', c: 'blue', v: courses.filter(course => course.status === 'active').length, l: 'Cursos Activos' },
          { i: 'fa-layer-group', c: 'green', v: courses.length, l: 'Total Secciones' },
          { i: 'fa-users', c: 'purple', v: courses.reduce((sum, course) => sum + Number(course.s || 0), 0), l: 'Estudiantes Total' },
        ].map(stat => (
          <div className="stat-card" key={stat.l}>
            <div className={`icon ${stat.c}`}><i className={`fas ${stat.i}`} /></div>
            <div className="value">{stat.v}</div>
            <div className="label">{stat.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Cursos y Secciones</h3>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus" />Nuevo Curso
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
              Cargando cursos...
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-school" />
              <h3>No hay cursos</h3>
              <p>Crea el primer curso para comenzar.</p>
              <button className="btn btn-primary" onClick={openAdd}>
                <i className="fas fa-plus" />Nuevo Curso
              </button>
            </div>
          ) : (
            <div className="grid-3">
              {courses.map(course => (
                <div className="competency-item" key={course.id}>
                  <div className="header">
                    <h4><span className="code">{course.c}</span> {course.n}</h4>
                    <span className={`status-badge ${course.status === 'active' ? 'active' : 'inactive'}`}>
                      {course.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <i className="fas fa-users" style={{ marginRight: 5 }} />{course.s} estudiantes • {course.sub} asignaturas
                  </p>
                  {course.teacher && (
                    <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      <i className="fas fa-chalkboard-teacher" style={{ marginRight: 5 }} />{course.teacher}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openView(course)}>
                      <i className="fas fa-users" />Ver estudiantes
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(course)}>
                      <i className="fas fa-edit" />
                    </button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => openDelete(course)}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addModal && (
        <Modal
          title="Agregar Nuevo Curso"
          icon="fa-plus-circle"
          onClose={() => setAddModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><i className="fas fa-save" />Guardar</button>
            </>
          }
        >
          {renderCourseForm('add')}
        </Modal>
      )}

      {editModal && (
        <Modal
          title="Editar Curso"
          icon="fa-edit"
          iconColor="var(--warning)"
          onClose={() => setEditModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleEdit}><i className="fas fa-save" />Actualizar</button>
            </>
          }
        >
          {renderCourseForm('edit')}
        </Modal>
      )}

      {viewModal && selected && (
        <Modal
          title={`Estudiantes - ${selected.c}`}
          icon="fa-users"
          iconColor="var(--secondary)"
          onClose={() => { setViewModal(false); setCourseStudents([]) }}
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(false)}>Cerrar</button>}
        >
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {selected.n} - {courseStudents.length} estudiantes registrados
          </p>
          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }} />
              Cargando estudiantes...
            </div>
          ) : courseStudents.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <i className="fas fa-user-graduate" />
              <h3>Sin estudiantes</h3>
              <p>No hay estudiantes reales registrados en este curso.</p>
            </div>
          ) : (
            courseStudents.map(student => (
              <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '0.72rem', flexShrink: 0 }}>
                  {initials(student.name)}
                </div>
                <span style={{ fontSize: '0.9rem' }}>{student.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280' }}>
                  {student.code || `EST-${String(student.id).padStart(3, '0')}`}
                </span>
              </div>
            ))
          )}
        </Modal>
      )}

      {deleteModal && selected && (
        <Modal
          title="Eliminar Curso"
          icon="fa-trash"
          iconColor="var(--danger)"
          onClose={() => setDeleteModal(false)}
          maxWidth="480px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}><i className="fas fa-trash" />Eliminar</button>
            </>
          }
        >
          <p>¿Seguro que deseas eliminar el curso <strong>{selected?.c}</strong>?</p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }} />Esta accion no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  )
}
