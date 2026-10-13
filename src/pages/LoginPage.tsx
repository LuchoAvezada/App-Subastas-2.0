import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, User, AlertCircle, ArrowRight, CheckCircle2, Zap, UserRound } from 'lucide-react';

export function LoginPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ci.trim()) {
      setError('Por favor ingrese su cédula o documento de identidad.');
      return;
    }

    if (!password) {
      setError('Por favor ingrese su contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(ci.trim(), password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Credenciales inválidas.');
      }
    } catch {
      setError('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F5F5F5] relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/brand/logo-agrotec.svg" alt="Agrotec S.A." className="h-14 w-auto" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-[#8A2733] mb-1">
            Portal de Subastas
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1C5A34] tracking-tight">
            Acceso para Colaboradores
          </h2>
          <p className="mt-1 text-sm text-[#6D6D6D]">
            Venta y adjudicación de activos informáticos
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-[#E4E4E4] shadow-none">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{error}</div>
              </div>
            )}

            <Input
              label="Cédula de Identidad (CI)"
              id="ci"
              type="text"
              autoComplete="username"
              required
              placeholder="Ej: 1234567"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Contraseña"
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              className="w-full shadow-md"
              size="lg"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-600">
              ¿Primera vez participando?{' '}
              <Link
                to="/registro"
                className="font-semibold text-agrotec-800 hover:text-agrotec-900 underline underline-offset-2"
              >
                Activar / Registrar mi cuenta
              </Link>
            </p>

            {/* Acceso de demostración: SOLO en desarrollo local.
                Se excluye del build de producción (import.meta.env.DEV === false),
                evitando un bypass de autenticación en producción. */}
            {import.meta.env.DEV && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Acceso de Demostración Local (solo dev)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const demoAdmin = {
                        id_usuario: 1,
                        id_colaborador: 1,
                        ci_documento: '1234567',
                        nombre: 'Juan Carlos Pérez (Admin)',
                        id_rol: 1,
                        es_admin: true,
                      };
                      localStorage.setItem('subasta_user', JSON.stringify(demoAdmin));
                      window.location.href = '/';
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-agrotec-800 bg-agrotec-50 hover:bg-agrotec-100 rounded-lg border border-agrotec-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
                  >
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const demoUser = {
                        id_usuario: 2,
                        id_colaborador: 2,
                        ci_documento: '2345678',
                        nombre: 'María Elena González',
                        id_rol: 2,
                        es_admin: false,
                      };
                      localStorage.setItem('subasta_user', JSON.stringify(demoUser));
                      window.location.href = '/';
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
                  >
                    <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
                    Usuario Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security / Help Note */}
        <div className="mt-6 text-center text-xs text-agrotec-200/80 max-w-sm mx-auto flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-agrotec-400 shrink-0" />
          <span>Acceso exclusivo para colaboradores habilitados.</span>
        </div>
      </div>
    </div>
  );
}
