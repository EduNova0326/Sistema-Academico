import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import Modal from '../components/Modal.jsx'
import { studentsService } from '../services/academicServices.js'

const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('')

const emptyForm = (course = '') => ({
  name: '',
  course,
  avg: '',
  att: '',
})

export default function Students({ showToast, onNavigate }) {
  const [students, setStudents] = useState([])
  const [courseOptions, setCourseOptions] = useState([])
  const [courseFilter, setCourseFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [viewModal, setViewModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm(''))
  const fileRef = useRef(null)

  useEffect(() => {
    fetchStudents()
    fetchCourseOptions()
  }, [])

  const fetchCourseOptions = async () => {
    try {
      const nextOptions = await studentsService.fetchCourseOptions()
      setCourseOptions(nextOptions)
      setForm(prev => ({ ...prev, course: prev.course || nextOptions[0] || '' }))
    } catch (error) {
      console.error(error)
    }
  }

  const fetchStudents = async () => {
    try {
      const data = await studentsService.list()
      setStudents(data)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar estudiantes')
    }
  }

  const set = (field) => (event) => setForm(prev => ({ ...prev, [field]: event.target.value }))

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => courseFilter === 'Todos' || student.course === courseFilter)
      .filter(student => {
        const term = search.trim().toLowerCase()
        if (!term) return true
        return [student.name, student.code, student.course]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(term))
      })
  }, [students, courseFilter, search])

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'El nombre es obligatorio')
      return
    }
    if (!String(form.course || '').trim()) {
      showToast('warning', 'Primero crea un curso en "Cursos y Secciones" y luego selecciona el curso del estudiante.')
      return
    }

    setLoading(true)
    try {
      await studentsService.createFromForm(form, {
        fallbackCourse: form.course || courseOptions[0] || '',
      })
      showToast('success', 'Estudiante registrado')
      setModal(false)
      setForm(emptyForm(courseOptions[0] || ''))
      fetchStudents()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar el estudiante')
    } finally {
      setLoading(false)
    }
  }

  const openView = (student) => {
    setSelected(student)
    setViewModal(true)
  }

  const openEdit = (student) => {
    setSelected(student)
    setForm({
      name: student.name || '',
      course: student.course || courseOptions[0] || '',
      avg: student.avg ?? '',
      att: student.att ?? '',
    })
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!selected) return
    if (!form.name.trim()) {
      showToast('error', 'El nombre es obligatorio')
      return
    }

    setLoading(true)
    try {
      await studentsService.updateFromForm(selected.id, form, {
        fallbackCourse: form.course || courseOptions[0] || '',
        forcedCode: selected.code,
      })
      showToast('success', 'Estudiante actualizado')
      setEditModal(false)
      fetchStudents()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al actualizar el estudiante')
    } finally {
      setLoading(false)
    }
  }

  const openDelete = (student) => {
    setSelected(student)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!selected) return

    try {
      await studentsService.delete(selected.id)
      setDeleteModal(false)
      setSelected(null)
      showToast('success', 'Estudiante eliminado')
      fetchStudents()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar el estudiante')
    }
  }

  const handleExport = () => {
    const now = new Date()
    const title = 'EduNova - Listado de Estudiantes'
    const subtitle = `Generado: ${now.toLocaleDateString('es')}`

    const borderThin = {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    }

    const styles = {
      title: {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '2563EB' } },
      },
      subtitle: {
        font: { color: { rgb: '111827' }, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
      },
      header: {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { patternType: 'solid', fgColor: { rgb: '111827' } },
        border: borderThin,
      },
      cell: {
        font: { color: { rgb: '111827' }, sz: 10 },
        alignment: { vertical: 'center', wrapText: true },
        border: borderThin,
      },
      cellCenter: {
        font: { color: { rgb: '111827' }, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin,
      },
      zebra: { fill: { patternType: 'solid', fgColor: { rgb: 'FAFAFA' } } },
    }

    const headersStyled = ['Codigo', 'Nombre', 'Curso', 'Promedio', 'Asistencia', 'Estado']
    const rowsStyled = filteredStudents.map(student => student.toExportRow())

    const wsData = []
    wsData.push(headersStyled.map((_, i) => ({ v: i === 0 ? title : '', t: 's', s: styles.title })))
    wsData.push(headersStyled.map((_, i) => ({ v: i === 0 ? subtitle : '', t: 's', s: styles.subtitle })))
    wsData.push(headersStyled.map(() => ''))
    wsData.push(headersStyled.map(h => ({ v: h, t: 's', s: styles.header })))

    rowsStyled.forEach((row, idx) => {
      wsData.push(row.map((value, colIdx) => {
        const isNumeric = colIdx === 3 || typeof value === 'number'
        const base = colIdx >= 3 ? styles.cellCenter : colIdx === 0 ? styles.cellCenter : styles.cell
        return {
          v: value ?? '',
          t: isNumeric ? 'n' : 's',
          s: { ...base, ...(idx % 2 === 1 ? styles.zebra : {}) },
        }
      }))
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headersStyled.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headersStyled.length - 1 } },
    ]
    ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    ws['!rows'] = [{ hpt: 24 }, { hpt: 18 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')
    XLSX.writeFile(wb, `estudiantes_${now.toISOString().slice(0, 10)}.xlsx`)
    showToast('success', 'Excel de estudiantes descargado')
    return
    const headers = ['Código', 'Nombre', 'Curso', 'Promedio', 'Asistencia', 'Estado']
    const rows = filteredStudents.map(student => student.toExportRow())

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const legacyWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(legacyWb, sheet, 'Estudiantes')
    XLSX.writeFile(legacyWb, 'estudiantes.xlsx')
    showToast('success', 'Lista exportada')
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

      const imported = await studentsService.importRows(rawRows, {
        fallbackCourse: form.course,
      })

      if (imported.length === 0) {
        showToast('warning', 'El archivo no contiene estudiantes válidos')
        return
      }

      showToast('success', `${imported.length} estudiantes importados correctamente`)
      fetchStudents()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al importar el archivo')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const totalAtRisk = students.filter(student => Number(student.avg) < 60).length

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb"><a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Estudiantes</span></div>
        <h2>Gestión de Estudiantes</h2>
        <p>Administra las listas oficiales de estudiantes, con importación, edición y exportación.</p>
      </div>

      <div className="stats-grid">
        {[
          { i: 'fa-user-graduate', c: 'blue', v: students.length, l: 'Total estudiantes' },
          { i: 'fa-school', c: 'green', v: courseFilter === 'Todos' ? courseOptions.length : 1, l: 'Cursos visibles' },
          { i: 'fa-chart-line', c: 'purple', v: filteredStudents.length, l: 'Resultados filtrados' },
          { i: 'fa-triangle-exclamation', c: 'orange', v: totalAtRisk, l: 'En riesgo' },
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
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-control" style={{ width: 'auto' }} value={courseFilter} onChange={event => setCourseFilter(event.target.value)}>
              <option value="Todos">Todos los cursos</option>
              {courseOptions.map(course => <option key={course}>{course}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 8, padding: '0.4rem 0.75rem', gap: 6 }}>
              <i className="fas fa-search" style={{ color: '#9ca3af', fontSize: '0.8rem' }} />
              <input
                placeholder="Buscar estudiante..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', width: 160 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <button
              className="btn btn-secondary"
              disabled={importing || courseOptions.length === 0}
              title={courseOptions.length === 0 ? 'Crea un curso primero en "Cursos y Secciones"' : ''}
              onClick={() => fileRef.current?.click()}
            >
              {importing
                ? <><i className="fas fa-spinner fa-spin" />Importando...</>
                : <><i className="fas fa-file-import" />Importar Excel</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExport}><i className="fas fa-file-export" />Exportar Excel</button>
            <button
              className="btn btn-primary"
              disabled={courseOptions.length === 0}
              title={courseOptions.length === 0 ? 'Crea un curso primero en "Cursos y Secciones"' : ''}
              onClick={() => setModal(true)}
            >
              <i className="fas fa-plus" />Nuevo Estudiante
            </button>
          </div>
        </div>

        <div className="card-body" style={{ overflowX: 'auto' }}>
          {courseOptions.length === 0 && (
            <div className="empty-state" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <i className="fas fa-layer-group" />
              <h3>Primero crea tus cursos</h3>
              <p>Ve a <strong>Cursos y Secciones</strong>, crea al menos un curso (por ejemplo 4to A). Luego podrás registrar estudiantes.</p>
            </div>
          )}
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-graduate" />
              <h3>No hay estudiantes</h3>
              <p>Registra estudiantes o importa una lista oficial en Excel o CSV.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Código</th><th>Nombre</th><th>Curso</th><th>Promedio</th><th>Asistencia</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.code}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ width: 35, height: 35, fontSize: '0.75rem' }}>{initials(student.name)}</div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td>{student.course}</td>
                    <td><span className={`status-badge ${student.avg >= 70 ? 'active' : student.avg >= 60 ? 'pending' : 'danger'}`}>{student.avg}</span></td>
                    <td>{student.att}%</td>
                    <td><span className={`status-badge ${student.status === 'active' ? 'active' : student.status === 'warning' ? 'pending' : 'danger'}`}>{student.statusLabel}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openView(student)}><i className="fas fa-eye" /></button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(student)}><i className="fas fa-edit" /></button>
                        <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => openDelete(student)}><i className="fas fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Registrar Nuevo Estudiante" icon="fa-user-graduate" onClose={() => setModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </>}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre Completo *</label>
              <input className="form-control" placeholder="Ana Martínez López" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label>Curso</label>
              <select className="form-control" value={form.course} onChange={set('course')}>
                {courseOptions.map(course => <option key={course}>{course}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Promedio</label>
              <input type="number" className="form-control" placeholder="0 - 100" min="0" max="100" value={form.avg} onChange={set('avg')} />
            </div>
            <div className="form-group">
              <label>Asistencia %</label>
              <input type="number" className="form-control" placeholder="0 - 100" min="0" max="100" value={form.att} onChange={set('att')} />
            </div>
          </div>
        </Modal>
      )}

      {viewModal && selected && (
        <Modal title="Detalle del Estudiante" icon="fa-eye" onClose={() => setViewModal(false)}
          footer={<button className="btn btn-secondary" onClick={() => setViewModal(false)}>Cerrar</button>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
            <div className="user-avatar" style={{ width: 46, height: 46 }}>{initials(selected.name)}</div>
            <div>
              <p style={{ fontWeight: 700 }}>{selected.name}</p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>{selected.code}</p>
            </div>
          </div>
          <div className="grid-2">
            <div style={{ background: '#f3f4f6', padding: '0.8rem', borderRadius: 10 }}>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>CURSO</p>
              <p style={{ fontWeight: 600 }}>{selected.course}</p>
            </div>
            <div style={{ background: '#f3f4f6', padding: '0.8rem', borderRadius: 10 }}>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>PROMEDIO</p>
              <p style={{ fontWeight: 600 }}>{selected.avg}</p>
            </div>
            <div style={{ background: '#f3f4f6', padding: '0.8rem', borderRadius: 10 }}>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>ASISTENCIA</p>
              <p style={{ fontWeight: 600 }}>{selected.att}%</p>
            </div>
            <div style={{ background: '#f3f4f6', padding: '0.8rem', borderRadius: 10 }}>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>ESTADO</p>
              <p style={{ fontWeight: 600 }}>{selected.statusLabel}</p>
            </div>
          </div>
        </Modal>
      )}

      {editModal && selected && (
        <Modal title="Editar Estudiante" icon="fa-edit" iconColor="var(--warning)" onClose={() => setEditModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={loading}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {loading ? 'Guardando...' : 'Actualizar'}
            </button>
          </>}>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nombre Completo *</label>
              <input className="form-control" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label>Curso</label>
              <select className="form-control" value={form.course} onChange={set('course')}>
                {courseOptions.map(course => <option key={course}>{course}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Promedio</label>
              <input type="number" className="form-control" min="0" max="100" value={form.avg} onChange={set('avg')} />
            </div>
            <div className="form-group">
              <label>Asistencia %</label>
              <input type="number" className="form-control" min="0" max="100" value={form.att} onChange={set('att')} />
            </div>
          </div>
        </Modal>
      )}

      {deleteModal && selected && (
        <Modal title="Eliminar Estudiante" icon="fa-trash" iconColor="var(--danger)" onClose={() => setDeleteModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}><i className="fas fa-trash" />Eliminar</button>
          </>}>
          <p>¿Seguro que deseas eliminar a <strong>{selected.name}</strong>?</p>
        </Modal>
      )}
    </section>
  )
}
