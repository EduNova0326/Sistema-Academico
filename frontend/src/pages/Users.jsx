import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import { notificationService } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { isPrimaryDirectorEmail } from '../services/systemConfig.js'

const ROL_COLORS = {
  Director:    'danger',
  Coordinador: 'pending',
  Docente:     'active',
  pending:     'inactive',
}

const ROL_GRADIENTS = {
  Director:    'linear-gradient(135deg,#ef4444,#dc2626)',
  Coordinador: 'linear-gradient(135deg,#f59e0b,#d97706)',
  Docente:     'linear-gradient(135deg,#2563eb,#7c3aed)',
  pending:     'linear-gradient(135deg,#9ca3af,#6b7280)',
}

const PERMS = [
  ['Gestionar usuarios',     true,  false, false],
  ['Ver todas las notas',    true,  true,  false],
  ['Editar notas propias',   true,  true,  true ],
  ['Ver planificaciones',    true,  true,  true ],
  ['Auditoría del sistema',  true,  true,  false],
  ['Gestionar respaldos',    true,  false, false],
  ['Configuración general',  true,  false, false],
]

export function Users({ showToast, onNavigate }) {
  const { user, profile, refreshProfile } = useAuth()
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [delModal,  setDelModal]  = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [saving,    setSaving]    = useState(false)

  // Campos editar
  const [formName, setFormName] = useState('')
  const [formEmail,setFormEmail]= useState('')
  const [formRol,  setFormRol]  = useState('Docente')
  const [errors,   setErrors]   = useState({})

  // ── CARGAR ───────────────────────────────────────────────
  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data.map(mapUser))
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const mapUser = u => ({
    id:     u.id,
    ini:    (u.full_name || u.email || '??').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(),
    name:   u.full_name || 'Sin nombre',
    email:  u.email || '',
    rol:    u.role || 'pending',
    status: u.status || (u.role ? 'active' : 'pending'),
    bg:     ROL_GRADIENTS[u.role] || ROL_GRADIENTS['pending'],
  })

  // ── EDITAR / ASIGNAR ROL ─────────────────────────────────
  const openEdit = u => {
    if (isPrimaryDirectorEmail(u.email)) {
      showToast('warning', 'La cuenta principal del director no debe cambiar su rol desde este panel')
      return
    }
    setSelected(u)
    setFormName(u.name)
    setFormEmail(u.email)
    setFormRol(u.rol === 'pending' ? 'Docente' : u.rol)
    setErrors({})
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!formName.trim()) {
      setErrors({ name: 'El nombre es requerido' })
      return
    }
    setSaving(true)
    try {
      const nextStatus = selected.rol === 'pending' ? 'active' : (selected.status === 'pending' ? 'active' : selected.status)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:  formName.trim(),
          role:       formRol,
          status:     nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id)
      if (error) throw error
      setUsers(p => p.map(u => u.id !== selected.id ? u : {
        ...u,
        name: formName,
        rol:  formRol,
        status: nextStatus,
        bg:   ROL_GRADIENTS[formRol],
        ini:  formName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(),
      }))
      setEditModal(false)
      if (selected.id === user?.id) refreshProfile?.()

      const shouldNotifyByEmail = selected.rol === 'pending' || selected.rol !== formRol
      if (shouldNotifyByEmail && formEmail) {
        notificationService.sendRoleAssignedNotice({
          user_name: formName.trim(),
          user_email: formEmail,
          role: formRol,
          assigned_by_name: profile?.full_name || user?.email || 'Director',
          assigned_by_email: profile?.email || user?.email || '',
        }).catch((notifyError) => {
          console.error('No se pudo enviar el correo de rol asignado:', notifyError)
        })
      }

      showToast('success',
        selected.rol === 'pending'
          ? `Rol asignado — ${formName} ahora es ${formRol}`
          : 'Usuario actualizado'
      )
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al actualizar usuario')
    } finally {
      setSaving(false)
    }
  }

  // ── ACTIVAR / DESACTIVAR ─────────────────────────────────
  const toggleStatus = async u => {
    if (isPrimaryDirectorEmail(u.email)) {
      showToast('warning', 'No puedes desactivar la cuenta principal del director')
      return
    }
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', u.id)
      if (error) throw error
      setUsers(p => p.map(x => x.id !== u.id ? x : {...x, status: newStatus}))
      showToast('success', `Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`)
    } catch (error) {
      showToast('error', 'Error al cambiar estado')
    }
  }

  // ── ELIMINAR ─────────────────────────────────────────────
  const openDelete = u => { setSelected(u); setDelModal(true) }

  const handleOpenDelete = u => {
    if (isPrimaryDirectorEmail(u.email)) {
      showToast('warning', 'No puedes eliminar la cuenta principal del director')
      return
    }
    openDelete(u)
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selected.id)
      if (error) throw error
      setUsers(p => p.filter(u => u.id !== selected.id))
      setDelModal(false)
      showToast('success', 'Usuario eliminado')
    } catch (error) {
      showToast('error', 'Error al eliminar usuario')
    }
  }

  // Separar usuarios pendientes de los que tienen rol
  const pending = users.filter(u => u.rol === 'pending')
  const active  = users.filter(u => u.rol !== 'pending')

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Usuarios y Permisos</span>
        </div>
        <h2>Control de Usuarios y Permisos</h2>
        <p>Administra los accesos, roles y permisos del sistema EduNova.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { i:'fa-users',             c:'blue',   v:users.length,                               l:'Total usuarios'   },
          { i:'fa-clock',             c:'orange', v:pending.length,                             l:'Sin rol asignado' },
          { i:'fa-chalkboard-teacher',c:'green',  v:users.filter(u=>u.rol==='Docente').length,   l:'Docentes'         },
          { i:'fa-check-circle',      c:'purple', v:users.filter(u=>u.status==='active').length, l:'Activos'          },
        ].map(s=>(
          <div className="stat-card" key={s.l}>
            <div className={`icon ${s.c}`}><i className={`fas ${s.i}`}/></div>
            <div className="value">{s.v}</div>
            <div className="label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Usuarios pendientes de rol ── */}
      {pending.length > 0 && (
        <div className="card" style={{marginBottom:'1.5rem', border:'2px solid var(--warning)'}}>
          <div className="card-header" style={{background:'rgba(245,158,11,0.05)'}}>
            <h3 style={{color:'var(--warning)'}}>
              <i className="fas fa-clock" style={{marginRight:8}}/>
              Usuarios esperando rol ({pending.length})
            </h3>
            <span style={{fontSize:'0.82rem', color:'#6b7280'}}>
              Asígnales un rol para que puedan usar el sistema
            </span>
          </div>
          <div className="card-body">
            {pending.map(u => (
              <div key={u.id} style={{display:'flex', alignItems:'center', gap:'1rem',
                padding:'0.875rem', borderBottom:'1px solid #e5e7eb',
                background:'rgba(245,158,11,0.03)'}}>
                <div style={{width:42, height:42, borderRadius:10, background:u.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:700, fontSize:'0.85rem', flexShrink:0}}>
                  {u.ini}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontWeight:600, fontSize:'0.875rem'}}>{u.name}</p>
                  <p style={{fontSize:'0.75rem', color:'#6b7280'}}>{u.email}</p>
                </div>
                <div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}>
                  <span style={{fontSize:'0.72rem', padding:'0.25rem 0.6rem',
                    background:'rgba(245,158,11,0.1)', color:'var(--warning)',
                    borderRadius:6, fontWeight:600}}>
                    Sin rol
                  </span>
                  <button className="btn btn-sm btn-primary" onClick={() => openEdit(u)}>
                    <i className="fas fa-user-tag"/>Asignar Rol
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{color:'var(--danger)'}}
                    onClick={() => handleOpenDelete(u)}>
                    <i className="fas fa-trash"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Lista usuarios con rol */}
        <div className="card">
          <div className="card-header">
            <h3>Usuarios del Sistema</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{textAlign:'center', padding:'2rem', color:'#6b7280'}}>
                <i className="fas fa-spinner fa-spin" style={{fontSize:'1.5rem', display:'block', marginBottom:'0.5rem'}}/>
                Cargando usuarios...
              </div>
            ) : active.length === 0 ? (
              <div className="empty-state" style={{padding:'1.5rem'}}>
                <i className="fas fa-users"/>
                <h3>No hay usuarios con rol</h3>
                <p>Los usuarios que se registren aparecerán arriba esperando un rol.</p>
              </div>
            ) : active.map(u => (
              <div key={u.id} style={{display:'flex', alignItems:'center', gap:'1rem',
                padding:'0.875rem', borderBottom:'1px solid #e5e7eb',
                background: u.status==='inactive' ? 'rgba(107,114,128,0.04)' : '',
                opacity: u.status==='inactive' ? 0.7 : 1}}>
                <div style={{width:42, height:42, borderRadius:10, background:u.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:700, fontSize:'0.85rem', flexShrink:0,
                  filter: u.status==='inactive' ? 'grayscale(0.6)' : 'none'}}>
                  {u.ini}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <p style={{fontWeight:600, fontSize:'0.875rem'}}>{u.name}</p>
                  <p style={{fontSize:'0.75rem', color:'#6b7280', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis'}}>{u.email}</p>
                </div>
                <div style={{display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap'}}>
                  <span className={`status-badge ${ROL_COLORS[u.rol]}`} style={{fontSize:'0.7rem'}}>
                    {u.rol}
                  </span>
                  {u.status === 'inactive' && (
                    <span className="status-badge inactive" style={{fontSize:'0.7rem'}}>Inactivo</span>
                  )}
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)} title="Editar">
                    <i className="fas fa-edit"/>
                  </button>
                  <button className="btn btn-sm btn-secondary"
                    style={{color: u.status==='active' ? 'var(--success)' : 'var(--danger)'}}
                    title={u.status==='active' ? 'Desactivar' : 'Activar'}
                    onClick={() => toggleStatus(u)}>
                    <i className={`fas ${u.status==='active' ? 'fa-toggle-on' : 'fa-toggle-off'}`}/>
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{color:'var(--danger)'}}
                    onClick={() => handleOpenDelete(u)} title="Eliminar">
                    <i className="fas fa-trash"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matriz permisos */}
        <div className="card">
          <div className="card-header"><h3>Matriz de Permisos</h3></div>
          <div className="card-body" style={{overflowX:'auto'}}>
            <table className="data-table" style={{fontSize:'0.85rem'}}>
              <thead>
                <tr>
                  <th>Permiso</th>
                  <th style={{textAlign:'center'}}>Director</th>
                  <th style={{textAlign:'center'}}>Coordinador</th>
                  <th style={{textAlign:'center'}}>Docente</th>
                </tr>
              </thead>
              <tbody>
                {PERMS.map(([p,...v]) => (
                  <tr key={p}>
                    <td>{p}</td>
                    {v.map((x,i) => (
                      <td key={i} style={{textAlign:'center'}}>
                        <i className={`fas ${x ? 'fa-check-circle' : 'fa-times-circle'}`}
                          style={{color: x ? 'var(--success)' : '#e5e7eb', fontSize:'1rem'}}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="card" style={{marginTop:'1.5rem'}}>
        <div className="card-header"><h3>Roles del Sistema</h3></div>
        <div className="card-body">
          <div className="grid-3">
            {[
              { i:'fa-user-shield',        c:'var(--danger)',  r:'Director',    d:'Acceso total. Gestiona usuarios, reportes y configuración.' },
              { i:'fa-chalkboard-teacher', c:'var(--primary)', r:'Docente',     d:'Accede a sus propias planificaciones, calificaciones y asistencia.' },
              { i:'fa-user-edit',          c:'var(--success)', r:'Coordinador', d:'Supervisa planificaciones y reportes de todos los docentes.' },
            ].map(r => (
              <div className="competency-item" key={r.r}>
                <div className="header">
                  <h4><i className={`fas ${r.i}`} style={{color:r.c}}/> {r.r}</h4>
                  <span className="status-badge active">
                    {users.filter(u=>u.rol===r.r).length} usuario{users.filter(u=>u.rol===r.r).length!==1?'s':''}
                  </span>
                </div>
                <p style={{color:'#6b7280', fontSize:'0.85rem'}}>{r.d}</p>
                <div style={{marginTop:'0.5rem'}}>
                  <div className="progress-bar" style={{height:4}}>
                    <div style={{
                      height:'100%', borderRadius:4,
                      width: active.length > 0 ? `${(users.filter(u=>u.rol===r.r).length/active.length)*100}%` : '0%',
                      background: r.c, transition:'width .3s'
                    }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal EDITAR / ASIGNAR ROL ── */}
      {editModal && selected && (
        <Modal
          title={selected.rol === 'pending' ? `Asignar Rol — ${selected.name}` : `Editar — ${selected.name}`}
          icon={selected.rol === 'pending' ? 'fa-user-tag' : 'fa-edit'}
          iconColor={selected.rol === 'pending' ? 'var(--warning)' : 'var(--primary)'}
          onClose={() => setEditModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving
                ? <><i className="fas fa-spinner fa-spin"/>Guardando...</>
                : selected.rol === 'pending'
                  ? <><i className="fas fa-user-tag"/>Asignar Rol</>
                  : <><i className="fas fa-save"/>Actualizar</>
              }
            </button>
          </>}>

          {/* Info del usuario */}
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:'1.25rem',
            padding:'0.875rem', background:'#f3f4f6', borderRadius:10}}>
            <div style={{width:40, height:40, borderRadius:10, background:selected.bg,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700}}>
              {selected.ini}
            </div>
            <div>
              <p style={{fontWeight:600}}>{selected.name}</p>
              <p style={{fontSize:'0.82rem', color:'#6b7280'}}>{selected.email}</p>
            </div>
          </div>

          <div className="form-group">
            <label>Nombre completo *</label>
            <input className="form-control" value={formName}
              onChange={e => setFormName(e.target.value)}/>
            {errors.name && <small style={{color:'var(--danger)'}}>{errors.name}</small>}
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" className="form-control" value={formEmail} disabled
              style={{background:'#f3f4f6', color:'#9ca3af'}}/>
          </div>

          <div className="form-group">
            <label>
              {selected.rol === 'pending' ? 'Asignar Rol *' : 'Cambiar Rol'}
            </label>
            <div style={{display:'flex', gap:'0.5rem'}}>
              {['Docente','Coordinador','Director'].map(r => (
                <div key={r} onClick={() => setFormRol(r)}
                  style={{flex:1, padding:'0.75rem', borderRadius:8, textAlign:'center',
                    cursor:'pointer', fontSize:'0.85rem',
                    fontWeight: formRol===r ? 600 : 400,
                    background: formRol===r ? ROL_GRADIENTS[r] : '#f3f4f6',
                    color: formRol===r ? '#fff' : '#374151',
                    transition:'all .2s',
                    border: formRol===r ? 'none' : '1px solid #e5e7eb'}}>
                  <i className={`fas ${r==='Director'?'fa-user-shield':r==='Coordinador'?'fa-user-edit':'fa-chalkboard-teacher'}`}
                    style={{display:'block', fontSize:'1.2rem', marginBottom:'0.25rem'}}/>
                  {r}
                </div>
              ))}
            </div>
          </div>

          {selected.rol === 'pending' && (
            <div className="alert-card success">
              <i className="fas fa-info-circle icon"/>
              <div>
                <strong>Al asignar el rol</strong>
                <p style={{fontSize:'0.82rem'}}>
                  El usuario podrá acceder al sistema completo la próxima vez que inicie sesión.
                </p>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal ELIMINAR ── */}
      {delModal && selected && (
        <Modal title="Eliminar Usuario" icon="fa-trash" iconColor="var(--danger)"
          onClose={() => setDelModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setDelModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <i className="fas fa-trash"/>Eliminar
            </button>
          </>}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:'1rem',
            padding:'0.875rem', background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca'}}>
            <div style={{width:40, height:40, borderRadius:10, background:selected.bg,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700}}>
              {selected.ini}
            </div>
            <div>
              <p style={{fontWeight:600}}>{selected.name}</p>
              <p style={{fontSize:'0.82rem', color:'#6b7280'}}>{selected.email} — {selected.rol}</p>
            </div>
          </div>
          <p>¿Seguro que deseas eliminar este usuario?</p>
          <p style={{color:'var(--danger)', fontSize:'0.85rem', marginTop:'0.5rem'}}>
            <i className="fas fa-exclamation-circle" style={{marginRight:5}}/>Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </section>
  )
}
