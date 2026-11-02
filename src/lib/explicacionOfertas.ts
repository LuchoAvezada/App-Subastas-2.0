/**
 * Explicación de ofertas F13 — Subasta Interna Agrotec S.A.
 * Para cada oferta recibida dice si ganó o perdió y por qué, con el mismo orden de
 * prelación que procesar_ganadores (monto, jerarquía, antigüedad, registro) y el
 * tope de un activo por categoría. Se calcula con la nómina actual (spec 013, RF-02).
 */

import {
  clasificarCriterio,
  compararPostores,
  empateTotal,
  type ColaboradorInput,
  type PostorEnriquecido,
} from './adjudicacion';
import { formatUSD } from './utils';
import type { OfertaRecibida, ResultadoDetalle } from '../types/domain';

export interface Desistimiento {
  id_activo: number;
  id_colaborador: number;
  motivo: string;
}

export type ResultadoOferta = 'Ganó' | 'Perdió' | 'Pendiente';

export interface OfertaExplicada {
  oferta: OfertaRecibida;
  /** Lugar de la oferta en la prelación de su activo (1 = mejor). */
  posicion: number;
  resultado: ResultadoOferta;
  comentario: string;
}

const TEXTO_CRITERIO: Record<string, string> = {
  'GANADO POR OFERTA MAS ALTA': 'Ofertó el monto más alto.',
  'GANADO POR JERARQUIA': 'Empató en monto y ganó por tener el cargo de mayor jerarquía.',
  'GANADO POR ANTIGUEDAD': 'Empató en monto y jerarquía, y ganó por mayor antigüedad en la empresa.',
  // Resultados anteriores a F14: desde entonces el empate total lo decide el comité
  'GANADO POR REGISTRO DE OFERTA': 'Empató en monto, jerarquía y antigüedad, y ganó por registrar su oferta primero.',
  'GANADO POR TOPE DE CATEGORIA':
    'Quienes ofertaron más ya habían ganado otro activo de esta categoría (máximo uno por colaborador).',
  'REQUIERE EVALUACION': 'Empate total en monto, jerarquía y antigüedad: la adjudicación la decide el comité.',
  'ADJUDICADO POR DECISION DEL COMITE': 'Empató en monto, jerarquía y antigüedad; el comité decidió la adjudicación.',
};

const POR_COMITE = 'ADJUDICADO POR DECISION DEL COMITE';
const POR_REGISTRO = 'GANADO POR REGISTRO DE OFERTA';

/** Criterio guardado en sub_resultados, en lenguaje claro. */
export function textoCriterio(criterio: string): string {
  return TEXTO_CRITERIO[criterio] ?? criterio;
}

function esElegible(c: ColaboradorInput | undefined): boolean {
  return c?.habilitado === 'SI' && c.id_rol === 2;
}

function motivoPerdedor(p: PostorEnriquecido, g: PostorEnriquecido): string {
  if (p.monto < g.monto) {
    return `Perdió por monto: ofertó ${formatUSD(p.monto)}, ${formatUSD(g.monto - p.monto)} menos que la oferta ganadora (${formatUSD(g.monto)}).`;
  }
  if (p.nivel_jerarquia > g.nivel_jerarquia) {
    return 'Empató en monto y perdió por jerarquía: el ganador tiene un cargo de mayor jerarquía.';
  }
  if (new Date(p.fecha_ingreso).getTime() > new Date(g.fecha_ingreso).getTime()) {
    return 'Empató en monto y jerarquía, y perdió por antigüedad: el ganador ingresó antes a la empresa.';
  }
  return 'Empató en monto, jerarquía y antigüedad, y perdió por orden de registro: la oferta ganadora se registró antes.';
}

/**
 * Devuelve cada oferta con su posición, resultado y comentario, agrupadas por activo
 * (en el orden en que llegan) y ordenadas por prelación dentro de cada activo.
 */
