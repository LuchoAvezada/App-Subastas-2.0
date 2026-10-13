import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { OfertaRecibida, RpcResponse } from '../types/domain';

export function useOfertas() {
  const { usuario } = useAuth();
  const [misOfertas, setMisOfertas] = useState<OfertaRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMisOfertas = useCallback(async () => {
    if (!usuario) {
      setMisOfertas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('sub_v_ofertas_recibidas')
        .select('*')
        .eq('id_colaborador', usuario.id_colaborador)
        .order('fecha_hora', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMisOfertas((data as OfertaRecibida[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ofertas');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    fetchMisOfertas();
  }, [fetchMisOfertas]);

  /**
   * Enviar oferta mediante la función RPC segura registrar_oferta
   */
  const enviarOferta = async (idActivo: number, monto: number): Promise<RpcResponse> => {
    if (!usuario) {
      return { success: false, error: 'Debe iniciar sesión para ofertar.' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('registrar_oferta', {
        p_id_activo: idActivo,
        p_ci_documento: usuario.ci_documento,
        p_monto: monto,
      });

      if (rpcError) {
        return { success: false, error: rpcError.message };
      }

      const response = data as unknown as RpcResponse;
      if (response.success) {
        await fetchMisOfertas();
      }
      return response;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error de conexión al enviar la oferta.',
      };
    }
  };

  return {
    misOfertas,
    loading,
    error,
    refetch: fetchMisOfertas,
    enviarOferta,
  };
}
