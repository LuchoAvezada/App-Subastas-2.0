import { useState, useMemo } from 'react';
import { ActivoCard } from './ActivoCard';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { MagnifyingGlassIcon, StackIcon } from '@phosphor-icons/react';
import { useResumenOfertas } from '../../hooks/useResumenOfertas';
import type { Activo } from '../../types/domain';

interface CatalogoGridProps {
  activos: Activo[];
  loading: boolean;
  onRefresh?: () => void;
  categoryTitle?: string;
}

export function CatalogoGrid({ activos, loading, onRefresh, categoryTitle }: CatalogoGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { resumen, refetchResumen } = useResumenOfertas();

  const filtered = useMemo(() => {
    return activos.filter(
      (a) =>
        !searchTerm.trim() ||
        `${a.marca || ''} ${a.modelo || ''} ${a.serialnumber || ''} ${a.fam || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [activos, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por marca, modelo o S/N..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-[18px] h-[18px]" />}
          />
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-white border border-gray-200/80 p-4 flex flex-col justify-between animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3"></div>
              <div className="h-40 bg-gray-100 rounded-xl mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
              <div className="h-9 bg-gray-100 rounded-lg mt-4"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<StackIcon weight="light" className="w-12 h-12 text-gray-300" />}
          title="No se encontraron activos"
          description={
            searchTerm
              ? 'No hay activos que coincidan con los criterios de búsqueda ingresados.'
              : `No hay activos disponibles en el catálogo ${categoryTitle ? `de ${categoryTitle} ` : ''}actualmente.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((activo) => (
            <ActivoCard
              key={activo.id_activo}
              activo={activo}
              resumen={resumen[activo.id_activo]}
              onOfertaSuccess={() => {
                refetchResumen();
                onRefresh?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
