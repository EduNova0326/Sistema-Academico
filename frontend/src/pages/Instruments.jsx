import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import { checklistsService, rubricsService } from '../services/planningCrudServices.js'

const emptyRubricForm = { name: '', criteria: [] }
const emptyChecklistForm = { name: '', items: [] }

export function Instruments({ showToast, onNavigate }) {
  const [tab, setTab] = useState('rubrics')

  const [rubrics, setRubrics] = useState([])
  const [checklists, setChecklists] = useState([])

  const [loading, setLoading] = useState({ rubrics: true, checklists: true })

  const [rubricModal, setRubricModal] = useState(false)
  const [checklistModal, setChecklistModal] = useState(false)

  const [selectedRubric, setSelectedRubric] = useState(null)
  const [selectedChecklist, setSelectedChecklist] = useState(null)

  const [rubricView, setRubricView] = useState(null)
  const [checklistView, setChecklistView] = useState(null)

  const [deleteRubric, setDeleteRubric] = useState(null)
  const [deleteChecklist, setDeleteChecklist] = useState(null)

  const [rubricForm, setRubricForm] = useState(emptyRubricForm)
  const [checklistForm, setChecklistForm] = useState(emptyChecklistForm)

  const [newCriterion, setNewCriterion] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    await Promise.all([loadRubrics(), loadChecklists()])
  }

  const loadRubrics = async () => {
    setLoading((current) => ({ ...current, rubrics: true }))
    try {
      setRubrics(await rubricsService.listDetailed())
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar rúbricas')
    } finally {
      setLoading((current) => ({ ...current, rubrics: false }))
    }
  }

  const loadChecklists = async () => {
    setLoading((current) => ({ ...current, checklists: true }))
    try {
      setChecklists(await checklistsService.listDetailed())
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar listas de cotejo')
    } finally {
      setLoading((current) => ({ ...current, checklists: false }))
    }
  }

  const openNewRubric = () => {
    setSelectedRubric(null)
    setRubricForm(emptyRubricForm)
    setNewCriterion('')
    setRubricModal(true)
  }

  const openEditRubric = (rubric) => {
    setSelectedRubric(rubric)
    setRubricForm({
      name: rubric.n,
      criteria: rubric.criteria.map((criterion) => ({ c: criterion.c, vals: [...criterion.vals] })),
    })
    setNewCriterion('')
    setRubricModal(true)
  }

  const addCriterion = () => {
    if (!newCriterion.trim()) return
    setRubricForm((current) => ({
      ...current,
      criteria: [...current.criteria, { c: newCriterion.trim(), vals: ['', '', '', ''] }],
    }))
    setNewCriterion('')
  }

  const updateCriterionValue = (criterionIndex, valueIndex, value) => {
    setRubricForm((current) => ({
      ...current,
      criteria: current.criteria.map((criterion, index) => (
        index !== criterionIndex
          ? criterion
          : { ...criterion, vals: criterion.vals.map((item, itemIndex) => itemIndex === valueIndex ? value : item) }
      )),
    }))
  }

  const removeCriterion = (criterionIndex) => {
    setRubricForm((current) => ({
      ...current,
      criteria: current.criteria.filter((_, index) => index !== criterionIndex),
    }))
  }

  const saveRubric = async () => {
    if (!rubricForm.name.trim()) {
      showToast('warning', 'El nombre de la rúbrica es obligatorio')
      return
    }
    try {
      if (selectedRubric) {
        await rubricsService.updateWithCriteria(selectedRubric.id, rubricForm)
        showToast('success', 'Rúbrica actualizada')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await rubricsService.createWithCriteria(rubricForm, user?.id)
        showToast('success', 'Rúbrica creada')
      }
      setRubricModal(false)
      loadRubrics()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar la rúbrica')
    }
  }

  const duplicateRubric = async (rubric) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await rubricsService.createWithCriteria({
        name: `${rubric.n} (copia)`,
        criteria: rubric.criteria,
      }, user?.id)
      showToast('success', 'Rúbrica duplicada')
      loadRubrics()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al duplicar la rúbrica')
    }
  }

  const confirmDeleteRubric = async () => {
    try {
      await rubricsService.delete(deleteRubric.id)
      setDeleteRubric(null)
      setRubrics((current) => current.filter((item) => item.id !== deleteRubric.id))
      showToast('success', 'Rúbrica eliminada')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar la rúbrica')
    }
  }

  const openNewChecklist = () => {
    setSelectedChecklist(null)
    setChecklistForm(emptyChecklistForm)
    setNewChecklistItem('')
    setChecklistModal(true)
  }

  const openEditChecklist = (checklist) => {
    setSelectedChecklist(checklist)
    setChecklistForm({
      name: checklist.n,
      items: checklist.items.map((item) => ({ label: item.label, checked: item.checked })),
    })
    setNewChecklistItem('')
    setChecklistModal(true)
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklistForm((current) => ({
      ...current,
      items: [...current.items, { label: newChecklistItem.trim(), checked: false }],
    }))
    setNewChecklistItem('')
  }

  const updateChecklistItem = (index, patch) => {
    setChecklistForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  const removeChecklistItem = (index) => {
    setChecklistForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const saveChecklist = async () => {
    if (!checklistForm.name.trim()) {
      showToast('warning', 'El nombre de la lista es obligatorio')
      return
    }
    try {
      if (selectedChecklist) {
        await checklistsService.updateWithItems(selectedChecklist.id, checklistForm)
        showToast('success', 'Lista actualizada')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await checklistsService.createWithItems(checklistForm, user?.id)
        showToast('success', 'Lista creada')
      }
      setChecklistModal(false)
      loadChecklists()
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar la lista')
    }
  }

  const toggleChecklistItem = async (checklistId, itemId, checked) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ checked: !checked })
        .eq('id', itemId)
      if (error) throw error
      setChecklists((current) => current.map((checklist) => (
        checklist.id !== checklistId
          ? checklist
          : {
              ...checklist,
              items: checklist.items.map((item) => item.id !== itemId ? item : { ...item, checked: !checked }),
            }
      )))
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al actualizar el ítem')
    }
  }

  const confirmDeleteChecklist = async () => {
    try {
      await checklistsService.delete(deleteChecklist.id)
      setDeleteChecklist(null)
      setChecklists((current) => current.filter((item) => item.id !== deleteChecklist.id))
      showToast('success', 'Lista eliminada')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al eliminar la lista')
    }
  }

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Instrumentos</span>
        </div>
        <h2>Instrumentos de Evaluación</h2>
        <p>Crea y gestiona rúbricas y listas de cotejo.</p>
      </div>

      <div className="tab-nav">
        {[
          ['rubrics', 'Rúbricas', 'fa-th'],
          ['checklists', 'Listas de Cotejo', 'fa-clipboard-list'],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            className={`btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            type="button"
          >
            <i className={`fas ${icon || 'fa-circle'}`} style={{ marginRight: 8 }} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'rubrics' && (
        <div className="card">
          <div className="card-header">
            <h3>Mis Rúbricas <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.9rem' }}>({rubrics.length})</span></h3>
            <button className="btn btn-primary" onClick={openNewRubric}><i className="fas fa-plus" />Nueva Rúbrica</button>
          </div>
          <div className="card-body">
            {loading.rubrics ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }} />
                Cargando rúbricas...
              </div>
            ) : rubrics.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-th" />
                <h3>No hay rúbricas</h3>
                <p>Crea tu primera rúbrica de evaluación.</p>
                <button className="btn btn-primary" onClick={openNewRubric}><i className="fas fa-plus" />Nueva Rúbrica</button>
              </div>
            ) : rubrics.map((rubric) => (
              <div className="competency-item" key={rubric.id}>
                <div className="header">
                  <h4><i className="fas fa-th" style={{ color: 'var(--secondary)', marginRight: 8 }} />{rubric.n}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setRubricView(rubric)}><i className="fas fa-eye" /></button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditRubric(rubric)}><i className="fas fa-edit" /></button>
                    <button className="btn btn-sm btn-secondary" onClick={() => duplicateRubric(rubric)}><i className="fas fa-copy" /></button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => setDeleteRubric(rubric)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>{rubric.criteria.length} criterios de evaluación</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Se eliminó la pestaña "Pruebas" para simplificar este apartado. */}
      {tab === 'checklists' && (
        <div className="card">
          <div className="card-header">
            <h3>Listas de Cotejo <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.9rem' }}>({checklists.length})</span></h3>
            <button className="btn btn-primary" onClick={openNewChecklist}><i className="fas fa-plus" />Nueva Lista</button>
          </div>
          <div className="card-body">
            {loading.checklists ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }} />
                Cargando listas...
              </div>
            ) : checklists.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-clipboard-list" />
                <h3>No hay listas de cotejo</h3>
                <p>Crea tu primera lista de cotejo.</p>
                <button className="btn btn-primary" onClick={openNewChecklist}><i className="fas fa-plus" />Nueva Lista</button>
              </div>
            ) : checklists.map((checklist) => (
              <div className="competency-item" key={checklist.id}>
                <div className="header">
                  <h4><i className="fas fa-clipboard-list" style={{ color: 'var(--success)', marginRight: 8 }} />{checklist.n}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setChecklistView(checklist)}><i className="fas fa-eye" /></button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditChecklist(checklist)}><i className="fas fa-edit" /></button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => setDeleteChecklist(checklist)}><i className="fas fa-trash" /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.75rem' }}>
                  {checklist.items.map((item) => (
                    <label key={item.id || item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                      <input type="checkbox" checked={!!item.checked} onChange={() => toggleChecklistItem(checklist.id, item.id, item.checked)} />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rubricModal && (
        <Modal
          title={selectedRubric ? 'Editar Rúbrica' : 'Nueva Rúbrica'}
          icon="fa-th"
          onClose={() => setRubricModal(false)}
          maxWidth="760px"
          footer={<><button className="btn btn-secondary" onClick={() => setRubricModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveRubric}><i className="fas fa-save" />Guardar</button></>}
        >
          <div className="form-group">
            <label>Nombre *</label>
            <input className="form-control" value={rubricForm.name} onChange={(event) => setRubricForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-group">
            <label>Nuevo criterio</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-control" value={newCriterion} onChange={(event) => setNewCriterion(event.target.value)} />
              <button className="btn btn-secondary" onClick={addCriterion}><i className="fas fa-plus" /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rubricForm.criteria.map((criterion, index) => (
              <div key={`${criterion.c}-${index}`} style={{ background: '#f8fafc', borderRadius: 10, padding: '0.9rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <strong>{criterion.c}</strong>
                  <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => removeCriterion(index)}><i className="fas fa-trash" /></button>
                </div>
                <div className="grid-2">
                  {['Excelente (4)', 'Bueno (3)', 'Regular (2)', 'Insuficiente (1)'].map((label, valueIndex) => (
                    <div className="form-group" key={label}>
                      <label>{label}</label>
                      <input className="form-control" value={criterion.vals[valueIndex]} onChange={(event) => updateCriterionValue(index, valueIndex, event.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {checklistModal && (
        <Modal
          title={selectedChecklist ? 'Editar Lista de Cotejo' : 'Nueva Lista de Cotejo'}
          icon="fa-clipboard-list"
          onClose={() => setChecklistModal(false)}
          maxWidth="700px"
          footer={<><button className="btn btn-secondary" onClick={() => setChecklistModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={saveChecklist}><i className="fas fa-save" />Guardar</button></>}
        >
          <div className="form-group">
            <label>Nombre *</label>
            <input className="form-control" value={checklistForm.name} onChange={(event) => setChecklistForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-group">
            <label>Nuevo ítem</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-control" value={newChecklistItem} onChange={(event) => setNewChecklistItem(event.target.value)} />
              <button className="btn btn-secondary" onClick={addChecklistItem}><i className="fas fa-plus" /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {checklistForm.items.map((item, index) => (
              <div key={`${item.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'center' }}>
                <input className="form-control" value={item.label} onChange={(event) => updateChecklistItem(index, { label: event.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={!!item.checked} onChange={(event) => updateChecklistItem(index, { checked: event.target.checked })} />
                  Cumplido
                </label>
                <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => removeChecklistItem(index)}><i className="fas fa-trash" /></button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {rubricView && (
        <Modal title={rubricView.n} icon="fa-eye" onClose={() => setRubricView(null)} footer={<button className="btn btn-secondary" onClick={() => setRubricView(null)}>Cerrar</button>}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {rubricView.criteria.map((criterion, index) => (
              <div key={`${criterion.c}-${index}`} style={{ background: '#f8fafc', borderRadius: 10, padding: '0.85rem' }}>
                <strong>{criterion.c}</strong>
                {criterion.vals.map((value, valueIndex) => (
                  <p key={`${criterion.c}-${valueIndex}`} style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.35rem' }}>
                    {value}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {checklistView && (
        <Modal title={checklistView.n} icon="fa-eye" onClose={() => setChecklistView(null)} footer={<button className="btn btn-secondary" onClick={() => setChecklistView(null)}>Cerrar</button>}>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {checklistView.items.map((item) => (
              <label key={item.id || item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={!!item.checked} readOnly />
                {item.label}
              </label>
            ))}
          </div>
        </Modal>
      )}

      {deleteRubric && (
        <Modal title="Eliminar Rúbrica" icon="fa-trash" iconColor="var(--danger)" onClose={() => setDeleteRubric(null)} footer={<><button className="btn btn-secondary" onClick={() => setDeleteRubric(null)}>Cancelar</button><button className="btn btn-danger" onClick={confirmDeleteRubric}><i className="fas fa-trash" />Eliminar</button></>}>
          <p>¿Seguro que deseas eliminar <strong>{deleteRubric.n}</strong>?</p>
        </Modal>
      )}

      {deleteChecklist && (
        <Modal title="Eliminar Lista" icon="fa-trash" iconColor="var(--danger)" onClose={() => setDeleteChecklist(null)} footer={<><button className="btn btn-secondary" onClick={() => setDeleteChecklist(null)}>Cancelar</button><button className="btn btn-danger" onClick={confirmDeleteChecklist}><i className="fas fa-trash" />Eliminar</button></>}>
          <p>¿Seguro que deseas eliminar <strong>{deleteChecklist.n}</strong>?</p>
        </Modal>
      )}
    </section>
  )
}
