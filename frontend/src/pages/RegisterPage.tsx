import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRegister } from '../api';
import { useAuth } from '../AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Lozinke se ne podudaraju');
      return;
    }
    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRegister({
        email,
        password,
        company_name: companyName || undefined,
      });
      login(data.token, data.user);
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registracija nije uspjela');
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
            Registrirajte charter kompaniju
          </p>
        </div>

        {error && (
          <div style={errorBoxStyle}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Naziv charter kompanije</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="npr. Adriatic Yachts d.o.o."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Email adresa <span style={{ color: '#f87171' }}>*</span></label>
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
            <label style={labelStyle}>Lozinka <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Najmanje 8 znakova"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Potvrda lozinke <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Ponovite lozinku"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={submitBtnStyle}
          >
            {loading ? 'Registracija...' : 'Registriraj se'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
          Registracijom prihvaćate uvjete korištenja platforme.
          Vaš račun će biti u ulozi <strong style={{ color: '#94a3b8' }}>klijent</strong> (charter kompanija).
        </p>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748b' }}>
          Već imate račun?{' '}
          <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            Prijavite se
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
  maxWidth: 440,
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
