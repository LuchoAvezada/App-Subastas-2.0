import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ActivoForm } from '../../components/activos/ActivoForm';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EstadoBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { formatUSD } from '../../lib/utils';
import type { Activo } from '../../types/domain';
import { PackagePlus, Search, Edit3, Trash2, RefreshCw, Layers, Image as ImageIcon, AlertTriangle, AlertCircle } from 'lucide-react';

export function AdminActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activoEditing, setActivoEditing] = useState<Activo | null>(null);
  const [activoToDelete, setActivoToDelete] = useState<Activo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toast = useToast();

  const fetchActivos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sub_activos')
        .select('*')
        .order('id_activo', { ascending: true });

      if (!error) {
        setActivos((data as Activo[]) || []);
      }
    } catch (err) {
      console.error('Error al cargar activos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivos();
  }, [fetchActivos]);

  const handleEdit = (activo: Activo) => {
    setActivoEditing(activo);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setActivoEditing(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!activoToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Validar si ya existen ofertas para evitar errores de clave foránea y guiar al usuario
      const { count, error: countError } = await supabase
        .from('sub_ofertas')
        .select('*', { count: 'exact', head: true })
        .eq('id_activo', activoToDelete.id_activo);

      if (!countError && count && count > 0) {
        setDeleteError(
          `No se puede eliminar el activo #${activoToDelete.id_activo} porque ya cuenta con ${count} oferta(s) registrada(s). Para darlo de baja, puede cambiar su estado a 'Cerrado' o 'Adjudicado'.`
        );
        setIsDeleting(false);
        return;
      }

      // 2. Ejecutar la eliminación
      const { error: deleteResultError } = await supabase
        .from('sub_activos')
        .delete()
        .eq('id_activo', activoToDelete.id_activo);

      if (deleteResultError) {
        setDeleteError(`No se pudo eliminar el activo: ${deleteResultError.message}`);
        setIsDeleting(false);
        return;
      }

      toast.success(`Activo #${activoToDelete.id_activo} eliminado exitosamente`);
      setActivoToDelete(null);
      fetchActivos();
    } catch (err) {
      console.error('Error al eliminar activo:', err);
      setDeleteError('Ocurrió un error inesperado al intentar eliminar el activo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredActivos = activos.filter((a) => {
    const matchSearch =
      !searchTerm.trim() ||
      `${a.marca || ''} ${a.modelo || ''} ${a.serialnumber || ''} ${a.fam || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchCategoria =
      selectedCategoria === 'Todos' || String(a.id_categoria) === selectedCategoria;

    return matchSearch && matchCategoria;
  });

  const getCategoriaLabel = (id: number) => {
    switch (id) {
      case 1:
        return 'Tablets';
      case 2:
        return 'Celulares';
      case 3:
        return 'Notebooks';
      case 4:
        return 'Otros';
      default:
        return `Cat #${id}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Gestión de Inventario</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Activos de Subasta
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Carga y administración de equipos tecnológicos puestos a disposición
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivos}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNew}
            leftIcon={<PackagePlus className="w-4 h-4" />}
          >
            Nuevo Activo
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por marca, modelo, S/N..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-500">Categoría:</span>
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="text-xs font-medium rounded-lg border border-gray-300 py-2 px-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-agrotec-500"
          >
            <option value="Todos">Todas las categorías ({activos.length})</option>
            <option value="1">Tablets</option>
            <option value="2">Celulares</option>
            <option value="3">Notebooks</option>
            <option value="4">Otros</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200/80 flex justify-center">
          <Spinner size="lg" label="Cargando inventario de activos..." />
        </div>
      ) : filteredActivos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No se encontraron activos</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">No hay registros con los filtros actuales.</p>
          <Button variant="outline" size="sm" onClick={handleNew}>
            Registrar Primer Activo
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-3">Foto</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Marca y Modelo</th>
                  <th className="py-3.5 px-4">S/N & FAM</th>
                  <th className="py-3.5 px-4 text-right">Precio Base</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredActivos.map((a) => (
                  <tr key={a.id_activo} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-xs">
                      #{a.id_activo}
                    </td>
                    <td className="py-3.5 px-3">
                      {a.foto_url ? (
                        <img
                          src={a.foto_url}
                          alt={`${a.marca || ''} ${a.modelo || ''}`}
                          className="w-10 h-10 rounded-lg object-cover border border-[#E4E4E4] bg-white shadow-none"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200/80 flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8F0EB] text-[#1C5A34]">
                        {getCategoriaLabel(a.id_categoria)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">
                        {a.marca} {a.modelo}
                      </div>
                      {a.observacion && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{a.observacion}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      <div>{a.serialnumber || '—'}</div>
                      {a.fam && <span className="text-[10px] text-gray-400">FAM: {a.fam}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                      {formatUSD(a.precio_base)}
                    </td>
                    <td className="py-3.5 px-4">
                      <EstadoBadge estado={a.estado} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(a)}
                          className="p-1.5 text-gray-500 hover:text-agrotec-800 hover:bg-agrotec-50 rounded-lg transition-colors"
                          title="Editar activo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setActivoToDelete(a);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#8A2733] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar activo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activoEditing ? `Editar Activo #${activoEditing.id_activo}` : 'Registrar Nuevo Activo'}
        description="Complete los datos del activo y su fotografía para la subasta."
        size="lg"
      >
        <ActivoForm
          activoToEdit={activoEditing}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchActivos();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Modal de Confirmación para Eliminar Activo */}
      <Modal
        isOpen={Boolean(activoToDelete)}
        onClose={() => {
          if (!isDeleting) {
            setActivoToDelete(null);
            setDeleteError(null);
          }
        }}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-[#8A2733] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                ¿Eliminar Activo #{activoToDelete?.id_activo}?
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Esta acción eliminará el registro del equipo de forma permanente.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{deleteError}</div>
            </div>
          )}

          {activoToDelete && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              {activoToDelete.foto_url ? (
                <img
                  src={activoToDelete.foto_url}
                  alt={`${activoToDelete.marca || ''} ${activoToDelete.modelo || ''}`}
                  className="w-12 h-12 rounded-lg object-cover border border-[#E4E4E4] bg-white shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200/80 border border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {activoToDelete.marca} {activoToDelete.modelo}
                </div>
                <div className="text-xs text-gray-500 font-mono truncate">
                  S/N: {activoToDelete.serialnumber || 'Sin S/N'} • Base: {formatUSD(activoToDelete.precio_base)}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setActivoToDelete(null);
                setDeleteError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleConfirmDelete}
            >
              Sí, Eliminar Activo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
