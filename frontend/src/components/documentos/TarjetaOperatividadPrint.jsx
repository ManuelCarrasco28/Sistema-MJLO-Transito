import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './TarjetasImpresion.css'

/**
 * Componente oficial de impresión: TARJETA DE OPERATIVIDAD (TUC)
 * Dimensiones: 85.6 mm x 53.98 mm a 2 caras (Anverso y Reverso)
 */
export function TarjetaOperatividadPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?doc=${encodeURIComponent(data.tucNumero || '')}&placa=${encodeURIComponent(data.placa || '')}`
  const isImageQr = Boolean(data.qrUrl && (data.qrUrl.startsWith('data:image') || data.qrUrl.endsWith('.png') || data.qrUrl.endsWith('.jpg')))

  return (
    <div id="seccion-impresion">
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
                <span className="val-nombres">{data.nombres || data.apellidos ? '' : 'CONDUCTOR AUTORIZADO'}</span>
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
    </div>
  )
}

/**
 * Componente oficial de impresión: CARNET DE SEGURIDAD VIAL (CURSO VIAL)
 * Dimensiones: 85.6 mm x 53.98 mm a 2 caras (Anverso y Reverso)
 */
export function CarnetCursoVialPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?tipo=CURSO_VIAL&carnet=${encodeURIComponent(data.tucNumero || data.codigo || '')}&dni=${encodeURIComponent(data.dni || '')}`
  const isImageQr = Boolean(data.qrUrl && (data.qrUrl.startsWith('data:image') || data.qrUrl.endsWith('.png') || data.qrUrl.endsWith('.jpg')))

  return (
    <div id="seccion-impresion">
      <div className="carnet-wrapper">
        {/* --- CARA ANVERSO --- */}
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
                  <span className="val-yellow">{data.numeroLicencia || 'B-IIc'}</span>
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

        {/* --- CARA REVERSO --- */}
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
      </div>
    </div>
  )
}

/**
 * Componente oficial de impresión: CERTICAV (FICHA A4 DE INSPECCIÓN TÉCNICA)
 * Formato oficial en Hoja A4 con Checklist Mecánico / Eléctrico
 */
