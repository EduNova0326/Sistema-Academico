export default function Modal({ title, icon, iconColor, children, footer, onClose, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={maxWidth ? { maxWidth } : {}}>
        <div className="modal-header">
          <h3>
            <i className={`fas ${icon}`} style={{ marginRight: 10, color: iconColor || 'var(--primary)' }} />
            {title}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
