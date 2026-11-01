export interface VetoRegistro {
  id_activo: number;
  id_colaborador: number;
  marca?: string | null;
  modelo?: string | null;
  categoria?: string | null;
  monto_cancelado: number;
  fecha_cancelacion: string; // ISO string
}

const STORAGE_KEY_PREFIX = 'agrotec_subasta_vetos_';

/**
 * Obtiene la lista de vetos de un colaborador desde el almacenamiento persistente
 */
export function getVetosColaborador(idColaborador: number): VetoRegistro[] {
  if (!idColaborador) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${idColaborador}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Determina si un colaborador posee veto permanente de reincidencia en un activo (Principio P9)
 */
export function hasVetoColaborador(idColaborador: number, idActivo: number): boolean {
  if (!idColaborador || !idActivo) return false;
  const vetos = getVetosColaborador(idColaborador);
  return vetos.some((v) => v.id_activo === idActivo);
}

/**
 * Reemplaza el caché local con los vetos del servidor, que es quien los hace cumplir (sql/23).
 * Conserva los locales que el servidor no conoce: anulaciones previas a la migración 23.
 */
export function sincronizarVetos(idColaborador: number, delServidor: VetoRegistro[]): void {
  try {
    const enServidor = new Set(delServidor.map((v) => v.id_activo));
    const previos = getVetosColaborador(idColaborador).filter((v) => !enServidor.has(v.id_activo));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${idColaborador}`, JSON.stringify([...delServidor, ...previos]));
    window.dispatchEvent(new CustomEvent('agrotec_veto_registrado'));
  } catch (err) {
    console.error('Error al sincronizar vetos en almacenamiento local:', err);
  }
}

/**
 * Registra un veto irrevocable tras la cancelación voluntaria de una oferta
 */
export function registrarVeto(veto: VetoRegistro): void {
  try {
    const vetos = getVetosColaborador(veto.id_colaborador);
    if (!vetos.some((v) => v.id_activo === veto.id_activo)) {
      const actualizados = [veto, ...vetos];
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${veto.id_colaborador}`,
        JSON.stringify(actualizados)
      );
      window.dispatchEvent(new CustomEvent('agrotec_veto_registrado', { detail: veto }));
    }
  } catch (err) {
    console.error('Error al registrar veto en almacenamiento local:', err);
  }
}
