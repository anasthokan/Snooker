import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'customer') {
      return <Navigate to="/customer/tables" replace />;
    }
    const redirect = user.role === 'super_admin' ? '/super' : '/tenant';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