export function explicarOfertas(
  ofertas: OfertaRecibida[],
  resultados: ResultadoDetalle[],
  nomina: ColaboradorInput[],
  desistimientos: Desistimiento[]
): OfertaExplicada[] {
  const colabs = new Map(nomina.map((c) => [c.id_colaborador, c]));
  const resultadoPorActivo = new Map(resultados.map((r) => [r.id_activo, r]));
  const desistio = new Map(desistimientos.map((d) => [`${d.id_activo}-${d.id_colaborador}`, d.motivo]));
  const vigentes = resultados.filter((r) => r.id_colaborador_ganador);
  // Otro activo de la misma categoría ya ganado por el colaborador (tope)
  const otroGanado = (o: OfertaRecibida) =>
    vigentes.find(
      (g) => g.categoria === o.categoria && g.id_activo !== o.id_activo && g.id_colaborador_ganador === o.id_colaborador
    );

  const porActivo = new Map<number, { oferta: OfertaRecibida; postor: PostorEnriquecido }[]>();
  for (const o of ofertas) {
    const lista = porActivo.get(o.id_activo) ?? [];
    lista.push({
      oferta: o,
      postor: {
        id_oferta: o.id_oferta,
        id_activo: o.id_activo,
        id_colaborador: o.id_colaborador,
        monto: Number(o.monto),
        fecha_hora: o.fecha_hora,
        nivel_jerarquia: o.nivel_jerarquia,
        fecha_ingreso: colabs.get(o.id_colaborador)?.fecha_ingreso ?? '9999-12-31',
      },
    });
    porActivo.set(o.id_activo, lista);
  }

  const salida: OfertaExplicada[] = [];

  for (const [idActivo, lista] of porActivo) {
    lista.sort((a, b) => compararPostores(a.postor, b.postor));
    const r = resultadoPorActivo.get(idActivo);
    const ganadora = r?.id_colaborador_ganador
      ? lista.find((x) => x.postor.id_colaborador === r.id_colaborador_ganador)?.postor
      : undefined;

    const explicar = (o: OfertaRecibida, p: PostorEnriquecido): Pick<OfertaExplicada, 'resultado' | 'comentario'> => {
      const perdio = (comentario: string) => ({ resultado: 'Perdió' as const, comentario });

      if (ganadora && p.id_oferta === ganadora.id_oferta) {
        if (r?.estado_adjudicacion === 'Reasignado') {
          return { resultado: 'Ganó', comentario: 'Reasignado: el ganador anterior desistió y era el siguiente postor elegible.' };
        }
        if (r?.criterio_desempate === POR_COMITE || r?.criterio_desempate === POR_REGISTRO) {
          return { resultado: 'Ganó', comentario: textoCriterio(r.criterio_desempate) };
        }
        const rival = lista.find((x) => x.postor !== p && esElegible(colabs.get(x.postor.id_colaborador)))?.postor;
        return {
          resultado: 'Ganó',
          comentario: rival ? textoCriterio(clasificarCriterio(p, rival)) : 'Fue la única oferta válida.',
        };
      }

      const motivo = desistio.get(`${idActivo}-${o.id_colaborador}`);
      if (motivo) return perdio(`Ganó el activo pero desistió (${motivo}).`);

      const c = colabs.get(o.id_colaborador);
      if (c?.habilitado === 'SI' && c.id_rol !== 2) {
        return perdio('No participó de la adjudicación: solo el rol Usuario puede ganar.');
      }
      if (!esElegible(c)) return perdio('No participó de la adjudicación: el colaborador está bloqueado.');

      const otro = otroGanado(o);
      const empate = ganadora && empateTotal(p, ganadora);
      if (empate && r?.criterio_desempate === POR_COMITE) {
        return perdio('Empató en monto, jerarquía y antigüedad, y el comité adjudicó el activo a otro postor.');
      }
      // Desde F14 un empate total solo se pierde por el tope (lo explica el mensaje de tope);
      // antes se perdía por el orden de registro
      const porTope = empate && otro && r?.criterio_desempate !== POR_REGISTRO;
      if (ganadora && compararPostores(p, ganadora) > 0 && !porTope) return perdio(motivoPerdedor(p, ganadora));

      if (otro) {
        const nombre = `${otro.marca || ''} ${otro.modelo || ''}`.trim();
        return perdio(
          `Tope de categoría: ya ganó el activo #${otro.id_activo}${nombre ? ` (${nombre})` : ''} de ${o.categoria}; máximo uno por colaborador.`
        );
      }

      if (r?.estado_adjudicacion === 'En evaluación') {
        // Primer postor que hoy puede ganarlo: los que empatan con él los evalúa el comité (F14)
        const primero = lista.find(
          (x) =>
            esElegible(colabs.get(x.oferta.id_colaborador)) &&
            !desistio.has(`${idActivo}-${x.oferta.id_colaborador}`) &&
            !otroGanado(x.oferta)
        )!.postor;
        return empateTotal(p, primero)
          ? { resultado: 'Pendiente', comentario: textoCriterio('REQUIERE EVALUACION') }
          : perdio('Quedó detrás de los postores empatados que evalúa el comité.');
      }

      if (r?.estado_adjudicacion === 'Desierto') return perdio('El activo quedó desierto tras los desistimientos.');
      if (!r) return { resultado: 'Pendiente', comentario: 'El activo todavía no fue adjudicado.' };
      return perdio('No resultó adjudicada en el orden de asignación.');
    };

    lista.forEach(({ oferta, postor }, i) => {
      salida.push({ oferta, posicion: i + 1, ...explicar(oferta, postor) });
    });
  }

  return salida;
}
