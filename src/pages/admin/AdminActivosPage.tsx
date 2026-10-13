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
import { PackagePlus, Search, Edit3, Trash2, RefreshCw, Layers } from 'lucide-react';

export function AdminActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activoEditing, setActivoEditing] = useState<Activo | null>(null);

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

  const handleDelete = async (idActivo: number) => {
    if (!window.confirm(`¿Está seguro de eliminar el activo #${idActivo}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sub_activos')
        .delete()
        .eq('id_activo', idActivo);

      if (error) {
        toast.error(`No se pudo eliminar el activo: ${error.message}`);
      } else {
        toast.success(`Activo #${idActivo} eliminado exitosamente`);
        fetchActivos();
      }
    } catch {
      toast.error('Error al eliminar el activo');
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
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
                          onClick={() => handleDelete(a.id_activo)}
                          className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
