import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// F09: la anon key no puede escribir tablas (sql/14_hardening_api.sql). Una escritura
// directa en el código fallaría en producción: toda escritura va por una RPC con token.
const ESCRITURA_DIRECTA = /\.from\(\s*['"`](\w+)['"`]\s*\)[^;]*?\.(insert|update|upsert|delete)\s*\(/g;

function archivosDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosDe(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );
}

describe('F09 — sin escrituras directas a tablas', () => {
  it('detecta una escritura encadenada', () => {
    const codigo = "await supabase\n  .from('sub_activos')\n  .update({ a: 1 })\n  .eq('id', 1);";
    expect([...codigo.matchAll(ESCRITURA_DIRECTA)]).toHaveLength(1);
  });

  it('src/ no hace insert/update/upsert/delete con .from(...)', () => {
    const hallazgos = archivosDe('src').flatMap((archivo) =>
      [...readFileSync(archivo, 'utf-8').matchAll(ESCRITURA_DIRECTA)].map(
        (m) => `${archivo}: ${m[2]} en ${m[1]}`
      )
    );
    expect(hallazgos).toEqual([]);
  });
});

// F10: la anon key solo lee el catálogo (sql/16_lecturas_con_sesion.sql). Leer otra tabla
// con .from() fallaría en producción: nómina, ofertas y resultados van por leer_datos().
// 'activos' es el bucket de Storage (supabase.storage.from).
const LEGIBLES = ['sub_activos', 'sub_app_config', 'sub_cargos', 'sub_v_resumen_ofertas', 'activos'];

describe('F10 — solo lecturas públicas del catálogo', () => {
  it('src/ solo usa .from(...) sobre tablas legibles por la anon key', () => {
    const hallazgos = archivosDe('src').flatMap((archivo) =>
      [...readFileSync(archivo, 'utf-8').matchAll(/\.from\(\s*['"`](\w+)['"`]/g)]
        .map((m) => m[1])
        .filter((tabla) => !LEGIBLES.includes(tabla))
        .map((tabla) => `${archivo}: ${tabla}`)
    );
    expect(hallazgos).toEqual([]);
  });
});
