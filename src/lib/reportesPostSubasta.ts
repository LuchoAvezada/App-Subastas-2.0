/**
 * Reportes post-subasta F13 — Subasta Interna Agrotec S.A.
 * PDF de ganadores para el comité y Excel de ofertas con el motivo de cada una.
 * Se carga con import() al hacer clic: exceljs y jspdf no pesan en la carga inicial.
 */

import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { textoCriterio, type OfertaExplicada } from './explicacionOfertas';
import type { ResultadoDetalle } from '../types/domain';

export interface ActivoReporte {
  id_activo: number;
  observacion: string | null;
  estado: string;
}

const VERDE: [number, number, number] = [28, 90, 52]; // #1C5A34, verde Agrotec

const nombreActivo = (a: { marca: string | null; modelo: string | null }) =>
  `${a.marca || ''} ${a.modelo || ''}`.trim();

const sufijo = (categoria: string) =>
  `${format(new Date(), 'yyyy-MM-dd')}${categoria ? `_${categoria.toLowerCase()}` : ''}`;

/** Logo de la marca rasterizado (jsPDF no dibuja SVG). Sin logo si no carga. */
async function logoPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = '/brand/logo-agrotec.svg';
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 521; // viewBox 2602 x 987
    canvas.height = 198;
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * PDF para el comité (spec 013, RF-01): por activo, ID, nombre, descripción y FAM;
 * del ganador, nombre, cargo y por qué ganó. Sin montos ni cédulas; sin desiertos.
 */
export async function descargarPdfComite(
  resultados: ResultadoDetalle[],
  explicadas: OfertaExplicada[],
  activos: Map<number, ActivoReporte>,
  categoria: string
) {
  const ganadoras = new Map(
    explicadas.filter((e) => e.resultado === 'Ganó').map((e) => [e.oferta.id_activo, e])
  );
  const conGanador = resultados.filter((r) => r.id_colaborador_ganador && r.estado_adjudicacion !== 'Desierto');
  const categorias = [...new Set(conGanador.map((r) => r.categoria))].sort((a, b) => a.localeCompare(b));

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();

  const logo = await logoPng();
  if (logo) doc.addImage(logo, 'PNG', 14, 10, 34, 12.9, undefined, 'FAST'); // sin comprimir pesa ~1 MB

  doc.setTextColor(...VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Ganadores de la Subasta Interna de Activos', ancho - 14, 15, { align: 'right' });
  doc.setTextColor(90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    [
      `Listado para validación del Comité${categoria ? ` — Categoría ${categoria}` : ''}`,
      `${conGanador.length} ${conGanador.length === 1 ? 'activo adjudicado' : 'activos adjudicados'} · Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    ],
    ancho - 14,
    20.5,
    { align: 'right' }
  );

  let y = 30;
  for (const cat of categorias) {
    const filas = conGanador
      .filter((r) => r.categoria === cat)
      .sort((a, b) => a.id_activo - b.id_activo)
      .map((r) => {
        const g = ganadoras.get(r.id_activo);
        return [
          `#${r.id_activo}`,
          nombreActivo(r),
          activos.get(r.id_activo)?.observacion || '—',
          r.fam || '—',
          r.colaborador_ganador,
          g?.oferta.cargo || '—',
          g?.comentario ?? textoCriterio(r.criterio_desempate),
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: `${cat} (${filas.length})`, colSpan: 7, styles: { fillColor: [240, 244, 241], textColor: VERDE, fontSize: 10 } }],
        ['ID', 'Activo', 'Descripción', 'FAM', 'Ganador', 'Cargo', 'Por qué ganó'],
      ],
      body: filas,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: [228, 228, 228], lineWidth: 0.1, valign: 'top' },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 13 },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 60 },
        3: { cellWidth: 20 },
        4: { cellWidth: 42 },
        5: { cellWidth: 34 },
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  // Pie: reglas de adjudicación y numeración
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(
      'Prelación: 1) mayor monto, 2) mayor jerarquía de cargo, 3) mayor antigüedad, 4) oferta registrada primero. Máximo un activo por categoría por colaborador.',
      14,
      alto - 9
    );
    doc.text(`Página ${p} de ${paginas}`, ancho - 14, alto - 9, { align: 'right' });
  }

  doc.save(`ganadores_comite_${sufijo(categoria)}.pdf`);
}

/**
 * Excel de ofertas (spec 013, RF-02): hoja "Ofertas" con el resultado y el motivo de
 * cada una, y hoja "Resumen" con una fila por activo.
 */
