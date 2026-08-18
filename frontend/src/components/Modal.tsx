import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, width = '520px' }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box fade-in"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: 'var(--texte)', fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--texte-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
