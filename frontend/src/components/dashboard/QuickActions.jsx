import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotonCancelar, BotonGuardar } from '../ui/ModalControls'
import { esRolOficina } from '../../config/roles'

const AVAILABLE_SHORTCUTS = [
  {
    id: 'vehiculo',
    path: '/vehiculos?accion=registrar',
    title: 'Registrar Vehículo',
    desc: 'Nueva unidad / mototaxi',
    color: '#5B6EE1',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  },
  {
    id: 'inspeccion',
    path: '/inspecciones?accion=registrar',
    title: 'Nueva Inspección',
    desc: 'Control y revisión técnica',
    color: '#6CB8E8',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 12.75L11.25 15 15 9.75m-2.182 7.848a9 9 0 11-1.636 0M12 3v1.5" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  },
  {
    id: 'papeleta',
    path: '/papeletas?accion=registrar',
    title: 'Emitir Papeleta',
    desc: 'Infracción e intervención',
    color: '#EE5D50',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  },
  {
    id: 'pago',
    path: '/pagos?accion=registrar',
    title: 'Cobro en Caja',
    desc: 'Ventanilla de recaudación',
    color: '#01B574',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  },
  {
    id: 'trabajador',
    path: '/trabajadores?accion=registrar',
    title: 'Registrar Trabajador',
    desc: 'Alta de personal y roles',
    color: '#FFB547',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    )
  },
  {
    id: 'asociacion',
    path: '/asociaciones?accion=registrar',
    title: 'Registrar Asociación',
    desc: 'Nuevas empresas de transporte',
    color: '#8A2BE2',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6.75h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    )
  },
  {
    id: 'documento',
    path: '/documentos?accion=registrar',
    title: 'Nuevo Doc. Vehicular',
    desc: 'Registrar TUC o SOAT',
    color: '#FF6347',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
  },
  {
    id: 'operativo',
    path: '/operativos?accion=registrar',
    title: 'Registrar Operativo',
    desc: 'Fiscalización en vía pública',
    color: '#20B2AA',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  {
    id: 'curso',
    path: '/cursos?accion=registrar',
    title: 'Nuevo Curso Vial',
    desc: 'Capacitación en seguridad',
    color: '#1E90FF',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    )
  }
];

const DEFAULT_SHORTCUTS = ['vehiculo', 'inspeccion', 'papeleta', 'pago'];

export function QuickActions({ user }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('quickActions_v1');
    if (saved) {
      try {
        setSelectedIds(JSON.parse(saved));
      } catch (e) {
        setSelectedIds(DEFAULT_SHORTCUTS);
      }
    } else {
      setSelectedIds(DEFAULT_SHORTCUTS);
    }
  }, []);

  const handleSave = (newSelection) => {
    setSelectedIds(newSelection);
    localStorage.setItem('quickActions_v1', JSON.stringify(newSelection));
    setIsModalOpen(false);
  };

  const rolNormalizado = (user?.rol || '').toUpperCase();
  const isOffice = esRolOficina(rolNormalizado);

  // Filtramos los atajos disponibles basados en el rol
  const allowedShortcuts = AVAILABLE_SHORTCUTS.filter(s => {
    if (!isOffice) {
      // Si no es oficina (ej. Inspector/Trabajador), solo puede ver papeleta, inspeccion, operativo
      return ['papeleta', 'inspeccion', 'operativo'].includes(s.id);
    }
    return true; // Oficina/Admin puede ver todos
  });

  const activeShortcuts = allowedShortcuts.filter(s => selectedIds.includes(s.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-base font-extrabold text-[#2B3674] dark:text-white tracking-tight">Accesos Rápidos Operativos</h4>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-[#5B6EE1] hover:underline cursor-pointer focus:outline-none bg-transparent border-none p-0"
        >
          Personalizar atajos
        </button>
      </div>
      
      {activeShortcuts.length === 0 ? (
        <div className="bg-white dark:bg-[#1C2438] rounded-[20px] p-6 text-center text-sm font-medium text-slate-500 shadow-sm border border-dashed border-slate-300 dark:border-white/10">
          No hay atajos seleccionados. Haz clic en "Personalizar atajos" para agregar algunos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {activeShortcuts.map(action => {
            const hexToRgb = (hex) => {
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
              return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '67, 24, 255';
            };
            
            const colorRgb = hexToRgb(action.color);

            return (
              <a 
                key={action.id}
                href={action.path}
                className="group p-4 rounded-[20px] bg-white dark:bg-[#1C2438] shadow-horizon dark:shadow-none hover:shadow-horizon dark:shadow-none-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-transparent dark:border-white/10 cursor-pointer" 
                style={{ '--hover-border': `rgba(${colorRgb}, 0.2)` }}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    navigate(action.path);
                  }
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${colorRgb}, 0.2)` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
              >
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-2xl transition-all flex items-center justify-center"
                  style={{ 
                    backgroundColor: `rgba(${colorRgb}, 0.1)`, 
                    color: action.color 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = action.color;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `rgba(${colorRgb}, 0.1)`;
                    e.currentTarget.style.color = action.color;
                  }}
                >
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <h5 
                    className="text-sm font-extrabold text-[#2B3674] dark:text-white transition-colors min-w-0 break-words"
                    onMouseEnter={(e) => { e.currentTarget.style.color = action.color }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '' }}
                  >
                    {action.title}
                  </h5>
                  <p className="text-[11px] font-medium text-[#A3AED0] mt-0.5 min-w-0 break-words">{action.desc}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <CustomizeModal 
          availableShortcuts={allowedShortcuts}
          initialSelection={selectedIds}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function CustomizeModal({ availableShortcuts, initialSelection, onSave, onClose }) {
  const [selection, setSelection] = useState(initialSelection);

  const toggleSelection = (id) => {
    setSelection(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1C2438] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#5B6EE1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Personalizar atajos
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">
            Selecciona los accesos rápidos que deseas mostrar en tu panel principal. Se recomiendan de 4 a 8 atajos.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableShortcuts.map(shortcut => {
              const isSelected = selection.includes(shortcut.id);
              return (
                <label 
                  key={shortcut.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-[#5B6EE1] bg-[#5B6EE1]/5' 
                      : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'
                  }`}
                >
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-[#5B6EE1] rounded border-slate-300 focus:ring-[#5B6EE1]"
                      checked={isSelected}
                      onChange={() => toggleSelection(shortcut.id)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-700 dark:text-white min-w-0 break-words">
                      {shortcut.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {shortcut.desc}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        
        <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-white/5">
          <BotonCancelar onClick={onClose} />
          <BotonGuardar type="button" onClick={() => onSave(selection)}>
Guardar cambios
</BotonGuardar>
        </div>
      </div>
    </div>
  );
}
