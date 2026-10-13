import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Search, Upload, RefreshCw, Check, Users, AlertCircle, UserPlus, Pencil } from 'lucide-react';
import { ColaboradorForm } from './ColaboradorForm';
import type { DatosColaborador } from '../../types/domain';
import Papa from 'papaparse';

export function ColaboradoresList() {
  const [colaboradores, setColaboradores] = useState<DatosColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editando, setEditando] = useState<DatosColaborador | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const toast = useToast();

  const fetchColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sub_v_datos_colaborador')
        .select('*')
        .order('id_colaborador', { ascending: true });

      if (error) setLoadError(error.message);
      else {
        setLoadError(null);
        setColaboradores((data as DatosColaborador[]) || []);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error cargando colaboradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  const toggleHabilitado = async (idColaborador: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'SI' ? 'NO' : 'SI';
    try {
      const { error } = await supabase
        .from('sub_colaboradores')
        .update({ habilitado: nuevoEstado })
        .eq('id_colaborador', idColaborador);

      if (error) {
        toast.error(`Error al actualizar colaborador: ${error.message}`);
      } else {
        toast.success(`Colaborador ${nuevoEstado === 'SI' ? 'habilitado' : 'deshabilitado'}`);
        fetchColaboradores();
      }
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          if (rows.length === 0) {
            setCsvError('El archivo CSV está vacío.');
            setCsvLoading(false);
            return;
          }

          // Format rows according to schema: ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol
          const insertPayload = rows.map((r) => ({
            ci_documento: String(r['ci_documento'] || r['CI'] || r['DOCUMENTO']).trim(),
            nombre: String(r['nombre'] || r['NOMBRE']).trim(),
            fecha_ingreso: String(r['fecha_ingreso'] || r['FECHA_INGRESO'] || '2024-01-01').trim(),
            habilitado: (r['habilitado'] || r['HABILITADO'] || 'SI').toUpperCase() === 'NO' ? 'NO' : 'SI',
            id_cargo: parseInt(r['id_cargo'] || r['ID_CARGO'] || '7', 10),
            id_rol: r['id_rol'] || r['ID_ROL'] ? parseInt(r['id_rol'] || r['ID_ROL'], 10) : 2,
          }));

          const { error: upsertError } = await supabase
            .from('sub_colaboradores')
            .upsert(insertPayload, { onConflict: 'ci_documento' });

          if (upsertError) {
            throw upsertError;
          }

          toast.success(`¡Se procesaron e importaron ${insertPayload.length} colaboradores!`);
          setIsCsvModalOpen(false);
          fetchColaboradores();
        } catch (err) {
          console.error('Error importando CSV:', err);
          setCsvError(err instanceof Error ? err.message : 'Error al importar datos del CSV.');
        } finally {
          setCsvLoading(false);
        }
      },
      error: (err) => {
        setCsvError(`Error de lectura del archivo: ${err.message}`);
        setCsvLoading(false);
      },
    });
  };

  const filtered = colaboradores.filter((c) => {
    return (
      !searchTerm.trim() ||
      `${c.nombre} ${c.ci_documento} ${c.cargo} ${c.rol || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nombre o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchColaboradores}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCsvModalOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
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
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Nuevo Colaborador
          </Button>
        </div>
      </div>

      {/* Table */}
      {loadError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>No se pudo cargar la nómina: {loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando colaboradores..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No se encontraron colaboradores</h3>
          <p className="text-xs text-gray-500 mt-1">Pruebe ajustando el término de búsqueda o importe la nómina vía CSV.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Documento / CI</th>
                  <th className="py-3.5 px-4">Nombre Completo</th>
                  <th className="py-3.5 px-4">Cargo & Jerarquía</th>
                  <th className="py-3.5 px-4">Antigüedad</th>
                  <th className="py-3.5 px-4">Cuenta</th>
                  <th className="py-3.5 px-4">Rol</th>
                  <th className="py-3.5 px-4 text-center">Habilitado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.map((c) => (
                  <tr key={c.id_colaborador} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-xs">
                      {c.ci_documento}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{c.nombre}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-800 text-xs">{c.cargo}</div>
                      <span className="text-[10px] text-gray-400">Nivel Jerárquico: {c.nivel_jerarquia}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-500">
                      {c.fecha_ingreso}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.usuario_registrado === 'REGISTRADO' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3" /> Registrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-gray-600">
                        {c.rol || 'Usuario'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleHabilitado(c.id_colaborador, c.habilitado)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          c.habilitado === 'SI'
                            ? 'bg-agrotec-100 text-agrotec-800 hover:bg-agrotec-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Haga clic para alternar habilitación"
                      >
                        {c.habilitado === 'SI' ? 'HABILITADO' : 'INACTIVO'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditando(c);
                          setIsFormOpen(true);
                        }}
                        aria-label={`Editar a ${c.nombre}`}
                        title="Editar colaborador"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-agrotec-800 hover:bg-agrotec-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para importación CSV */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Importar Colaboradores desde CSV"
        description="Suba un archivo CSV con columnas: ci_documento, nombre, fecha_ingreso, id_cargo, id_rol, habilitado"
        size="md"
      >
        <div className="space-y-4">
          {csvError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{csvError}</span>
            </div>
          )}

          <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center">
            <input
              type="file"
              accept=".csv"
              disabled={csvLoading}
              onChange={handleCsvUpload}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-agrotec-800 file:text-white hover:file:bg-agrotec-900 cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Las filas con cédulas ya existentes actualizarán los datos (upsert), preservando los accesos y contraseñas creadas previamente.
          </p>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsCsvModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
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
