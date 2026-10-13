import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface OfertaPublicaRaw {
  id_activo: number;
  monto: number;
}

export interface EstadisticaActivo {
  montoLider: number;
  totalOfertas: number;
}

export function calcularResumenOfertas(
  ofertas: Array<{ id_activo: number; monto: number | string }>
): Record<number, EstadisticaActivo> {
  const map: Record<number, EstadisticaActivo> = {};

  for (const row of ofertas) {
    const idActivo = Number(row.id_activo);
    const monto = Number(row.monto);

    if (isNaN(idActivo) || isNaN(monto)) continue;

    if (!map[idActivo]) {
      map[idActivo] = { montoLider: monto, totalOfertas: 1 };
    } else {
      map[idActivo].totalOfertas += 1;
      if (monto > map[idActivo].montoLider) {
        map[idActivo].montoLider = monto;
      }
    }
  }

  return map;
}

export function useResumenOfertas() {
  const [resumen, setResumen] = useState<Record<number, EstadisticaActivo>>({});
  const [loading, setLoading] = useState(true);

  const fetchResumen = useCallback(async () => {
    try {
      // Consultamos sub_v_ofertas_recibidas que tiene permisos accesibles para roles del sistema
      // Principio P9: Solo seleccionamos id_activo y monto, garantizando anonimato absoluto
      let { data, error } = await supabase
        .from('sub_v_ofertas_recibidas')
        .select('id_activo, monto');

      // Fallback por si la vista no estuviese disponible
      if (error || !data) {
        const fallbackRes = await supabase
          .from('sub_ofertas')
          .select('id_activo, monto');
        if (!fallbackRes.error && fallbackRes.data) {
          data = fallbackRes.data;
          error = null;
        }
      }

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
