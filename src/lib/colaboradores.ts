import { ROL, type DatosColaborador } from '../types/domain';

/** Fila de sub_colaboradores lista para el upsert: siempre con las seis columnas resueltas. */
export interface ColaboradorImportado {
  ci_documento: string;
  nombre: string;
  fecha_ingreso: string;
  habilitado: string;
  id_cargo: number;
  id_rol: number | null;
}

/** Datos actuales del colaborador en la base, para comparar contra el CSV. */
export type ColaboradorExistente = ColaboradorImportado;

export interface ErrorDeFila {
  fila: number;
  ci: string;
  motivo: string;
}

export interface ResultadoValidacion {
  nuevos: ColaboradorImportado[];
  actualizados: ColaboradorImportado[];
  sinCambios: number;
  errores: ErrorDeFila[];
}

export const COLUMNAS_OBLIGATORIAS = ['ci_documento', 'nombre', 'fecha_ingreso', 'id_cargo'];

/** Encabezado en minúsculas y sin espacios ni BOM; `ci` y `documento` son alias de la cédula. */
export function normalizarEncabezado(encabezado: string): string {
  const clave = encabezado.trim().toLowerCase();
  return clave === 'ci' || clave === 'documento' ? 'ci_documento' : clave;
}

/**
 * Acepta DD/MM/AAAA (convención es-PY) o AAAA-MM-DD y devuelve AAAA-MM-DD,
 * o null si la fecha no existe. Es un DATE sin hora: no pasa por zona horaria.
 */
export function normalizarFecha(valor: string | undefined): string | null {
  const texto = (valor ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const py = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
  const partes = iso ? [iso[1], iso[2], iso[3]] : py ? [py[3], py[2], py[1]] : null;
  if (!partes) return null;

  const [anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return existe ? fecha.toISOString().slice(0, 10) : null;
}

/**
 * Valida las filas del CSV (con encabezados ya normalizados) contra la nómina actual.
 * No inventa fecha_ingreso ni id_cargo: ambos definen el desempate (P9).
 * Si el CSV no trae habilitado o id_rol, los existentes conservan los suyos.
 * El rol Administrador nunca se asigna ni se quita desde un CSV.
 */
export function validarNomina(
  filas: Record<string, string | undefined>[],
  existentes: ColaboradorExistente[],
  cargosValidos: Set<number>
): ResultadoValidacion {
  const porCi = new Map(existentes.map((c) => [c.ci_documento, c]));
  const vistas = new Map<string, number>();
  const resultado: ResultadoValidacion = { nuevos: [], actualizados: [], sinCambios: 0, errores: [] };

  filas.forEach((r, i) => {
    const fila = i + 2; // la fila 1 de la planilla es el encabezado
    const motivos: string[] = [];

    const ci = (r.ci_documento ?? '').replace(/[.\s]/g, '');
    if (!ci) motivos.push('Falta la cédula');
    else if (!/^\d+(-\d+)?$/.test(ci) || ci.length > 20)
      motivos.push('Cédula inválida: solo números, sin puntos');
    else if (vistas.has(ci)) motivos.push(`Cédula repetida (ya está en la fila ${vistas.get(ci)})`);
    else vistas.set(ci, fila);

    const nombre = (r.nombre ?? '').trim().replace(/\s+/g, ' ');
    if (!nombre) motivos.push('Falta el nombre');
    else if (nombre.includes('�'))
      motivos.push('Nombre con caracteres ilegibles: guarde el archivo como "CSV UTF-8"');
    else if (nombre.length > 100) motivos.push('Nombre de más de 100 caracteres');

    const fechaIngreso = normalizarFecha(r.fecha_ingreso);
    if (!fechaIngreso) motivos.push('Fecha de ingreso inválida: use DD/MM/AAAA o AAAA-MM-DD');

    const cargoTexto = (r.id_cargo ?? '').trim();
    const idCargo = Number(cargoTexto);
    if (!cargoTexto) motivos.push('Falta el cargo (id_cargo)');
    else if (!/^\d+$/.test(cargoTexto) || !cargosValidos.has(idCargo))
      motivos.push(`El cargo ${cargoTexto} no existe`);

    const habilitado = (r.habilitado ?? '').trim().toUpperCase().replace('Í', 'I');
    if (habilitado && habilitado !== 'SI' && habilitado !== 'NO') motivos.push('Habilitado debe ser SI o NO');

    const existente = porCi.get(ci);
    const rolTexto = (r.id_rol ?? '').trim();
    const idRol = Number(rolTexto);
    if (rolTexto) {
      if (idRol === ROL.ADMINISTRADOR)
        motivos.push('El rol Administrador solo se asigna desde el formulario individual');
      else if (idRol !== ROL.USUARIO && idRol !== ROL.VISITANTE)
        motivos.push(`Rol ${rolTexto} inválido: use ${ROL.USUARIO} (Usuario) o ${ROL.VISITANTE} (Visitante)`);
      else if (existente?.id_rol === ROL.ADMINISTRADOR)
        motivos.push('Es administrador: su rol solo se cambia desde el formulario individual');
    }

    if (motivos.length || !fechaIngreso) {
      resultado.errores.push({ fila, ci, motivo: motivos.join('; ') });
      return;
    }

    const colaborador: ColaboradorImportado = {
      ci_documento: ci,
      nombre,
      fecha_ingreso: fechaIngreso,
      habilitado: habilitado || existente?.habilitado || 'SI',
      id_cargo: idCargo,
      id_rol: rolTexto ? idRol : existente ? existente.id_rol : ROL.USUARIO,
    };

    const campos = Object.keys(colaborador) as (keyof ColaboradorImportado)[];
    if (!existente) resultado.nuevos.push(colaborador);
    else if (campos.some((k) => colaborador[k] !== existente[k])) resultado.actualizados.push(colaborador);
    else resultado.sinCambios++;
  });

  return resultado;
}

/** Filtros de la vista: campo de DatosColaborador → valor exacto ('' = sin filtro). */
export type FiltrosColaborador = Partial<Record<'habilitado' | 'usuario_registrado' | 'id_rol' | 'id_cargo', string>>;

const sinAcentos = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda por nombre, CI, cargo o rol (sin acentos ni mayúsculas) combinada con filtros por campo. */
export function filtrarColaboradores(
  lista: DatosColaborador[],
  busqueda: string,
  filtros: FiltrosColaborador
): DatosColaborador[] {
  const termino = sinAcentos(busqueda.trim());
  return lista.filter(
    (c) =>
      Object.entries(filtros).every(
        ([campo, valor]) => !valor || String(c[campo as keyof FiltrosColaborador]) === valor
      ) &&
      (!termino || sinAcentos(`${c.nombre} ${c.ci_documento} ${c.cargo} ${c.rol ?? ''}`).includes(termino))
  );
}

export type CampoOrden =
  | 'ci_documento'
  | 'nombre'
  | 'nivel_jerarquia'
  | 'fecha_ingreso'
  | 'usuario_registrado'
  | 'rol'
  | 'habilitado';

const comparar = (a: unknown, b: unknown) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true });

/** Orden por un campo (las CI se comparan como números); los empates se ordenan por nombre. */
export function ordenarColaboradores(
  lista: DatosColaborador[],
  campo: CampoOrden,
  asc: boolean
): DatosColaborador[] {
  return [...lista].sort(
    (a, b) => (asc ? 1 : -1) * comparar(a[campo], b[campo]) || comparar(a.nombre, b.nombre)
  );
}
