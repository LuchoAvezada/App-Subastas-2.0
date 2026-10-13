import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Activo } from '../types/domain';

interface UseActivosOptions {
  idCategoria?: number;
  estado?: 'Disponible' | 'Cerrado' | 'Adjudicado' | 'Todos';
}

export function useActivos(options?: UseActivosOptions) {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idCategoria = options?.idCategoria;
  const estado = options?.estado;

  const fetchActivos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('sub_activos')
        .select('*')
        .order('id_activo', { ascending: true });

      if (idCategoria) {
        query = query.eq('id_categoria', idCategoria);
      }

      if (estado && estado !== 'Todos') {
        query = query.eq('estado', estado);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setActivos((data as Activo[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar activos');
    } finally {
      setLoading(false);
    }
  }, [idCategoria, estado]);

  useEffect(() => {
    fetchActivos();
  }, [fetchActivos]);

  return { activos, loading, error, refetch: fetchActivos };
}
