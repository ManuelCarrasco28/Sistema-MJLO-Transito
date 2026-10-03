import React from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import DOMPurify from 'dompurify'
import './TarjetasImpresion.css'

// El contenido de la resolución se edita con un editor de texto enriquecido y
// se guarda como HTML; se sanitiza antes de inyectarlo para evitar XSS
// almacenado (scripts, manejadores onerror/onload, iframes, etc.).
const sanitizarHtml = (html) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  ALLOWED_ATTR: ['style', 'href', 'target', 'rel'],
})

export function PrintWrapper({ children, className = '', orientation = 'portrait' }) {
  React.useEffect(() => {
    const handleBeforePrint = () => {
      document.body.setAttribute('data-print-orientation', orientation)
      if (orientation === 'landscape') {
        document.body.classList.add('is-printing-landscape')
      } else if (orientation === 'ticket') {
        document.body.classList.add('is-printing-ticket')
      } else {
        document.body.classList.add('is-printing-portrait')
      }
    }
    const handleAfterPrint = () => {
      document.body.removeAttribute('data-print-orientation')
      document.body.classList.remove('is-printing-landscape', 'is-printing-ticket', 'is-printing-portrait')
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
      document.body.removeAttribute('data-print-orientation')
      document.body.classList.remove('is-printing-landscape', 'is-printing-ticket', 'is-printing-portrait')
    }
  }, [orientation])

  return (
    <>
      <div className={`preview-doc-screen preview-${orientation} ${className}`}>
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(
        <div id="seccion-impresion" className={`seccion-impresion-portal print-${orientation}`} data-orientation={orientation}>
          <div className="impresion-documento-hoja">
            {children}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/**
 * Componente oficial de impresión: TARJETA DE OPERATIVIDAD (TUC)
 * Dimensiones: 85.6 mm x 53.98 mm a 2 caras (Anverso y Reverso)
 */
export function TarjetaOperatividadPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?doc=${encodeURIComponent(data.tucNumero || '')}&placa=${encodeURIComponent(data.placa || '')}`
  const isImageQr = Boolean(data.qrUrl && (data.qrUrl.startsWith('data:image') || data.qrUrl.endsWith('.png') || data.qrUrl.endsWith('.jpg')))

  return (
    <PrintWrapper className="carnet-preview-wrap">
      <div className="carnet-wrapper">
        {/* --- CARA ANVERSO --- */}
        <div className="carnet-box anverso">
          <div className="header-carnet">
            <img src="/escudo-jlo.png" alt="MDJLO" className="escudo" />
            <div className="header-text">
              <h2>Municipalidad Distrital de José Leonardo Ortiz</h2>
              <h1>TARJETA DE OPERATIVIDAD</h1>
            </div>
          </div>

          <div className="asociacion-banner">
            {data.asociacion || 'ASOCIACIÓN INDEPENDIENTE'}
          </div>

          <div className="body-carnet">
            <div className="foto-container">
              <img src={data.fotoUrl || '/placeholder-user.png'} alt="Conductor" />
            </div>
            <div className="datos-container">
              <div className="row-flex">
                <div>
                  <span className="label">D.N.I.: </span>
                  <span className="val-yellow">{data.dni || '—'}</span>
                </div>
                <div>
                  <span className="label">Res. Municipal: </span>
                  <span className="val-yellow">{data.resMunicipal || 'R.M. VIGENTE'}</span>
                </div>
              </div>
              <div className="row-single">
                <span className="label">Dirección: </span>
                <span className="val-text">{data.direccion || 'JOSÉ LEONARDO ORTIZ'}</span>
              </div>
              <div className="row-single nombres-box">
                <span className="val-nombres">{data.apellidos || ''}</span>
                <span className="val-nombres">{data.nombres || (!data.apellidos ? 'CONDUCTOR AUTORIZADO' : '')}</span>
              </div>
            </div>
          </div>

          <div className="footer-carnet-anverso">
            <span className="tuc-numero">{data.tucNumero}</span>
          </div>
        </div>

        {/* --- CARA REVERSO --- */}
        <div className="carnet-box reverso">
          <div className="reverso-grid">
            <div className="reverso-info">
              <div className="field-block">
                <label>PLACA DE RODAJE:</label>
                <div className="box-val">{data.placa || '—'}</div>
              </div>
              <div className="field-block">
                <label>N° MOTOR:</label>
                <div className="box-val">{data.numeroMotor || '—'}</div>
              </div>
              <div className="field-block">
                <label>FECHA DE EXPEDICIÓN:</label>
                <div className="box-val">{data.fechaExpedicion || '—'}</div>
              </div>
              <div className="field-block">
                <label>FECHA DE VENCIMIENTO:</label>
                <div className="box-val highlight-red">{data.fechaVencimiento || '—'}</div>
              </div>
              <div className="field-block">
                <label>DIRECCIÓN:</label>
                <div className="box-val-sm">{data.direccion || 'JOSÉ LEONARDO ORTIZ'}</div>
              </div>
            </div>

            <div className="reverso-lateral">
              <div className="qr-container">
                {isImageQr ? (
                  <img src={data.qrUrl} alt="QR Validación" />
                ) : (
                  <QRCodeSVG value={qrRaw} size={68} level="M" includeMargin={false} />
                )}
              </div>
              <div className="firma-container">
                <div className="linea-firma"></div>
                <span>SUB GERENCIA DE TRÁNSITO</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Cara Frontal (Anverso): CARNET DE SEGURIDAD VIAL
 */
export function CarnetCursoVialAnverso({ data }) {
  return (
    <div className="carnet-box curso-vial-anverso">
      <div className="header-carnet" style={{ borderBottomColor: '#34d399' }}>
        <img src="/escudo-jlo.png" alt="MDJLO" className="escudo" />
        <div className="header-text">
          <h2>Municipalidad Distrital de José Leonardo Ortiz</h2>
          <h1 style={{ fontSize: '7.5pt' }}>CARNET DE SEGURIDAD VIAL</h1>
        </div>
      </div>

      <div className="banner-curso">
        CURSO ANUAL DE EDUCACIÓN Y SEGURIDAD VIAL
      </div>

      <div className="body-carnet">
        <div className="foto-container" style={{ borderColor: '#34d399' }}>
          <img src={data.fotoUrl || data.fotoConductor || '/placeholder-user.png'} alt="Conductor" />
        </div>
        <div className="datos-container">
          <div className="row-flex">
            <div>
              <span className="label" style={{ color: '#a7f3d0' }}>D.N.I.: </span>
              <span className="val-yellow">{data.dni || data.conductorDni || '—'}</span>
            </div>
            <div>
              <span className="label" style={{ color: '#a7f3d0' }}>N° Licencia: </span>
              <span className="val-yellow">{data.licencia || data.numeroLicencia || 'B-IIc'}</span>
            </div>
          </div>
          <div className="row-single">
            <span className="label" style={{ color: '#a7f3d0' }}>Res. Gerencia: </span>
            <span className="val-text">{data.resMunicipal || 'R.G. N° 018-2025-MDJLO/GSCyT'}</span>
          </div>
          <div className="row-single nombres-box" style={{ borderTopColor: 'rgba(255,255,255,0.2)' }}>
            <span className="val-nombres">{data.apellidos || data.conductorNombres || 'CONDUCTOR AUTORIZADO'}</span>
            {data.nombres && <span className="val-nombres">{data.nombres}</span>}
          </div>
        </div>
      </div>

      <div className="footer-carnet-anverso">
        <span className="tuc-numero" style={{ color: '#6ee7b7' }}>{data.tucNumero || data.codigo}</span>
      </div>
    </div>
  )
}

/**
 * Cara Trasera (Reverso): CARNET DE SEGURIDAD VIAL
 */
export function CarnetCursoVialReverso({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?tipo=CURSO_VIAL&carnet=${encodeURIComponent(data.tucNumero || data.codigo || '')}&dni=${encodeURIComponent(data.dni || '')}`
  const isImageQr = Boolean(data.qrUrl && (data.qrUrl.startsWith('data:image') || data.qrUrl.endsWith('.png') || data.qrUrl.endsWith('.jpg')))

  return (
    <div className="carnet-box reverso">
      <div className="reverso-grid">
        <div className="reverso-info">
          <div className="field-block">
            <label>MODALIDAD AUTORIZADA:</label>
            <div className="box-val">SERVICIO ESPECIAL TRIMÓVIL</div>
          </div>
          <div className="field-block">
            <label>EMPRESA / ASOCIACIÓN:</label>
            <div className="box-val-sm">{data.asociacion || 'INDEPENDIENTE'}</div>
          </div>
          <div className="field-block">
            <label>FECHA DE EXPEDICIÓN:</label>
            <div className="box-val">{data.fechaExpedicion || '—'}</div>
          </div>
          <div className="field-block">
            <label>FECHA DE VENCIMIENTO:</label>
            <div className="box-val highlight-red">{data.fechaVencimiento || data.fechaExpiracion || '—'}</div>
          </div>
          <div className="field-block">
            <label>CONDICIÓN:</label>
            <div className="box-val-sm" style={{ color: '#047857', fontWeight: 800 }}>CAPACITADO Y APTO</div>
          </div>
        </div>

        <div className="reverso-lateral">
          <div className="qr-container">
            {isImageQr ? (
              <img src={data.qrUrl} alt="QR Validación" />
            ) : (
              <QRCodeSVG value={qrRaw} size={68} level="M" includeMargin={false} />
            )}
          </div>
          <div className="firma-container">
            <div className="linea-firma"></div>
            <span>SUB GERENCIA DE TRÁNSITO</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Par Anverso + Reverso de un carnet individual alineado verticalmente para corte y doblado
 */
export function CarnetCursoVialItem({ data }) {
  return (
    <div className="carnet-item-par">
      <CarnetCursoVialAnverso data={data} />
      <CarnetCursoVialReverso data={data} />
    </div>
  )
}

/**
 * Componente individual de previsualización e impresión: CARNET DE SEGURIDAD VIAL
 */
export function CarnetCursoVialPrint({ data }) {
  return (
    <PrintWrapper className="carnet-preview-wrap">
      <div className="carnet-wrapper">
        <CarnetCursoVialAnverso data={data} />
        <CarnetCursoVialReverso data={data} />
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión en lote: CARNETS DE SEGURIDAD VIAL
 * Distribución: 4 carnets completos por hoja A4 (2 columnas x 4 filas: Anversos y Reversos en pares)
 * Garantiza exactamente el formato solicitado (frentes arriba y dorsos abajo) sin desbordamiento de página.
 */
export function CarnetCursoVialLotePrint({ items = [] }) {
  if (!items || items.length === 0) return null

  // Dividir en grupos de hasta 4 carnets por hoja A4
  const chunks = []
  for (let i = 0; i < items.length; i += 4) {
    chunks.push(items.slice(i, i + 4))
  }

  return (
    typeof document !== 'undefined' && createPortal(
      <div id="seccion-impresion" className="seccion-impresion-portal seccion-lote-carnets">
        {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className="hoja-carnets-lote-a4">
            <div className="grid-carnets-4">
              {chunk.map((item, itemIndex) => (
                <CarnetCursoVialItem key={itemIndex} data={item} />
              ))}
            </div>
          </div>
        ))}
      </div>,
      document.body
    )
  )
}

/**
 * Componente oficial de impresión: CERTICAV (FICHA OFICIAL DE INSPECCIÓN TÉCNICA VEHICULAR)
 * Réplica exacta del formato municipal oficial (Ordenanza Nº 012-2012-MDJLO) en Hoja A4
 */
export function CerticavFichaPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?tipo=CERTICAV&reg=${encodeURIComponent(data.codigo || data.numeroInspeccion || '')}&placa=${encodeURIComponent(data.placa || data.vehiculoPlaca || '')}`

  // Extraer día, mes y año de la fecha de inspección
  const getFechaParts = () => {
    const raw = data.fecha || data.fechaExpedicion || new Date().toISOString().split('T')[0]
    const clean = String(raw).split('T')[0].split('-')
    if (clean.length === 3) {
      return {
        dia: clean[2].padStart(2, '0'),
        mes: clean[1].padStart(2, '0'),
        anio: clean[0].slice(-2), // 2 dígitos como en la ficha física (ej: 23, 26)
        anioCompleto: clean[0]
      }
    }
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      return {
        dia: String(d.getDate()).padStart(2, '0'),
        mes: String(d.getMonth() + 1).padStart(2, '0'),
        anio: String(d.getFullYear()).slice(-2),
        anioCompleto: String(d.getFullYear())
      }
    }
    return { dia: '—', mes: '—', anio: '—', anioCompleto: '—' }
  }

  const fParts = getFechaParts()

  // Formato del número de serie en rojo tipo sello municipal (7 dígitos, ej: 0008180)
  const formatSerieSello = () => {
    if (data.numeroSerieCerticav) {
      const digits = String(data.numeroSerieCerticav).replace(/\D/g, '')
      if (digits.length > 0) return digits.slice(-7).padStart(7, '0')
      return data.numeroSerieCerticav
    }
    const regDigits = String(data.numeroRegistro || data.numeroInspeccion || data.id || '1').replace(/\D/g, '')
    return regDigits.slice(-7).padStart(7, '0')
  }

  const serieSello = formatSerieSello()

  // Evaluación y resultado técnico
  const primeraEval = data.primeraEvaluacion || (data.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO')
  const isPrimeraAprobado = primeraEval === 'APROBADO'
  const isPrimeraDesaprobado = primeraEval === 'DESAPROBADO'

  const segundaEval = data.segundaEvaluacion || ''
  const isSegundaAprobado = segundaEval === 'APROBADO'
  const isSegundaDesaprobado = segundaEval === 'DESAPROBADO'

  // Cada ítem del acta corresponde al criterio con código CV-NN (NN = número del ítem).
  // Un ítem sin resultado registrado se imprime vacío, nunca como "B".
  const getCriterioVal = (numeroItem) => {
    if (!Array.isArray(data.detalles)) return ''
    const codigo = `CV-${String(numeroItem).padStart(2, '0')}`
    const found = data.detalles.find((d) => d.codigo === codigo)
    return found ? found.estado : ''
  }

  // Lista exacta de los 37 ítems oficiales de la ficha municipal organizados en 2 columnas
  const columnaIzquierda = [
    { tipo: 'header', titulo: 'SISTEMA ELECTRICO' },
    { id: 1, label: 'Encendido de máquina' },
    { id: 2, label: 'Velocímetro' },
    { id: 3, label: 'Sonido de Claxón' },
    { tipo: 'sub', label: 'Luces Direccionales' },
    { id: 4, label: '- Lado delantero derecho', isChild: true },
    { id: 5, label: '- Lado delantero izquierdo', isChild: true },
    { id: 6, label: '- Lado posterior derecho', isChild: true },
    { id: 7, label: '- Lado posterior izquierdo', isChild: true },
    { tipo: 'sub', label: 'Luces de faro delantero' },
    { id: 8, label: '- Luz de alta', isChild: true },
    { id: 9, label: '- Luz de baja', isChild: true },
    { tipo: 'sub', label: 'Luces de freno' },
    { id: 10, label: '- Lado delantero derecho', isChild: true },
    { id: 11, label: '- Lado delantero izquierdo', isChild: true },
    { id: 12, label: '- Lado posterior derecho', isChild: true },
    { id: 13, label: '- Lado posterior izquierdo', isChild: true },
    { tipo: 'sub', label: 'Luces de estacionamiento' },
    { id: 14, label: '- Lado delantero derecho', isChild: true },
    { id: 15, label: '- Lado delantero izquierdo', isChild: true },
    { id: 16, label: '- Lado posterior derecho', isChild: true },
    { id: 17, label: '- Lado posterior izquierdo', isChild: true },
    { tipo: 'header', titulo: 'ASPECTOS INTERIORES' },
    { id: 18, label: 'Tapiz del asiento' },
  ]

  const columnaDerecha = [
    { tipo: 'header', titulo: 'ESPECIFICACIONES MECÁNICAS' },
    { id: 19, label: 'Tubo de escape' },
    { id: 20, label: 'Acelerador' },
    { id: 21, label: 'Embrague' },
    { id: 22, label: 'Tapa de tanque de combustible' },
    { tipo: 'sub', label: 'Sistema de frenos' },
    { id: 23, label: '- Freno de pedal', isChild: true },
    { id: 24, label: '- Freno de mano auxiliar', isChild: true },
    { tipo: 'header', titulo: 'ASPECTOS EXTERIORES' },
    { id: 25, label: 'Espejos retrovisores' },
    { id: 26, label: 'Parabrisas transparente' },
    { id: 27, label: '- Visibilidad del parabrisas', isChild: true },
    { id: 28, label: 'Micas transparentes' },
    { id: 29, label: 'Placa original del vehículo' },
    { tipo: 'sub', label: 'Cinta reflectiva' },
    { id: 30, label: '- Lado izquierdo', isChild: true },
    { id: 31, label: '- Lado derecho', isChild: true },
    { id: 32, label: '- Lado posterior', isChild: true },
    { tipo: 'sub', label: 'Pintado' },
    { id: 33, label: '- Placa lado posterior del vehículo', isChild: true },
    { id: 34, label: '- Placa lado superior techo', isChild: true },
    { id: 35, label: '- Placa lado interior respaldar del conductor', isChild: true },
    { id: 36, label: 'Razón social transportador lado superior techo' },
    { id: 37, label: 'Razón social lado interior' },
  ]

  const renderCheckCell = (val, targetVal) => {
    const isChecked = val === targetVal
    return (
      <span style={{ fontWeight: 900, fontSize: '10pt', color: '#000000', display: 'inline-block', lineHeight: 1 }}>
        {isChecked ? '✓' : ''}
      </span>
    )
  }

  const renderTableSection = (items) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.6pt', border: '1.5px solid #000' }}>
      <thead>
        <tr style={{ background: '#004b93', color: '#ffffff', textAlign: 'left', lineHeight: 1.2 }}>
          <th style={{ padding: '2px 4px', borderRight: '1px solid #000', textTransform: 'uppercase', fontWeight: 900, fontSize: '8pt' }}>
            {items[0].titulo}
          </th>
          <th style={{ width: '18px', textAlign: 'center', borderRight: '1px solid #000', fontWeight: 900, padding: '2px 0' }}>B</th>
          <th style={{ width: '22px', textAlign: 'center', borderRight: '1px solid #000', fontWeight: 900, padding: '2px 0' }}>M.E.</th>
          <th style={{ width: '22px', textAlign: 'center', fontWeight: 900, padding: '2px 0' }}>N.T.</th>
        </tr>
      </thead>
      <tbody>
        {items.slice(1).map((item, idx) => {
          if (item.tipo === 'header') {
            return (
              <tr key={'hdr-' + idx} style={{ background: '#004b93', color: '#ffffff', lineHeight: 1.2 }}>
                <td style={{ padding: '2px 4px', borderTop: '1.5px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', textTransform: 'uppercase', fontWeight: 900, fontSize: '8pt' }}>
                  {item.titulo}
                </td>
                <td style={{ borderTop: '1.5px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>B</td>
                <td style={{ borderTop: '1.5px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>M.E.</td>
                <td style={{ borderTop: '1.5px solid #000', borderBottom: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>N.T.</td>
              </tr>
            )
          }

          if (item.tipo === 'sub') {
            return (
              <tr key={'sub-' + idx} style={{ background: '#f8fafc' }}>
                <td colSpan={4} style={{ padding: '2px 4px', borderBottom: '1px solid #000', fontWeight: 800, color: '#1e293b', fontSize: '7.4pt' }}>
                  {item.label}
                </td>
              </tr>
            )
          }

          const val = getCriterioVal(item.id)

          return (
            <tr key={'row-' + item.id} style={{ height: '17px', lineHeight: 1 }}>
              <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '1px 3px', paddingLeft: item.isChild ? '10px' : '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#000' }}>
                {item.label}
              </td>
              <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                {renderCheckCell(val, 'BIEN')}
              </td>
              <td style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                {renderCheckCell(val, 'MAL_ESTADO')}
              </td>
              <td style={{ borderBottom: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                {renderCheckCell(val, 'NO_TIENE')}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <PrintWrapper>
      <div className="ficha-certicav-a4">
        
        {/* CABECERA INSTITUCIONAL */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div />

          <div style={{ textAlign: 'center' }}>
            {/* El logo ya incluye "Municipalidad José Leonardo Ortiz". */}
            <img src="/escudo-jlo.png" alt="Municipalidad Distrital de José Leonardo Ortiz" style={{ height: '72px', width: 'auto', maxWidth: '100%', display: 'block', margin: '0 auto 4px' }} />
            <p style={{ fontSize: '6.5pt', fontWeight: 800, margin: '1px 0 0', color: '#004b93', textTransform: 'uppercase' }}>
              ORDENANZA MUNICIPAL Nº 012-2012-MDJLO
            </p>
            <p style={{ fontSize: '7.5pt', fontWeight: 800, margin: '1px 0 2px', color: '#004b93', textTransform: 'uppercase' }}>
              SUB GERENCIA DE TRANSITO - TRANSPORTES Y SEGURIDAD VIAL
            </p>
            <div style={{ background: '#004b93', color: '#fff', padding: '2px 6px', fontWeight: 900, fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '2px' }}>
              INSPECCIÓN TECNICA DE VEHICULOS MENORES
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ border: '2px solid #22c55e', borderRadius: '30px', padding: '4px 8px', background: '#ffffff', display: 'inline-block' }}>
              <span style={{ fontSize: '15pt', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', letterSpacing: '1px', lineHeight: 1 }}>
                {serieSello}
              </span>
            </div>
          </div>
        </div>

        {/* CUADRÍCULA DE DATOS DEL VEHÍCULO Y OPERADOR */}
        <div style={{ border: '1.5px solid #000', marginBottom: '6px', fontSize: '7.8pt' }}>
          {/* Fila 1: Registro, Marca y Serie */}
          <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', borderBottom: '1.5px solid #000' }}>
            <div style={{ padding: '2px 5px', borderRight: '1.5px solid #000' }}>
              <strong style={{ fontSize: '6pt', textTransform: 'uppercase', color: '#1e293b' }}>N° DE REGISTRO:</strong>{' '}
              <span style={{ fontSize: '7.8pt', fontWeight: 900, fontFamily: 'monospace' }}>
                {data.numeroRegistro || data.numeroInspeccion || '—'}
              </span>
            </div>
            <div style={{ padding: '2px 5px', borderRight: '1.5px solid #000' }}>
              <strong style={{ fontSize: '6pt', textTransform: 'uppercase', color: '#1e293b' }}>MARCA DE VEHICULO:</strong>{' '}
              <span style={{ fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase' }}>
                {data.vehiculoMarca || data.marca || '—'}
              </span>
            </div>
            <div style={{ padding: '2px 5px', textAlign: 'center', background: '#f8fafc' }}>
              <strong style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: '#004b93', fontWeight: 900 }}>
                N° SERIE CERTICAV
              </strong>
            </div>
          </div>

          {/* Cuerpo dividido en Izquierda (Transportador / Conductor) y Derecha (Fecha / Placa / Motor) */}
          <div style={{ display: 'grid', gridTemplateColumns: '62% 38%' }}>
            
            {/* Lado Izquierdo */}
            <div style={{ borderRight: '1.5px solid #000' }}>
              <div style={{ padding: '2px 5px', borderBottom: '1px solid #000' }}>
                <strong style={{ fontSize: '6pt', display: 'block', textTransform: 'uppercase', color: '#334155' }}>
                  RAZON SOCIAL DEL TRANSPORTADOR:
                </strong>
                <span style={{ fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
                  {data.transportador || data.asociacion || 'INDEPENDIENTE'}
                </span>
              </div>

              <div style={{ padding: '2px 5px', borderBottom: '1px solid #000' }}>
                <strong style={{ fontSize: '6pt', display: 'block', textTransform: 'uppercase', color: '#334155' }}>
                  PROPIETARIO DEL VEHICULO:
                </strong>
                <span style={{ fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
                  {data.propietario || '—'}
                </span>
              </div>

              <div style={{ padding: '2px 5px', borderBottom: '1px solid #000' }}>
                <strong style={{ fontSize: '6pt', display: 'block', textTransform: 'uppercase', color: '#334155' }}>
                  CONDUCTOR:
                </strong>
                <span style={{ fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
                  {data.conductorNombre || data.conductor || (data.propietario ? 'ÍDEM' : '—')}
                </span>
              </div>

              <div style={{ padding: '2px 5px' }}>
                <strong style={{ fontSize: '6pt', display: 'block', textTransform: 'uppercase', color: '#334155' }}>
                  N° LICENCIA DE CONDUCTOR:
                </strong>
                <span style={{ fontSize: '7.5pt', fontWeight: 900, fontFamily: 'monospace', color: '#000' }}>
                  {data.conductorLicencia || data.numeroLicencia || data.propietarioDni || data.conductorDni || '—'}
                </span>
              </div>
            </div>

            {/* Lado Derecho */}
            <div>
              {/* Fecha en 3 casillas */}
              <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', borderBottom: '1px solid #000', alignItems: 'center' }}>
                <div style={{ padding: '2px 4px', borderRight: '1px solid #000' }}>
                  <strong style={{ fontSize: '6pt', textTransform: 'uppercase' }}>FECHA</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', fontSize: '7pt', fontWeight: 900 }}>
                  <span style={{ borderRight: '1px solid #000', padding: '2px 0' }}>{fParts.dia}</span>
                  <span style={{ borderRight: '1px solid #000', padding: '2px 0' }}>{fParts.mes}</span>
                  <span style={{ padding: '2px 0' }}>{fParts.anio}</span>
                </div>
              </div>

              {/* Placa */}
              <div style={{ padding: '2px 5px', borderBottom: '1px solid #000' }}>
                <strong style={{ fontSize: '6pt', display: 'block', textTransform: 'uppercase' }}>N° DE PLACA:</strong>
                <span style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.5px', color: '#000' }}>
                  {data.placa || data.vehiculoPlaca || '—'}
                </span>
              </div>

              {/* Año de Fabricación */}
              <div style={{ padding: '2px 5px', borderBottom: '1px solid #000' }}>
                <strong style={{ fontSize: '6pt', textTransform: 'uppercase' }}>AÑO DE FABRICACIÓN:</strong>{' '}
                <span style={{ fontSize: '7.5pt', fontWeight: 900, fontFamily: 'monospace' }}>
                  {data.vehiculoAnio || data.anioFabricacion || '—'}
                </span>
              </div>

              {/* Modelo y Motor */}
              <div style={{ display: 'grid', gridTemplateColumns: '50% 50%' }}>
                <div style={{ padding: '2px 4px', borderRight: '1px solid #000' }}>
                  <strong style={{ fontSize: '5.8pt', display: 'block', textTransform: 'uppercase' }}>MODELO:</strong>
                  <span style={{ fontSize: '6.8pt', fontWeight: 800, textTransform: 'uppercase' }}>
                    {data.vehiculoModelo || data.modelo || '—'}
                  </span>
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <strong style={{ fontSize: '5.8pt', display: 'block', textTransform: 'uppercase' }}>N° MOTOR:</strong>
                  <span style={{ fontSize: '6.8pt', fontWeight: 800, fontFamily: 'monospace' }}>
                    {data.numeroMotor || data.vehiculoMotor || '—'}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* CHECKLIST DE INSPECCIÓN EN 2 COLUMNAS SIMÉTRICAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '49.5% 49.5%', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div>{renderTableSection(columnaIzquierda)}</div>
          <div>{renderTableSection(columnaDerecha)}</div>
        </div>

        {/* BLOQUE DE EVALUACIÓN Y LEYENDA */}
        <div style={{ display: 'grid', gridTemplateColumns: '32% 32% 36%', border: '1.5px solid #000', marginBottom: '5px', fontSize: '6.5pt', alignItems: 'center' }}>
          
          {/* Primera Evaluación */}
          <div style={{ borderRight: '1.5px solid #000', padding: '3px 5px' }}>
            <div style={{ background: '#004b93', color: '#fff', padding: '1px 3px', fontWeight: 900, fontSize: '6.2pt', textAlign: 'center', marginBottom: '2px' }}>
              PRIMERA EVALUACIÓN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontWeight: 800, fontSize: '6.5pt' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                APROBADO <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', textAlign: 'center', lineHeight: '11px', fontWeight: 900 }}>{isPrimeraAprobado ? '✓' : ''}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                DESAPROBADO <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', textAlign: 'center', lineHeight: '11px', fontWeight: 900 }}>{isPrimeraDesaprobado ? '✓' : ''}</span>
              </span>
            </div>
          </div>

          {/* Segunda Evaluación */}
          <div style={{ borderRight: '1.5px solid #000', padding: '3px 5px' }}>
            <div style={{ background: '#004b93', color: '#fff', padding: '1px 3px', fontWeight: 900, fontSize: '6.2pt', textAlign: 'center', marginBottom: '2px' }}>
              SEGUNDA EVALUACIÓN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontWeight: 800, fontSize: '6.5pt' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                APROBADO <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', textAlign: 'center', lineHeight: '11px', fontWeight: 900 }}>{isSegundaAprobado ? '✓' : ''}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                DESAPROBADO <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', textAlign: 'center', lineHeight: '11px', fontWeight: 900 }}>{isSegundaDesaprobado ? '✓' : ''}</span>
              </span>
            </div>
          </div>

          {/* Leyenda */}
          <div style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 900, fontSize: '6.5pt', letterSpacing: '0.2px' }}>
            B = BIEN · M.E. = MAL ESTADO · N.T. = NO TIENE
          </div>
        </div>

        {/* RESPONSABLES Y FIRMAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '49.5% 49.5%', justifyContent: 'space-between', border: '1.5px solid #000', marginBottom: '5px', fontSize: '6.8pt' }}>
          
          {/* Técnico Responsable */}
          <div style={{ borderRight: '1.5px solid #000', padding: '3px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '52px' }}>
            <div style={{ background: '#004b93', color: '#fff', padding: '1px 4px', fontWeight: 900, fontSize: '6.2pt', textTransform: 'uppercase' }}>
              TECNICO RESPONSABLE:
            </div>
            <div style={{ marginTop: '2px' }}>
              <span style={{ fontSize: '6.2pt', color: '#334155' }}>Nombre: </span>
              <strong style={{ textTransform: 'uppercase', fontSize: '7.2pt' }}>
                {data.inspector || '—'}
              </strong>
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px dotted #64748b', paddingTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '6.2pt', color: '#334155' }}>Firma y Sello:</span>
              <span style={{ fontSize: '5.5pt', color: '#64748b' }}>Subgerencia de Tránsito y Transporte - MDJLO</span>
            </div>
          </div>

          {/* Propietario / Conductor */}
          <div style={{ padding: '3px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '52px' }}>
            <div style={{ background: '#004b93', color: '#fff', padding: '1px 4px', fontWeight: 900, fontSize: '6.2pt', textTransform: 'uppercase' }}>
              PROPIETARIO Y/O CONDUCTOR DEL VEHICULO:
            </div>
            <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '6.2pt', color: '#334155' }}>Nombre: </span>
                <strong style={{ textTransform: 'uppercase', fontSize: '7.2pt' }}>
                  {data.conductorNombre || data.propietario || '—'}
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '6.2pt', color: '#334155' }}>D.N.I. Nº: </span>
                <strong style={{ fontFamily: 'monospace', fontSize: '7.2pt' }}>
                  {data.conductorDni || data.propietarioDni || data.dni || '—'}
                </strong>
              </div>
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px dotted #64748b', paddingTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '6.2pt', color: '#334155' }}>Firma:</span>
              <span style={{ fontSize: '5.5pt', color: '#64748b' }}>Conductor / Titular Evaluado</span>
            </div>
          </div>

        </div>

        {/* PIE LEGAL CON QR DE SEGURIDAD DIGITAL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 45px', gap: '6px', alignItems: 'center', borderTop: '1px solid #000', paddingTop: '2px' }}>
          <p style={{ fontSize: '5.5pt', color: '#000', margin: 0, lineHeight: 1.25, textAlign: 'justify' }}>
            <strong>Nota:</strong> Se otorgará un plazo de cinco (5) días para subsanar las observaciones para una 2da. evaluación, de corresponder. Declaro bajo juramento que los datos consignados en la presente Declaración Jurada son verdaderos, en caso contrario me someto a las acciones y sanciones contempladas en la Ley del Procedimiento Administrativo General Nº 27444.
          </p>
          <div style={{ textAlign: 'center' }}>
            <QRCodeSVG value={qrRaw} size={40} level="M" includeMargin={false} />
            <span style={{ fontSize: '4pt', fontWeight: 800, color: '#004b93', display: 'block', lineHeight: 1, marginTop: '1px' }}>
              VAL. DIGITAL
            </span>
          </div>
        </div>

      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión: CONSTANCIA DE REGISTRO SOAT VEHICULAR (Hoja A4 Oficial)
 */
export function SoatConstanciaPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?tipo=SOAT&reg=${encodeURIComponent(data.codigo || '')}&placa=${encodeURIComponent(data.placa || data.vehiculoPlaca || '')}`

  return (
    <PrintWrapper>
      <div className="constancia-soat-a4">
        {/* Cabecera institucional */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '3px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/escudo-jlo.png" alt="MDJLO" style={{ width: '36px', height: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '8.5pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Municipalidad Distrital de José Leonardo Ortiz
              </h2>
              <h3 style={{ fontSize: '7pt', fontWeight: 700, margin: '1px 0 0', color: '#475569', textTransform: 'uppercase' }}>
                Gerencia de Seguridad Ciudadana y Fiscalización · Subgerencia de Tránsito y Transporte
              </h3>
              <p style={{ fontSize: '6.5pt', fontWeight: 800, color: '#0369a1', margin: '1px 0 0' }}>
                CONSTANCIA DE REGISTRO Y VIGENCIA DE SEGURO OBLIGATORIO (SOAT VEHICULAR)
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ border: '1.5px solid #0284c7', padding: '2px 8px', borderRadius: '4px', background: '#f0f9ff' }}>
              <span style={{ fontSize: '5.5pt', fontWeight: 800, display: 'block', color: '#0369a1' }}>N° REGISTRO SOAT</span>
              <span style={{ fontSize: '8.5pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                {data.codigo || 'SOAT-2026-001'}
              </span>
            </div>
          </div>
        </div>

        {/* Banner de Verificación */}
        <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: '4px', padding: '4px 8px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '7pt', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', display: 'block' }}>
              DOCUMENTO VÁLIDO PARA PRESTACIÓN DEL SERVICIO PÚBLICO ESPECIAL DE PASAJEROS
            </span>
            <p style={{ fontSize: '6pt', color: '#166534', margin: '1px 0 0' }}>
              La Subgerencia de Tránsito certifica que el vehículo menor cuenta con póliza vigente registrada en el sistema oficial municipal.
            </p>
          </div>
          <span style={{ background: '#16a34a', color: '#fff', fontSize: '7.5pt', fontWeight: 900, padding: '2px 8px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
            ESTADO: VIGENTE
          </span>
        </div>

        {/* Datos de la Póliza */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '5px 8px', marginBottom: '6px', background: '#f8fafc' }}>
          <h4 style={{ fontSize: '7pt', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
            1. Información de la Póliza de Seguro
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '7pt' }}>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>COMPAÑÍA ASEGURADORA:</strong>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{data.aseguradora || 'LA POSITIVA SEGUROS / RIMAC'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>N° DE PÓLIZA / CERTIFICADO:</strong>
              <span style={{ fontWeight: 900, fontFamily: 'monospace', color: '#0284c7' }}>{data.codigo || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>TIPO DE COBERTURA:</strong>
              <span style={{ fontWeight: 700 }}>SERVICIO ESPECIAL (TRIMÓVIL)</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>FECHA DE EXPEDICIÓN:</strong>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.fechaExpedicion || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>FECHA DE VENCIMIENTO:</strong>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#b91c1c' }}>{data.fechaVencimiento || data.fechaExpiracion || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>FISCALIZACIÓN SBS:</strong>
              <span style={{ fontWeight: 700, color: '#15803d' }}>CONFORME / REGISTRADO</span>
            </div>
          </div>
        </div>

        {/* Datos del Vehículo y Titular */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '5px 8px', marginBottom: '6px', background: '#f8fafc' }}>
          <h4 style={{ fontSize: '7pt', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
            2. Identificación del Vehículo y Propietario
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '7pt' }}>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>PLACA DE RODAJE:</strong>
              <span style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>{data.placa || data.vehiculoPlaca || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>PROPIETARIO / TITULAR:</strong>
              <span style={{ fontWeight: 800 }}>{data.propietario || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>DNI / RUC DEL PROPIETARIO:</strong>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.propietarioDni || data.dni || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>MARCA / MODELO:</strong>
              <span>{data.vehiculoMarca || 'WANXIN'} / {data.vehiculoModelo || 'WX-200'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>N° MOTOR / SERIE:</strong>
              <span style={{ fontFamily: 'monospace' }}>{data.numeroMotor || data.vehiculoMotor || '—'}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', display: 'block', fontSize: '5.5pt' }}>EMPRESA / ASOCIACIÓN:</strong>
              <span style={{ fontWeight: 700 }}>{data.asociacion || 'Independiente'}</span>
            </div>
          </div>
        </div>

        {/* Validación y QR */}
        <div style={{ display: 'grid', gridTemplateColumns: '78% 22%', gap: '8px', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: '4px', marginBottom: '8px' }}>
          <div>
            <strong style={{ fontSize: '6.5pt', textTransform: 'uppercase', color: '#0f172a', display: 'block' }}>
              DECLARACIÓN INSTITUCIONAL DE CONTROL VIAL:
            </strong>
            <p style={{ fontSize: '6pt', color: '#475569', margin: '2px 0 0', lineHeight: 1.25 }}>
              La presente constancia certifica que los datos del SOAT coinciden con el registro físico y digital verificado por la Subgerencia de Tránsito y Transporte de la Municipalidad Distrital de José Leonardo Ortiz, autorizando la tramitación complementaria de la Tarjeta Única de Circulación (TUC).
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={qrRaw} size={48} level="M" includeMargin={false} />
            <span style={{ fontSize: '5pt', fontWeight: 700, color: '#64748b', marginTop: '1px' }}>CONSULTA QR</span>
          </div>
        </div>

        {/* Firmas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px', textAlign: 'center', marginTop: '8px' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '2px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '6.5pt', display: 'block', color: '#0f172a' }}>RESPONSABLE DE FISCALIZACIÓN SOAT</strong>
              <span style={{ fontSize: '5.5pt', color: '#64748b' }}>Subgerencia de Tránsito y Transporte - MDJLO</span>
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '2px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '6.5pt', display: 'block', color: '#0f172a' }}>SUBGERENTE DE TRÁNSITO Y TRANSPORTE</strong>
              <span style={{ fontSize: '5.5pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión: AUTORIZACIÓN DE CARGA Y DESCARGA (Hoja A4 Oficial MDJLO)
 * Fiel a las resoluciones emitidas por la Subgerencia de Tránsito y Transporte (Fotos oficiales)
 */
export function AutorizacionCargaDescargaPrint({ data }) {
  const qrRaw = `https://munijlo.gob.pe/transito/validar?tipo=AUT_CARGA&nro=${encodeURIComponent(data.numeroAutorizacion || '')}&placa=${encodeURIComponent(data.vehiculoPlaca || '')}`
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const parts = String(dateStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      const mIdx = parseInt(parts[1], 10) - 1
      return `${parts[2]} DE ${months[mIdx] || parts[1]} DEL ${parts[0]}`
    }
    return dateStr
  }

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—'
    const parts = String(dateStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      const mIdx = parseInt(parts[1], 10) - 1
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`
    }
    return dateStr
  }

  const fechaInicioTxt = formatShortDate(data.fechaInicioVigencia)
  const fechaFinTxt = formatShortDate(data.fechaFinVigencia)
  const fechaEmisionTxt = formatDate(data.fechaEmision || new Date().toISOString())

  return (
    <PrintWrapper>
      <div className="autorizacion-carga-a4" style={{ fontSize: '7.2pt', lineHeight: 1.22 }}>
        {/* CABECERA OFICIAL CON ESCUDO NACIONAL Y MDJLO */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 140px', alignItems: 'center', gap: '8px', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '4px' }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/escudo-jlo.png" alt="MDJLO" style={{ width: '50px', height: 'auto', display: 'inline-block' }} />
            <div style={{ fontSize: '6pt', fontWeight: 900, textTransform: 'uppercase', marginTop: '2px', color: '#1e293b' }}>
              MUNICIPIOS
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '8.5pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              MUNICIPALIDAD DISTRITAL DE JOSE LEONARDO ORTIZ
            </h1>
            <h2 style={{ fontSize: '7.5pt', fontWeight: 800, margin: '1px 0 0', textTransform: 'uppercase' }}>
              SUBGERENCIA DE TRANSITO TRANSPORTE Y VIALIDAD
            </h2>
            <p style={{ fontSize: '5.5pt', fontStyle: 'italic', margin: '2px 0 0', color: '#334155' }}>
              "Año del Bicentenario, de la consolidación de nuestra Independencia, y de la conmemoración de las heroicas batallas de Junín y Ayacucho"
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '6pt', lineHeight: 1.2 }}>
            <div style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
              Jose Leonardo Ortiz {data.fechaEmision ? formatShortDate(data.fechaEmision) : ''}
            </div>
            <div style={{ marginTop: '2px' }}>
              <strong>N° seguridad:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{data.numeroSeguridad || '13058'}</span>
            </div>
          </div>
        </div>

        {/* CÓDIGO EXPEDIENTE INSTITUCIONAL */}
        <div style={{ fontSize: '6.5pt', fontWeight: 'bold', marginBottom: '4px' }}>
          AUTORIZACION DE CARGA Y DESCARGA {data.numeroAutorizacion || '000000-2024-MDJLO/GSCFT/SGTTV'} [{data.expediente || '5294 - 1'}]
        </div>

        {/* DESTINATARIO Y REFERENCIA */}
        <div style={{ fontSize: '7.5pt', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', lineHeight: 1.25 }}>
          {data.representanteLegal && <div>{data.representanteLegal}</div>}
          <div style={{ color: '#004b93' }}>{data.solicitanteNombre || data.solicitante || 'EMPRESA SOLICITANTE'}</div>
          <div style={{ fontSize: '6.5pt', fontWeight: 700, marginTop: '2px' }}>
            ASUNTO: <span style={{ fontWeight: 900 }}>{data.asunto || 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA'}</span>
          </div>
          <div style={{ fontSize: '6.5pt', fontWeight: 700 }}>
            REFERENCIA: <span style={{ fontFamily: 'monospace' }}>{data.referenciaSisgedo || ('SISGEDO N° ' + (data.expediente || '5294-2024-UTD'))}</span>
          </div>
        </div>

        {/* CUADRO INSTITUCIONAL DE 3 CASILLAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #000', textAlign: 'center', fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>
          <div style={{ padding: '3px 4px', borderRight: '1px solid #000' }}>
            Municipalidad Distrital<br />de José Leonardo Ortiz
          </div>
          <div style={{ padding: '3px 4px', borderRight: '1px solid #000' }}>
            Gerencia de Seguridad Ciudadana<br />fiscalización y Transportes
          </div>
          <div style={{ padding: '3px 4px' }}>
            Sub Gerencia de Tránsito<br />Transporte y Vialidad
          </div>
        </div>

        {/* TÍTULO PRINCIPAL DE LA AUTORIZACIÓN */}
        <div style={{ textAlign: 'center', border: '1.5px solid #000', padding: '3px', background: '#f8fafc', marginBottom: '5px' }}>
          <h2 style={{ fontSize: '10.5pt', fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
            AUTORIZACION DE CARGA Y DESCARGA N° {data.numeroAutorizacion || '038-2024-SGTTV'}
          </h2>
          <div style={{ fontSize: '7pt', fontWeight: 800, marginTop: '1px' }}>
            EXPEDIENTE .UTD- <span style={{ fontFamily: 'monospace' }}>{data.expediente || '5294-24-'}</span> &nbsp;&nbsp;&nbsp;&nbsp; REGISTRO N° <span style={{ fontFamily: 'monospace' }}>{data.registroNumero || '610'}</span>
          </div>
        </div>

        {/* BLOQUE "AUTORIZA A" Y "VEHÍCULO AUTORIZADO" */}
        <div style={{ border: '1.5px solid #000', padding: '4px 6px', marginBottom: '5px' }}>
          <div style={{ textAlign: 'center', fontSize: '9pt', fontWeight: 900, textDecoration: 'underline', marginBottom: '3px' }}>
            AUTORIZA
          </div>
          
          <div style={{ fontSize: '8pt', marginBottom: '2px' }}>
            <strong>A:</strong> <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{data.solicitanteNombre || data.solicitante}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt', borderTop: '1px dashed #94a3b8', paddingTop: '2px', marginTop: '2px' }}>
            <span><strong>VEHICULO AUTORIZADO</strong></span>
            <span style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#fff', padding: '1px 6px', borderRadius: '2px' }}>
              PLACA N° {data.vehiculoPlaca || '—'}
            </span>
          </div>

          <div style={{ fontSize: '7.5pt', fontWeight: 800, marginTop: '3px', color: '#0f172a' }}>
            CIRCULAR DENTRO DEL ANILLO VIAL: <span style={{ textDecoration: 'underline' }}>{data.horarioInicio && data.horarioFin ? `${data.horarioInicio.slice(0, 5)} - ${data.horarioFin.slice(0, 5)} hrs (del día siguiente)` : '4.00 PM - 05.00 AM (del día siguiente)'}</span>
          </div>
        </div>

        {/* VIGENCIA */}
        <div style={{ border: '1.5px solid #000', padding: '3px 6px', textAlign: 'center', marginBottom: '5px', background: '#f8fafc' }}>
          <div style={{ fontSize: '7.5pt', fontWeight: 900, textTransform: 'uppercase' }}>
            AUTORIZACION VALIDA
          </div>
          <div style={{ fontSize: '8pt', fontWeight: 900 }}>
            DEL {fechaInicioTxt} - HASTA {fechaFinTxt} - VIGENCIA 01 AÑO
          </div>
        </div>

        {/* BASE LEGAL */}
        <div style={{ marginBottom: '4px', fontSize: '6pt', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 900, textDecoration: 'underline', marginBottom: '1px' }}>BASE LEGAL:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px' }}>
            <div>❖ Art. 42° de la Ley N° 27972-LOM.</div>
            <div>❖ Art. 76° Numeral 76.1- Ley N° 27444.</div>
            <div>❖ Art. 81-LOM.</div>
            <div>❖ Art. 1° LEY N° 27181</div>
            <div>❖ O. M. N°013-2023-MDJLO</div>
            <div>❖ O.M. N°0027-2015-MDJLO</div>
          </div>
          <div style={{ marginTop: '1px' }}>
            ❖ TEXTO UNICO ORDENADO DE LA LEY N° 27444 LEY DEL PROCEDIMIENTO ADMINISTRATIVO GENERAL D.S. N° 004-2019-JUS ART. IV. PRINCIPIOS DEL PROCEDIMIENTO ADM. INCISO 1.1 - PRINCIPIO DE LEGALIDAD- 1.7 PRINCIPIO DE PRESUNCION DE VERACIDAD.
          </div>
        </div>

        {/* PARÁMETROS SUJETO A CONTROL */}
        <div style={{ marginBottom: '4px', fontSize: '6pt', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 900, textDecoration: 'underline', marginBottom: '1px' }}>PARAMETROS SUJETO A CONTROL:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px' }}>
            <div>❖ Acatar de forma estricta los horarios permitidos y zonas de circulación.</div>
            <div>❖ Esta Autorización es válida solamente en Original</div>
            <div>❖ La presente no amerita el otorgamiento de la Autorización definitiva</div>
            <div>❖ En caso de ruptura del pavimento asfaltico y/o vereda será repuesto por la empresa.</div>
            <div>❖ Prohibido estacionarse en lugares que puedan constituir un peligro u obstáculo a la circulación peatonal.</div>
            <div>❖ Prohibido cargar o descargar interrumpiendo el tránsito o poniendo en riesgo la seguridad vial</div>
          </div>
          <div style={{ marginTop: '1px', fontWeight: 'bold' }}>
            ❖ En caso de incumplimiento o de contravenir esta autorización quedará sin efecto y/o anulación automática.
          </div>
        </div>

        {/* NOTA DE PROHIBICIÓN DE ESTACIONAMIENTO PERMANENTE */}
        <div style={{ border: '1px solid #000', padding: '3px 5px', fontSize: '5.8pt', fontWeight: 'bold', lineHeight: 1.2, background: '#fff', marginBottom: '4px' }}>
          NOTA: EL VEHICULO QUE EFECTUA LA CARGA O DESCARGA NO PODRA PERMANECER ESTACIONADO DESPUES DE REALIZADA LA ACCION PARA LO QUE FUE AUTORIZADO EN CASO DE INCUMPLIMIENTO EL PERMISO QUEDARA SIN EFECTO QUEDANDO SUJETO A LA INFRACCION E INTERNAMIENTO DEL VEHICULO.
        </div>

        {/* CONSTANCIA DE PAGO / RECIBO DE INGRESO */}
        <div style={{ border: '1px dashed #000', padding: '3px 6px', fontSize: '6.5pt', marginBottom: '6px' }}>
          <div style={{ fontWeight: 'bold' }}>
            EL ADMINISTRADO HA CANCELADO SU DERECHO DE TRAMITE MEDIANTE:
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
            <span>
              RECIBO DE INGRESO N° <strong style={{ fontFamily: 'monospace' }}>{data.reciboIngresoNumero || '202400028830'}</strong> — POR EL MONTO DE <strong>S/ {Number(data.reciboIngresoMonto || 1030).toFixed(2)}</strong> — FECHA: <strong>{data.reciboIngresoFecha ? formatShortDate(data.reciboIngresoFecha) : formatShortDate(data.fechaEmision)}</strong>
            </span>
            <span>
              Tonelaje: <strong style={{ textDecoration: 'underline' }}>{data.tonelaje || '03 A 07-TM'}</strong>
            </span>
          </div>
        </div>

        {/* PIE DE PÁGINA, SELLO Y FIRMA */}
        <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', alignItems: 'end', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '5.8pt', textTransform: 'uppercase', lineHeight: 1.2, color: '#334155' }}>
              LA SUB GERENCIA DE TRANSITO, TRANSPORTE Y VIALIDAD, DE LA MUNICIPALIDAD DISTRITAL DE JOSE LEONARDO ORTIZ, DE CONFORMIDAD AL TEXTO UNICO DE PROCEDIMIENTOS ADMINISTRATIVOS - TUPA 2020, APROBADO CON ORDENANZA MUNICIPAL N° 014-2019-MDJLO.
            </div>
            <div style={{ marginTop: '8px', fontSize: '7pt', fontWeight: 900 }}>
              JOSE LEONARDO ORTIZ, {fechaEmisionTxt}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <QRCodeSVG value={qrRaw} size={50} level="M" includeMargin={false} />
              <span style={{ fontSize: '5pt', fontFamily: 'monospace', color: '#64748b', marginTop: '1px' }}>VALIDACIÓN OFICIAL</span>
            </div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '100%' }}>
              <div style={{ fontSize: '6.5pt', fontWeight: 900 }}>SUB GERENCIA DE TRANSITO</div>
              <div style={{ fontSize: '5.5pt', fontWeight: 700 }}>TRANSPORTE Y VIALIDAD</div>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión: AUTORIZACIÓN PROVISIONAL DE USO DE VÍAS (Hoja A4 Oficial MDJLO)
 * Fiel al documento municipal físico (Foto 3)
 */
export function AutorizacionUsoViasPrint({ data }) {
  const qrRaw = `https://munijlo.gob.pe/transito/validar?tipo=AUT_VIAS&nro=${encodeURIComponent(data.numeroAutorizacion || '')}&sol=${encodeURIComponent(data.solicitanteNombre || data.solicitante || '')}`

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—'
    const parts = String(dateStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      const mIdx = parseInt(parts[1], 10) - 1
      return `${parts[2]} de ${months[mIdx] || parts[1]} del ${parts[0]}`
    }
    return dateStr
  }

  // Parsear placas de la flota
  const placasList = data.flotaPlacas
    ? data.flotaPlacas.split(/[,;\n\t]+/).map(p => p.trim()).filter(Boolean)
    : [data.vehiculoPlaca || 'M4-5678', 'M4-9012', '1234-5B', '6789-9A', '5432-1C']

  return (
    <PrintWrapper>
      <div className="autorizacion-vias-a4" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
        {/* CABECERA NORMATIVA TUPA */}
        <div style={{ fontSize: '6.2pt', textAlign: 'justify', lineHeight: 1.2, marginBottom: '8px', color: '#1e293b' }}>
          DE LA MUNICIPALIDAD DISTRITAL DE JOSE LEONARDO ORTIZ, DE CONFORMIDAD AL TEXTO UNICO DE PROCEDIMIENTOS ADMINISTRATIVOS – TUPA 2020, APROBADO CON ORDENANZA MUNICIPAL N° 014-2019-MDJLO DE FECHA 31/12/19, PUBLICADA EL 06 DE NOVIEMBRE DEL 2020, CONVENIOS Y DEMAS NORMAS COMPLEMENTARIAS VIGENTES, EXPIDE LA PRESENTE:
        </div>

        {/* TÍTULO PRINCIPAL */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '11pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AUTORIZACION PROVISIONAL DE USO DE VIAS N° {data.numeroAutorizacion || '015-2024-MDJLO/SGTTYV'}
          </h2>
        </div>

        {/* LISTADO DE DATOS DE LA EMPRESA Y RECORRIDO */}
        <div style={{ spaceY: '4px', marginBottom: '8px', fontSize: '8pt' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>EMPRESA DE TRANSPORTE</strong>
            <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>: {data.solicitanteNombre || data.solicitante || '—'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>REPRESENTANTE LEGAL</strong>
            <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>: {data.representanteLegal || '—'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>PERIODO DE VIGENCIA</strong>
            <span style={{ fontWeight: 800 }}>: DEL {formatShortDate(data.fechaInicioVigencia)} AL {formatShortDate(data.fechaFinVigencia)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>UBICACIÓN</strong>
            <span style={{ fontWeight: 700 }}>: {data.ubicacion || data.zonaCirculacion || 'Jurisdicción del Distrito de José Leonardo Ortiz'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>RECORRIDO DE INGRESO</strong>
            <span style={{ fontWeight: 700 }}>: {data.recorridoIngreso || 'Av. Balta, Av. Chiclayo, Calle Kennedy'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', padding: '2px 0' }}>
            <strong>RECORRIDO DE SALIDA</strong>
            <span style={{ fontWeight: 700 }}>: {data.recorridoSalida || 'Calle Leguía, Av. México, Av. Sáenz Peña'}</span>
          </div>
        </div>

        {/* FLOTA VEHICULAR POR PLACAS (TABLA CUADRICULADA) */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '7.8pt', fontWeight: 900, marginBottom: '3px' }}>
            FLOTA VEHICULAR : SEGÚN PLACA DE VEHICULOS:
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '7.5pt', textAlign: 'center' }}>
            <tbody>
              {Array.from({ length: Math.ceil(Math.max(placasList.length, 10) / 5) }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {[0, 1, 2, 3, 4].map(colIdx => {
                    const plate = placasList[rowIdx * 5 + colIdx]
                    return (
                      <td
                        key={colIdx}
                        style={{
                          border: '1px solid #000',
                          padding: '3px 4px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          height: '18px',
                          background: plate ? '#fff' : '#f8fafc'
                        }}
                      >
                        {plate || ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* OBSERVACIÓN Y CANCELACIÓN */}
        <div style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '7.2pt', marginBottom: '8px', background: '#fff' }}>
          <div>
            <strong>OBSERVACION:</strong> {data.observaciones || 'Se otorga de manera provisional sujeta a fiscalización continua.'}
          </div>
          <div style={{ marginTop: '3px', fontWeight: 'bold' }}>
            LA EMPRESA EN MENCION HA CANCELADO CON RECIBO DE INGRESO N° <span style={{ fontFamily: 'monospace' }}>{data.reciboIngresoNumero || '202400031120'}</span> LA CANTIDAD DE S/ {Number(data.reciboIngresoMonto || 850).toFixed(2)}, sumando en total S/ {Number(data.reciboIngresoMonto || 850).toFixed(2)}
          </div>
        </div>

        {/* RECOMENDACIONES Y NORMAS */}
        <div style={{ fontSize: '6.5pt', lineHeight: 1.25, marginBottom: '10px' }}>
          <div style={{ fontWeight: 900, marginBottom: '2px' }}>
            EN CASO DE REORDENAMIENTO DEL TRANSITO VEHICULAR; LA PRESENTE AUTORIZACION SE REALIZARÁ LA VARIACION DE RECORRIDO
          </div>
          <div style={{ fontWeight: 900, marginBottom: '1px' }}>
            SE RECOMIENDA OBLIGATORIAMENTE:
          </div>
          <div style={{ paddingLeft: '10px' }}>
            <div>✓ UBICAR LA PRESENTE EN UN LUGAR VISIBLE DENTRO DEL VEHÍCULO.</div>
            <div>✓ PAGAR EL RECIBO CORRESPONDIENTE AL DERECHO DE PARQUEO.</div>
            <div>✓ UBICAR Y MANTENER VISIBLE EL PANEL O CARTEL DE IDENTIFICACION DE LA EMPRESA.</div>
          </div>
          <p style={{ margin: '3px 0 1px' }}>
            La Empresa se compromete a evitar el congestionamiento vehicular en las vías por donde realizan su recorrido.
          </p>
          <p style={{ margin: '1px 0' }}>
            Así mismo cumplirá con las normas y reglamento de tránsito y transportes; queda entendido que de incumplir cualquiera de las recomendaciones; se procederá a anular la presente autorización provisional.
          </p>
          <p style={{ margin: '1px 0', fontStyle: 'italic' }}>
            Invocamos a las autoridades competentes otorgar las facilidades pertinentes para el estricto cumplimiento de la presente autorización provisional.
          </p>
        </div>

        {/* PIE DE PÁGINA, FECHA, EXPEDIENTE Y FIRMA */}
        <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', alignItems: 'end', borderTop: '1px solid #000', paddingTop: '6px' }}>
          <div>
            <div style={{ fontSize: '7.5pt', fontWeight: 800 }}>
              Se expide la presente, José L. Ortiz, {data.fechaEmision ? formatShortDate(data.fechaEmision) : 'del 2024'}.
            </div>
            <div style={{ fontSize: '6.8pt', marginTop: '3px' }}>
              <strong>EXPEDIENTE:</strong> N° {data.expediente || 'S/N'} &nbsp;&nbsp;&nbsp;&nbsp; <strong>REG. N°</strong> {data.registroNumero || 'S/N'}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
              <QRCodeSVG value={qrRaw} size={50} level="M" includeMargin={false} />
            </div>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2px', width: '80%', margin: '0 auto' }}>
              <div style={{ fontSize: '7pt', fontWeight: 900 }}>SUB GERENCIA DE TRANSITO</div>
              <div style={{ fontSize: '5.5pt', color: '#475569' }}>Transporte y Vialidad - MDJLO</div>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión: PERMISO DE CONTROL VEHICULAR (Hoja A4 Oficial MDJLO)
 */
export function AutorizacionControlVehicularPrint({ data }) {
  const qrRaw = `https://munijlo.gob.pe/transito/validar?tipo=PERM_CTRL&nro=${encodeURIComponent(data.numeroAutorizacion || '')}&placa=${encodeURIComponent(data.vehiculoPlaca || '')}`

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—'
    const parts = String(dateStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      const mIdx = parseInt(parts[1], 10) - 1
      return `${parts[2]} DE ${months[mIdx] || parts[1]} DEL ${parts[0]}`
    }
    return dateStr
  }

  return (
    <PrintWrapper>
      <div className="autorizacion-control-a4" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
        {/* CABECERA INSTITUCIONAL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #4338ca', paddingBottom: '6px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/escudo-jlo.png" alt="MDJLO" style={{ width: '48px', height: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '9.5pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Municipalidad Distrital de José Leonardo Ortiz
              </h2>
              <h3 style={{ fontSize: '7.5pt', fontWeight: 800, margin: '2px 0 0', color: '#4338ca', textTransform: 'uppercase' }}>
                Gerencia de Seguridad Ciudadana y Fiscalización · Subgerencia de Tránsito y Transporte
              </h3>
              <p style={{ fontSize: '7pt', fontWeight: 800, color: '#475569', margin: '2px 0 0' }}>
                PERMISO MUNICIPAL DE CONTROL VEHICULAR Y CIRCULACIÓN
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ border: '2px solid #4338ca', padding: '4px 10px', borderRadius: '4px', background: '#eef2ff' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 800, display: 'block', color: '#4338ca' }}>PERMISO N°</span>
              <span style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                {data.numeroAutorizacion || 'AUT. CTRL N° 001-2026-SGTTV'}
              </span>
            </div>
          </div>
        </div>

        {/* FICHA TÉCNICA DE LA UNIDAD Y ADMINISTRADO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '7.5pt' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>ADMINISTRADO / TITULAR:</strong>
            <span style={{ fontSize: '9pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
              {data.solicitanteNombre || data.solicitante || data.propietario || '—'}
            </span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>DOCUMENTO DE IDENTIDAD:</strong>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '8.5pt' }}>
              {data.solicitanteRuc ? `RUC ${data.solicitanteRuc}` : `DNI ${data.solicitanteDocumento || data.solicitanteDni || '—'}`}
            </span>
          </div>

          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>PLACA DE RODAJE:</strong>
            <span style={{ display: 'inline-block', background: '#fef08a', border: '1.5px solid #000', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 900, fontSize: '9pt', color: '#000' }}>
              {data.vehiculoPlaca || '—'}
            </span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>EXPEDIENTE / SISGEDO:</strong>
            <span style={{ fontWeight: 800 }}>{data.expediente || data.referenciaSisgedo || 'S/N'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>RECIBO DE DERECHO TUPA:</strong>
            <span style={{ fontWeight: 800, color: '#16a34a' }}>
              REC. {data.reciboIngresoNumero || 'S/N'} ({data.reciboIngresoMonto ? `S/ ${Number(data.reciboIngresoMonto).toFixed(2)}` : 'S/ 450.00'})
            </span>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>ÁMBITO DE CIRCULACIÓN AUTORIZADO:</strong>
            <span style={{ fontWeight: 700, color: '#4338ca' }}>
              {data.zonaCirculacion || 'Anillo Vial y Cuadrantes Autorizados - Distrito de José Leonardo Ortiz'}
            </span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>HORARIO DE CIRCULACIÓN:</strong>
            <span style={{ fontWeight: 800 }}>
              {data.horarioInicio && data.horarioFin ? `${data.horarioInicio} a ${data.horarioFin}` : '06:00:00 a 22:00:00'}
            </span>
          </div>
        </div>

        {/* PARTE RESOLUTIVA Y CONDICIONES */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', background: '#ffffff' }}>
          <h4 style={{ fontSize: '8pt', fontWeight: 900, color: '#0f172a', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Cuerpo Oficial de la Resolución / Evaluación Técnica:
          </h4>
          {data.contenido && data.contenido.includes('<') ? (
            <div
              style={{ fontSize: '7.2pt', lineHeight: 1.35, color: '#334155' }}
              dangerouslySetInnerHTML={{ __html: sanitizarHtml(data.contenido) }}
            />
          ) : (
            <p style={{ fontSize: '7.2pt', lineHeight: 1.35, color: '#334155', whiteSpace: 'pre-line', margin: 0 }}>
              {data.contenido || 'Se autoriza la circulación y operatividad del vehículo especificado al haber acreditado el cumplimiento cabal de las exigencias técnicas y reglamentarias, manteniéndose sujeto a las normas vigentes de tránsito y transporte del Distrito de José Leonardo Ortiz.'}
            </p>
          )}
        </div>

        {/* VIGENCIA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', fontSize: '7.2pt', background: '#f8fafc' }}>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>FECHA DE EMISIÓN:</strong>
            <span style={{ fontWeight: 800 }}>{formatShortDate(data.fechaEmision || new Date().toISOString())}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>INICIO DE VIGENCIA:</strong>
            <span style={{ fontWeight: 800 }}>{formatShortDate(data.fechaInicioVigencia)}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>VENCIMIENTO:</strong>
            <span style={{ fontWeight: 900, color: '#b91c1c' }}>{formatShortDate(data.fechaFinVigencia)}</span>
          </div>
        </div>

        {/* PIE Y FIRMAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '75% 25%', gap: '10px', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '6.2pt', color: '#475569', margin: 0, lineHeight: 1.25 }}>
              La presente credencial de Control Vehicular es personal e intransferible. Faculta la circulación dentro de los cuadrantes expresamente aprobados. Su portabilidad física o digital verificable mediante código QR es de carácter obligatorio frente a la Policía Nacional del Perú e Inspectores Municipales de Transporte.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={qrRaw} size={58} level="M" includeMargin={false} />
            <span style={{ fontSize: '5.2pt', fontWeight: 800, color: '#4338ca', marginTop: '2px' }}>CONTROL OFICIAL</span>
          </div>
        </div>

        {/* FIRMAS INSTITUCIONALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', textAlign: 'center', marginTop: '18px' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.2pt', display: 'block', color: '#0f172a' }}>SUBGERENTE DE TRÁNSITO Y TRANSPORTE</strong>
              <span style={{ fontSize: '6pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.2pt', display: 'block', color: '#0f172a' }}>GERENTE DE SEGURIDAD CIUDADANA Y FISCALIZACIÓN</strong>
              <span style={{ fontSize: '6pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente oficial de impresión: AUTORIZACIÓN DE ZONAS RESERVADAS DE ESTACIONAMIENTO (Hoja A4 Oficial MDJLO)
 */
export function AutorizacionZonasReservadasPrint({ data }) {
  const qrRaw = `https://munijlo.gob.pe/transito/validar?tipo=AUT_ZONA_RES&nro=${encodeURIComponent(data.numeroAutorizacion || '')}&titular=${encodeURIComponent(data.solicitanteNombre || data.solicitante || '')}`

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—'
    const parts = String(dateStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
      const mIdx = parseInt(parts[1], 10) - 1
      return `${parts[2]} DE ${months[mIdx] || parts[1]} DEL ${parts[0]}`
    }
    return dateStr
  }

  return (
    <PrintWrapper>
      <div className="autorizacion-zonas-a4" style={{ fontSize: '7.5pt', lineHeight: 1.3 }}>
        {/* CABECERA INSTITUCIONAL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #047857', paddingBottom: '6px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/escudo-jlo.png" alt="MDJLO" style={{ width: '48px', height: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '9.5pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Municipalidad Distrital de José Leonardo Ortiz
              </h2>
              <h3 style={{ fontSize: '7.5pt', fontWeight: 800, margin: '2px 0 0', color: '#047857', textTransform: 'uppercase' }}>
                Gerencia de Seguridad Ciudadana y Fiscalización · Subgerencia de Tránsito y Transporte
              </h3>
              <p style={{ fontSize: '7pt', fontWeight: 800, color: '#475569', margin: '2px 0 0' }}>
                AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ border: '2px solid #047857', padding: '4px 10px', borderRadius: '4px', background: '#ecfdf5' }}>
              <span style={{ fontSize: '6.5pt', fontWeight: 800, display: 'block', color: '#047857' }}>AUTORIZACIÓN N°</span>
              <span style={{ fontSize: '9.5pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                {data.numeroAutorizacion || 'AUT. ZONA RES N° 001-2026-SGTTV'}
              </span>
            </div>
          </div>
        </div>

        {/* FICHA DE LA ENTIDAD / ESTABLECIMIENTO Y UBICACIÓN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '7.5pt' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>ESTABLECIMIENTO / RAZÓN SOCIAL:</strong>
            <span style={{ fontSize: '9pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
              {data.solicitanteNombre || data.solicitante || '—'}
            </span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>DOCUMENTO DE IDENTIDAD / RUC:</strong>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '8.5pt' }}>
              {data.solicitanteRuc ? `RUC ${data.solicitanteRuc}` : `DOC ${data.solicitanteDocumento || data.solicitanteDni || '—'}`}
            </span>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>FRONTIS / UBICACIÓN AUTORIZADA:</strong>
            <span style={{ fontWeight: 800, color: '#047857', fontSize: '8pt' }}>
              {data.ubicacion || data.zonaCirculacion || 'Frontis del establecimiento solicitante - José Leonardo Ortiz'}
            </span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>HORARIO DE RESERVA:</strong>
            <span style={{ fontWeight: 800 }}>
              {data.horarioInicio && data.horarioFin ? `${data.horarioInicio} a ${data.horarioFin}` : '07:00:00 a 20:00:00'}
            </span>
          </div>

          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>EXPEDIENTE / SISGEDO:</strong>
            <span style={{ fontWeight: 800 }}>{data.expediente || data.referenciaSisgedo || 'S/N'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>REPRESENTANTE LEGAL:</strong>
            <span style={{ fontWeight: 700 }}>{data.representanteLegal || '—'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>DERECHO TUPA ANUAL:</strong>
            <span style={{ fontWeight: 800, color: '#16a34a' }}>
              REC. {data.reciboIngresoNumero || 'S/N'} ({data.reciboIngresoMonto ? `S/ ${Number(data.reciboIngresoMonto).toFixed(2)}` : 'S/ 920.00'})
            </span>
          </div>
        </div>

        {/* PARTE RESOLUTIVA OFICIAL */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', background: '#ffffff' }}>
          <h4 style={{ fontSize: '8pt', fontWeight: 900, color: '#0f172a', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Parte Resolutiva Oficial y Disposiciones Técnicas:
          </h4>
          {data.contenido && data.contenido.includes('<') ? (
            <div
              style={{ fontSize: '7.2pt', lineHeight: 1.35, color: '#334155' }}
              dangerouslySetInnerHTML={{ __html: sanitizarHtml(data.contenido) }}
            />
          ) : (
            <p style={{ fontSize: '7.2pt', lineHeight: 1.35, color: '#334155', whiteSpace: 'pre-line', margin: 0 }}>
              {data.contenido || 'Se autoriza la reserva de estacionamiento temporal en la vía pública frente al inmueble señalado, quedando sujeto a la estricta demarcación reglamentaria y prohibición de obstaculización fuera del cajón asignado.'}
            </p>
          )}
        </div>

        {/* VIGENCIA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', fontSize: '7.2pt', background: '#f8fafc' }}>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>FECHA DE EMISIÓN:</strong>
            <span style={{ fontWeight: 800 }}>{formatShortDate(data.fechaEmision || new Date().toISOString())}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>INICIO DE VIGENCIA:</strong>
            <span style={{ fontWeight: 800 }}>{formatShortDate(data.fechaInicioVigencia)}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6pt' }}>VENCIMIENTO:</strong>
            <span style={{ fontWeight: 900, color: '#b91c1c' }}>{formatShortDate(data.fechaFinVigencia)}</span>
          </div>
        </div>

        {/* PIE Y FIRMAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '75% 25%', gap: '10px', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '6.2pt', color: '#475569', margin: 0, lineHeight: 1.25 }}>
              La presente autorización de Zona Reservada no otorga derecho posesorio ni propiedad sobre la vía pública. Exige la demarcación reglamentaria con pintura amarilla y blanca de tráfico y señal vertical R-36 informativa. Queda terminantemente prohibido lucrar o cobrar por el uso de este espacio. Es revocable por necesidad del tránsito distrital.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={qrRaw} size={58} level="M" includeMargin={false} />
            <span style={{ fontSize: '5.2pt', fontWeight: 800, color: '#047857', marginTop: '2px' }}>ZONA RESERVADA</span>
          </div>
        </div>

        {/* FIRMAS INSTITUCIONALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', textAlign: 'center', marginTop: '18px' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.2pt', display: 'block', color: '#0f172a' }}>SUBGERENTE DE TRÁNSITO Y TRANSPORTE</strong>
              <span style={{ fontSize: '6pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.2pt', display: 'block', color: '#0f172a' }}>GERENTE DE SEGURIDAD CIUDADANA Y FISCALIZACIÓN</strong>
              <span style={{ fontSize: '6pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
        </div>
      </div>
    </PrintWrapper>
  )
}

/**
 * Componente despachador oficial de impresión: RESOLUCIÓN DE PERMISO Y AUTORIZACIÓN (Hoja A4 Oficial)
 * Despacha entre los 4 trámites oficiales municipales:
 * 1. Carga y Descarga (CARGA_DESCARGA)
 * 2. Uso Provisional de Vías (USO_VIAS)
 * 3. Zonas Reservadas de Estacionamiento (ZONAS_RESERVADAS)
 * 4. Permiso de Control Vehicular (CONTROL_VEHICULAR / OPERACION)
 */
export function ResolucionPermisoPrint({ data }) {
  if (!data) return null

  const tipo = (data.tipoPermiso || '').toUpperCase()

  // 1. Carga y Descarga
  if (tipo === 'CARGA_DESCARGA') {
    return <AutorizacionCargaDescargaPrint data={data} />
  }

  // 2. Uso Provisional de Vías
  if (tipo === 'USO_VIAS') {
    return <AutorizacionUsoViasPrint data={data} />
  }

  // 3. Zonas Reservadas
  if (tipo === 'ZONAS_RESERVADAS' || tipo === 'ZONA_RESERVADA') {
    return <AutorizacionZonasReservadasPrint data={data} />
  }

  // 4. Permiso de Control Vehicular (CONTROL_VEHICULAR o legado OPERACION)
  return <AutorizacionControlVehicularPrint data={data} />
}

