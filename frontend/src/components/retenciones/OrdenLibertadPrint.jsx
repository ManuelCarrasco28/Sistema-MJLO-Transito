import { createPortal } from 'react-dom';

export const OrdenLibertadPrint = ({ item }) => {
  const fecha = item?.fechaRegistro ? new Date(item.fechaRegistro) : new Date();
  const day = fecha.getDate().toString().padStart(2, '0');
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const year = fecha.getFullYear().toString().slice(-2);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div id="seccion-impresion" className="print:block hidden bg-white text-black font-sans w-[210mm] mx-auto pt-0 pb-2 px-6 box-border text-xs print:absolute print:top-0 print:left-0 print:m-0 print:w-full">
      
      {/* Header */}
      <div className="text-center relative mb-1 pt-2">
        <h1 className="text-sm font-bold tracking-widest text-blue-800 outline-text" style={{ WebkitTextStroke: '0.3px #1e3a8a', color: 'white' }}>
          MUNICIPALIDAD DISTRITAL DE JOSÉ LEONARDO ORTIZ
        </h1>
        <h2 className="text-lg font-black tracking-widest text-blue-800 outline-text" style={{ WebkitTextStroke: '0.3px #1e3a8a', color: 'white' }}>
          DIVISIÓN DE TRÁNSITO
        </h2>
        <h2 className="text-lg font-black tracking-widest text-blue-800 outline-text mb-1" style={{ WebkitTextStroke: '0.3px #1e3a8a', color: 'white' }}>
          Y TRANSPORTE
        </h2>
        <div className="absolute right-0 top-0 text-red-600 font-bold text-lg tracking-widest font-serif">
          Nº {item?.numeroBoleta || '000000'}
        </div>
      </div>

      <div className="text-center mb-1">
        <h3 className="text-xl font-black tracking-widest text-blue-800" style={{ WebkitTextStroke: '0.3px #1e3a8a', color: 'white' }}>
          ORDEN DE LIBERTAD
        </h3>
      </div>

      {/* Date */}
      <div className="flex items-end mb-1 text-sm">
        <span className="font-bold w-40 uppercase">JOSÉ L. ORTIZ</span>
        <div className="flex-1 flex gap-2 text-lg font-serif">
          <div className="w-12 text-center">{day}</div>
          <span>-</span>
          <div className="w-12 text-center">{month}</div>
          <span>-</span>
          <div className="w-12 text-center">{year}</div>
        </div>
      </div>

      {/* Interesado Details */}
      <div className="flex flex-col gap-1 mb-1">
        <div className="flex items-end text-sm">
          <span className="whitespace-nowrap mr-2">Esta jefatura autoriza al Sr. (a):</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.interesadoNombre || ''}</div>
        </div>
        <div className="flex items-end text-sm">
          <span className="whitespace-nowrap mr-2">Domicilio:</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.interesadoDireccion || ''}</div>
        </div>
        <div className="flex items-end text-sm">
          <span className="whitespace-nowrap mr-2">Doc. de Identidad:</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.interesadoDni || ''}</div>
        </div>
      </div>

      <div className="text-center mb-1 mt-2">
        <h4 className="text-base font-bold text-blue-900 tracking-wider">RETIRAR DEL DEPOSITO OFICIAL DE VEHICULOS</h4>
      </div>

      {/* Vehicle Details */}
      <div className="flex flex-col gap-1 mb-1">
        <div className="flex items-end text-sm">
          <span className="mr-2">Clase:</span>
          <div className="border-b border-black w-32 font-serif uppercase px-2">{item?.vehiculoTipo || ''}</div>
          <span className="mx-2">N°</span>
          <div className="border-b border-black w-32 font-serif uppercase px-2">{item?.vehiculoPlaca || ''}</div>
          <span className="mx-2">Color</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.vehiculoColor || ''}</div>
        </div>
        
        <div className="flex items-end text-sm">
          <span className="mr-2">Fecha de nacimiento:</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.interesadoFechaNacimiento ? new Date(item.interesadoFechaNacimiento).toLocaleDateString('es-PE') : ''}</div>
          <span className="mx-2">Marca</span>
          <div className="border-b border-black w-24 font-serif uppercase px-2">{item?.vehiculoMarca || ''}</div>
          <span className="mx-2">Año</span>
          <div className="border-b border-black w-16 font-serif uppercase px-2">{item?.vehiculoAnio || ''}</div>
        </div>

        <div className="flex items-end text-sm">
          <span className="mr-2">Boleta N°</span>
          <div className="border-b border-black w-24 font-serif uppercase px-2">{item?.numeroBoleta || ''}</div>
          <span className="mx-2">Motor</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.vehiculoMotor || ''}</div>
          <span className="mx-2">Total días:</span>
          <div className="border-b border-black w-16 font-serif uppercase px-2 text-center">{item?.totalDias || ''}</div>
        </div>

        <div className="flex items-end text-sm">
          <span className="mr-2">Infracción:</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.motivo || ''}</div>
        </div>

        <div className="flex items-end text-sm">
          <span className="mr-2">N° de Papeleta u Oficio:</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.numeroPapeleta || ''}</div>
        </div>
      </div>

      {/* Payments */}
      <div className="flex flex-col gap-1 mb-1">
        <div className="flex items-end text-sm">
          <span className="mr-2">N° de recibo de la M.J.L.O.</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.reciboPapeleta || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-serif uppercase px-2 text-right">{item?.montoPapeletaCobrada ? Number(item.montoPapeletaCobrada).toFixed(2) : ''}</div>
        </div>
        
        <div className="flex items-end text-sm">
          <span className="mr-2">Guardianía N° de Recibo</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.reciboGuardiania || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-serif uppercase px-2 text-right">{item?.montoGuardiania ? Number(item.montoGuardiania).toFixed(2) : ''}</div>
        </div>

        <div className="flex items-end text-sm">
          <span className="mr-2">Remolque N° de Recibo</span>
          <div className="border-b border-black flex-1 font-serif uppercase px-2">{item?.reciboRemolque || ''}</div>
          <span className="mx-2 font-bold">Monto S/.</span>
          <div className="border-b border-black w-32 font-serif uppercase px-2 text-right">{item?.montoRemolque ? Number(item.montoRemolque).toFixed(2) : ''}</div>
        </div>

        <div className="flex items-end justify-end text-sm mt-1">
          <span className="font-bold mr-2 text-base">TOTAL S/.</span>
          <div className="border-b border-black w-40 font-serif uppercase px-2 text-right font-bold text-base">{item?.montoTotalLiberacion ? Number(item.montoTotalLiberacion).toFixed(2) : ''}</div>
        </div>
      </div>

      {/* Observaciones and Stamp */}
      <div className="flex items-start mt-2">
        <span className="text-base font-bold mr-4 mt-1">OBSERVACIONES</span>
        
        {/* Stamp */}
        <div className="w-16 h-16 border-2 border-black rounded-full flex flex-col items-center justify-center relative rotate-12 mx-4 shrink-0">
          <div className="absolute inset-1 border-[1.5px] border-black rounded-full flex flex-col items-center justify-center text-[5px] text-center p-0.5 leading-tight font-bold">
             V° B° <br/> SUB GERENCIA DE <br/> TRÁNSITO <br/> TRANSPORTE <br/> PÚBLICO
          </div>
          <div className="text-[5px] font-bold text-center absolute top-1 w-full uppercase">MUNICIPALIDAD</div>
          <div className="text-[5px] font-bold text-center absolute bottom-1 w-full uppercase">DE JOSÉ L. ORTIZ</div>
        </div>

        <div className="border-b border-black flex-1 self-end mt-8 font-serif uppercase px-2 text-xs">
          {item?.observaciones || ''}
        </div>
      </div>

      <div className="border-b border-black w-full mt-1"></div>

      {/* Footer note */}
      <div className="mt-1 text-center text-[10px] font-bold text-blue-900 px-6 leading-tight">
        Nota: El concesionario del DOV. Está obligado a entregar el vehiculo sin antes el interesado no
        presenta su Tarjeta de Propiedad y Licencia de Conducir, siendo su horario de Lunes a
        viernes, Mañanas de 09:00 a 15:00 hrs
      </div>

    </div>,
    document.body
  );
};

