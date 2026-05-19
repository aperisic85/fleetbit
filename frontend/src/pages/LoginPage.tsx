import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiLogin } from '../api';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiLogin({ email, password });
      login(data.token, data.user);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prijava nije uspjela');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚓</div>
            <span style={{ fontWeight: 700, fontSize: 22, color: '#e2e8f0' }}>
              Fleet<span style={{ color: '#38bdf8' }}>bit</span>
            </span>
          </Link>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
            Prijavite se u svoje račun
          </p>
        </div>

        {error && (
          <div style={errorBoxStyle}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email adresa</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="ime@kompanija.hr"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Lozinka</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={submitBtnStyle}
          >
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
          Nemate račun?{' '}
          <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            Registrirajte se
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: '#64748b' }}>
          <Link to="/live" style={{ color: '#64748b', textDecoration: 'none' }}>
            ← Pogledaj kartu kao gost
          </Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '40px 36px',
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#94a3b8',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#0ea5e9',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
};

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(248,113,113,0.1)',
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#f87171',
  fontSize: 13,
  marginBottom: 16,
};
