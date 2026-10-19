import { createPortal } from 'react-dom'

const dinero = (valor) => `S/ ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const CONCEPTOS = { TRAMITE: 'Trámite', PAPELETA: 'Papeleta', CURSO: 'Curso', INTERNAMIENTO: 'Depósito' }
const metodoLegible = (m) => (m === 'DEPÓSITO' ? 'Efectivo (depósito)' : m === 'TARJETA' ? 'Tarjeta' : m === 'EFECTIVO' ? 'Efectivo' : m)

const celda = { border: '1px solid #000', padding: '2.2mm 2.5mm', fontSize: '8.5pt', verticalAlign: 'middle' }
const cabecera = { ...celda, background: '#e5e7eb', fontWeight: 800, textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.3px' }

function Tabla({ titulo, columnas, filas, vacio, pie }) {
  return (
    <section style={{ breakInside: 'avoid', marginBottom: '6mm' }}>
      <h2 style={{ margin: '0 0 2mm', fontSize: '9pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titulo}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr>{columnas.map((c) => <th key={c.titulo} style={{ ...cabecera, textAlign: c.align || 'left', width: c.ancho }}>{c.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {filas.length === 0
            ? <tr><td colSpan={columnas.length} style={{ ...celda, textAlign: 'center', color: '#475569' }}>{vacio}</td></tr>
            : filas.map((f, i) => (
              <tr key={i} style={{ breakInside: 'avoid' }}>
                {f.map((valor, k) => <td key={k} style={{ ...celda, textAlign: columnas[k].align || 'left', fontFamily: columnas[k].mono ? 'monospace' : 'inherit', fontWeight: columnas[k].negrita ? 800 : 400 }}>{valor}</td>)}
              </tr>
            ))}
        </tbody>
        {pie && <tfoot><tr>{pie.map((valor, k) => <td key={k} style={{ ...celda, background: '#f3f4f6', fontWeight: 900, textAlign: columnas[k].align || 'left' }}>{valor}</td>)}</tr></tfoot>}
      </table>
    </section>
  )
}

/**
 * Hoja impresa del arqueo y cierre diario de caja (A4 vertical). Se monta como documento aparte
 * (portal en <body>) para que la impresión no arrastre la pantalla de Pagos que está detrás.
 */
export function ArqueoCajaPrint({ data }) {
  if (!data || typeof document === 'undefined') return null
  const fecha = new Date(`${data.fecha}T00:00:00`)
  const fechaLarga = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const emitido = new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const movimientos = data.pagos || []

  return createPortal(
    <div id="seccion-impresion" className="seccion-impresion-portal print-portrait" data-orientation="portrait">
      <div style={{ width: '100%', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <header style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '3mm', marginBottom: '5mm' }}>
          <img src="/escudo-jlo.png" alt="Municipalidad Distrital de José Leonardo Ortiz" style={{ height: '22mm', width: 'auto', display: 'block', margin: '0 auto 2mm' }} />
          <p style={{ margin: 0, fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' }}>Subgerencia de Tránsito, Transportes y Seguridad Vial</p>
          <h1 style={{ margin: '2mm 0 1mm', fontSize: '14pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Arqueo y cierre diario de caja</h1>
          <p style={{ margin: 0, fontSize: '9pt', textTransform: 'capitalize' }}>{fechaLarga}</p>
        </header>

        <section style={{ breakInside: 'avoid', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm', marginBottom: '6mm' }}>
          {[
            ['Total recaudado', dinero(data.totalRecaudado), `${data.totalOperaciones || 0} operaciones`],
            ['Efectivo en caja', dinero(data.porMetodo?.efectivo), 'Incluye depósito'],
            ['Tarjetas', dinero(data.porMetodo?.tarjeta), 'Cobros con tarjeta'],
          ].map(([etiqueta, valor, detalle]) => (
            <div key={etiqueta} style={{ border: '1.5px solid #000', padding: '3mm' }}>
              <p style={{ margin: 0, fontSize: '7.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{etiqueta}</p>
              <p style={{ margin: '1.5mm 0 0.5mm', fontSize: '15pt', fontWeight: 900 }}>{valor}</p>
              <p style={{ margin: 0, fontSize: '7.5pt', color: '#334155' }}>{detalle}</p>
            </div>
          ))}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', alignItems: 'start' }}>
          <Tabla
            titulo="Recaudación por concepto"
            columnas={[{ titulo: 'Concepto', negrita: true }, { titulo: 'Cant.', align: 'center', ancho: '16mm' }, { titulo: 'Subtotal', align: 'right', ancho: '28mm' }]}
            filas={(data.porConcepto || []).map((c) => [CONCEPTOS[c.tipoPago] || c.tipoPago, c.cantidad, dinero(c.total)])}
            vacio="Sin ingresos en la fecha"
            pie={['Total', data.totalOperaciones || 0, dinero(data.totalRecaudado)]}
          />
          <Tabla
            titulo="Rendición por cajero"
            columnas={[{ titulo: 'Cajero', negrita: true }, { titulo: 'Oper.', align: 'center', ancho: '16mm' }, { titulo: 'Total cobrado', align: 'right', ancho: '28mm' }]}
            filas={(data.porCajero || []).map((c) => [c.usuario, c.cantidad, dinero(c.total)])}
            vacio="Sin operaciones"
            pie={['Total', data.totalOperaciones || 0, dinero(data.totalRecaudado)]}
          />
        </div>

        <Tabla
          titulo={`Movimientos y recibos emitidos (${movimientos.length})`}
          columnas={[
            { titulo: 'N° recibo', mono: true, negrita: true, ancho: '30mm' },
            { titulo: 'Hora', align: 'center', mono: true, ancho: '16mm' },
            { titulo: 'Concepto', ancho: '28mm' },
            { titulo: 'Método', ancho: '34mm' },
            { titulo: 'Cajero' },
            { titulo: 'Monto', align: 'right', negrita: true, ancho: '26mm' },
          ]}
          filas={movimientos.map((p) => [
            p.numeroRecibo || `#${p.id}`,
            p.fecha && p.fecha.includes(' ') ? p.fecha.split(' ')[1].slice(0, 5) : '—',
            CONCEPTOS[p.tipoPago] || p.tipoPago,
            metodoLegible(p.metodo),
            p.cajero,
            dinero(p.montoTotal),
          ])}
          vacio="No se registraron cobros en esta jornada."
          pie={['Total del día', '', '', '', '', dinero(data.totalRecaudado)]}
        />

        <section style={{ breakInside: 'avoid', marginTop: '16mm' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10mm', textAlign: 'center', fontSize: '8pt' }}>
            {['Cajero responsable', 'Jefe de Caja / Tesorería', 'V° B° Subgerente de Tránsito'].map((cargo) => (
              <div key={cargo} style={{ borderTop: '1px solid #000', paddingTop: '1.5mm', fontWeight: 700 }}>{cargo}</div>
            ))}
          </div>
          <p style={{ margin: '8mm 0 0', fontSize: '7pt', color: '#475569', textAlign: 'right' }}>Emitido el {emitido}</p>
        </section>
      </div>
    </div>,
    document.body
  )
}
