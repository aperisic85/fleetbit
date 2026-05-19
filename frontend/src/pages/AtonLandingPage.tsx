import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AtonLandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2027 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Navigacijska traka */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(15,23,42,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>⚓</span>
          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>
            Fleet<span style={{ color: '#38bdf8' }}>bit</span>
            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>AIS Aton</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {user?.email}
              </span>
              <Link to="/app" style={primaryBtnStyle}>
                Otvori aplikaciju
              </Link>
            </>
          ) : (
            <Link to="/login" style={primaryBtnStyle}>
              Prijava
            </Link>
          )}
        </div>
      </nav>

      {/* Hero sekcija */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <section style={{
          maxWidth: 900,
          width: '100%',
          margin: '80px auto 60px',
          padding: '0 32px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 13,
            color: '#38bdf8',
            marginBottom: 24,
            letterSpacing: '0.04em',
          }}>
            AIS nadzor pomoćnih plovnih oznaka
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #e2e8f0 0%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Nadzor AtoN oznaka<br />u realnom vremenu
          </h1>

          <p style={{
            fontSize: 18,
            color: '#94a3b8',
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Fleetbit AIS Aton platforma pruža kontinuiran nadzor svjetionika,
            plutača i ostalih pomoćnih plovnih oznaka. Alarmi, svjetlosni status
            i RACON — sve na jednom mjestu.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link to="/app" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
                Otvori nadzornu ploču →
              </Link>
            ) : (
              <Link to="/login" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
                Prijavi se →
              </Link>
            )}
          </div>
        </section>

        {/* Značajke */}
        <section style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto 80px',
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 28,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Status baner */}
        <section style={{
          width: '100%',
          background: 'rgba(56,189,248,0.06)',
          borderTop: '1px solid rgba(56,189,248,0.15)',
          borderBottom: '1px solid rgba(56,189,248,0.15)',
          padding: '60px 32px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            Sigurnost plovidbe počinje s pouzdanim oznakama
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: 28 }}>
            Svaki alarm na plovnoj oznaci vidljiv je odmah — s poviješću statusa i točnom pozicijom.
          </p>
          {!isAuthenticated && (
            <Link to="/login" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
              Prijavi se →
            </Link>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 32px',
        color: '#475569',
        fontSize: 13,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        © {new Date().getFullYear()} Fleetbit · AIS Aton nadzor
      </footer>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#0ea5e9',
  color: '#fff',
  textDecoration: 'none',
  fontSize: 14,
  padding: '9px 20px',
  borderRadius: 8,
  fontWeight: 600,
  transition: 'background 0.2s',
};

const features = [
  {
    icon: '🔴',
    title: 'Alarm nadzor',
    desc: 'Trenutačna obavijest o svakom alarmu na plovnoj oznaci. Crveni, žuti i zeleni status za brz pregled situacije.',
  },
  {
    icon: '💡',
    title: 'Status svjetla',
    desc: 'Praćenje rada svjetioničkih svjetala u realnom vremenu — uključeno, isključeno ili kvar.',
  },
  {
    icon: '📡',
    title: 'RACON nadzor',
    desc: 'Stanje RACON radarskih transpondera: operativno, nenadzirano ili greška.',
  },
  {
    icon: '📍',
    title: 'Detekcija pomaka pozicije',
    desc: 'Automatsko otkrivanje kada plutača ili oznaka otplovi izvan dozvoljenog područja.',
  },
  {
    icon: '🗺️',
    title: 'Interaktivna karta',
    desc: 'Sve AtoN oznake prikazane na pomorskoj karti s bojama prema statusu. Kliknite za detalje.',
  },
  {
    icon: '📊',
    title: 'Pregled po kategorijama',
    desc: 'Filtriranje po tipu oznake, zdravstvenom statusu i geografskom području.',
  },
];
