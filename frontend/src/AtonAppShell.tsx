import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AtonLive } from './types';
import { fetchLiveAtons } from './api';
import { AtonView } from './components/AtonView';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { useAuth } from './AuthContext';

let toastIdCounter = 1;

export default function AtonAppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [atons, setAtons] = useState<AtonLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = toastIdCounter++;
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    fetchLiveAtons()
      .then((data) => setAtons(data.atons ?? []))
      .catch((err) => {
        console.error(err);
        addToast('Greška pri učitavanju AtoN podataka', 'error');
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const roleLabel: Record<string, string> = { admin: 'Admin', moderator: 'Moderator', client: 'Klijent' };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden', flexDirection: 'column' }}>

      {/* Gornja traka */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        background: 'var(--bg-surface, #1e293b)',
        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        flexShrink: 0,
        zIndex: 1060,
        height: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚓</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #e2e8f0)' }}>
            Fleet<span style={{ color: '#38bdf8' }}>bit</span>
            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>AIS Aton</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <>
              <span style={{
                fontSize: 12,
                color: 'var(--text-secondary, #94a3b8)',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.company_name ?? user.email}
              </span>
              <span style={{
                background: user.role === 'admin' ? 'rgba(239,68,68,0.15)' :
                  user.role === 'moderator' ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.12)',
                color: user.role === 'admin' ? '#f87171' :
                  user.role === 'moderator' ? '#fbbf24' : '#38bdf8',
                border: `1px solid ${user.role === 'admin' ? 'rgba(239,68,68,0.3)' :
                  user.role === 'moderator' ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.25)'}`,
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.03em',
              }}>
                {roleLabel[user.role] ?? user.role}
              </span>
            </>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-secondary, #94a3b8)',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Odjava
          </button>
        </div>
      </div>

      {/* AtoN pregled ispunjava ostatak prostora */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AtonView atons={atons} loading={loading} />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
