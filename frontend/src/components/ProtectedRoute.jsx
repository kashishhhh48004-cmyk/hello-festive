import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Spinner() {
  return (
    <div className="center-screen">
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, profileLoaded } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly) {
    if (!profileLoaded) return <Spinner />;
    if (!isAdmin) return <Navigate to="/" replace />;
  }
  return children;
}
