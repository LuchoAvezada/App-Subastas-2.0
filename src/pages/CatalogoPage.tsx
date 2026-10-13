import { useParams, Navigate } from 'react-router-dom';
import { useActivos } from '../hooks/useActivos';
import { CatalogoGrid } from '../components/activos/CatalogoGrid';
import { CATEGORIA_MAP, type CategoriaSlug } from '../types/domain';
import { RefreshCw, Tag } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function CatalogoPage() {
  const { categoria } = useParams<{ categoria: string }>();

  const catSlug = (categoria?.toLowerCase() || '') as CategoriaSlug;
  const catConfig = CATEGORIA_MAP[catSlug];

  // El hook debe llamarse incondicionalmente (rules-of-hooks); se pasa el id
  // de categoría o undefined si la ruta es inválida (justo antes de redirigir).
  const { activos, loading, refetch } = useActivos({
    idCategoria: catConfig?.id,
  });

  if (!catConfig) {
    return <Navigate to="/" replace />;
  }

  const disponiblesCount = activos.filter((a) => a.estado === 'Disponible').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 text-agrotec-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Catálogo Oficial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Categoría: {catConfig.label}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {disponiblesCount} {disponiblesCount === 1 ? 'activo disponible' : 'activos disponibles'} para ofertas en esta categoría
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Grid listing */}
      <CatalogoGrid
        activos={activos}
        loading={loading}
        onRefresh={refetch}
        categoryTitle={catConfig.label}
      />
    </div>
  );
}
