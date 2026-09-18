export const BoletaInternamientoPrint = ({ item }) => {
  const fecha = item?.fechaRegistro ? new Date(item.fechaRegistro) : new Date();
  const day = fecha.getDate().toString().padStart(2, '0');
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const year = fecha.getFullYear().toString().slice(-2);
  const time = fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0');

  const exteriorItems = [
    'FARO GRANDE DE', 'FARO CHICO DE', 'FAROS POSTERIORES', 'BICERAS',
    'LIMPIA PARABRISAS', 'LUNA', 'LLANTAS', 'VASOS', 'ESPEJO EXTR.',
    'CHAPAS', 'ANTENAS', 'PARACHOQUES', 'LLANTA DE REP.'
  ];

  const interiorItems = [
    'TABLERO', 'CHAPA CONTACTO', 'RADIO', 'ENCENDEDOR', 'PISOS',
    'MANIJAS', 'CENICEROS', 'PARASOLARES', 'ESPEJO INT.', 'CODERAS',
    'GATA', 'LLAVE DE RUEDAS', 'ADORNOS'
  ];

  const motorItems = [
    'BATERÍA', 'RADIADOR', 'ARRANCADOR', 'ALTERNADOR', 'CARBURADOR',
    'PURIFICADOR', 'DISTRIBUIDOR', 'BOBINA', 'TAPA ACEITE', 'BUJIAS',
    'VEH, GR. AB.'
  ];

  const getInvValue = (label) => {
    if (!item?.inventario) return '';
    const found = item.inventario.find(i => i.nombre?.trim().toUpperCase() === label.trim().toUpperCase());
    if (found) {
      return found.cantidad || '/';
    }
    return '';
  };

  const InvRow = ({ label }) => (
    <div className="flex items-center justify-between mb-[2px] pr-2">
      <span className="text-[8px] font-bold flex-1 leading-none uppercase tracking-tighter">{label}</span>
      <div className="border border-black w-10 h-3.5 flex items-center justify-center text-[9px] font-bold">
        {getInvValue(label)}
      </div>
    </div>
  );

  return (
    <div id="seccion-impresion" className="print:block hidden bg-white text-black font-sans w-[210mm] mx-auto pt-0 pb-2 px-6 box-border print:absolute print:top-0 print:left-0 print:m-0 print:w-full">
      {/* Header */}
      <div className="text-center relative mb-1 pt-2">
        <h1 className="text-base font-black leading-none tracking-widest">MUNICIPALIDAD DISTRITAL</h1>
        <h2 className="text-lg font-black leading-none">"JOSÉ LEONARDO ORTIZ"</h2>
        <h3 className="text-sm font-bold leading-none tracking-wider">-CHICLAYO-</h3>
        <div className="absolute right-0 top-0 text-red-600 font-bold text-lg tracking-widest font-serif">
          Nº {item?.numeroBoleta || '000000'}
        </div>
      </div>

      <div className="text-center mb-1">
        <h3 className="text-base font-black uppercase underline tracking-widest">Boleta de Internamiento al DOV</h3>
      </div>

      {/* Main Info Box */}
      <div className="flex justify-between gap-2 mb-1">
        {/* Left Column (Fecha) */}
        <div className="w-1/2 flex flex-col gap-1">
          <div className="flex gap-2 items-center pl-10 mb-1">
            <span className="text-[10px] font-bold uppercase w-12">FECHA</span>
            <div className="flex gap-1">
              <div className="border border-black w-8 h-6 flex items-center justify-center font-bold text-sm">{day}</div>
              <div className="border border-black w-8 h-6 flex items-center justify-center font-bold text-sm">{month}</div>
              <div className="border border-black w-8 h-6 flex items-center justify-center font-bold text-sm">{year}</div>
            </div>
          </div>
          
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">CLASE VEH</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.vehiculoTipo || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">COLOR</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.vehiculoColor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">PAPELETA O N° DE DOC</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.numeroPapeleta || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">GRADO DEL REMISOR</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.gradoRemisor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">HORA</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{time}</div>
          </div>
        </div>

        {/* Right Column (Placa) */}
        <div className="w-1/2 flex flex-col gap-1">
          <div className="flex flex-col items-center pl-8 mb-1">
            <span className="text-[10px] font-bold uppercase border-b border-black w-28 text-center pb-0.5 mb-0.5 leading-none">PLACA</span>
            <div className="border border-black w-28 h-8 flex items-center justify-center font-bold text-lg uppercase tracking-widest leading-none">{item?.vehiculoPlaca || ''}</div>
            <div className="text-center font-bold text-[9px] uppercase leading-none mt-0.5">Depósito Oficial<br/>JOSE L. ORTIZ</div>
          </div>

          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">MARCA</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.vehiculoMarca || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">MOTOR</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.vehiculoMotor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">INFRACCIÓN</span>
            <div className="border-b border-black flex-1 font-bold text-[11px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.motivo || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-bold uppercase w-24">AUTORIDAD QUE DISPONE</span>
            <div className="border-b border-black flex-1 font-bold text-[9px] text-center uppercase pb-0.5 leading-tight min-h-[16px]">{item?.autoridadQueDispone || ''}</div>
          </div>
        </div>
      </div>

      <div className="mt-1 mb-1">
        <h3 className="text-center text-sm font-black uppercase tracking-widest">INVENTARIO</h3>
      </div>

      {/* Inventario columns */}
      <div className="flex gap-4 mb-1">
        {/* Col 1 */}
        <div className="w-1/3 pr-2">
          <h4 className="text-[9px] font-black uppercase mb-0.5">1.- ESTADO DE CARROCERIA</h4>
          <div className="w-full h-3 mb-1 border-b border-black"></div>
          
          <h4 className="text-[9px] font-black uppercase mb-1 text-center">2.- PARTE EXTERIOR</h4>
          {exteriorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>

        {/* Col 2 */}
        <div className="w-1/3 px-2 flex flex-col justify-end">
          <h4 className="text-[9px] font-black uppercase mb-1 text-center">2.- PARTE INTERIOR</h4>
          {interiorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>

        {/* Col 3 */}
        <div className="w-1/3 pl-2 flex flex-col justify-end">
          <h4 className="text-[9px] font-black uppercase mb-1 text-center">2.- MOTOR</h4>
          {motorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>
      </div>

      {/* Observaciones */}
      <div className="flex items-end mt-1 mb-4">
        <span className="text-[9px] font-black uppercase w-28">5.- OBSERVACIONES</span>
        <div className="border-b border-black flex-1 font-bold text-xs italic h-4 leading-none">{item?.observaciones || ''}</div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end gap-8 mt-4">
        {/* Remisor */}
        <div className="w-1/2 flex flex-col gap-2">
          <div className="flex items-end">
            <span className="text-[9px] font-black uppercase w-20">REMISOR</span>
            <div className="border-b border-black flex-1"></div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-black uppercase w-20">NOMBRE</span>
            <div className="border-b border-black flex-1 text-center text-[9px] uppercase font-bold">{item?.remisorNombre || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-black uppercase w-20">N° DE CARNÉ</span>
            <div className="border-b border-black flex-1"></div>
          </div>
        </div>

        {/* Interesado */}
        <div className="w-1/2 flex flex-col gap-2 mb-4">
          <div className="flex items-end">
            <span className="text-[9px] font-black uppercase w-20">INTERESADO</span>
            <div className="border-b border-black flex-1 text-center text-[9px] uppercase font-bold">{item?.interesadoNombre || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[9px] font-black uppercase w-20">DOC. ID.</span>
            <div className="border-b border-black flex-1 text-center text-[9px] uppercase font-bold">{item?.interesadoDni || ''}</div>
          </div>
          <div className="flex items-end mt-2">
            <span className="text-[9px] font-black uppercase w-20"></span>
            <div className="border-t border-black flex-1 text-center text-[7px] uppercase pt-0.5">Firma del Interesado</div>
          </div>
        </div>
      </div>

    </div>
  );
};
