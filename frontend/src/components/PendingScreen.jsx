export default function PendingScreen({ onLogout, profile }) {
  const isInactive = profile?.status === 'inactive'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '3rem',
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isInactive ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <i className={`fas ${isInactive ? 'fa-user-slash' : 'fa-clock'}`} style={{ fontSize: '2rem', color: isInactive ? 'var(--danger)' : 'var(--warning)' }} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1f2937' }}>
          {isInactive ? 'Cuenta desactivada' : 'Cuenta pendiente de aprobacion'}
        </h2>

        <p style={{ color: '#6b7280', marginBottom: '0.5rem', lineHeight: 1.6 }}>
          {isInactive
            ? 'Tu cuenta existe, pero fue desactivada por el director del sistema.'
            : 'Tu cuenta fue creada correctamente, pero todavia no tiene un rol asignado.'}
        </p>

        <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.6 }}>
          {isInactive
            ? 'Contacta al director para que reactive tu acceso.'
            : 'No puedes entrar a la aplicacion hasta que el director te asigne un rol.'}
        </p>

        <div
          style={{
            background: '#f3f4f6',
            borderRadius: 10,
            padding: '1rem',
            marginBottom: '2rem',
            fontSize: '0.85rem',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
            <i className="fas fa-envelope" style={{ marginRight: 6, color: 'var(--primary)' }} />
            Estado de tu cuenta
          </p>
          <p style={{ color: '#6b7280' }}>
            {profile?.email || 'Tu usuario'} {isInactive ? 'esta desactivado temporalmente.' : 'esta esperando asignacion de rol.'}
          </p>
        </div>

        <button className="btn btn-secondary" onClick={onLogout} style={{ width: '100%' }}>
          <i className="fas fa-sign-out-alt" />Cerrar Sesion
        </button>
      </div>
    </div>
  )
}
