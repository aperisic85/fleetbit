import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuestMapPage from './pages/GuestMapPage';
import AppShell from './AppShell';

/** Ruta dostupna samo prijavljenim korisnicima */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Javne rute */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/live" element={<GuestMapPage />} />

      {/* Zaštićena ruta — puna aplikacija */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
