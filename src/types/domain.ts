// ═══════════════════════════════════════════════════════════════════════
// Domain Types — Business-layer types used throughout the app
// ═══════════════════════════════════════════════════════════════════════

/** Authenticated user session data */
export interface Usuario {
  id_usuario: number;
  id_colaborador: number;
  ci_documento: string;
  nombre: string;
  id_rol: number | null;
  es_admin: boolean;
  /** Token de sesión emitido por autenticar_usuario; las funciones de admin lo exigen. */
  token?: string;
}

/** Roles del sistema. Solo USUARIO participa de la subasta. */
export const ROL = { ADMINISTRADOR: 1, USUARIO: 2, VISITANTE: 3 } as const;

/** Solo el rol USUARIO puede ofertar (admins y visitantes quedan excluidos). */
export function puedeOfertar(usuario: Usuario | null | undefined): boolean {
  return usuario?.id_rol === ROL.USUARIO;
}

/** Category of assets */
export interface Categoria {
  id_categoria: number;
  tipo: string;
}

/** Category slug mapping for routing */
export type CategoriaSlug = 'tablets' | 'celulares' | 'notebooks' | 'otros';

export const CATEGORIA_MAP: Record<CategoriaSlug, { id: number; label: string }> = {
  tablets: { id: 1, label: 'Tablets' },
  celulares: { id: 2, label: 'Celulares' },
  notebooks: { id: 3, label: 'Notebooks' },
  otros: { id: 4, label: 'Otros' },
};

/** Asset (activo) in the auction */
export interface Activo {
  id_activo: number;
  id_categoria: number;
  marca: string | null;
  modelo: string | null;
  serialnumber: string | null;
  observacion: string | null;
  precio_base: number;
  estado: 'Disponible' | 'Cerrado' | 'Adjudicado';
  foto_url: string | null;
  fam: string | null;
}

/** Offer placed on an asset */
export interface Oferta {
  id_oferta: number;
  id_activo: number;
  id_colaborador: number;
  monto: number;
  fecha_hora: string;
}

/** Enriched offer from the view */
export interface OfertaRecibida {
  id_oferta: number;
  id_activo: number;
  marca: string | null;
  modelo: string | null;
  serialnumber: string | null;
  fam: string | null;
  categoria: string;
  precio_base: number;
  id_colaborador: number;
  nombre_colaborador: string;
  ci_documento: string;
  cargo: string;
  nivel_jerarquia: number;
  monto: number;
  fecha_hora_display: string;
  fecha_hora: string;
}

/** Auction result */
export interface ResultadoDetalle {
  id_resultado: number;
  id_activo: number;
  marca: string | null;
  modelo: string | null;
  serialnumber: string | null;
  fam: string | null;
  categoria: string;
  precio_base: number;
  id_colaborador_ganador: number;
  colaborador_ganador: string;
  ci_documento: string;
  monto_final: number;
  criterio_desempate: string;
  fecha_cierre_display: string;
  fecha_cierre: string;
  estado_adjudicacion?: 'Adjudicado' | 'Desistido' | 'Reasignado' | 'Desierto';
  motivo_desistimiento?: string | null;
}

/** Collaborator data from view */
export interface DatosColaborador {
  id_usuario: number | null;
  id_colaborador: number;
  ci_documento: string;
  nombre: string;
  fecha_ingreso: string;
  habilitado: string;
  cargo: string;
  nivel_jerarquia: number;
  rol: string | null;
  id_rol: number | null;
  usuario_registrado: string;
  id_cargo: number;
}

/** Cargo (job position/level) */
export interface Cargo {
  id_cargo: number;
  descripcion: string;
  nivel_jerarquia: number;
}

/** Rol */
export interface Rol {
  id_rol: number;
  descripcion: string;
  inactivo: number;
  observacion: string | null;
}

/** App configuration */
export interface AppConfig {
  id: number;
  fecha_fin_subasta: string | null;
  resultados_publicados?: boolean;
}

/** Generic RPC response */
export interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
}
