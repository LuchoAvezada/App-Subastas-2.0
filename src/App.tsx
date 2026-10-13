import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/layout/AdminRoute';
import { Layout } from './components/layout/Layout';

// Public Pages
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';

// Protected User Pages
import { HomePage } from './pages/HomePage';
import { CatalogoPage } from './pages/CatalogoPage';
import { MisOfertasPage } from './pages/MisOfertasPage';
import { ResultadosPage } from './pages/ResultadosPage';

// Admin Pages
import { AdminOfertasPage } from './pages/admin/AdminOfertasPage';
import { AdminActivosPage } from './pages/admin/AdminActivosPage';
import { AdminColaboradoresPage } from './pages/admin/AdminColaboradoresPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas de Autenticación */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />

            {/* Rutas Protegidas dentro del Shell con Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/catalogo/:categoria" element={<CatalogoPage />} />
              <Route path="/mis-ofertas" element={<MisOfertasPage />} />
              <Route path="/resultados" element={<ResultadosPage />} />

              {/* Rutas de Administración (requieren es_admin = true) */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/ofertas" element={<AdminOfertasPage />} />
                <Route path="/admin/activos" element={<AdminActivosPage />} />
                <Route path="/admin/colaboradores" element={<AdminColaboradoresPage />} />
                <Route path="/admin/config" element={<AdminConfigPage />} />
              </Route>
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
