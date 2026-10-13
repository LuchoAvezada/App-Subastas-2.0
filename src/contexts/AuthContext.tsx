import { useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types/domain';
import { AuthContext, STORAGE_KEY } from './auth-context-definition';

function getInitialUser(): Usuario | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Usuario;
      if (parsed.id_usuario && parsed.ci_documento) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(getInitialUser);
  const [loading] = useState(false);

  const login = useCallback(async (ci: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('autenticar_usuario', {
        p_ci_documento: ci.trim(),
        p_password: password,
      });

      if (error) {
        console.error('Login RPC error:', error);
        return { success: false, error: 'Error de conexión con el servidor.' };
      }

      const result = data as unknown as {
        success: boolean;
        error?: string;
        data?: Usuario;
      };

      if (!result.success) {
        return { success: false, error: result.error || 'Credenciales inválidas.' };
      }

      if (result.data) {
        setUsuario(result.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      }

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Error de conexión.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const registrar = useCallback(async (ci: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('registrar_nuevo_usuario', {
        p_ci_documento: ci.trim(),
        p_password: password,
      });

      if (error) {
        console.error('Register RPC error:', error);
        return { success: false, error: 'Error de conexión con el servidor.' };
      }

      const result = data as unknown as {
        success: boolean;
        error?: string;
        message?: string;
      };

      return result.success
        ? { success: true }
        : { success: false, error: result.error || 'No se pudo completar el registro.' };
    } catch (err) {
      console.error('Register error:', err);
      return { success: false, error: 'Error de conexión.' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, registrar }}>
      {children}
    </AuthContext.Provider>
  );
}
