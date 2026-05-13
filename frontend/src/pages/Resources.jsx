import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import { resourcesService } from '../services/planningCrudServices.js'

const TIPO_ICONS = {
  PDF:    { i:'fa-file-pdf',    bg:'rgba(239,68,68,0.1)',  ic:'var(--danger)'   },
  Video:  { i:'fa-play-circle', bg:'rgba(239,68,68,0.1)',  ic:'var(--danger)'   },
  Enlace: { i:'fa-link',        bg:'rgba(37,99,235,0.1)',  ic:'var(--primary)'  },
  Imagen: { i:'fa-image',       bg:'rgba(124,58,237,0.1)', ic:'var(--secondary)'},
}

export function Resources({ showToast, onNavigate }) {
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('Todos')
  const [search,    setSearch]    = useState('')
  const [addModal,  setAddModal]  = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [delModal,  setDelModal]  = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [saving,    setSaving]    = useState(false)

  // Campos formulario separados
  const [formN,    setFormN]    = useState('')
  const [formUrl,  setFormUrl]  = useState('')
  const [formTipo, setFormTipo] = useState('Enlace')
  const [formSize, setFormSize] = useState('')
  const [formDesc, setFormDesc] = useState('')

  // ── CARGAR ───────────────────────────────────────────────
  useEffect(() => { fetchResources() }, [])

  const fetchResources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setResources((data || []).map(row => resourcesService.entityClass.fromRow(row)))
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar recursos')
    } finally {
      setLoading(false)
    }
  }

  // ── FILTRAR Y BUSCAR ─────────────────────────────────────
  const filtered = resources
    .filter(r => filter === 'Todos' || r.tipo === filter)
    .filter(r => r.n.toLowerCase().includes(search.toLowerCase()))

  // ── ABRIR ADD ────────────────────────────────────────────
  const openAdd = () => {
    setFormN(''); setFormUrl(''); setFormTipo('Enlace')
    setFormSize(''); setFormDesc('')
    setAddModal(true)
  }

  // ── AGREGAR ──────────────────────────────────────────────
  const handleAdd = async () => {
    if (!formN.trim()) { showToast('warning', 'El nombre es requerido'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const created = await resourcesService.createFromForm({
        name: formN,
        type: formTipo,
        url: formUrl,
        size: formSize,
        description: formDesc,
      }, user?.id)
      setResources(p => [created, ...p])
      setAddModal(false)
      showToast('success', `Recurso "${formN}" agregado`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al agregar el recurso')
    } finally {
      setSaving(false)
    }
  }

  // ── EDITAR ───────────────────────────────────────────────
  const openEdit = r => {
    setSelected(r)
    setFormN(r.n); setFormUrl(r.url || ''); setFormTipo(r.tipo)
    setFormSize(r.size || ''); setFormDesc(r.desc || '')
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!formN.trim()) { showToast('warning', 'El nombre es requerido'); return }
    setSaving(true)
    try {
      const updated = await resourcesService.updateFromForm(selected.id, {
        name: formN,
        type: formTipo,
        url: formUrl,
        size: formSize,
        description: formDesc,
      })
      setResources(p => p.map(r => r.id !== selected.id ? r : updated))
      setEditModal(false)
      showToast('success', 'Recurso actualizado')
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  // ── ELIMINAR ─────────────────────────────────────────────
  const openDelete = r => { setSelected(r); setDelModal(true) }

  const handleDelete = async () => {
    try {
      await resourcesService.delete(selected.id)
      setResources(p => p.filter(r => r.id !== selected.id))
      setDelModal(false)
      showToast('success', 'Recurso eliminado')
    } catch (error) {
      showToast('error', 'Error al eliminar')
    }
  }

  // ── ABRIR ENLACE ─────────────────────────────────────────
  const handleOpen = r => {
    if (!r.url || r.url === '#') {
      showToast('warning', 'Este recurso no tiene enlace disponible')
      return
    }
    window.open(r.url, '_blank')
  }

  // ── COPIAR ENLACE ────────────────────────────────────────
  const handleCopy = r => {
    if (!r.url || r.url === '#') {
      showToast('warning', 'Este recurso no tiene enlace para copiar')
      return
    }
    navigator.clipboard.writeText(r.url)
    showToast('success', 'Enlace copiado al portapapeles')
  }

  // ── DESCARGAR ────────────────────────────────────────────
  const handleDownload = r => {
    if (!r.url || r.url === '#') {
      showToast('warning', 'Este recurso no tiene archivo descargable')
      return
    }
    const a = document.createElement('a')
    a.href = r.url
    a.download = r.n
    a.target = '_blank'
    a.click()
    showToast('success', `Descargando "${r.n}"...`)
  }

  // ── SUBIR ARCHIVO A SUPABASE STORAGE ────────────────────
  // Subida de archivos eliminada.

  // ── CAMPOS FORMULARIO ────────────────────────────────────
  const formFields = (
    <>
      <div className="form-group">
        <label>Nombre del recurso *</label>
        <input className="form-control" placeholder="Ej: Guía de Ecuaciones"
          value={formN} onChange={e => setFormN(e.target.value)}/>
      </div>
      <div className="form-group">
        <label>Tipo</label>
        <select className="form-control" value={formTipo} onChange={e => setFormTipo(e.target.value)}>
          {['PDF','Video','Enlace','Imagen'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>URL / Enlace</label>
        <input className="form-control" placeholder="https://..."
          value={formUrl} onChange={e => setFormUrl(e.target.value)}/>
      </div>
      <div className="form-group">
        <label>Tamaño / Duración</label>
        <input className="form-control" placeholder="Ej: 2.4 MB  ó  15:30 min"
          value={formSize} onChange={e => setFormSize(e.target.value)}/>
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea className="form-control" rows={2} placeholder="Descripción opcional del recurso..."
          value={formDesc} onChange={e => setFormDesc(e.target.value)}/>
      </div>
    </>
  )

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Banco de Recursos</span>
        </div>
        <h2>Banco de Actividades y Recursos</h2>
        <p>Gestiona tus materiales didácticos. Filtra, descarga y comparte recursos.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { i:'fa-folder-open', c:'blue',   v:resources.length,                          l:'Total recursos'  },
          { i:'fa-file-pdf',    c:'orange', v:resources.filter(r=>r.tipo==='PDF').length, l:'PDFs'            },
          { i:'fa-play-circle', c:'purple', v:resources.filter(r=>r.tipo==='Video').length,l:'Videos'         },
          { i:'fa-link',        c:'green',  v:resources.filter(r=>r.tipo==='Enlace').length,l:'Enlaces'       },
        ].map(s=>(
          <div className="stat-card" key={s.l}>
            <div className={`icon ${s.c}`}><i className={`fas ${s.i}`}/></div>
            <div className="value">{s.v}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div className="card-header">
          <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center'}}>
            {/* Filtros */}
            {['Todos','PDF','Video','Enlace','Imagen'].map(t=>(
              <button key={t} className={`btn btn-sm ${filter===t?'btn-primary':'btn-secondary'}`}
                onClick={() => setFilter(t)}>{t}
              </button>
            ))}
            {/* Búsqueda */}
            <div style={{display:'flex', alignItems:'center', background:'#f3f4f6', borderRadius:8, padding:'0.4rem 0.75rem', gap:'6px', marginLeft:'0.5rem'}}>
              <i className="fas fa-search" style={{color:'#9ca3af', fontSize:'0.8rem'}}/>
              <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                style={{border:'none', background:'none', outline:'none', fontSize:'0.85rem', width:140}}/>
              {search && <button onClick={() => setSearch('')} style={{border:'none', background:'none', cursor:'pointer', color:'#9ca3af'}}><i className="fas fa-times"/></button>}
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="fas fa-plus"/>Agregar Recurso
          </button>
        </div>

        <div className="card-body">
          {loading ? (
            <div style={{textAlign:'center', padding:'2rem', color:'#6b7280'}}>
              <i className="fas fa-spinner fa-spin" style={{fontSize:'1.5rem', marginBottom:'0.5rem', display:'block'}}/>
              Cargando recursos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-folder-open"/>
              <h3>{search ? 'Sin resultados' : 'No hay recursos'}</h3>
              <p>{search ? `No se encontró "${search}"` : 'Agrega tu primer recurso.'}</p>
              {!search && <button className="btn btn-primary" onClick={openAdd}><i className="fas fa-plus"/>Agregar Recurso</button>}
            </div>
          ) : (
            <div className="grid-3">
              {filtered.map(r => {
                const ti = TIPO_ICONS[r.tipo] || TIPO_ICONS['Enlace']
                return (
                  <div className="competency-item" key={r.id}>
                    <div style={{display:'flex', gap:'1rem', alignItems:'flex-start', marginBottom:'0.75rem'}}>
                      <div style={{width:50, height:50, background:ti.bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                        <i className={`fas ${ti.i}`} style={{color:ti.ic, fontSize:'1.4rem'}}/>
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <h4 style={{fontSize:'0.9rem', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.n}</h4>
                        <p style={{fontSize:'0.78rem', color:'#6b7280'}}>{r.m} • {r.size || '—'}</p>
                        {r.desc && <p style={{fontSize:'0.75rem', color:'#9ca3af', marginTop:3}}>{r.desc}</p>}
                      </div>
                    </div>

                    {/* URL preview */}
                    {r.url && r.url !== '#' && (
                      <p style={{fontSize:'0.72rem', color:'#2563eb', marginBottom:'0.75rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor:'pointer'}}
                        onClick={() => handleOpen(r)}>
                        <i className="fas fa-external-link-alt" style={{marginRight:4}}/>{r.url}
                      </p>
                    )}

                    <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
                      {/* Abrir */}
                      <button className="btn btn-sm btn-primary" onClick={() => handleOpen(r)} title="Abrir enlace">
                        <i className="fas fa-external-link-alt"/>Abrir
                      </button>
                      {/* Descargar */}
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDownload(r)} title="Descargar">
                        <i className="fas fa-download"/>
                      </button>
                      {/* Copiar enlace */}
                      <button className="btn btn-sm btn-secondary" onClick={() => handleCopy(r)} title="Copiar enlace">
                        <i className="fas fa-link"/>
                      </button>
                      {/* Editar */}
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(r)} title="Editar">
                        <i className="fas fa-edit"/>
                      </button>
                      {/* Eliminar */}
                      <button className="btn btn-sm btn-secondary" style={{color:'var(--danger)'}} onClick={() => openDelete(r)} title="Eliminar">
                        <i className="fas fa-trash"/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Se eliminó la sección de subida de archivos por decisión del proyecto. */}

      {/* ── Modal AGREGAR ── */}
      {addModal && (
        <Modal title="Agregar Recurso" icon="fa-plus-circle"
          onClose={() => setAddModal(false)} maxWidth="500px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin"/>Guardando...</> : <><i className="fas fa-save"/>Guardar</>}
            </button>
          </>}>
          {formFields}
        </Modal>
      )}

      {/* ── Modal EDITAR ── */}
      {editModal && (
        <Modal title="Editar Recurso" icon="fa-edit" iconColor="var(--warning)"
          onClose={() => setEditModal(false)} maxWidth="500px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin"/>Guardando...</> : <><i className="fas fa-save"/>Actualizar</>}
            </button>
          </>}>
          {formFields}
        </Modal>
      )}

      {/* ── Modal ELIMINAR ── */}
      {delModal && selected && (
        <Modal title="Eliminar Recurso" icon="fa-trash" iconColor="var(--danger)"
          onClose={() => setDelModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setDelModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}><i className="fas fa-trash"/>Eliminar</button>
          </>}>
          <p>¿Seguro que deseas eliminar <strong>"{selected?.n}"</strong>?</p>
          <p style={{color:'var(--danger)', fontSize:'0.85rem', marginTop:'0.5rem'}}>
            <i className="fas fa-exclamation-circle" style={{marginRight:5}}/>Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  )
}
