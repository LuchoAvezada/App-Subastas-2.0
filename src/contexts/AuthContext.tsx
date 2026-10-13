import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types/domain';

const STORAGE_KEY = 'subasta_user';

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registrar: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Usuario;
        if (parsed.id_usuario && parsed.ci_documento) {
          setUsuario(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

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
        return { success: false, error: result.error || 'Error desconocido.' };
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
        : { success: false, error: result.error || 'Error desconocido.' };
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

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
