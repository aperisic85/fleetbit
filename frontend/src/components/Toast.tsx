import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ContainerProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 60,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

const COLORS: Record<ToastMessage['type'], string> = {
  info:    '#60a5fa',
  success: '#34d399',
  warning: '#f59e0b',
  error:   '#f87171',
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Kratkotrajni RAF da CSS transition se okine
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3200);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(hide);
    };
  }, [toast.id, onRemove]);

  const color = COLORS[toast.type];

  return (
    <div
      style={{
        background: '#1e293b',
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12,
        color: '#e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        pointerEvents: 'auto',
        maxWidth: 260,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
      }}
    >
      <span style={{
        width: 6, height: 6,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {toast.text}
      </span>
    </div>
  );
}
