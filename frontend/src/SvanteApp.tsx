import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SvanteMonitorPage from './svante/SvanteMonitorPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function SvanteApp() {
  return (
    <Routes>
      {/* Fokus aplikacije je nadzor kanala — karta je odmah na početnoj */}
      <Route path="/" element={<SvanteMonitorPage mode="guest" />} />
      <Route path="/live" element={<SvanteMonitorPage mode="guest" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <SvanteMonitorPage mode="app" />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
