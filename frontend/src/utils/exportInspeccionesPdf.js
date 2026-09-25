import { formatFecha } from './formatters'

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function badgeResultado(resultado) {
  if (resultado === 'APROBADO') {
    return `<span style="background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">APROBADO</span>`
  }
  if (resultado === 'OBSERVADO') {
    return `<span style="background:#fef3c7; color:#b45309; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">OBSERVADO</span>`
  }
  return `<span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">DESAPROBADO</span>`
}

// Abre una ventana emergente e imprime el padrón de inspecciones CERTICAV en PDF.
// Devuelve true si se pudo abrir, false si el navegador bloqueó el popup.
export function imprimirInspeccionesPdf({ listToExport, vehiculos, totales, aprobados, observados, desaprobados }) {
  const printWin = window.open('', '_blank', 'width=1100,height=750')
  if (!printWin) return false

  const rowsHtml = listToExport
    .map((i, index) => {
      const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
      return `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; color: #64748b; font-size: 10px;">${index + 1}</td>
          <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center;">${escapeXml(i.numeroRegistro || i.numeroInspeccion || '')}</td>
          <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; color: #0284c7;">${escapeXml(i.numeroSerieCerticav || '')}</td>
          <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; background: #fef3c7;">${escapeXml(i.vehiculoPlaca || '')}</td>
          <td style="font-size: 10.5px; font-weight: 700; color: #0f172a;">${escapeXml(vehiculo?.propietario || i.propietario || '—')}</td>
          <td style="font-size: 10px; color: #475569;">${escapeXml(vehiculo?.asociacion || i.transportador || 'Independiente')}</td>
          <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(i.fecha))}</td>
          <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(i.fechaVencimiento))}</td>
          <td style="text-align: center;">${badgeResultado(i.resultado)}</td>
        </tr>
      `
    })
    .join('')

  const pdfHtml = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>Padron_Inspecciones_CERTICAV_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm 10mm 8mm 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a; margin: 0; padding: 0; font-size: 10.5px;
          }
          .header {
            border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;
            display: flex; justify-content: space-between; align-items: flex-start;
          }
          .title {
            font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase;
          }
          .subtitle {
            font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;
          }
          .meta { font-size: 9.5px; color: #64748b; text-align: right; }
          .summary-bar {
            display: flex; gap: 16px; margin-bottom: 10px; background: #f1f5f9; padding: 6px 12px;
            border-radius: 6px; font-size: 10.5px;
          }
          .summary-item strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th {
            background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9px;
            font-weight: 800; letter-spacing: 0.4px; padding: 6px 7px; border: 1px solid #0f172a; text-align: left;
          }
          td { border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: middle; }
          .footer {
            margin-top: 12px; font-size: 8.5px; color: #94a3b8; display: flex;
            justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
            <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Inspecciones Técnicas Vehiculares (CERTICAV)</div>
          </div>
          <div class="meta">
            <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
            <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
          </div>
        </div>
        <div class="summary-bar">
          <div>Total en padrón: <strong>${totales}</strong></div>
          <div>· Exportando: <strong>${listToExport.length}</strong> inspecciones</div>
          <div>· Aprobados: <strong>${aprobados}</strong></div>
          <div>· Observados: <strong>${observados}</strong></div>
          <div>· Desaprobados: <strong>${desaprobados}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">N°</th>
              <th style="width: 110px; text-align: center;">N° Registro</th>
              <th style="width: 110px; text-align: center;">Serie CertiCAV</th>
              <th style="width: 80px; text-align: center;">Placa</th>
              <th style="width: 180px;">Titular / Propietario</th>
              <th>Asociación</th>
              <th style="width: 80px; text-align: center;">Fecha</th>
              <th style="width: 80px; text-align: center;">Vencimiento</th>
              <th style="width: 90px; text-align: center;">Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <span>Documento oficial generado para fiscalización y control del transporte en José Leonardo Ortiz.</span>
          <span>Página 1 de 1</span>
        </div>
        <script>
          window.onload = function() {
            window.focus();
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
    </html>
  `

  printWin.document.open()
  printWin.document.write(pdfHtml)
  printWin.document.close()
  return true
}
