import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/** Fila de sub_v_resumen_ofertas: una por activo, sin postor (P9). */
export interface ResumenOfertaRaw {
  id_activo: number;
  total_ofertas: number;
  monto_lider: number;
}

export interface EstadisticaActivo {
  montoLider: number;
  totalOfertas: number;
}

export function calcularResumenOfertas(
  filas: Array<{ id_activo: number; total_ofertas: number | string; monto_lider: number | string }>
): Record<number, EstadisticaActivo> {
  const map: Record<number, EstadisticaActivo> = {};

  for (const row of filas) {
    const idActivo = Number(row.id_activo);
    const montoLider = Number(row.monto_lider);
    const totalOfertas = Number(row.total_ofertas);

    if (isNaN(idActivo) || isNaN(montoLider) || isNaN(totalOfertas)) continue;
    map[idActivo] = { montoLider, totalOfertas };
  }

  return map;
}

export function useResumenOfertas() {
  const [resumen, setResumen] = useState<Record<number, EstadisticaActivo>>({});
  const [loading, setLoading] = useState(true);

  const fetchResumen = useCallback(async () => {
    try {
      // Principio P9: la vista pública solo trae cantidad y monto líder por activo (F10)
      const { data, error } = await supabase
        .from('sub_v_resumen_ofertas')
        .select('id_activo, total_ofertas, monto_lider');

      if (!error && data) {
        const mapaCalculado = calcularResumenOfertas(data);
        setResumen(mapaCalculado);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas de ofertas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumen();

    // Actualización reactiva periódica y al reenfocar pestaña
    const interval = setInterval(fetchResumen, 6000);
    const handleFocus = () => fetchResumen();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchResumen]);

  return { resumen, loading, refetchResumen: fetchResumen };
}
