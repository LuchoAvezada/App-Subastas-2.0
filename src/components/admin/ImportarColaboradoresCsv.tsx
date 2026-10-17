import { useEffect, useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { ROL, type Cargo } from '../../types/domain';
import {
  COLUMNAS_OBLIGATORIAS,
  normalizarEncabezado,
  validarNomina,
  type ColaboradorExistente,
  type ResultadoValidacion,
} from '../../lib/colaboradores';

interface Props {
  onClose: () => void;
  /** Se llama tras importar, para refrescar la lista. */
  onImportado: () => void;
}

export function ImportarColaboradoresCsv({ onClose, onImportado }: Props) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [existentes, setExistentes] = useState<ColaboradorExistente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  const [importando, setImportando] = useState(false);
  const [importado, setImportado] = useState(false);

  // Nómina leída en el momento: tomar a un existente por nuevo le quitaría su rol o su inhabilitación.
  useEffect(() => {
    Promise.all([
      supabase.from('sub_cargos').select('id_cargo, descripcion, nivel_jerarquia').order('id_cargo'),
      supabase
        .from('sub_colaboradores')
        .select('ci_documento, nombre, fecha_ingreso, habilitado, id_cargo, id_rol', { count: 'exact' }),
    ]).then(([cargosRes, nominaRes]) => {
      const fallo = cargosRes.error ?? nominaRes.error;
      const nomina = (nominaRes.data ?? []) as ColaboradorExistente[];
      if (fallo) setError(`No se pudo leer la nómina actual: ${fallo.message}`);
      else if ((nominaRes.count ?? 0) > nomina.length)
        setError('La nómina actual se leyó incompleta, así que importar ahora podría pisar datos.');
      else {
        setCargos((cargosRes.data ?? []) as Cargo[]);
        setExistentes(nomina);
      }
    });
  }, []);

  const handleArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después de corregirlo
    if (!file || !existentes) return;

    setError(null);
    setResultado(null);
    setArchivo(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizarEncabezado,
      complete: ({ data, meta }) => {
        const faltan = COLUMNAS_OBLIGATORIAS.filter((c) => !meta.fields?.includes(c));
        if (faltan.length) setError(`Faltan columnas obligatorias: ${faltan.join(', ')}.`);
        else if (!data.length) setError('El archivo no tiene filas de datos.');
        else setResultado(validarNomina(data, existentes, new Set(cargos.map((c) => c.id_cargo))));
      },
      error: (err) => setError(`No se pudo leer el archivo: ${err.message}`),
    });
  };

  const importar = async () => {
    if (!resultado) return;
    setImportando(true);
    setError(null);
    // Un solo upsert: si algo falla, la base no guarda ninguna fila.
    const { error: dbError } = await supabase
      .from('sub_colaboradores')
      .upsert([...resultado.nuevos, ...resultado.actualizados], { onConflict: 'ci_documento' });
    setImportando(false);
    if (dbError) setError(`No se importó ningún registro: ${dbError.message}`);
    else {
      setImportado(true);
      onImportado();
    }
  };

  const aEscribir = resultado ? resultado.nuevos.length + resultado.actualizados.length : 0;
  const resumen = resultado
    ? [
        { titulo: 'Nuevos', valor: resultado.nuevos.length, color: 'text-agrotec-800' },
        { titulo: 'Con cambios', valor: resultado.actualizados.length, color: 'text-gray-900' },
        { titulo: 'Sin cambios', valor: resultado.sinCambios, color: 'text-gray-500' },
        {
          titulo: 'Con error',
          valor: resultado.errores.length,
          color: resultado.errores.length ? 'text-marca-rojo' : 'text-gray-500',
        },
      ]
    : [];

  return (
    <Modal
      isOpen
      onClose={() => !importando && onClose()}
      title="Importar Colaboradores desde CSV"
      description="El archivo se revisa antes de guardar: nada se escribe hasta que usted confirme."
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
          >
            <WarningCircleIcon className="w-[18px] h-[18px] text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {importado && resultado ? (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2"
          >
            <CheckCircleIcon className="w-[18px] h-[18px] shrink-0 mt-0.5" />
            <span>
              Importación completada: {resultado.nuevos.length} nuevos y {resultado.actualizados.length}{' '}
              actualizados.
              {resultado.errores.length > 0 &&
                ` Las ${resultado.errores.length} filas con error no se importaron; corríjalas y vuelva a subir el archivo.`}
            </span>
          </div>
        ) : existentes ? (
          <>
            <div className="text-xs text-gray-600 leading-relaxed space-y-1.5">
              <p>
                <strong className="text-gray-900">Columnas obligatorias:</strong> <code>ci_documento</code>,{' '}
                <code>nombre</code>, <code>fecha_ingreso</code> (DD/MM/AAAA o AAAA-MM-DD) e <code>id_cargo</code>.
              </p>
              <p>
                <strong className="text-gray-900">Opcionales:</strong> <code>habilitado</code> (SI/NO) e{' '}
                <code>id_rol</code> ({ROL.USUARIO} Usuario, {ROL.VISITANTE} Visitante). Si faltan, los nuevos
                quedan habilitados como Usuario y los existentes conservan lo que tienen. El rol Administrador solo
                se asigna desde el formulario individual.
              </p>
              <p>
                Guarde la planilla como <strong className="text-gray-900">CSV UTF-8</strong>, separada por comas o
                por punto y coma.
              </p>
            </div>

            <details className="rounded-xl border border-gray-200 bg-gray-50 text-xs">
              <summary className="cursor-pointer px-3.5 py-2.5 font-semibold text-gray-700 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-agrotec-500">
                Ver códigos de cargo ({cargos.length})
              </summary>
              <ul className="max-h-40 overflow-y-auto px-3.5 pb-3 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                {cargos.map((c) => (
                  <li key={c.id_cargo}>
                    <span className="font-mono font-bold text-gray-900">{c.id_cargo}</span> — {c.descripcion}{' '}
                    <span className="text-gray-500">(nivel {c.nivel_jerarquia})</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center">
              <label htmlFor="csv-nomina" className="sr-only">
                Archivo CSV de la nómina
              </label>
              <input
                id="csv-nomina"
                type="file"
                accept=".csv,text/csv"
                disabled={importando}
                onChange={handleArchivo}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-agrotec-800 file:text-white hover:file:bg-agrotec-900 file:cursor-pointer cursor-pointer"
              />
            </div>
          </>
        ) : (
          !error && <Spinner label="Leyendo la nómina actual..." />
        )}

        {resultado && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Revisión de <span className="font-semibold text-gray-700">{archivo}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {resumen.map((r) => (
                <div key={r.titulo} className="p-3 rounded-xl border border-gray-200 bg-white">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
                    {r.titulo}
                  </span>
                  <span className={`text-xl font-black ${r.color}`}>{r.valor}</span>
                </div>
              ))}
            </div>

            {resultado.errores.length > 0 && (
              <div className="rounded-xl border border-rose-200 overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Filas con error que no se importan</caption>
                    <thead className="bg-marca-rosa text-[11px] uppercase tracking-wider text-marca-rojo sticky top-0">
                      <tr>
                        <th scope="col" className="py-2 px-3">Fila</th>
                        <th scope="col" className="py-2 px-3">Cédula</th>
                        <th scope="col" className="py-2 px-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resultado.errores.map((e) => (
                        <tr key={e.fila}>
                          <td className="py-2 px-3 font-mono text-gray-900">{e.fila}</td>
                          <td className="py-2 px-3 font-mono text-gray-700">{e.ci || '—'}</td>
                          <td className="py-2 px-3 text-gray-700">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {importado ? (
            <Button onClick={onClose}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={importando}>
                Cancelar
              </Button>
              {resultado && (
                <Button onClick={importar} isLoading={importando} disabled={!aEscribir}>
                  {aEscribir
                    ? `Importar ${aEscribir} ${aEscribir === 1 ? 'registro' : 'registros'}`
                    : 'Nada para importar'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
