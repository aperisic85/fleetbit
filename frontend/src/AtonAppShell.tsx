import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AtonLive } from './types';
import { fetchLiveAtons } from './api';
import { AtonView } from './components/AtonView';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { CommandHeader } from './components/CommandHeader';
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

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden', flexDirection: 'column' }}>

      {/* Gornja traka — Command Center */}
      <CommandHeader
        user={user}
        wsStatus={loading ? 'connecting' : atons.length > 0 ? 'connected' : 'disconnected'}
        onLogout={handleLogout}
        station="FLEETBIT · AIS ATON"
      />

      {/* AtoN pregled ispunjava ostatak prostora */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AtonView atons={atons} loading={loading} />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
