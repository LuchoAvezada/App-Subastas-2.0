import { createContext } from 'react';
import type { Usuario } from '../types/domain';

export const STORAGE_KEY = 'subasta_user';

export interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registrar: (ci: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
