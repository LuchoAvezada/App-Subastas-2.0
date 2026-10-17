/**
 * Módulo de Adjudicación Oficial F06 — Subasta Interna Agrotec S.A.
 * Implementa el algoritmo determinístico con:
 * 1. Prelación de postores (Monto DESC -> Jerarquía ASC -> Antigüedad ASC -> Fecha Oferta ASC).
 * 2. Tope de equidad: Máximo 1 activo por categoría por colaborador (Q-03).
 * 3. Reasignación en cascada para colisiones en la misma categoría.
 */

export interface OfertaInput {
  id_oferta: number;
  id_activo: number;
  id_colaborador: number;
  monto: number;
  fecha_hora: string;
}

export interface ColaboradorInput {
  id_colaborador: number;
  nombre: string;
  ci_documento: string;
  id_cargo: number;
  id_rol: number;
  habilitado: 'SI' | 'NO' | string;
  fecha_ingreso: string;
}

export interface CargoInput {
  id_cargo: number;
  nivel_jerarquia: number;
  descripcion?: string;
}

export interface ActivoInput {
  id_activo: number;
  id_categoria: number;
  marca?: string;
  modelo?: string;
  estado: string;
}

export type CriterioDesempate =
  | 'GANADO POR OFERTA MAS ALTA'
  | 'GANADO POR JERARQUIA'
  | 'GANADO POR ANTIGUEDAD'
  | 'GANADO POR REGISTRO DE OFERTA';

export interface ResultadoAdjudicacion {
  id_activo: number;
  id_colaborador_ganador: number;
  monto_final: number;
  criterio_desempate: CriterioDesempate;
}

interface PostorEnriquecido {
  id_oferta: number;
  id_activo: number;
  id_colaborador: number;
  monto: number;
  fecha_hora: string;
  nivel_jerarquia: number;
  fecha_ingreso: string;
}

/**
 * Función de comparación para ordenar postores en orden de mérito decreciente.
 */
function compararPostores(a: PostorEnriquecido, b: PostorEnriquecido): number {
  // 1. Mayor monto
  if (b.monto !== a.monto) {
    return b.monto - a.monto;
  }
  // 2. Menor nivel de jerarquía (mayor rango institucional)
  if (a.nivel_jerarquia !== b.nivel_jerarquia) {
    return a.nivel_jerarquia - b.nivel_jerarquia;
  }
  // 3. Menor fecha de ingreso (mayor antigüedad)
  const fechaIngresoA = new Date(a.fecha_ingreso).getTime();
  const fechaIngresoB = new Date(b.fecha_ingreso).getTime();
  if (fechaIngresoA !== fechaIngresoB) {
    return fechaIngresoA - fechaIngresoB;
  }
  // 4. Registro de oferta más temprano
  const fechaOfertaA = new Date(a.fecha_hora).getTime();
  const fechaOfertaB = new Date(b.fecha_hora).getTime();
  if (fechaOfertaA !== fechaOfertaB) {
    return fechaOfertaA - fechaOfertaB;
  }
  // 5. ID de oferta
  return a.id_oferta - b.id_oferta;
}

/**
 * Determina el criterio formal de adjudicación comparando el ganador con el segundo postor.
 */
function clasificarCriterio(ganador: PostorEnriquecido, segundo?: PostorEnriquecido): CriterioDesempate {
  if (!segundo) {
    return 'GANADO POR OFERTA MAS ALTA';
  }

  if (ganador.monto > segundo.monto) {
    return 'GANADO POR OFERTA MAS ALTA';
  }

  if (ganador.nivel_jerarquia < segundo.nivel_jerarquia) {
    return 'GANADO POR JERARQUIA';
  }

  const ingresoGanador = new Date(ganador.fecha_ingreso).getTime();
  const ingresoSegundo = new Date(segundo.fecha_ingreso).getTime();
  if (ingresoGanador < ingresoSegundo) {
    return 'GANADO POR ANTIGUEDAD';
  }

  return 'GANADO POR REGISTRO DE OFERTA';
}

