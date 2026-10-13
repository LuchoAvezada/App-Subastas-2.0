import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/auth-context-definition';

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
