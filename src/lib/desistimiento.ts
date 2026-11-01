/**
 * Módulo de Gobernanza y Desistimiento F07 — Subasta Interna Agrotec S.A.
 * 1. Control de acceso condicional a resultados (publicación oficial por administración).
 * 2. Motor de reasignación automática por desistimiento respetando topes de equidad.
 */

import type {
  ResultadoAdjudicacion,
  OfertaInput,
  ColaboradorInput,
  CargoInput,
  ActivoInput,
} from './adjudicacion';
import type { Usuario } from '../types/domain';

export type EstadoAdjudicacion = 'Adjudicado' | 'Desistido' | 'Reasignado' | 'Desierto';

export interface ReasignacionInput {
  idActivo: number;
  motivo: string;
  resultadosActuales: ResultadoAdjudicacion[];
  ofertas: OfertaInput[];
  colaboradores: ColaboradorInput[];
  cargos: CargoInput[];
  activos: ActivoInput[];
  /** Colaboradores que ya desistieron antes de este activo: no pueden volver a ganarlo. */
  desistidos?: number[];
}

export interface ResultadoReasignado {
  id_activo: number;
  estado_adjudicacion: EstadoAdjudicacion;
  id_colaborador_ganador: number | null;
  monto_final: number;
  criterio_desempate: string;
  motivo_desistimiento: string;
}

/**
 * Determina si el usuario actual tiene permisos para consultar los resultados finales.
 * - Administradores: SIEMPRE pueden ver los resultados (modo vista previa o público).
 * - Usuarios y Visitantes: Solo pueden ver los resultados si han sido publicados oficialmente.
 */
export function puedeVerResultados(
  usuario: Usuario | null | undefined,
  resultadosPublicados: boolean
): boolean {
  if (usuario?.es_admin) {
    return true;
  }
  return Boolean(resultadosPublicados);
}

/**
 * Calcula la reasignación automática de un activo tras el desistimiento del ganador previo.
 * Respeta el principio de equidad: ningún colaborador puede superar el tope de 1 por categoría.
 */
export function calcularReasignacion(input: ReasignacionInput): ResultadoReasignado {
  const { idActivo, motivo, resultadosActuales, ofertas, colaboradores, cargos, activos, desistidos = [] } = input;

  // 1. Identificar el activo y su categoría
  const activo = activos.find((a) => a.id_activo === idActivo);
  const idCategoria = activo?.id_categoria ?? 0;

  // 2. Identificar el ganador actual que desiste
  const resultadoActual = resultadosActuales.find((r) => r.id_activo === idActivo);
  const idColaboradorDesistente = resultadoActual?.id_colaborador_ganador;
  if (!idColaboradorDesistente) {
    throw new Error(`El activo ${idActivo} no tiene ganador que pueda desistir.`);
  }

  // Excluidos de este activo: todos los que ya desistieron, incluido el ganador actual
  const excluidos = new Set<number>([...desistidos, idColaboradorDesistente]);

  // 3. Obtener el conjunto de colaboradores que ya tienen ganado un activo en esta categoría
  const colaboradoresConTopeEnCategoria = new Set<number>();
  resultadosActuales.forEach((r) => {
    if (r.id_activo !== idActivo && r.id_colaborador_ganador) {
      const act = activos.find((a) => a.id_activo === r.id_activo);
      if (act && act.id_categoria === idCategoria) {
        colaboradoresConTopeEnCategoria.add(r.id_colaborador_ganador);
      }
    }
  });

  // 4. Mapas auxiliares de colaboradores y cargos
  const cargoMap = new Map<number, number>();
  cargos.forEach((c) => cargoMap.set(c.id_cargo, c.nivel_jerarquia));

  const colaboradorMap = new Map<number, ColaboradorInput>();
  colaboradores.forEach((c) => {
    if (c.habilitado === 'SI' && c.id_rol === 2) {
      colaboradorMap.set(c.id_colaborador, c);
    }
  });

  // 5. Filtrar ofertas elegibles para este activo descartando al que desistió y a quienes ya tienen tope
  const ofertasActivo = ofertas.filter((o) => o.id_activo === idActivo);
  const candidatosValidos = ofertasActivo
    .filter((o) => {
      if (excluidos.has(o.id_colaborador)) return false;
      if (colaboradoresConTopeEnCategoria.has(o.id_colaborador)) return false;
      return colaboradorMap.has(o.id_colaborador);
    })
    .map((o) => {
      const colab = colaboradorMap.get(o.id_colaborador)!;
      return {
        id_oferta: o.id_oferta,
        id_activo: o.id_activo,
        id_colaborador: o.id_colaborador,
        monto: o.monto,
        fecha_hora: o.fecha_hora,
        nivel_jerarquia: cargoMap.get(colab.id_cargo) ?? 99,
        fecha_ingreso: colab.fecha_ingreso,
      };
    });

  // 6. Ordenar por mérito estricto
  candidatosValidos.sort((a, b) => {
    if (b.monto !== a.monto) return b.monto - a.monto;
    if (a.nivel_jerarquia !== b.nivel_jerarquia) return a.nivel_jerarquia - b.nivel_jerarquia;
    const tA = new Date(a.fecha_ingreso).getTime();
    const tB = new Date(b.fecha_ingreso).getTime();
    if (tA !== tB) return tA - tB;
    const fA = new Date(a.fecha_hora).getTime();
    const fB = new Date(b.fecha_hora).getTime();
    if (fA !== fB) return fA - fB;
    return a.id_oferta - b.id_oferta;
  });

  // 7. Si hay candidato elegible, reasignar
  if (candidatosValidos.length > 0) {
    const nuevoGanador = candidatosValidos[0];
    return {
      id_activo: idActivo,
      estado_adjudicacion: 'Reasignado',
      id_colaborador_ganador: nuevoGanador.id_colaborador,
      monto_final: nuevoGanador.monto,
      // 1 desistimiento → 2º postor, 2 → 3º, ... (igual que la función SQL)
      criterio_desempate: `REASIGNADO POR DESISTIMIENTO (${excluidos.size + 1}º POSTOR)`,
      motivo_desistimiento: motivo,
    };
  }

  // 8. Si no hay postores restantes elegibles, el activo queda desierto
  return {
    id_activo: idActivo,
    estado_adjudicacion: 'Desierto',
    id_colaborador_ganador: null,
    monto_final: 0,
    criterio_desempate: 'DESIERTO TRAS DESISTIMIENTO',
    motivo_desistimiento: motivo,
  };
}
