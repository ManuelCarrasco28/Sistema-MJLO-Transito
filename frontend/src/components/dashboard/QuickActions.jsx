import { Icon } from '../ui/Icon'
import { useNavigate } from 'react-router-dom'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-base font-extrabold text-[#2B3674] dark:text-white tracking-tight">Accesos Rápidos Operativos</h4>
        <span className="text-xs font-bold text-[#4318FF] hover:underline cursor-pointer">Personalizar atajos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Action 1 */}
        <a 
          className="group p-4 rounded-[20px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none hover:shadow-horizon dark:shadow-none-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-transparent dark:border-white/10 hover:border-[#4318FF]/20 cursor-pointer" 
          onClick={() => navigate('/vehiculos?accion=registrar')}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#4318FF]/10 text-[#4318FF] group-hover:bg-[#4318FF] group-hover:text-white transition-all flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-extrabold text-[#2B3674] dark:text-white group-hover:text-[#4318FF] transition-colors truncate">Registrar Vehículo</h5>
            <p className="text-[11px] font-medium text-[#A3AED0] mt-0.5 truncate">Nueva unidad / mototaxi</p>
          </div>
        </a>
        
        {/* Action 2 */}
        <a 
          className="group p-4 rounded-[20px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none hover:shadow-horizon dark:shadow-none-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-transparent dark:border-white/10 hover:border-[#39B8FF]/20 cursor-pointer" 
          onClick={() => navigate('/inspecciones?accion=registrar')}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#39B8FF]/10 text-[#39B8FF] group-hover:bg-[#39B8FF] group-hover:text-white transition-all flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75m-2.182 7.848a9 9 0 11-1.636 0M12 3v1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-extrabold text-[#2B3674] dark:text-white group-hover:text-[#39B8FF] transition-colors truncate">Nueva Inspección</h5>
            <p className="text-[11px] font-medium text-[#A3AED0] mt-0.5 truncate">Control y revisión técnica</p>
          </div>
        </a>
        
        {/* Action 3 */}
        <a 
          className="group p-4 rounded-[20px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none hover:shadow-horizon dark:shadow-none-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-transparent dark:border-white/10 hover:border-[#EE5D50]/20 cursor-pointer" 
          onClick={() => navigate('/papeletas?accion=registrar')}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#EE5D50]/10 text-[#EE5D50] group-hover:bg-[#EE5D50] group-hover:text-white transition-all flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-extrabold text-[#2B3674] dark:text-white group-hover:text-[#EE5D50] transition-colors truncate">Emitir Papeleta</h5>
            <p className="text-[11px] font-medium text-[#A3AED0] mt-0.5 truncate">Infracción e intervención</p>
          </div>
        </a>
        
        {/* Action 4 */}
        <a 
          className="group p-4 rounded-[20px] bg-white dark:bg-[#111C44] shadow-horizon dark:shadow-none hover:shadow-horizon dark:shadow-none-hover transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-transparent dark:border-white/10 hover:border-[#01B574]/20 cursor-pointer" 
          onClick={() => navigate('/pagos?accion=registrar')}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#01B574]/10 text-[#01B574] group-hover:bg-[#01B574] group-hover:text-white transition-all flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div className="min-w-0">
            <h5 className="text-sm font-extrabold text-[#2B3674] dark:text-white group-hover:text-[#01B574] transition-colors truncate">Cobro en Caja</h5>
            <p className="text-[11px] font-medium text-[#A3AED0] mt-0.5 truncate">Ventanilla de recaudación</p>
          </div>
        </a>
      </div>
    </div>
  )
}