/**
 * Procesa la adjudicación global de activos aplicando todas las reglas de negocio.
 */
export function procesarAdjudicacion(
  ofertas: OfertaInput[],
  colaboradores: ColaboradorInput[],
  cargos: CargoInput[],
  activos: ActivoInput[]
): ResultadoAdjudicacion[] {
  // 1. Mapas auxiliares para búsqueda O(1)
  const cargoMap = new Map<number, number>();
  cargos.forEach((c) => cargoMap.set(c.id_cargo, c.nivel_jerarquia));

  const colaboradorMap = new Map<number, ColaboradorInput>();
  colaboradores.forEach((c) => {
    // Solo colaboradores habilitados con id_rol = 2 (Usuario) son elegibles
    if (c.habilitado === 'SI' && c.id_rol === 2) {
      colaboradorMap.set(c.id_colaborador, c);
    }
  });

  // 2. Filtrar activos disponibles
  const activosDisponibles = activos.filter((a) => a.estado === 'Disponible');

  // 3. Agrupar activos por categoría
  const categoriasMap = new Map<number, ActivoInput[]>();
  activosDisponibles.forEach((a) => {
    const list = categoriasMap.get(a.id_categoria) || [];
    list.push(a);
    categoriasMap.set(a.id_categoria, list);
  });

  const resultadosTotales: ResultadoAdjudicacion[] = [];

  // 4. Procesar categoría por categoría de forma independiente (Tope = 1 por categoría)
  for (const [, activosEnCategoria] of categoriasMap.entries()) {
    // Para cada activo, obtener y ordenar sus postores enriquecidos
    const postoresPorActivo = new Map<number, PostorEnriquecido[]>();

    activosEnCategoria.forEach((activo) => {
      const ofertasActivo = ofertas.filter((o) => o.id_activo === activo.id_activo);
      const postoresValidos: PostorEnriquecido[] = [];

      ofertasActivo.forEach((o) => {
        const colab = colaboradorMap.get(o.id_colaborador);
        if (colab) {
          const nivel = cargoMap.get(colab.id_cargo) ?? 99;
          postoresValidos.push({
            id_oferta: o.id_oferta,
            id_activo: o.id_activo,
            id_colaborador: o.id_colaborador,
            monto: o.monto,
            fecha_hora: o.fecha_hora,
            nivel_jerarquia: nivel,
            fecha_ingreso: colab.fecha_ingreso,
          });
        }
      });

      // Ordenar por orden de mérito
      postoresValidos.sort(compararPostores);
      postoresPorActivo.set(activo.id_activo, postoresValidos);
    });

    // Resolución iterativa de colisiones con tope = 1 por colaborador en esta categoría
    const ganadoresCategoria = new Map<number, PostorEnriquecido>(); // id_activo -> PostorEnriquecido
    const colaboradoresAsignados = new Set<number>(); // id_colaborador

    // Activos pendientes de asignar en esta categoría
    const activosPendientesIds = new Set<number>(activosEnCategoria.map((a) => a.id_activo));

    let hayCambios = true;
    while (hayCambios && activosPendientesIds.size > 0) {
      hayCambios = false;

      // Paso A: Determinar el postor líder tentativo para cada activo pendiente
      const postoresTentativos = new Map<number, PostorEnriquecido>(); // id_activo -> PostorEnriquecido
      // Para saber qué colaboradores lideran en qué activos
      const activosLideradosPorColab = new Map<number, number[]>(); // id_colaborador -> id_activo[]

      for (const idActivo of activosPendientesIds) {
        const postores = postoresPorActivo.get(idActivo) || [];
        // Buscar el primer postor que aún no haya alcanzado el tope en esta categoría
        const postorElegible = postores.find((p) => !colaboradoresAsignados.has(p.id_colaborador));

        if (postorElegible) {
          postoresTentativos.set(idActivo, postorElegible);
          const activosList = activosLideradosPorColab.get(postorElegible.id_colaborador) || [];
          activosList.push(idActivo);
          activosLideradosPorColab.set(postorElegible.id_colaborador, activosList);
        }
      }

      // Paso B: Evaluar si hay conflictos o si se pueden fijar ganadores
      if (postoresTentativos.size === 0) {
        // Ningún activo pendiente tiene postores elegibles restantes
        break;
      }

      // Buscar si algún colaborador lidera en 2 o más activos
      let huboConflicto = false;

      for (const [idColab, listaActivos] of activosLideradosPorColab.entries()) {
        if (listaActivos.length > 1) {
          huboConflicto = true;
          // Colisión de tope: el colaborador lidera varios activos de la misma categoría.
          // Regla: se le adjudica aquel activo donde su postura represente MAYOR monto.
          // Ante empate de monto, menor id_activo.
          let mejorActivoId = listaActivos[0];
          let mejorOferta = postoresTentativos.get(mejorActivoId)!;

          for (let i = 1; i < listaActivos.length; i++) {
            const candidatoActivoId = listaActivos[i];
            const candidatoOferta = postoresTentativos.get(candidatoActivoId)!;

            if (
              candidatoOferta.monto > mejorOferta.monto ||
              (candidatoOferta.monto === mejorOferta.monto && candidatoActivoId < mejorActivoId)
            ) {
              mejorActivoId = candidatoActivoId;
              mejorOferta = candidatoOferta;
            }
          }

          // Bloquear este mejor activo para este colaborador
          ganadoresCategoria.set(mejorActivoId, mejorOferta);
          colaboradoresAsignados.add(idColab);
          activosPendientesIds.delete(mejorActivoId);

          // En los demás activos donde lideraba, descalificar al colaborador
          for (const otroActivoId of listaActivos) {
            if (otroActivoId !== mejorActivoId) {
              const postores = postoresPorActivo.get(otroActivoId) || [];
              postoresPorActivo.set(
                otroActivoId,
                postores.filter((p) => p.id_colaborador !== idColab)
              );
            }
          }

          hayCambios = true;
          break; // Reiniciar ciclo tras resolver este conflicto para respetar la cascada
        }
      }

      // Si ningún colaborador tuvo conflictos, todos los postores tentativos son ganadores directos
      if (!huboConflicto) {
        for (const [idActivo, postor] of postoresTentativos.entries()) {
          ganadoresCategoria.set(idActivo, postor);
          colaboradoresAsignados.add(postor.id_colaborador);
          activosPendientesIds.delete(idActivo);
        }
        break;
      }
    }

    // Paso C: Construir resultados finales para esta categoría clasificando el criterio de desempate
    for (const [idActivo, ganador] of ganadoresCategoria.entries()) {
      // Para auditar el criterio de desempate, comparar con el segundo postor de ese activo
      const todosLosPostores = ofertas
        .filter((o) => o.id_activo === idActivo && o.id_colaborador !== ganador.id_colaborador)
        .map((o) => {
          const colab = colaboradorMap.get(o.id_colaborador);
          return {
            id_oferta: o.id_oferta,
            id_activo: o.id_activo,
            id_colaborador: o.id_colaborador,
            monto: o.monto,
            fecha_hora: o.fecha_hora,
            nivel_jerarquia: colab ? (cargoMap.get(colab.id_cargo) ?? 99) : 99,
            fecha_ingreso: colab ? colab.fecha_ingreso : '9999-12-31',
          };
        })
        .sort(compararPostores);

      const segundoPostor = todosLosPostores[0];
      const criterio = clasificarCriterio(ganador, segundoPostor);

      resultadosTotales.push({
        id_activo: idActivo,
        id_colaborador_ganador: ganador.id_colaborador,
        monto_final: ganador.monto,
        criterio_desempate: criterio,
      });
    }
  }

  return resultadosTotales;
}
