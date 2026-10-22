import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useRpcSesion } from '../../hooks/useRpcSesion';
import { ROL } from '../../types/domain';
import type { DatosColaborador } from '../../types/domain';
import { WarningCircleIcon } from '@phosphor-icons/react';

interface Cargo {
  id_cargo: number;
  descripcion: string;
  nivel_jerarquia: number;
}

// Los roles los define la app (id_rol = 1 es admin en autenticar_usuario),
// así que no hace falta consultarlos.
const ROLES = [
  { id: ROL.USUARIO, label: 'Usuario — participa de la subasta' },
  { id: ROL.ADMINISTRADOR, label: 'Administrador — no oferta' },
  { id: ROL.VISITANTE, label: 'Visitante — no oferta' },
];

interface Props {
  colaborador?: DatosColaborador | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const selectClass =
  'w-full rounded-lg border border-gray-300 py-2.5 px-3.5 text-sm bg-white font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500';

export function ColaboradorForm({ colaborador, onSuccess, onCancel }: Props) {
  const [ciDocumento, setCiDocumento] = useState(colaborador?.ci_documento || '');
  const [nombre, setNombre] = useState(colaborador?.nombre || '');
  const [fechaIngreso, setFechaIngreso] = useState(colaborador?.fecha_ingreso || '');
  const [habilitado, setHabilitado] = useState(colaborador?.habilitado || 'SI');
  const [idCargo, setIdCargo] = useState<number | ''>(colaborador?.id_cargo ?? '');
  const [idRol, setIdRol] = useState<number>(colaborador?.id_rol ?? ROL.USUARIO);

  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();
  const rpc = useRpcSesion();

  useEffect(() => {
    supabase
      .from('sub_cargos')
      .select('id_cargo, descripcion, nivel_jerarquia')
      .order('descripcion')
      .then(({ data, error: e }) => {
        if (e) setError(`No se pudieron cargar los cargos: ${e.message}`);
        else setCargos((data as Cargo[]) || []);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!idCargo) {
      setError('Seleccione un cargo.');
      return;
    }

    setSaving(true);
    // Sin id_colaborador en el alta: lo asigna la secuencia. La cédula repetida la informa el servidor.
    const res = await rpc('guardar_colaborador', {
      p_id_colaborador: colaborador?.id_colaborador ?? null,
      p_ci_documento: ciDocumento.trim(),
      p_nombre: nombre.trim(),
      p_fecha_ingreso: fechaIngreso,
      p_habilitado: habilitado,
      p_id_cargo: Number(idCargo),
      p_id_rol: idRol,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error || 'No se pudo guardar el colaborador.');
      return;
    }
    toast.success(colaborador ? 'Colaborador actualizado' : 'Colaborador registrado');
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <WarningCircleIcon className="w-[18px] h-[18px] text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Cédula de Identidad *"
          required
          placeholder="Ej: 4029825"
          value={ciDocumento}
          onChange={(e) => setCiDocumento(e.target.value)}
        />

        <Input
          label="Fecha de Ingreso *"
          type="date"
          required
          value={fechaIngreso}
          onChange={(e) => setFechaIngreso(e.target.value)}
          helperText="Se usa como criterio de desempate por antigüedad"
        />

        <div className="sm:col-span-2">
          <Input
            label="Nombre Completo *"
            required
            placeholder="Ej: María Elena González"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="colab-cargo"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            Cargo *
          </label>
          <select
            id="colab-cargo"
            required
            value={idCargo}
            onChange={(e) => setIdCargo(Number(e.target.value))}
            className={selectClass}
          >
            <option value="" disabled>
              {cargos.length ? 'Seleccione un cargo…' : 'Cargando cargos…'}
            </option>
            {cargos.map((c) => (
              <option key={c.id_cargo} value={c.id_cargo}>
                {c.descripcion} (nivel {c.nivel_jerarquia})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="colab-rol"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            Rol *
          </label>
          <select
            id="colab-rol"
            value={idRol}
            onChange={(e) => setIdRol(Number(e.target.value))}
            className={selectClass}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="colab-habilitado"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            Habilitado para participar
          </label>
          <select
            id="colab-habilitado"
            value={habilitado}
            onChange={(e) => setHabilitado(e.target.value)}
            className={selectClass}
          >
            <option value="SI">Sí — puede registrarse y ofertar</option>
            <option value="NO">No — acceso bloqueado</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          {colaborador ? 'Guardar Cambios' : 'Registrar Colaborador'}
        </Button>
      </div>
    </form>
  );
}
