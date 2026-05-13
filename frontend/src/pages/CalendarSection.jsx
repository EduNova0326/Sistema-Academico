import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { supabase } from '../services/supabaseClient.js'
import { startOfMonthLocal, toISODateLocal } from '../utils/dateUtils.js'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const EVENT_COLORS = ['var(--primary)','var(--success)','var(--warning)','var(--danger)','var(--secondary)']
const COLOR_NAMES  = ['Azul','Verde','Naranja','Rojo','Morado']

const COLOR_BG = {
  'var(--primary)':   'rgba(37,99,235,0.08)',
  'var(--success)':   'rgba(16,185,129,0.08)',
  'var(--warning)':   'rgba(245,158,11,0.08)',
  'var(--danger)':    'rgba(239,68,68,0.08)',
  'var(--secondary)': 'rgba(124,58,237,0.08)',
}

export function CalendarSection({ showToast, onNavigate }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [events,      setEvents]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [addModal,    setAddModal]    = useState(false)
  const [editModal,   setEditModal]   = useState(false)
  const [selDay,      setSelDay]      = useState(null)
  const [selected,    setSelected]    = useState(null)

  // Campos separados para evitar bug de una letra
  const [formTitle, setFormTitle] = useState('')
  const [formDesc,  setFormDesc]  = useState('')
  const [formColor, setFormColor] = useState('var(--primary)')
  const [formType,  setFormType]  = useState('Académico')

  const EVENT_TYPES = ['Académico','Evaluación','Reunión','Entrega','Festivo','Otro']

  // Base dinámica: primer día del mes actual según la fecha real del sistema.
  const BASE = startOfMonthLocal()
  const cur  = new Date(BASE); cur.setMonth(cur.getMonth() + monthOffset)
  const year = cur.getFullYear(), month = cur.getMonth()
  const today = new Date()

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()

  // ── CARGAR EVENTOS ───────────────────────────────────────
  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
      if (error) throw error
      setEvents(data.map(e => ({
        id:    e.id,
        day:   new Date(e.event_date).getUTCDate(),
        m:     new Date(e.event_date).getUTCMonth(),
        y:     new Date(e.event_date).getUTCFullYear(),
        title: e.title,
        desc:  e.description,
        color: e.color,
        type:  e.type || 'Académico',
      })))
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }

  const getEventsForDay = d => events.filter(e => e.day===d && e.m===month && e.y===year)

  // Construir celdas del calendario
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push({d:daysInPrev-firstDay+i+1, other:true})
  for (let i=1; i<=daysInMonth; i++) cells.push({d:i, other:false})
  while (cells.length%7!==0) cells.push({d:cells.length-daysInMonth-firstDay+1, other:true})

  // ── AGREGAR EVENTO ───────────────────────────────────────
  const openAdd = (day) => {
    setSelDay(day)
    setFormTitle(''); setFormDesc('')
    setFormColor('var(--primary)'); setFormType('Académico')
    setAddModal(true)
  }

  const handleAdd = async () => {
    if (!formTitle.trim()) { showToast('warning', 'El título es requerido'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const eventDate = toISODateLocal(new Date(year, month, selDay))
      const { data, error } = await supabase
        .from('events')
        .insert([{
          user_id:     user.id,
          title:       formTitle.trim(),
          description: formDesc.trim(),
          event_date:  eventDate,
          color:       formColor,
          type:        formType,
        }])
        .select()
        .single()
      if (error) throw error
      setEvents(p => [...p, {
        id: data.id, day: selDay, m: month, y: year,
        title: data.title, desc: data.description,
        color: data.color, type: data.type,
      }])
      setAddModal(false)
      showToast('success', `Evento "${formTitle}" agregado`)
    } catch (error) {
      console.error(error)
      showToast('error', 'Error al guardar el evento')
    }
  }

  // ── EDITAR EVENTO ────────────────────────────────────────
  const openEdit = (e) => {
    setSelected(e)
    setFormTitle(e.title); setFormDesc(e.desc || '')
    setFormColor(e.color); setFormType(e.type || 'Académico')
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!formTitle.trim()) return
    try {
      const { error } = await supabase
        .from('events')
        .update({ title: formTitle, description: formDesc, color: formColor, type: formType })
        .eq('id', selected.id)
      if (error) throw error
      setEvents(p => p.map(e => e.id !== selected.id ? e : {
        ...e, title: formTitle, desc: formDesc, color: formColor, type: formType
      }))
      setEditModal(false)
      showToast('success', 'Evento actualizado')
    } catch (error) {
      showToast('error', 'Error al actualizar el evento')
    }
  }

  // ── ELIMINAR EVENTO ──────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      setEvents(p => p.filter(e => e.id !== id))
      showToast('success', 'Evento eliminado')
    } catch (error) {
      showToast('error', 'Error al eliminar')
    }
  }

  // Próximos eventos
  const upcoming = events
    .filter(e => new Date(e.y, e.m, e.day) >= new Date(year, month, 1))
    .sort((a,b) => new Date(a.y,a.m,a.day) - new Date(b.y,b.m,b.day))
    .slice(0, 6)

  const TYPE_ICONS = {
    'Académico':  { i:'fa-graduation-cap', c:'var(--primary)'   },
    'Evaluación': { i:'fa-clipboard-check',c:'var(--danger)'    },
    'Reunión':    { i:'fa-users',          c:'var(--secondary)' },
    'Entrega':    { i:'fa-inbox',          c:'var(--warning)'   },
    'Festivo':    { i:'fa-star',           c:'var(--success)'   },
    'Otro':       { i:'fa-circle',         c:'#6b7280'          },
  }

  // Formulario compartido
  const eventForm = (
    <>
      <div className="form-group">
        <label>Título del evento *</label>
        <input className="form-control" placeholder="Ej: Entrega de notas período 1"
          value={formTitle} onChange={e => setFormTitle(e.target.value)}/>
      </div>
      <div className="form-group">
        <label>Tipo de evento</label>
        <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
          {EVENT_TYPES.map(t => {
            const ti = TYPE_ICONS[t]
            return (
              <div key={t} onClick={() => setFormType(t)}
                style={{padding:'0.4rem 0.75rem', borderRadius:8, cursor:'pointer', fontSize:'0.82rem',
                  background: formType===t ? ti.c : '#f3f4f6',
                  color: formType===t ? '#fff' : '#374151',
                  fontWeight: formType===t ? 600 : 400,
                  transition:'all .2s'}}>
                <i className={`fas ${ti.i}`} style={{marginRight:4}}/>{t}
              </div>
            )
          })}
        </div>
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <input className="form-control" placeholder="Detalles del evento"
          value={formDesc} onChange={e => setFormDesc(e.target.value)}/>
      </div>
      <div className="form-group">
        <label>Color</label>
        <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
          {EVENT_COLORS.map((col, i) => (
            <div key={col} onClick={() => setFormColor(col)}
              style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer'}}>
              <div style={{width:28, height:28, borderRadius:'50%', background:col,
                border: formColor===col ? '3px solid #1f2937' : '3px solid transparent',
                transition:'border .2s'}}/>
              <span style={{fontSize:'0.65rem', color:'#6b7280'}}>{COLOR_NAMES[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <section>
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('dashboard')}>Inicio</a><span>/</span><span>Calendario</span>
        </div>
        <h2>Calendario Académico</h2>
        <p>Haz clic en cualquier día para agregar un evento. Los eventos de Plan Semanal también aparecen aquí.</p>
      </div>

      {/* Stats rápidas */}
      <div className="stats-grid">
        {[
          { i:'fa-calendar-check', c:'blue',   v:events.filter(e=>e.m===month&&e.y===year).length,                      l:'Eventos este mes'  },
          { i:'fa-clipboard-check',c:'orange', v:events.filter(e=>e.type==='Evaluación').length,                         l:'Evaluaciones'      },
          { i:'fa-users',          c:'purple', v:events.filter(e=>e.type==='Reunión').length,                            l:'Reuniones'         },
          { i:'fa-inbox',          c:'green',  v:events.filter(e=>e.type==='Entrega').length,                            l:'Entregas'          },
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
          <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthOffset(o=>o-1)}>
              <i className="fas fa-chevron-left"/>
            </button>
            <span style={{fontWeight:700, fontSize:'1.15rem'}}>{MONTHS[month]} {year}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthOffset(o=>o+1)}>
              <i className="fas fa-chevron-right"/>
            </button>
            {monthOffset!==0 && (
              <button className="btn btn-sm btn-secondary" onClick={() => setMonthOffset(0)}>
                <i className="fas fa-home"/> Hoy
              </button>
            )}
          </div>
          <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
            <span style={{fontSize:'0.85rem', color:'#6b7280'}}>
              <i className="fas fa-circle" style={{color:'var(--primary)', fontSize:'0.6rem', marginRight:4}}/>
              {events.filter(e=>e.m===month&&e.y===year).length} eventos
            </span>
          </div>
        </div>

        <div className="card-body">
          {/* Leyenda de tipos */}
          <div style={{display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem', paddingBottom:'1rem', borderBottom:'1px solid #e5e7eb'}}>
            {Object.entries(TYPE_ICONS).map(([type, ti]) => (
              <div key={type} style={{display:'flex', alignItems:'center', gap:5, fontSize:'0.78rem', color:'#6b7280'}}>
                <i className={`fas ${ti.i}`} style={{color:ti.c, fontSize:'0.75rem'}}/>
                {type}
              </div>
            ))}
          </div>

          {/* Calendario */}
          <div className="calendar-grid">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
              <div key={d} className="calendar-header" style={{fontWeight:700, color:'#374151'}}>{d}</div>
            ))}
            {cells.map((cell, i) => {
              const evs     = cell.other ? [] : getEventsForDay(cell.d)
              const isToday = !cell.other
                && cell.d === today.getDate()
                && month === today.getMonth()
                && year === today.getFullYear()
              return (
                <div key={i}
                  className={`calendar-day${cell.other?' other-month':''}${isToday?' today':''}`}
                  style={{
                    position:'relative',
                    background: !cell.other && evs.length > 0 ? COLOR_BG[evs[0].color] || 'rgba(37,99,235,0.05)' : '',
                    border: !cell.other && evs.length > 0 ? `1px solid ${evs[0].color}` : '',
                    borderRadius: 10,
                    cursor: cell.other ? 'default' : 'pointer',
                    transition:'all .2s',
                  }}
                  title={evs.map(e => e.title).join(', ')}
                  onClick={() => { if (!cell.other) openAdd(cell.d) }}>
                  {cell.d}
                  {/* Puntos de eventos */}
                  {evs.length > 0 && (
                    <div style={{display:'flex', gap:2, justifyContent:'center', position:'absolute', bottom:3, left:0, right:0}}>
                      {evs.slice(0,3).map((e, ei) => (
                        <div key={ei} style={{width:5, height:5, borderRadius:'50%', background:e.color}}/>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Próximos eventos */}
      <div className="card">
        <div className="card-header">
          <h3>Próximos Eventos</h3>
          <span style={{fontSize:'0.85rem', color:'#6b7280'}}>{upcoming.length} eventos próximos</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{textAlign:'center', padding:'1.5rem', color:'#6b7280'}}>
              <i className="fas fa-spinner fa-spin" style={{fontSize:'1.5rem', display:'block', marginBottom:'0.5rem'}}/>
              Cargando eventos...
            </div>
          ) : upcoming.length === 0 ? (
            <div style={{textAlign:'center', padding:'2rem', color:'#9ca3af'}}>
              <i className="fas fa-calendar" style={{fontSize:'2rem', display:'block', marginBottom:'0.5rem'}}/>
              <p>No hay eventos próximos.</p>
              <p style={{fontSize:'0.85rem'}}>Haz clic en cualquier día del calendario para agregar uno.</p>
            </div>
          ) : upcoming.map(e => {
            const ti = TYPE_ICONS[e.type] || TYPE_ICONS['Otro']
            return (
              <div key={e.id} style={{display:'flex', gap:'1rem', padding:'0.875rem', borderRadius:10, marginBottom:'0.5rem', background:COLOR_BG[e.color]||'#f8fafc', border:`1px solid ${e.color}`, alignItems:'flex-start'}}>
                {/* Fecha */}
                <div style={{minWidth:48, textAlign:'center', background:e.color, borderRadius:8, padding:'0.4rem 0'}}>
                  <p style={{color:'#fff', fontSize:'0.65rem', fontWeight:600, textTransform:'uppercase'}}>{MONTHS[e.m].slice(0,3)}</p>
                  <p style={{color:'#fff', fontSize:'1.2rem', fontWeight:700, lineHeight:1}}>{e.day}</p>
                </div>
                {/* Contenido */}
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:3}}>
                    <i className={`fas ${ti.i}`} style={{color:ti.c, fontSize:'0.8rem'}}/>
                    <span style={{fontSize:'0.72rem', color:ti.c, fontWeight:600}}>{e.type}</span>
                  </div>
                  <h4 style={{fontSize:'0.9rem', marginBottom:3}}>{e.title}</h4>
                  {e.desc && <p style={{fontSize:'0.78rem', color:'#6b7280'}}>{e.desc}</p>}
                </div>
                {/* Acciones */}
                <div style={{display:'flex', gap:'0.4rem', flexShrink:0}}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(e)} title="Editar">
                    <i className="fas fa-edit"/>
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{color:'var(--danger)'}}
                    onClick={() => handleDelete(e.id)} title="Eliminar">
                    <i className="fas fa-times"/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal AGREGAR ── */}
      {addModal && (
        <Modal title={`Agregar evento — ${selDay} de ${MONTHS[month]}`} icon="fa-calendar-plus"
          onClose={() => setAddModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd}><i className="fas fa-save"/>Guardar</button>
          </>}>
          {eventForm}
        </Modal>
      )}

      {/* ── Modal EDITAR ── */}
      {editModal && selected && (
        <Modal title="Editar Evento" icon="fa-edit" iconColor="var(--warning)"
          onClose={() => setEditModal(false)} maxWidth="480px"
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEdit}><i className="fas fa-save"/>Actualizar</button>
          </>}>
          {eventForm}
        </Modal>
      )}
    </section>
  )
}
