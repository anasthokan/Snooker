import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();
  const location = useLocation();

  const storedUser = (() => {
    if (user) return user;
    try {
      const token = sessionStorage.getItem('gamehub_access_token');
      const raw = sessionStorage.getItem('gamehub_user');
      if (token && raw) return JSON.parse(raw) as typeof user;
    } catch {
      // ignore
    }
    return null;
  })();

  if (!storedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(storedUser.role)) {
    if (storedUser.role === 'customer') {
      return <Navigate to="/customer/tables" replace />;
    }
    const redirect = storedUser.role === 'super_admin' ? '/super' : '/tenant';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
