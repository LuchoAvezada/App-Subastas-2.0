import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { validatePassword } from '../lib/utils';
import { Lock, User, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export function RegistroPage() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { registrar } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCi = ci.trim();
    if (!trimmedCi) {
      setError('Por favor ingrese su cédula o documento de identidad.');
      return;
    }

    const validationError = validatePassword(password, trimmedCi);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await registrar(trimmedCi, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(res.error || 'No se pudo completar el registro.');
      }
    } catch {
      setError('Error al comunicarse con el servidor.');
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
            Activar Cuenta
          </h2>
          <p className="mt-1 text-sm text-[#6D6D6D]">
            Registro inicial para colaboradores de Agrotec S.A.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-[#E4E4E4] shadow-none">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-[#E8F0EB] text-[#1C5A34] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-[#1C5A34]">
                ¡Cuenta registrada con éxito!
              </h3>
              <p className="text-sm text-[#6D6D6D] leading-relaxed">
                Su usuario ha sido creado correctamente. En breves segundos será redirigido a la pantalla de inicio de sesión...
              </p>
              <Link to="/login" className="inline-block mt-4">
                <Button variant="primary">
                  Ir al Login ahora
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
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
                helperText="Debe coincidir con su documento registrado en RRHH"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Nueva Contraseña"
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Mínimo 8 caracteres"
                helperText="Debe incluir mayúscula, minúscula y número"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Input
                label="Confirmar Contraseña"
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Repita su contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button
                type="submit"
                className="w-full shadow-none mt-2"
                size="lg"
                isLoading={loading}
              >
                Crear Mi Usuario
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-[#E4E4E4] pt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C5A34] hover:text-[#154728] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Iniciar Sesión</span>
            </Link>
          </div>
        </div>

        {/* Security / Help Note */}
        <div className="mt-6 text-center text-xs text-[#6D6D6D] max-w-sm mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1C5A34] shrink-0" />
          <span>Acceso exclusivo para colaboradores habilitados.</span>
        </div>
      </div>
    </div>
  );
}
