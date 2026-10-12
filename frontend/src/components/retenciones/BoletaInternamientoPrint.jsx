import { createPortal } from 'react-dom';
import { fechaInternamiento } from '../../utils/fechaInternamiento';
import { textoInfraccion } from '../../utils/infraccionInternamiento';

export const BoletaInternamientoPrint = ({ item }) => {
  const fecha = fechaInternamiento(item?.fechaIngreso);
  const day = fecha ? String(fecha.getDate()).padStart(2, '0') : '';
  const month = fecha ? String(fecha.getMonth() + 1).padStart(2, '0') : '';
  const year = fecha ? String(fecha.getFullYear()).slice(-2) : '';
  const time = fecha && /\d{2}:\d{2}/.test(item?.fechaIngreso || '')
    ? `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}` : '';

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
    'VEH. GR. AB.'
  ];

  const getInvValue = (label) => {
    if (!item?.inventario) return '';
    const found = item.inventario.find(i => i.nombre?.trim().toUpperCase() === label.trim().toUpperCase());
    if (found) {
      return found.cantidad ?? '';
    }
    return '';
  };

  const InvRow = ({ label }) => (
    <div className="flex items-center justify-between mb-[2px] pr-2">
      <span className="text-[11.5px] font-bold flex-1 leading-none uppercase">{label}</span>
      <div className="border border-black w-14 h-5 flex items-center justify-center text-[13.5px] font-bold">
        {String(getInvValue(label)) === '1' ? '✓' : getInvValue(label)}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div id="seccion-impresion" className="seccion-impresion-portal boleta-internamiento-a4 font-sans box-border">
      {/* Header */}
      <div className="relative mb-3 pt-1 flex justify-center">
        {/* El logo ya trae el nombre de la municipalidad: no se repite en texto */}
        <img src="/img/logo-mjlo.png" alt="Municipalidad José Leonardo Ortiz" className="h-24 w-64 object-contain" />
        <div className="absolute right-0 top-0 text-red-600 font-bold text-xl tracking-widest font-sans [font-variant-numeric:lining-nums_tabular-nums]">
          <div className="text-[9px] font-bold uppercase tracking-normal text-slate-700">Registro digital</div>
          Nº {String(item?.numeroBoleta || '000000').replace(/^[A-Za-z]+-/, '')}
        </div>
      </div>

      <div className="text-center mb-3">
        <h3 className="text-xl font-black uppercase underline tracking-widest">Boleta de Internamiento al DOV</h3>
      </div>

      {/* Main Info Box */}
      <div className="flex justify-between gap-6 mb-3">
        {/* Left Column (Fecha) */}
        <div className="w-1/2 flex flex-col gap-2">
          <div className="flex gap-2 items-center pl-4 mb-2">
            <span className="text-[13.5px] font-bold uppercase w-14">FECHA</span>
            <div className="flex gap-1">
              <div className="border border-black w-11 h-8 flex items-center justify-center font-bold text-lg">{day}</div>
              <div className="border border-black w-11 h-8 flex items-center justify-center font-bold text-lg">{month}</div>
              <div className="border border-black w-11 h-8 flex items-center justify-center font-bold text-lg">{year}</div>
            </div>
          </div>
          
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">CLASE VEH</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.vehiculoTipo || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">COLOR</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.vehiculoColor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">PAPELETA O N° DE DOC</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.numeroPapeleta || item?.documentoReferencia || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">GRADO DEL REMISOR</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.gradoRemisor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">HORA</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{time}</div>
          </div>
        </div>

        {/* Right Column (Placa) */}
        <div className="w-1/2 flex flex-col gap-2">
          <div className="flex flex-col items-center mb-2">
            <span className="text-[13.5px] font-bold uppercase border-b border-black w-44 text-center pb-0.5 mb-1 leading-none">PLACA</span>
            <div className="border-2 border-black w-44 h-11 flex items-center justify-center font-black text-2xl uppercase tracking-widest leading-none">{item?.vehiculoPlaca || ''}</div>
            <div className="text-center font-bold text-[12.5px] uppercase leading-none mt-0.5">Depósito Oficial<br/>JOSE L. ORTIZ</div>
          </div>

          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">MARCA</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.vehiculoMarca || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">MOTOR</span>
            <div className="border-b border-black flex-1 font-bold text-[15px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.vehiculoMotor || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">INFRACCIÓN</span>
            <div className="border-b border-black flex-1 font-bold text-[11.5px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{textoInfraccion(item)}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-bold uppercase w-24">AUTORIDAD QUE DISPONE</span>
            <div className="border-b border-black flex-1 font-bold text-[12.5px] text-center uppercase pb-0.5 leading-tight min-h-[23px]">{item?.autoridadQueDispone || ''}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 mb-2">
        <h3 className="text-center text-lg font-black uppercase tracking-widest">INVENTARIO</h3>
      </div>

      {/* Inventario columns */}
      <div className="flex gap-6 mb-2">
        {/* Col 1 */}
        <div className="w-1/3 pr-2">
          <h4 className="text-[12.5px] font-black uppercase mb-0.5">1.- ESTADO DE CARROCERIA</h4>
          <div className="w-full min-h-6 mb-1 border-b border-black text-[13.5px]">{item?.estadoCarroceria || ''}</div>
          
          <h4 className="text-[12.5px] font-black uppercase mb-1 text-center">2.- PARTE EXTERIOR</h4>
          {exteriorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>

        {/* Col 2 */}
        <div className="w-1/3 px-2 flex flex-col justify-end">
          <h4 className="text-[12.5px] font-black uppercase mb-1 text-center">2.- PARTE INTERIOR</h4>
          {interiorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>

        {/* Col 3 */}
        <div className="w-1/3 pl-2 flex flex-col justify-end">
          <h4 className="text-[12.5px] font-black uppercase mb-1 text-center">2.- MOTOR</h4>
          {motorItems.map((lbl, idx) => <InvRow key={idx} label={lbl} />)}
        </div>
      </div>

      {/* Observaciones */}
      <div className="flex items-end mt-2 mb-3">
        <span className="text-[12.5px] font-black uppercase w-28">5.- OBSERVACIONES</span>
        <div className="border-b border-black flex-1 font-bold text-xs italic h-4 leading-none">{item?.observaciones || ''}</div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end gap-10 mt-3">
        {/* Remisor */}
        <div className="w-1/2 flex flex-col gap-3">
          <div className="flex items-end">
            <span className="text-[12.5px] font-black uppercase w-28">REMISOR</span>
            <div className="border-b border-black flex-1 min-h-6"></div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-black uppercase w-28">NOMBRE</span>
            <div className="border-b border-black flex-1 text-center text-[12.5px] uppercase font-bold">{item?.remisorNombre || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-black uppercase w-28">N° DE CARNÉ</span>
            <div className="border-b border-black flex-1 text-center text-[12.5px] font-bold">{item?.carnetRemisor || ''}</div>
          </div>
        </div>

        {/* Interesado */}
        <div className="w-1/2 flex flex-col gap-3 mb-4">
          <div className="flex items-end">
            <span className="text-[12.5px] font-black uppercase w-28">INTERESADO</span>
            <div className="border-b border-black flex-1 text-center text-[12.5px] uppercase font-bold">{item?.interesadoNombre || ''}</div>
          </div>
          <div className="flex items-end">
            <span className="text-[12.5px] font-black uppercase w-28">DOC. ID.</span>
            <div className="border-b border-black flex-1 text-center text-[12.5px] uppercase font-bold">{item?.interesadoDni || ''}</div>
          </div>
          <div className="flex items-end mt-2">
            <span className="text-[12.5px] font-black uppercase w-28"></span>
            <div className="border-t border-black flex-1 text-center text-[10px] uppercase pt-0.5">Firma del Interesado</div>
          </div>
        </div>
      </div>

    </div>,
    document.body
  );
};
