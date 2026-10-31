import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from './ui.jsx';

// Frontend guard for convenience only. The API enforces the same rules on every request.
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
