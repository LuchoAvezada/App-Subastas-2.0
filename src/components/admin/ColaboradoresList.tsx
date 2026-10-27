import { useState, useEffect, useCallback } from 'react';
import { differenceInYears, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { useRpcSesion } from '../../hooks/useRpcSesion';
import { Modal } from '../ui/Modal';
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  CheckIcon,
  KeyIcon,
  LockIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  UploadSimpleIcon,
  UserPlusIcon,
  UsersIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { ColaboradorForm } from './ColaboradorForm';
import { ImportarColaboradoresCsv } from './ImportarColaboradoresCsv';
import type { DatosColaborador } from '../../types/domain';
import {
  filtrarColaboradores,
  ordenarColaboradores,
  type CampoOrden,
  type FiltrosColaborador,
} from '../../lib/colaboradores';

const FILTROS_VACIOS: FiltrosColaborador = { habilitado: '', usuario_registrado: '', id_rol: '', id_cargo: '' };

/** Filtros de la vista: las opciones y sus cantidades salen de la nómina cargada. */
const FILTROS: {
  campo: keyof FiltrosColaborador;
  titulo: string;
  todos: string;
  etiqueta: (c: DatosColaborador) => string;
}[] = [
  {
    campo: 'habilitado',
    titulo: 'Estado',
    todos: 'Todos los estados',
    etiqueta: (c) => (c.habilitado === 'SI' ? 'Habilitados' : 'Bloqueados'),
  },
  {
    campo: 'usuario_registrado',
    titulo: 'Cuenta',
    todos: 'Todas las cuentas',
    etiqueta: (c) => (c.usuario_registrado === 'REGISTRADO' ? 'Registrada' : 'Pendiente de registro'),
  },
  { campo: 'id_rol', titulo: 'Rol', todos: 'Todos los roles', etiqueta: (c) => c.rol ?? 'Sin rol' },
  { campo: 'id_cargo', titulo: 'Cargo', todos: 'Todos los cargos', etiqueta: (c) => c.cargo },
];

const COLUMNAS: { campo: CampoOrden; titulo: string; centrada?: boolean }[] = [
  { campo: 'ci_documento', titulo: 'Documento / CI' },
  { campo: 'nombre', titulo: 'Nombre Completo' },
  { campo: 'nivel_jerarquia', titulo: 'Cargo & Jerarquía' },
  { campo: 'fecha_ingreso', titulo: 'Ingreso' },
  { campo: 'usuario_registrado', titulo: 'Cuenta' },
  { campo: 'rol', titulo: 'Rol' },
  { campo: 'habilitado', titulo: 'Habilitado', centrada: true },
];

const ACCION_CLASS =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-agrotec-800 hover:bg-agrotec-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500';

type TipoAccion = 'bloquear' | 'desbloquear' | 'restablecer';

/** Acciones de cuenta (F12): todas piden confirmación antes de llamar al servidor. */
const ACCIONES: Record<
  TipoAccion,
  { titulo: string; aviso: string; exito: string; variant: 'danger' | 'primary' }
> = {
  bloquear: {
    titulo: 'Bloquear acceso',
    aviso:
      'No podrá iniciar sesión, sus sesiones abiertas se cerrarán y sus ofertas no contarán en la adjudicación mientras siga bloqueado.',
    exito: 'Acceso bloqueado',
    variant: 'danger',
  },
  desbloquear: {
    titulo: 'Desbloquear acceso',
    aviso: 'Podrá volver a iniciar sesión y ofertar, y sus ofertas vuelven a contar en la adjudicación.',
    exito: 'Acceso desbloqueado',
    variant: 'primary',
  },
  restablecer: {
    titulo: 'Restablecer contraseña',
    aviso:
      'Se borrará su cuenta y se cerrarán sus sesiones; sus datos, rol y ofertas no cambian. Para volver a entrar deberá registrarse de nuevo en "Activar / Registrar mi cuenta". Hágalo cuando la persona pueda registrarse en seguida: mientras tanto, cualquiera que conozca su CI podría registrarse antes.',
    exito: 'Contraseña restablecida: ya puede registrarse de nuevo',
    variant: 'danger',
  },
};

/** Opciones de un filtro con su cantidad, en orden alfabético. */
function opcionesDe(
  lista: DatosColaborador[],
  campo: keyof FiltrosColaborador,
  etiqueta: (c: DatosColaborador) => string
) {
  const conteo = new Map<string, { etiqueta: string; cantidad: number }>();
  for (const c of lista) {
    const valor = String(c[campo]);
    const opcion = conteo.get(valor) ?? { etiqueta: etiqueta(c), cantidad: 0 };
    opcion.cantidad++;
    conteo.set(valor, opcion);
  }
  return [...conteo]
    .map(([valor, o]) => ({ valor, ...o }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

/** Antigüedad a partir de la fecha de ingreso (DATE sin hora: no pasa por zona horaria). */
function antiguedad(fechaIngreso: string): string {
  const anios = differenceInYears(new Date(), parseISO(fechaIngreso));
  return anios < 1 ? 'Menos de 1 año' : `${anios} ${anios === 1 ? 'año' : 'años'}`;
}

export function ColaboradoresList() {
  const [colaboradores, setColaboradores] = useState<DatosColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<FiltrosColaborador>(FILTROS_VACIOS);
  const [orden, setOrden] = useState<{ campo: CampoOrden; asc: boolean }>({ campo: 'nombre', asc: true });
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editando, setEditando] = useState<DatosColaborador | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accion, setAccion] = useState<{ tipo: TipoAccion; colaborador: DatosColaborador } | null>(null);
  const [ejecutando, setEjecutando] = useState(false);

  const toast = useToast();
  const rpc = useRpcSesion();
  const { usuario } = useAuth();

  const fetchColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rpc<{ filas: DatosColaborador[] }>('leer_datos', { p_consulta: 'colaboradores' });

      if (!res.success) setLoadError(res.error || 'Error cargando colaboradores');
      else {
        setLoadError(null);
        setColaboradores(res.filas ?? []);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error cargando colaboradores');
    } finally {
      setLoading(false);
    }
  }, [rpc]);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  const ejecutarAccion = async () => {
    if (!accion) return;
    const { tipo, colaborador } = accion;
    setEjecutando(true);
    const res =
      tipo === 'restablecer'
        ? await rpc('restablecer_cuenta', { p_id_colaborador: colaborador.id_colaborador })
        : await rpc('habilitar_colaborador', {
            p_id_colaborador: colaborador.id_colaborador,
            p_habilitado: tipo === 'bloquear' ? 'NO' : 'SI',
          });
    setEjecutando(false);

    if (!res.success) {
      toast.error(res.error || 'No se pudo completar la acción.');
      return;
    }
    toast.success(ACCIONES[tipo].exito);
    setAccion(null);
    fetchColaboradores();
  };

  const visibles = ordenarColaboradores(
    filtrarColaboradores(colaboradores, searchTerm, filtros),
    orden.campo,
    orden.asc
  );
  const hayFiltros = searchTerm.trim() !== '' || Object.values(filtros).some(Boolean);
  const cargandoPrimeraVez = loading && colaboradores.length === 0;
  const resumen = [
    { titulo: 'Colaboradores', valor: colaboradores.length },
    { titulo: 'Habilitados', valor: colaboradores.filter((c) => c.habilitado === 'SI').length },
    {
      titulo: 'Con cuenta registrada',
      valor: colaboradores.filter((c) => c.usuario_registrado === 'REGISTRADO').length,
    },
    {
      titulo: 'Habilitados sin registrarse',
      valor: colaboradores.filter((c) => c.habilitado === 'SI' && c.usuario_registrado === 'PENDIENTE').length,
    },
  ];

  const ordenarPor = (campo: CampoOrden) =>
    setOrden((o) => ({ campo, asc: o.campo === campo ? !o.asc : true }));

  return (
    <div className="space-y-6">
      {/* Resumen de la nómina */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {resumen.map((r) => (
          <div key={r.titulo} className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 block">{r.titulo}</span>
            <span className="text-2xl font-black text-gray-900 mt-1 block">
              {cargandoPrimeraVez ? '—' : r.valor}
            </span>
          </div>
        ))}
      </div>

      {/* Búsqueda, filtros y acciones */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Buscar por nombre, CI, cargo o rol..."
              aria-label="Buscar colaboradores"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-[18px] h-[18px]" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchColaboradores}
              leftIcon={<ArrowsClockwiseIcon className="w-4 h-4" />}
            >
              Actualizar
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCsvModalOpen(true)}
              leftIcon={<UploadSimpleIcon className="w-4 h-4" />}
            >
              Importar CSV
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditando(null);
                setIsFormOpen(true);
              }}
              leftIcon={<UserPlusIcon className="w-4 h-4" />}
            >
              Nuevo Colaborador
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FILTROS.map((f) => (
            <div key={f.campo}>
              <label
                htmlFor={`filtro-${f.campo}`}
                className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
              >
                {f.titulo}
              </label>
              <select
                id={`filtro-${f.campo}`}
                value={filtros[f.campo] ?? ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, [f.campo]: e.target.value }))}
                className="w-full text-xs font-medium rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
              >
                <option value="">{f.todos}</option>
                {opcionesDe(colaboradores, f.campo, f.etiqueta).map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta} ({o.cantidad})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <span aria-live="polite">
            Mostrando <strong className="text-gray-900">{visibles.length}</strong> de {colaboradores.length}{' '}
            colaboradores
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFiltros(FILTROS_VACIOS);
              }}
              className="font-semibold text-agrotec-800 hover:text-agrotec-900 hover:underline cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loadError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <WarningCircleIcon className="w-[18px] h-[18px] text-red-500 shrink-0 mt-0.5" />
          <span>No se pudo cargar la nómina: {loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando colaboradores..." />
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
          <UsersIcon weight="light" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            {colaboradores.length ? 'Ningún colaborador coincide' : 'Aún no hay colaboradores cargados'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {colaboradores.length
              ? 'Pruebe con otra búsqueda o limpie los filtros.'
              : 'Registre uno nuevo o importe la nómina vía CSV.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  {COLUMNAS.map((col) => {
                    const activa = orden.campo === col.campo;
                    const Icono = !activa ? CaretUpDownIcon : orden.asc ? CaretUpIcon : CaretDownIcon;
                    return (
                      <th
                        key={col.campo}
                        scope="col"
                        aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : undefined}
                        className={`py-3.5 px-4 ${col.centrada ? 'text-center' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => ordenarPor(col.campo)}
                          className="inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer rounded hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
                        >
                          {col.titulo}
                          <Icono
                            className={`w-3.5 h-3.5 ${activa ? 'text-agrotec-800' : 'text-gray-400'}`}
                            aria-hidden="true"
                          />
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="py-3.5 px-4 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {visibles.map((c) => (
                  <tr key={c.id_colaborador} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-xs">
                      {c.ci_documento}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{c.nombre}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-800 text-xs">{c.cargo}</div>
                      <span className="text-[11px] text-gray-500">Nivel jerárquico: {c.nivel_jerarquia}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-mono text-gray-700">
                        {c.fecha_ingreso.split('-').reverse().join('/')}
                      </div>
                      <span className="text-[11px] text-gray-500">{antiguedad(c.fecha_ingreso)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.usuario_registrado === 'REGISTRADO' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckIcon className="w-3.5 h-3.5" /> Registrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-gray-600">{c.rol ?? 'Sin rol'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.habilitado === 'SI' ? 'bg-agrotec-100 text-agrotec-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {c.habilitado === 'SI' ? 'HABILITADO' : 'BLOQUEADO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditando(c);
                            setIsFormOpen(true);
                          }}
                          aria-label={`Editar a ${c.nombre}`}
                          title="Editar colaborador"
                          className={ACCION_CLASS}
                        >
                          <PencilSimpleIcon className="w-[18px] h-[18px]" aria-hidden="true" />
                        </button>
                        {/* Sobre la propia cuenta no se ofrecen: el servidor también las rechaza */}
                        {c.ci_documento !== usuario?.ci_documento && (
                          <>
                            <button
                              onClick={() =>
                                setAccion({ tipo: c.habilitado === 'SI' ? 'bloquear' : 'desbloquear', colaborador: c })
                              }
                              aria-label={`${c.habilitado === 'SI' ? 'Bloquear' : 'Desbloquear'} acceso de ${c.nombre}`}
                              title={c.habilitado === 'SI' ? 'Bloquear acceso' : 'Desbloquear acceso'}
                              className={ACCION_CLASS}
                            >
                              {c.habilitado === 'SI' ? (
                                <LockIcon className="w-[18px] h-[18px]" aria-hidden="true" />
                              ) : (
                                <LockOpenIcon className="w-[18px] h-[18px]" aria-hidden="true" />
                              )}
                            </button>
                            {c.usuario_registrado === 'REGISTRADO' && (
                              <button
                                onClick={() => setAccion({ tipo: 'restablecer', colaborador: c })}
                                aria-label={`Restablecer contraseña de ${c.nombre}`}
                                title="Restablecer contraseña"
                                className={ACCION_CLASS}
                              >
                                <KeyIcon className="w-[18px] h-[18px]" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importación CSV: se monta al abrir para leer la nómina en ese momento */}
      {isCsvModalOpen && (
        <ImportarColaboradoresCsv onClose={() => setIsCsvModalOpen(false)} onImportado={fetchColaboradores} />
      )}

      {/* Confirmación de bloqueo / desbloqueo / restablecer contraseña */}
      <Modal
        isOpen={accion !== null}
        onClose={() => !ejecutando && setAccion(null)}
        title={accion && ACCIONES[accion.tipo].titulo}
        size="sm"
      >
        {accion && (
          <div className="space-y-4">
            <p className="text-sm text-gray-800">
              <strong>{accion.colaborador.nombre}</strong>{' '}
              <span className="font-mono text-xs text-gray-500">(CI {accion.colaborador.ci_documento})</span>
            </p>
            <p className="text-sm text-gray-600">{ACCIONES[accion.tipo].aviso}</p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setAccion(null)} disabled={ejecutando}>
                Cancelar
              </Button>
              <Button variant={ACCIONES[accion.tipo].variant} onClick={ejecutarAccion} isLoading={ejecutando}>
                {ACCIONES[accion.tipo].titulo}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de alta / edición */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editando ? `Editar Colaborador #${editando.id_colaborador}` : 'Nuevo Colaborador'}
        description={
          editando
            ? 'Modifique los datos del colaborador.'
            : 'Registre un colaborador habilitado para participar de la subasta.'
        }
        size="lg"
      >
        <ColaboradorForm
          colaborador={editando}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchColaboradores();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
