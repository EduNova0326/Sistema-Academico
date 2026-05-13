import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (field) => (event) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const getStrength = () => {
    const password = form.password
    if (!password) return 0

    let value = 0
    if (password.length >= 6) value++
    if (password.length >= 10) value++
    if (/[A-Z]/.test(password)) value++
    if (/[0-9]/.test(password)) value++
    if (/[^A-Za-z0-9]/.test(password)) value++
    return value
  }

  const strength = getStrength()
  const strengthLabel = ['', 'Muy debil', 'Debil', 'Regular', 'Buena', 'Excelente'][strength]
  const strengthColor = ['', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#10b981'][strength]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name || !form.email || !form.password) {
      setError('Todos los campos son obligatorios')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await register(form.email, form.password, form.name)
      setSuccess('Cuenta creada correctamente. Ahora debes esperar a que el director te asigne un rol para poder entrar.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err?.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const styles = getStyles()

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.circle1} />
          <div style={styles.circle2} />
          <div style={styles.circle3} />

          <div style={styles.brand}>
            <div style={styles.logoWrap}>
              <i className="fas fa-graduation-cap" style={styles.logoIcon} />
            </div>
            <h1 style={styles.brandName}>EduNova</h1>
            <p style={styles.brandTagline}>Plataforma de gestion educativa</p>
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Registro con aprobacion</h3>
            <p style={styles.infoText}>
              Tu cuenta se crea primero en estado pendiente. El director debe asignarte un rol antes de que puedas usar el sistema.
            </p>
          </div>

          <p style={styles.leftFooter}>© 2026 EduNova. Todos los derechos reservados.</p>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Crea tu cuenta</h2>
            <p style={styles.formSubtitle}>Completa tus datos para solicitar acceso</p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Nombre completo"
              value={form.name}
              onChange={setField('name')}
              style={styles.input}
            />

            <input
              type="email"
              placeholder="Correo electronico"
              value={form.email}
              onChange={setField('email')}
              style={styles.input}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={setField('password')}
              style={styles.input}
            />

            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              style={styles.input}
            />

            {form.password && (
              <div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${strength * 20}%`,
                      height: 6,
                      background: strengthColor,
                      borderRadius: 4,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <small style={{ color: strengthColor }}>{strengthLabel}</small>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <button onClick={() => navigate('/login')} style={styles.loginBtn}>
            Ya tengo cuenta
          </button>
        </div>
      </div>
    </div>
  )
}

function getStyles() {
  return {
    page: { minHeight: '100vh', display: 'flex' },
    left: {
      width: '45%',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #1a2744 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    leftInner: { padding: '3rem', color: '#fff', maxWidth: 430, position: 'relative', zIndex: 2 },
    circle1: {
      position: 'absolute',
      top: '-90px',
      right: '-90px',
      width: 280,
      height: 280,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)',
    },
    circle2: {
      position: 'absolute',
      bottom: '10%',
      left: '-60px',
      width: 220,
      height: 220,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
    },
    circle3: {
      position: 'absolute',
      top: '45%',
      right: '10%',
      width: 140,
      height: 140,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
    },
    brand: { marginBottom: '2rem' },
    logoWrap: {
      width: 60,
      height: 60,
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem',
    },
    logoIcon: { color: '#fff', fontSize: '1.5rem' },
    brandName: { fontSize: '1.9rem', fontWeight: 800, marginBottom: '0.35rem' },
    brandTagline: { fontSize: '0.9rem', color: '#94a3b8' },
    infoCard: {
      padding: '1rem 1.1rem',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: '2rem',
    },
    infoTitle: { fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' },
    infoText: { color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 },
    leftFooter: { marginTop: '2rem', fontSize: '0.75rem', opacity: 0.6 },
    right: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      padding: '2rem',
    },
    formCard: {
      background: '#fff',
      padding: '2rem',
      borderRadius: 18,
      width: '100%',
      maxWidth: 430,
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    },
    formHeader: { marginBottom: '1rem' },
    formTitle: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' },
    formSubtitle: { fontSize: '0.88rem', color: '#64748b' },
    input: {
      padding: '0.85rem 0.9rem',
      borderRadius: 10,
      border: '1px solid #cbd5e1',
      fontSize: '0.95rem',
      outline: 'none',
    },
    submitBtn: {
      padding: '0.85rem',
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      fontWeight: 600,
    },
    loginBtn: {
      marginTop: '1rem',
      padding: '0.85rem',
      background: 'transparent',
      border: '1px solid #2563eb',
      color: '#2563eb',
      borderRadius: 10,
      cursor: 'pointer',
      width: '100%',
      fontWeight: 600,
    },
    errorBox: {
      background: '#fee2e2',
      color: '#dc2626',
      padding: '0.75rem',
      borderRadius: 10,
      marginBottom: '1rem',
      fontSize: '0.88rem',
    },
    successBox: {
      background: '#d1fae5',
      color: '#059669',
      padding: '0.75rem',
      borderRadius: 10,
      marginBottom: '1rem',
      fontSize: '0.88rem',
    },
  }
}