export function CerticavFichaPrint({ data }) {
  const qrRaw = data.qrUrl || `https://munijlo.gob.pe/transito/validar?tipo=CERTICAV&reg=${encodeURIComponent(data.codigo || data.numeroInspeccion || '')}&placa=${encodeURIComponent(data.placa || data.vehiculoPlaca || '')}`

  const checklistItems = [
    { cat: '1. SISTEMA DE LUCES', items: ['Faros principales (Altas y Bajas)', 'Luces direccionales e intermitentes de emergencia', 'Luz de freno posterior y posición', 'Luz blanca de placa de rodaje y reflectantes'], ok: true },
    { cat: '2. SISTEMA DE FRENOS', items: ['Freno de servicio (pedal / hidráulico o mecánico)', 'Freno de estacionamiento (palanca / trinquete)', 'Nivel y estado de líquido / zapatas / discos'], ok: true },
    { cat: '3. CHASIS Y CARROCERÍA', items: ['Estructura de chasis sin fisuras ni corrosión grave', 'Carrocería, toldo y carpa reglamentaria limpia', 'Asientos de pasajeros fijos y agarraderas seguras', 'Espejos retrovisores (izquierdo y derecho) y parabrisas'], ok: true },
    { cat: '4. NEUMÁTICOS Y DIRECCIÓN', items: ['Profundidad de cocada reglamentaria (mínimo 1.6 mm)', 'Neumáticos sin deformaciones ni alambres expuestos', 'Horquilla, rodamientos y amortiguadores delanteros/posteriores'], ok: true },
    { cat: '5. EQUIPAMIENTO DE SEGURIDAD', items: ['Extintor de incendios con carga vigente (PQS 1kg)', 'Botiquín de primeros auxilios reglamentario', 'Cintas reflectivas de alta intensidad según norma MTC'], ok: true },
  ]

  return (
    <div id="seccion-impresion">
      <div className="ficha-certicav-a4">
        {/* Cabecera institucional */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/escudo-jlo.png" alt="MDJLO" style={{ width: '48px', height: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '10pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                Municipalidad Distrital de José Leonardo Ortiz
              </h2>
              <h3 style={{ fontSize: '8pt', fontWeight: 700, margin: '2px 0 0', color: '#475569', textTransform: 'uppercase' }}>
                Gerencia de Seguridad Ciudadana y Fiscalización · Subgerencia de Tránsito y Transporte
              </h3>
              <p style={{ fontSize: '7.5pt', fontWeight: 800, color: '#047857', margin: '2px 0 0' }}>
                CERTICAV — CONSTATAÇÃO DE CARACTERÍSTICAS Y VERIFICACIÓN TÉCNICA VEHICULAR
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ border: '2px solid #0f172a', padding: '4px 10px', borderRadius: '4px', background: '#f8fafc' }}>
              <span style={{ fontSize: '7pt', fontWeight: 800, display: 'block', color: '#64748b' }}>N° REGISTRO CERTICAV</span>
              <span style={{ fontSize: '10pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                {data.codigo || data.numeroInspeccion || 'CAV-2026-001'}
              </span>
            </div>
          </div>
        </div>

        {/* Ficha técnica del vehículo y titular */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '7.5pt' }}>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>PLACA DE RODAJE:</strong>
            <span style={{ fontSize: '10pt', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>{data.placa || data.vehiculoPlaca || '—'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>PROPIETARIO / TITULAR:</strong>
            <span style={{ fontWeight: 800 }}>{data.propietario || '—'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>DNI / RUC:</strong>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.propietarioDni || data.dni || '—'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>RAZÓN SOCIAL / ASOCIACIÓN:</strong>
            <span>{data.asociacion || 'Independiente'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>MARCA / MODELO:</strong>
            <span>{data.vehiculoMarca || 'WANXIN'} / {data.vehiculoModelo || 'WX-200'}</span>
          </div>
          <div>
            <strong style={{ color: '#64748b', display: 'block', fontSize: '6.5pt' }}>N° MOTOR / SERIE:</strong>
            <span style={{ fontFamily: 'monospace' }}>{data.numeroMotor || data.vehiculoMotor || '—'}</span>
          </div>
        </div>

        {/* Checklist de Inspección Técnica */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ fontSize: '8pt', fontWeight: 900, background: '#0f172a', color: '#fff', padding: '4px 8px', margin: '0 0 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
            Checklist de Inspección Mecánica y Eléctrica Oficial
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7pt' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', textAlign: 'left' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '3px 6px', width: '70%' }}>SISTEMA / ELEMENTO EVALUADO</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '3px 6px', textAlign: 'center', width: '15%' }}>CONFORME</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '3px 6px', textAlign: 'center', width: '15%' }}>OBSERVADO</th>
              </tr>
            </thead>
            <tbody>
              {checklistItems.map((c, i) => (
                <React.Fragment key={i}>
                  <tr style={{ background: '#f1f5f9' }}>
                    <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '3px 6px', fontWeight: 800, color: '#1e293b' }}>
                      {c.cat}
                    </td>
                  </tr>
                  {c.items.map((it, j) => (
                    <tr key={j}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2.5px 6px' }}>• {it}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2.5px 6px', textAlign: 'center', fontWeight: 900, color: '#047857' }}>
                        [ X ]
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2.5px 6px', textAlign: 'center', color: '#94a3b8' }}>
                        [ &nbsp; ]
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dictamen y Resultado */}
        <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '12px', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '14px' }}>
          <div>
            <strong style={{ fontSize: '7.5pt', textTransform: 'uppercase', color: '#0f172a', display: 'block' }}>
              DICTAMEN TÉCNICO Y DECLARACIÓN JURADA:
            </strong>
            <p style={{ fontSize: '6.5pt', color: '#475569', margin: '4px 0 0', lineHeight: 1.3 }}>
              El presente vehículo trimóvil de servicio especial ha sido evaluado en las instalaciones municipales conforme al Reglamento Nacional de Vehículos (D.S. 058-2003-MTC) y Ordenanza Municipal vigente, determinándose que cumple con los estándares técnicos y de seguridad exigidos.
            </p>
            <div style={{ marginTop: '6px', fontSize: '7pt' }}>
              <span style={{ fontWeight: 800 }}>RESULTADO FINAL DE LA INSPECCIÓN: </span>
              <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 900, padding: '2px 6px', borderRadius: '3px' }}>
                APROBADO — APTO PARA CIRCULAR
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={qrRaw} size={70} level="M" includeMargin={false} />
            <span style={{ fontSize: '5.5pt', fontWeight: 700, color: '#64748b', marginTop: '3px' }}>VALIDACIÓN OFICIAL QR</span>
          </div>
        </div>

        {/* Firmas de Autoridad y Técnico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', textAlign: 'center', marginTop: '24px' }}>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.5pt', display: 'block', color: '#0f172a' }}>INSPECTOR TÉCNICO EVALUADOR</strong>
              <span style={{ fontSize: '6.5pt', color: '#64748b' }}>Subgerencia de Tránsito y Transporte - MDJLO</span>
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', width: '80%', margin: '0 auto' }}>
              <strong style={{ fontSize: '7.5pt', display: 'block', color: '#0f172a' }}>SUBGERENTE DE TRÁNSITO Y VIALIDAD</strong>
              <span style={{ fontSize: '6.5pt', color: '#64748b' }}>Municipalidad Distrital de José Leonardo Ortiz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
