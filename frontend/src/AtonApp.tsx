import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AtonLandingPage from './pages/AtonLandingPage';
import LoginPage from './pages/LoginPage';
import AtonAppShell from './AtonAppShell';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AtonApp() {
  return (
    <Routes>
      <Route path="/" element={<AtonLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AtonAppShell />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
