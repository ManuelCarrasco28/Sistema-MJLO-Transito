import { createPortal } from 'react-dom';
import { fechaInternamiento, fechaInternamientoTexto } from '../../utils/fechaInternamiento';
import { textoInfraccion } from '../../utils/infraccionInternamiento';

export const OrdenLibertadPrint = ({ item }) => {
  const fecha = fechaInternamiento(item?.fechaLiberacion || item?.fechaSalida);
  const day = fecha ? String(fecha.getDate()).padStart(2, '0') : '';
  const month = fecha ? String(fecha.getMonth() + 1).padStart(2, '0') : '';
  const year = fecha ? String(fecha.getFullYear()) : '';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div id="seccion-impresion" className="seccion-impresion-portal orden-libertad-a4 font-sans text-[15px] box-border">
      
      {/* Header: el logo va arriba y centrado; ya trae el nombre de la municipalidad, no se repite en texto */}
      <div className="relative mb-3 pt-1">
        <div className="flex justify-center">
          <img src="/img/logo-mjlo.png" alt="Municipalidad José Leonardo Ortiz" className="h-24 w-64 object-contain" />
        </div>
        <div className="absolute right-0 top-0 text-red-600 font-bold text-xl tracking-widest font-sans [font-variant-numeric:lining-nums_tabular-nums]">
          <div className="text-[9px] font-bold uppercase tracking-normal text-slate-700">Registro digital</div>
          Nº {String(item?.numeroOrdenLibertad || 'S/N').replace(/^[A-Za-z]+-/, '')}
        </div>
        <h2 className="mt-1 text-center text-xl font-black tracking-widest text-blue-900">
          DIVISIÓN DE TRÁNSITO Y TRANSPORTE
        </h2>
      </div>

      <div className="text-center mb-3">
        <h3 className="text-2xl font-black tracking-widest text-blue-900">
          ORDEN DE LIBERTAD
        </h3>
      </div>

      {/* Date */}
      <div className="flex items-end mb-3 text-[15px]">
        <span className="font-bold w-40 uppercase">JOSÉ L. ORTIZ</span>
        <div className="flex-1 flex gap-2 text-lg font-sans">
          <div className="w-12 text-center">{day}</div>
          <span>-</span>
          <div className="w-12 text-center">{month}</div>
          <span>-</span>
          <div className="w-12 text-center">{year}</div>
        </div>
      </div>

      {/* Interesado Details */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-end text-[15px]">
          <span className="whitespace-nowrap mr-2">Esta jefatura autoriza al Sr. (a):</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.autorizadoNombre ?? item?.interesadoNombre ?? ''}</div>
        </div>
        <div className="flex items-end text-[15px]">
          <span className="whitespace-nowrap mr-2">Domicilio:</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.autorizadoDireccion ?? item?.interesadoDireccion ?? ''}</div>
        </div>
        <div className="flex items-end text-[15px]">
          <span className="whitespace-nowrap mr-2">Doc. de Identidad:</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.autorizadoDni ?? item?.interesadoDni ?? ''}</div>
        </div>
      </div>

      <div className="text-center mb-3 mt-3">
        <h4 className="text-lg font-bold text-blue-900 tracking-wider">RETIRAR DEL DEPOSITO OFICIAL DE VEHICULOS</h4>
      </div>

      {/* Vehicle Details */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-end text-[15px]">
          <span className="mr-2">Clase:</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2">{item?.vehiculoTipo || ''}</div>
          <span className="mx-2">N°</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2">{item?.vehiculoPlaca || ''}</div>
          <span className="mx-2">Color</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.vehiculoColor || ''}</div>
        </div>
        
        <div className="flex items-end text-[15px]">
          <span className="mr-2">Fecha de internamiento:</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{fechaInternamientoTexto(item?.fechaIngreso)}</div>
          <span className="mx-2">Marca</span>
          <div className="border-b border-black w-24 font-sans uppercase px-2">{item?.vehiculoMarca || ''}</div>
          <span className="mx-2">Año</span>
          <div className="border-b border-black w-16 font-sans uppercase px-2">{item?.vehiculoAnio || ''}</div>
        </div>

        <div className="flex items-end text-[15px]">
          <span className="mr-2">Boleta N°</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2">{item?.numeroBoleta || ''}</div>
          <span className="mx-2">Motor</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.vehiculoMotor || ''}</div>
          <span className="mx-2">Total días:</span>
          <div className="border-b border-black w-16 font-sans uppercase px-2 text-center">{item?.totalDias ?? ''}</div>
        </div>

        <div className="flex items-end text-[15px]">
          <span className="mr-2">Infracción:</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2 text-[13px] leading-tight">{textoInfraccion(item)}</div>
        </div>

        <div className="flex items-end text-[15px]">
          <span className="mr-2">N° de Papeleta u Oficio:</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.numeroPapeleta || item?.documentoReferencia || ''}</div>
        </div>
      </div>

      {/* Payments */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-end text-[15px]">
          <span className="mr-2">N° de recibo de la M.J.L.O.</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.reciboPapeleta || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2 text-right">{item?.montoPapeletaCobrada != null ? Number(item.montoPapeletaCobrada).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}</div>
        </div>
        
        <div className="flex items-end text-[15px]">
          <span className="mr-2">Guardianía N° de Recibo</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.reciboGuardiania || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2 text-right">{item?.montoGuardiania != null ? Number(item.montoGuardiania).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}</div>
        </div>

        <div className="flex items-end text-[15px]">
          <span className="mr-2">Remolque N° de Recibo</span>
          <div className="border-b border-black flex-1 font-sans uppercase px-2">{item?.reciboRemolque || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-sans uppercase px-2 text-right">{item?.montoRemolque != null ? Number(item.montoRemolque).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}</div>
        </div>

        <div className="flex items-end justify-end text-[15px] mt-1">
          <span className="font-bold mr-2 text-base">TOTAL S/.</span>
          <div className="border-b border-black w-40 font-sans uppercase px-2 text-right font-bold text-base">{item?.montoTotalLiberacion != null ? Number(item.montoTotalLiberacion).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}</div>
        </div>
      </div>

      {/* Observaciones and Stamp */}
      <div className="flex items-start mt-3">
        <span className="text-base font-bold mr-4 mt-1">OBSERVACIONES</span>
        
        <div className="w-20 h-20 mx-4 shrink-0" aria-label="Espacio para sello físico" />

        <div className="border-b border-black flex-1 self-end mt-8 font-sans uppercase px-2 text-[13px]">
          {item?.observaciones || ''}
        </div>
      </div>

      <div className="border-b border-black w-full mt-1"></div>

      {/* Footer note */}
      <div className="mt-3 text-center text-[13px] font-bold text-blue-900 px-6 leading-snug">
        Nota: El concesionario del DOV. Está obligado a entregar el vehiculo sin antes el interesado no
        presenta su Tarjeta de Propiedad y Licencia de Conducir, siendo su horario de Lunes a
        viernes, Mañanas de 09:00 a 15:00 hrs
      </div>

      <div className="mt-8 grid grid-cols-2 gap-10 text-[13px]">
        <div className="space-y-4">
          <div className="flex gap-2">REMISOR <span className="flex-1 border-b border-black min-h-5" /></div>
          <div className="flex gap-2">NOMBRE <span className="flex-1 border-b border-black uppercase">{item?.remisorNombre || ''}</span></div>
          <div className="flex gap-2">N° DE CARNÉ <span className="flex-1 border-b border-black">{item?.carnetRemisor || ''}</span></div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">INTERESADO <span className="flex-1 border-b border-black uppercase">{item?.autorizadoNombre ?? item?.interesadoNombre ?? ''}</span></div>
          <div className="flex gap-2">DOC. ID. <span className="flex-1 border-b border-black">{item?.autorizadoDni ?? item?.interesadoDni ?? ''}</span></div>
          <div className="mt-6 border-t border-black pt-1 text-center text-[11px]">Firma del interesado</div>
        </div>
      </div>

    </div>,
    document.body
  );
};