export async function descargarExcelOfertas(
  resultados: ResultadoDetalle[],
  explicadas: OfertaExplicada[],
  activos: Map<number, ActivoReporte>,
  categoria: string
) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const encabezar = (ws: ExcelJS.Worksheet) => {
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C5A34' } };
    h.alignment = { vertical: 'middle' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  };

  // Hoja 1: una fila por oferta, agrupadas por activo y en orden de prelación
  const ws = wb.addWorksheet('Ofertas');
  ws.columns = [
    { header: 'ID Activo', key: 'id', width: 10 },
    { header: 'Categoría', key: 'cat', width: 13 },
    { header: 'Activo', key: 'activo', width: 28 },
    { header: 'FAM', key: 'fam', width: 12 },
    { header: 'Posición', key: 'pos', width: 9 },
    { header: 'Colaborador', key: 'colab', width: 30 },
    { header: 'C.I.', key: 'ci', width: 12 },
    { header: 'Cargo', key: 'cargo', width: 26 },
    { header: 'Monto USD', key: 'monto', width: 13, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Fecha oferta', key: 'fecha', width: 19 },
    { header: 'Resultado', key: 'res', width: 11 },
    { header: 'Comentario', key: 'com', width: 80, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ];

  const ordenadas = [...explicadas].sort(
    (a, b) => a.oferta.id_activo - b.oferta.id_activo || a.posicion - b.posicion
  );
  let grupo = 0;
  let activoAnterior = -1;
  for (const e of ordenadas) {
    const o = e.oferta;
    if (o.id_activo !== activoAnterior) {
      grupo++;
      activoAnterior = o.id_activo;
    }
    const fila = ws.addRow({
      id: o.id_activo,
      cat: o.categoria,
      activo: nombreActivo(o),
      fam: o.fam || '',
      pos: e.posicion,
      colab: o.nombre_colaborador,
      ci: o.ci_documento,
      cargo: o.cargo,
      monto: Number(o.monto),
      fecha: o.fecha_hora_display,
      res: e.resultado,
      com: e.comentario,
    });
    // Activos alternados en gris para separar los grupos
    if (grupo % 2 === 0) {
      fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }
    fila.getCell('res').font =
      e.resultado === 'Ganó' ? { bold: true, color: { argb: 'FF1C5A34' } } : { color: { argb: 'FF555555' } };
  }
  encabezar(ws);

  // Hoja 2: una fila por activo con ofertas o resultado
  const resumen = wb.addWorksheet('Resumen');
  resumen.columns = [
    { header: 'ID Activo', key: 'id', width: 10 },
    { header: 'Categoría', key: 'cat', width: 13 },
    { header: 'Activo', key: 'activo', width: 28 },
    { header: 'FAM', key: 'fam', width: 12 },
    { header: 'Estado', key: 'estado', width: 13 },
    { header: 'Ofertas recibidas', key: 'n', width: 10 },
    { header: 'Ganador', key: 'ganador', width: 30 },
    { header: 'Cargo', key: 'cargo', width: 26 },
    { header: 'Monto adjudicado USD', key: 'monto', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Motivo', key: 'motivo', width: 80, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ];

  const porActivo = new Map<number, OfertaExplicada[]>();
  for (const e of ordenadas) {
    porActivo.set(e.oferta.id_activo, [...(porActivo.get(e.oferta.id_activo) ?? []), e]);
  }
  const resultadoPorActivo = new Map(resultados.map((r) => [r.id_activo, r]));
  const ids = [...new Set([...porActivo.keys(), ...resultadoPorActivo.keys()])].sort((a, b) => a - b);

  for (const id of ids) {
    const r = resultadoPorActivo.get(id);
    const lista = porActivo.get(id) ?? [];
    const base = r ?? lista[0]?.oferta;
    if (!base) continue;
    const g = lista.find((e) => e.resultado === 'Ganó');
    const conGanador = r?.id_colaborador_ganador && r.estado_adjudicacion !== 'Desierto';
    resumen.addRow({
      id,
      cat: base.categoria,
      activo: nombreActivo(base),
      fam: base.fam || '',
      estado: r?.estado_adjudicacion ?? activos.get(id)?.estado ?? '',
      n: lista.length,
      ganador: conGanador ? r.colaborador_ganador : '',
      cargo: conGanador ? (g?.oferta.cargo ?? '') : '',
      monto: conGanador ? Number(r.monto_final) : null,
      motivo: conGanador ? (g?.comentario ?? textoCriterio(r.criterio_desempate)) : (r?.motivo_desistimiento ?? ''),
    });
  }
  encabezar(resumen);

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `ofertas_por_activo_${sufijo(categoria)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
