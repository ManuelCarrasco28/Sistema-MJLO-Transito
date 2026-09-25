function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Exporta el padrón de personas a un .xls descargable (formato Excel/HTML,
// no usa la librería exportToExcel genérica porque necesita columnas y
// formato mso-number-format específicos para documentos/teléfonos).
export function exportPersonasExcel({ listToExport, filterEstado }) {
  const rowsHtml = listToExport
    .map((p, index) => {
      const docTipo = p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI')
      const cel = p.celular?.trim() || ''
      const tel = p.telefono?.trim() || ''
      const estadoClass = p.estado === 'ACTIVO' ? 'color: #059669; font-weight: bold;' : 'color: #dc2626; font-weight: bold;'

      return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${escapeXml(docTipo)}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(p.numeroDocumento || '—')}</td>
          <td>${escapeXml(p.apellidoPaterno || '—')}</td>
          <td>${escapeXml(p.apellidoMaterno || '—')}</td>
          <td>${escapeXml(p.nombres || '—')}</td>
          <td style="text-align: center; mso-number-format:'\\@'; font-weight: bold;">${escapeXml(p.numeroLicencia || 'Sin licencia')}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(cel || '—')}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(tel || '—')}</td>
          <td>${escapeXml(p.email || '—')}</td>
          <td>${escapeXml(p.direccion || '—')}</td>
          <td style="text-align: center;">${escapeXml(p.sexo || '—')}</td>
          <td style="text-align: center;">${escapeXml(p.fechaNacimiento || '—')}</td>
          <td style="text-align: center;">${escapeXml(p.estadoCivil || '—')}</td>
          <td>${escapeXml(p.profesion || '—')}</td>
          <td style="text-align: center; ${estadoClass}">${escapeXml(p.estado || 'ACTIVO')}</td>
        </tr>
      `
    })
    .join('')

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Padron Personas</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 11pt; }
          td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: middle; }
          .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
          .header-subtitle { font-size: 11pt; color: #475569; margin-bottom: 8px; }
          .header-meta { font-size: 10pt; color: #64748b; margin-bottom: 14px; }
        </style>
      </head>
      <body>
        <div class="header-title">MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ</div>
        <div class="header-subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios</div>
        <div class="header-meta">
          Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')} |
          Total registros: ${listToExport.length} |
          Filtro: ${filterEstado === 'TODOS' ? 'Todos' : filterEstado}
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 45px;">N°</th>
              <th style="text-align: center; width: 90px;">Tipo Doc.</th>
              <th style="text-align: center; width: 110px;">N° Documento</th>
              <th style="width: 160px;">Apellido Paterno</th>
              <th style="width: 160px;">Apellido Materno</th>
              <th style="width: 180px;">Nombres</th>
              <th style="text-align: center; width: 120px;">N° Licencia</th>
              <th style="text-align: center; width: 110px;">Celular</th>
              <th style="text-align: center; width: 110px;">Teléfono Fijo</th>
              <th style="width: 200px;">Correo Electrónico</th>
              <th style="width: 240px;">Dirección</th>
              <th style="text-align: center; width: 80px;">Sexo</th>
              <th style="text-align: center; width: 110px;">F. Nacimiento</th>
              <th style="text-align: center; width: 100px;">Estado Civil</th>
              <th style="width: 160px;">Ocupación</th>
              <th style="text-align: center; width: 90px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Abre una ventana emergente e imprime el padrón de personas en PDF.
// Devuelve true si se pudo abrir, false si el navegador bloqueó el popup.
export function exportPersonasPdf({ listToExport, totalPersonas, conductores, propietarios, activos }) {
  const printWin = window.open('', '_blank', 'width=1200,height=800')
  if (!printWin) return false

  const rowsHtml = listToExport
    .map((p, index) => {
      const docTipo = p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI')
      const apellidos = [p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || (p.apellidoPaterno || '—')
      const nombres = p.nombres || '—'
      const cel = p.celular?.trim()
      const tel = p.telefono?.trim()
      const telefonos = Array.from(new Set([cel, tel].filter(Boolean))).join(' / ') || '—'
      const estadoBadge = p.estado === 'ACTIVO'
        ? '<span style="display:inline-block; padding:2px 7px; font-size:9.5px; font-weight:700; border-radius:5px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">ACTIVO</span>'
        : '<span style="display:inline-block; padding:2px 7px; font-size:9.5px; font-weight:700; border-radius:5px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3;">INACTIVO</span>'

      return `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
          <td style="text-align: center; font-family: monospace; font-size: 10.5px;">
            <span style="color:#64748b; font-size:9.5px;">${escapeXml(docTipo)}</span><br/>
            <strong>${escapeXml(p.numeroDocumento || '—')}</strong>
          </td>
          <td>
            <strong style="color: #0f172a; font-size: 11px; text-transform: uppercase;">${escapeXml(apellidos)}</strong>
          </td>
          <td>
            <span style="color: #334155; font-size: 11px;">${escapeXml(nombres)}</span>
          </td>
          <td style="text-align: center; font-family: monospace;">
            ${p.numeroLicencia ? `<span style="color: #b45309; font-weight: bold;">${escapeXml(p.numeroLicencia)}</span>` : '<span style="color:#94a3b8; font-size:10px;">Sin licencia</span>'}
          </td>
          <td style="text-align: center; font-size: 10.5px; color: #334155;">
            ${escapeXml(telefonos)}
          </td>
          <td style="font-size: 10.5px; color: #4338ca; word-break: break-all;">
            ${escapeXml(p.email || '—')}
          </td>
          <td style="font-size: 10.5px; color: #475569;">
            ${escapeXml(p.direccion || '—')}
          </td>
          <td style="text-align: center;">${estadoBadge}</td>
        </tr>
      `
    })
    .join('')

  const pdfHtml = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 8mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 10.5px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.3px;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 10.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .meta {
            font-size: 9.5px;
            color: #64748b;
            text-align: right;
          }
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 10px;
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 10.5px;
          }
          .summary-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .summary-item strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            text-transform: uppercase;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.4px;
            padding: 6px 7px;
            border: 1px solid #0f172a;
            text-align: left;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 5px 7px;
            vertical-align: middle;
          }
          .footer {
            margin-top: 12px;
            font-size: 8.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            padding-top: 5px;
          }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
            <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios</div>
          </div>
          <div class="meta">
            <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
            <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total en padrón: <strong>${totalPersonas}</strong></div>
          <div class="summary-item">· Exportando: <strong>${listToExport.length}</strong> personas</div>
          <div class="summary-item">· Con Licencia: <strong>${conductores}</strong></div>
          <div class="summary-item">· Sin Licencia: <strong>${propietarios}</strong></div>
          <div class="summary-item">· Activos: <strong>${activos}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">N°</th>
              <th style="width: 80px; text-align: center;">Documento</th>
              <th style="width: 155px;">Apellidos</th>
              <th style="width: 135px;">Nombres</th>
              <th style="width: 85px; text-align: center;">N° Licencia</th>
              <th style="width: 95px; text-align: center;">Celular</th>
              <th style="width: 150px;">Correo Electrónico</th>
              <th>Dirección</th>
              <th style="width: 65px; text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Documento oficial generado para fines administrativos y fiscalización del transporte en José Leonardo Ortiz.</span>
          <span>Página 1 de 1</span>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            setTimeout(function() {
              window.print();
            }, 250);
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
