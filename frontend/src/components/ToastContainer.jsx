const ICONS = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle' }

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`fas ${ICONS[t.type]} icon`} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
