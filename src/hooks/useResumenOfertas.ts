import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EstadisticaActivo {
  montoLider: number;
  totalOfertas: number;
}

export function useResumenOfertas() {
  const [resumen, setResumen] = useState<Record<number, EstadisticaActivo>>({});
  const [loading, setLoading] = useState(true);

  const fetchResumen = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sub_ofertas')
        .select('id_activo, monto');

      if (!error && data) {
        const map: Record<number, EstadisticaActivo> = {};
        for (const row of data as { id_activo: number; monto: number }[]) {
          if (!map[row.id_activo]) {
            map[row.id_activo] = { montoLider: row.monto, totalOfertas: 1 };
          } else {
            map[row.id_activo].totalOfertas += 1;
            if (row.monto > map[row.id_activo].montoLider) {
              map[row.id_activo].montoLider = row.monto;
            }
          }
        }
        setResumen(map);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas de ofertas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  return { resumen, loading, refetchResumen: fetchResumen };
}
