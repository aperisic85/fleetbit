import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function LandingPage() {
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
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/live" style={linkStyle}>
            Karta brodova
          </Link>
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
            <>
              <Link to="/login" style={linkStyle}>
                Prijava
              </Link>
              <Link to="/register" style={primaryBtnStyle}>
                Registracija
              </Link>
            </>
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
            AIS Praćenje u realnom vremenu
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
            Pratite svoju flotu<br />u realnom vremenu
          </h1>

          <p style={{
            fontSize: 18,
            color: '#94a3b8',
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Fleetbit je napredna platforma za praćenje plovila putem AIS sustava.
            Savršeno za charter kompanije, brodare i maritimne operatere.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link to="/app" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
                Otvori aplikaciju →
              </Link>
            ) : (
              <>
                <Link to="/register" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
                  Počni besplatno →
                </Link>
                <Link to="/live" style={{
                  ...linkStyle,
                  fontSize: 16,
                  padding: '14px 32px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                }}>
                  Pogledaj kartu
                </Link>
              </>
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

        {/* CTA banner */}
        {!isAuthenticated && (
          <section style={{
            width: '100%',
            background: 'rgba(56,189,248,0.06)',
            borderTop: '1px solid rgba(56,189,248,0.15)',
            borderBottom: '1px solid rgba(56,189,248,0.15)',
            padding: '60px 32px',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
              Registrirajte svoju charter kompaniju
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: 28 }}>
              Dobijte pristup svim naprednim funkcijama praćenja plovila.
            </p>
            <Link to="/register" style={{ ...primaryBtnStyle, fontSize: 16, padding: '14px 32px' }}>
              Registrirajte se →
            </Link>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 32px',
        color: '#475569',
        fontSize: 13,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        © {new Date().getFullYear()} Fleetbit · AIS maritimno praćenje
      </footer>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: 14,
  padding: '8px 12px',
  borderRadius: 6,
  transition: 'color 0.2s',
};

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
    icon: '🗺️',
    title: 'Live karta u realnom vremenu',
    desc: 'Pregledajte sve brodove na interaktivnoj karti. Pozicije se ažuriraju svake 2 sekunde putem AIS sustava.',
  },
  {
    icon: '📍',
    title: 'Historijski trag plovila',
    desc: 'Pratite kretanje pojedinog plovila u odabranom vremenskom rasponu s detaljnim podacima o ruti.',
  },
  {
    icon: '🚢',
    title: 'Upravljanje flotom',
    desc: 'Grupirajte plovila u flote, dodajte vlastite nazive i pratite status cijele charter flote.',
  },
  {
    icon: '🔔',
    title: 'Geofencing zone',
    desc: 'Definirajte geografske zone i primajte obavijesti kada plovilo uđe ili napusti područje.',
  },
  {
    icon: '📊',
    title: 'Detaljni podaci',
    desc: 'IMO, MMSI, gaz, dimenzije, brzina, smjer, navigacijski status — sve informacije na jednom mjestu.',
  },
  {
    icon: '🔒',
    title: 'Sigurnost i privatnost',
    desc: 'Pristup je zaštićen korisničkim računima. Svaka charter kompanija vidi samo relevantne podatke.',
  },
];
