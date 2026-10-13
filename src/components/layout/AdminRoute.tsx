import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

export function AdminRoute() {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" label="Comprobando permisos..." />
      </div>
    );
  }

  if (!usuario || !usuario.es_admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
