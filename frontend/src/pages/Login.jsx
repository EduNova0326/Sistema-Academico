import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError('Correo o contraseña incorrectos')
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
            <p style={styles.brandTagline}>Plataforma de gestión educativa</p>
          </div>

          <div style={styles.features}>
            {[
              { icon: 'fa-users', text: 'Gestión de docentes y estudiantes' },
              { icon: 'fa-chart-line', text: 'Seguimiento de calificaciones' },
              { icon: 'fa-calendar-alt', text: 'Planificación curricular' },
              { icon: 'fa-shield-alt', text: 'Acceso seguro con Supabase Auth' },
            ].map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <div style={styles.featureIcon}>
                  <i className={`fas ${f.icon}`} style={{ color: '#60a5fa', fontSize: '0.9rem' }} />
                </div>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          <p style={styles.leftFooter}>© 2025 EduNova. Todos los derechos reservados.</p>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Bienvenido de vuelta</h2>
            <p style={styles.formSubtitle}>Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Correo electrónico</label>
              <div style={styles.inputWrap}>
                <i className="fas fa-envelope" style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.inputWrap}>
                <i className="fas fa-lock" style={styles.inputIcon} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...styles.input, paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={styles.eyeBtn}
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={
                loading
                  ? { ...styles.submitBtn, opacity: 0.7 }
                  : styles.submitBtn
              }
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>¿Nuevo en EduNova?</span>
            <div style={styles.dividerLine} />
          </div>

          <button
            onClick={() => navigate('/register')}
            style={styles.registerBtn}
          >
            Crear una cuenta nueva
          </button>
        </div>
      </div>
    </div>
  )
}

function getStyles() {
  return {
    page: {
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    },
    left: {
      width: '45%',
      background:
        'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #1a2744 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    leftInner: {
      position: 'relative',
      zIndex: 2,
      padding: '3rem',
      width: '100%',
      maxWidth: 420,
    },
    circle1: {
      position: 'absolute',
      top: '-80px',
      right: '-80px',
      width: 300,
      height: 300,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
    },
    circle2: {
      position: 'absolute',
      bottom: '10%',
      left: '-60px',
      width: 250,
      height: 250,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
    },
    circle3: {
      position: 'absolute',
      top: '40%',
      right: '5%',
      width: 150,
      height: 150,
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
    },
    brand: { marginBottom: '3rem' },
    logoWrap: {
      width: 68,
      height: 68,
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      borderRadius: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1.25rem',
      boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
    },
    logoIcon: { color: 'white', fontSize: '1.75rem' },
    brandName: {
      color: '#f1f5f9',
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.5px',
      marginBottom: '0.4rem',
    },
    brandTagline: { color: '#64748b', fontSize: '0.95rem' },
    features: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
      marginBottom: '3rem',
    },
    featureItem: { display: 'flex', alignItems: 'center', gap: '0.875rem' },
    featureIcon: {
      width: 34,
      height: 34,
      background: 'rgba(37,99,235,0.15)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(37,99,235,0.2)',
    },
    featureText: { color: '#94a3b8', fontSize: '0.875rem' },
    leftFooter: { color: '#334155', fontSize: '0.75rem' },
    right: {
      flex: 1,
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    },
    formCard: {
      background: '#ffffff',
      borderRadius: 24,
      padding: '2.5rem',
      width: '100%',
      maxWidth: 420,
      boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
    },
    formHeader: { marginBottom: '2rem' },
    formTitle: {
      fontSize: '1.6rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '0.4rem',
    },
    formSubtitle: { color: '#64748b', fontSize: '0.9rem' },
    errorBox: {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 12,
      padding: '0.75rem 1rem',
      marginBottom: '1.25rem',
      color: '#dc2626',
      fontSize: '0.875rem',
    },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.85rem', fontWeight: 600, color: '#374151' },
    inputWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      border: '2px solid #2d3748',
      borderRadius: 12,
      background: '#f8fafc',
    },
    inputIcon: {
      position: 'absolute',
      left: '1rem',
      color: '#94a3b8',
      fontSize: '0.875rem',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      padding: '0.8rem 1rem 0.8rem 2.75rem',
      border: 'none',
      background: 'transparent',
      outline: 'none',
      fontSize: '0.9rem',
      color: '#0f172a',
    },
    eyeBtn: {
      position: 'absolute',
      right: '0.75rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94a3b8',
      padding: '0.25rem',
      fontSize: '0.9rem',
    },
    submitBtn: {
      width: '100%',
      padding: '0.875rem',
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      fontSize: '0.95rem',
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: '0.25rem',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      margin: '1.5rem 0',
    },
    dividerLine: { flex: 1, height: 1, background: '#e2e8f0' },
    dividerText: {
      color: '#94a3b8',
      fontSize: '0.8rem',
      whiteSpace: 'nowrap',
    },
    registerBtn: {
      width: '100%',
      padding: '0.8rem',
      background: 'transparent',
      color: '#2563eb',
      border: '2px solid #2563eb',
      borderRadius: 12,
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
  }
}