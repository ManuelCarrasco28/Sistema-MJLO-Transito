import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { navigationGroups, PREFETCH_MAP } from '../../config/navigation'
import { Icon } from '../ui/Icon'
import { apiFetch } from '../../config/api'

export function Sidebar({ activeItem, onSelect, mobileOpen, onClose, onLogout, collapsedOnDesktop, user, onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()

  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isSuperAdmin = rolNormalizado === 'SUPERADMIN'
  const isAdmin = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE'].includes(rolNormalizado)
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes(rolNormalizado)

  // Memoizado: antes se recalculaba en cada render con una referencia nueva,
  // lo que el useEffect de auto-apertura (más abajo) no podía declarar como
  // dependencia real sin re-ejecutarse de más. Al fijar la referencia, el
  // efecto puede depender de esta lista de forma explícita y predecible.
  const visibleNavigationGroups = useMemo(() => navigationGroups
    .map((group) => {
      if (group.superAdminOnly && !isSuperAdmin) return null
      if (group.adminOnly && !isAdmin) return null
      if (group.officeOnly && !isOffice) return null
      if (isSuperAdmin && !group.superAdminOnly) return null

      const filteredItems = group.items.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) return false
        if (item.adminOnly && !isAdmin) return false
        if (item.officeOnly && !isOffice) return false
        return true
      })

      if (filteredItems.length === 0) return null
      return { ...group, items: filteredItems }
    })
    .filter(Boolean), [isSuperAdmin, isAdmin, isOffice])

  // Se compara solo contra la ruta actual (siempre exacta y sincronizada con
  // el router). Antes también se comparaba contra "activeItem" y contra
  // prefijos de ruta, lo que a veces marcaba como activo un grupo distinto
  // al que realmente se estaba visitando.
  const isItemSelected = (item) => {
    if (!item) return false
    if (location.pathname === item.path) return true
    if (item.path === '/cursos' && location.pathname === '/cursos-seguridad') return true
    if (item.path === '/internamientos' && location.pathname === '/retenciones') return true
    return false
  }

  // Cada grupo se abre/cierra de forma independiente (se pueden tener varios
  // abiertos a la vez). El estado inicial se restaura desde las preferencias
  // guardadas en la cuenta del usuario, y cada cambio se persiste ahí mismo
  // (con debounce) para que quede igual sin importar el dispositivo/navegador.
  const [expandedGroups, setExpandedGroups] = useState(() => user?.preferencias?.sidebarExpandedGroups || {})
  const isFirstRender = useRef(true)
  const savePreferenceTimeout = useRef(null)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (savePreferenceTimeout.current) clearTimeout(savePreferenceTimeout.current)
    savePreferenceTimeout.current = setTimeout(() => {
      apiFetch('/perfil/preferencias', {
        method: 'PUT',
        body: { sidebarExpandedGroups: expandedGroups },
      }).catch(() => {})
    }, 600)
    return () => {
      if (savePreferenceTimeout.current) clearTimeout(savePreferenceTimeout.current)
    }
  }, [expandedGroups])

  useEffect(() => {
    const activeGroup = visibleNavigationGroups.find((group) => group.items.some((item) => isItemSelected(item)))
    if (activeGroup) {
      setExpandedGroups((prev) => (prev[activeGroup.name] ? prev : { ...prev, [activeGroup.name]: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visibleNavigationGroups])

  const [activeFlyoutGroup, setActiveFlyoutGroup] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const flyoutRef = useRef(null)

  const [hoveredGroup, setHoveredGroup] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const tooltipTimeoutRef = useRef(null)

  // Dispara el import() dinámico del módulo en hover para que esté listo antes del clic.
  // Los imports dinámicos se cachean: llamarlo N veces = una sola petición real.
  const handleItemPrefetch = useCallback((path) => {
    const fn = PREFETCH_MAP[path]
    if (fn) fn().catch(() => {})
  }, [])

  // Diseño monocromático: todos los íconos de grupo usan el mismo tono gris
  // Sin caja de fondo por categoría, pero cada ícono de grupo mantiene su
  // propio color distintivo (solo el glifo, no un fondo/caja coloreada).
  const NEUTRAL_ICON = 'text-slate-500 dark:text-slate-400'
  const groupIconConfig = {
    'Super Admin': { icon: 'shieldCheck', color: 'text-cyan-500 dark:text-cyan-400', bg: '' },
    'Administración': { icon: 'settings', color: 'text-emerald-500 dark:text-emerald-400', bg: '' },
    'Mantenimiento': { icon: 'lock', color: NEUTRAL_ICON, bg: '' },
    'Principal': { icon: 'dashboard', color: 'text-[#5B6EE1] dark:text-indigo-400', bg: '' },
    'Padrón municipal': { icon: 'people', color: 'text-[#5B6EE1] dark:text-indigo-400', bg: '' },
    'Trámites': { icon: 'document', color: 'text-amber-500 dark:text-amber-400', bg: '' },
    'Inspecciones Técnicas': { icon: 'certificate', color: 'text-purple-600 dark:text-purple-400', bg: '' },
    'Fiscalización': { icon: 'ticket', color: 'text-rose-500 dark:text-rose-400', bg: '' },
    'Pagos': { icon: 'receiptCheck', color: 'text-emerald-600 dark:text-emerald-400', bg: '' },
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        // Ignoramos si el clic fue en un botón que abre/cierra el menú flotante
        if (event.target.closest('[data-flyout-trigger="true"]')) {
          return
        }
        setActiveFlyoutGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  const openFlyout = (group, e) => {
    if (activeFlyoutGroup?.name === group.name) {
      setActiveFlyoutGroup(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setFlyoutPos({
      top: rect.top,
      left: 80 + 12 // sidebar is 80px
    })
    setActiveFlyoutGroup(group)
    setHoveredGroup(null) // Hide tooltip when opening flyout
  }

  const handleMouseEnter = (label, e, groupName) => {
    if (activeFlyoutGroup?.name === groupName) return
    const rect = e.currentTarget.getBoundingClientRect()
    
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipPos({ 
        top: rect.top + rect.height / 2, 
        left: collapsedOnDesktop ? 92 : rect.right + 12 
      })
      setHoveredGroup(label)
    }, 150)
  }

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    setHoveredGroup(null)
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        style={{ height: '100%', maxHeight: '100dvh' }}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen h-dvh max-h-dvh flex-col overflow-hidden bg-white dark:bg-[#1C2438] text-slate-800 dark:text-slate-100 border-r border-slate-200/80 dark:border-white/10 shadow-2xl transition-all duration-300 lg:relative lg:z-auto lg:h-full lg:max-h-full lg:translate-x-0 lg:shadow-none shrink-0 select-none ${
          collapsedOnDesktop ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-purpose="sidebar-navigation"
      >
        <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-slate-100 dark:border-white/10 px-3 relative group/header">
          {/* Logo Container */}
          <div className={`flex items-center justify-center transition-opacity duration-200 ${
            collapsedOnDesktop 
              ? 'justify-center w-full absolute inset-0 opacity-100 group-hover/header:opacity-0 pointer-events-none' 
              : 'w-full flex items-center justify-center px-7'
          }`}>
            {collapsedOnDesktop ? (
              <span className="text-xl font-black text-[#2B3674] dark:text-white">JLO</span>
            ) : (
              <>
                <img
                  src="/img/logo-mjlo.png"
                  alt="Logo Municipalidad JLO"
                  className="h-[54px] max-w-[12.5rem] object-contain dark:hidden block"
                  onError={(event) => { event.currentTarget.src = '/escudo-jlo.png' }}
                />
                <img
                  src="/img/logo-mjlo-blanco.png"
                  alt="Logo Municipalidad JLO"
                  className="h-[54px] max-w-[12.5rem] object-contain dark:block hidden"
                  onError={(event) => { event.currentTarget.src = '/escudo-jlo.png' }}
                />
              </>
            )}
          </div>
          
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden absolute right-2.5 top-1/2 -translate-y-1/2 z-10"
          >
            <Icon name="close" />
          </button>

          {/* Desktop toggle button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 p-1.5 cursor-pointer z-10 ${
              collapsedOnDesktop
                ? 'absolute inset-0 m-auto size-9 opacity-0 group-hover/header:opacity-100'
                : 'absolute right-2.5 top-1/2 -translate-y-1/2'
            }`}
            onMouseEnter={(e) => handleMouseEnter(collapsedOnDesktop ? "Expandir panel" : "Ocultar panel", e, null)}
            onMouseLeave={handleMouseLeave}
          >
            <Icon name="sidebarRight" className="size-5" />
          </button>
        </div>

        <nav className={`no-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1.5 py-2 px-2.5 ${collapsedOnDesktop ? 'lg:px-2 px-2.5' : 'px-2.5'}`} aria-label="Navegación principal">
          {visibleNavigationGroups.map((group) => {
            const grpCfg = groupIconConfig[group.name] || { icon: 'dashboard', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' }
            const isSingle = group.items.length === 1
            const mainItem = group.items[0]
            const groupSelected = group.items.some(item => isItemSelected(item))

            if (collapsedOnDesktop) {
              return (
                <div key={group.name} className="flex justify-center mb-0.5">
                  <button
                    type="button"
                    data-flyout-trigger="true"
                    onMouseEnter={(e) => {
                      handleMouseEnter(isSingle ? mainItem.label : group.name, e, group.name)
                      if (isSingle) handleItemPrefetch(mainItem.path)
                    }}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                      if (isSingle) {
                        onSelect(mainItem.label)
                        navigate(mainItem.path)
                        if (mobileOpen) onClose()
                      } else {
                        openFlyout(group, e)
                      }
                    }}
                    className={`group flex size-10 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                      groupSelected || activeFlyoutGroup?.name === group.name
                        ? ''
                        : 'hover:bg-slate-50 dark:hover:bg-[#1C2438]'
                    }`}
                  >
                    <span className={`grid size-[32px] place-items-center rounded-[10px] transition-all duration-200 ${
                      groupSelected
                        ? 'bg-[#5B6EE1] text-white shadow-md'
                        : activeFlyoutGroup?.name === group.name
                          ? `ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-white/5 ${grpCfg.color}`
                          : `bg-slate-100 dark:bg-white/5 ${grpCfg.color} hover:brightness-95 dark:hover:brightness-110`
                    }`}>
                      <Icon
                        name={isSingle ? mainItem.icon : grpCfg.icon}
                        className="size-5"
                      />
                    </span>
                  </button>
                </div>
              )
            }

            if (isSingle) {
              const selected = isItemSelected(mainItem)
              return (
                <button
                  key={group.name}
                  type="button"
                  onMouseEnter={() => handleItemPrefetch(mainItem.path)}
                  onClick={() => {
                    onSelect(mainItem.label)
                    navigate(mainItem.path)
                    if (mobileOpen) onClose()
                  }}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer ${
                    selected
                      ? 'bg-[#F4F7FE] dark:bg-white/5 text-[#5B6EE1] dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon name={mainItem.icon} className={`size-4 shrink-0 ${selected ? '' : grpCfg.color}`} />
                  <span className="text-[13px] font-semibold uppercase tracking-tight truncate flex-1">{mainItem.label}</span>
                </button>
              )
            }

            return (
              <div key={group.name}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer ${
                    groupSelected && !expandedGroups[group.name]
                      ? 'bg-[#F4F7FE] dark:bg-white/5 text-[#5B6EE1] dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon name={grpCfg.icon} className={`size-4 shrink-0 ${groupSelected && !expandedGroups[group.name] ? '' : grpCfg.color}`} />
                  <span className="text-[13px] font-semibold uppercase tracking-tight truncate flex-1">{group.name}</span>
                  <Icon
                    name="chevronDown"
                    className={`size-3.5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expandedGroups[group.name] ? 'rotate-180' : ''}`}
                  />
                </button>

                <div className={`grid transition-all duration-150 ease-in-out ${expandedGroups[group.name] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden space-y-0.5 pt-0.5 pb-1">
                    {group.items.map((item) => {
                      const selected = isItemSelected(item)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => handleItemPrefetch(item.path)}
                          onClick={() => {
                            onSelect(item.label)
                            navigate(item.path)
                            if (mobileOpen) onClose()
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-6 pr-2.5 text-left transition-colors duration-150 cursor-pointer ${
                            selected
                              ? 'text-[#5B6EE1] dark:text-indigo-300 font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        >
                          <Icon name={item.icon} className={`size-4 shrink-0 ${selected ? 'text-[#5B6EE1] dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`} />
                          <span className="text-[12.5px] tracking-tight truncate flex-1">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-100 dark:border-white/10 px-2.5 py-2 bg-white dark:bg-[#1C2438]">
          <button
            type="button"
            onClick={onLogout}
            onMouseEnter={(e) => collapsedOnDesktop ? handleMouseEnter("Cerrar sesión", e, null) : null}
            onMouseLeave={handleMouseLeave}
            className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer ${
              collapsedOnDesktop
                ? 'lg:justify-center lg:size-10 mx-auto w-full'
                : 'w-full'
            }`}
          >
            <span className={`grid ${collapsedOnDesktop ? 'size-[32px]' : 'size-6'} shrink-0 place-items-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 transition-transform duration-150 group-hover:scale-105`}>
              <Icon name="logout" className={collapsedOnDesktop ? 'size-5' : 'size-3.5'} />
            </span>
            <span className={`text-[12.5px] font-bold tracking-tight truncate flex-1 text-red-600 dark:text-red-400 ${collapsedOnDesktop ? 'lg:hidden' : ''}`}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Flyout Menu for Collapsed Desktop Sidebar */}
      {activeFlyoutGroup && createPortal(
        <div
          ref={flyoutRef}
          style={{ position: 'fixed', top: flyoutPos.top, left: flyoutPos.left, zIndex: 9999 }}
          className="min-w-[13rem] rounded-[16px] border border-[#E9EDF7]/60 dark:border-white/10 bg-white dark:bg-[#1C2438] p-2.5 shadow-[0_20px_60px_rgba(112,144,176,0.15)] dark:shadow-none animate-enter"
        >
          <p className="px-2 pb-2 pt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/60">
            {activeFlyoutGroup.name}
          </p>
          <div className="space-y-1">
            {activeFlyoutGroup.items.map((item) => {
              const selected = isItemSelected(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => handleItemPrefetch(item.path)}
                  onClick={() => {
                    onSelect(item.label)
                    navigate(item.path)
                    setActiveFlyoutGroup(null)
                  }}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] font-bold transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'bg-[#5B6EE1] text-white shadow-md'
                      : 'text-slate-800 dark:text-white/80 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} className={`size-3.5 ${selected ? 'text-white' : (groupIconConfig[activeFlyoutGroup.name]?.color || 'text-blue-500')}`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Custom Tooltip for Collapsed Sidebar */}
      {hoveredGroup && createPortal(
        <div 
          style={{ position: 'fixed', top: tooltipPos.top, left: tooltipPos.left, transform: 'translateY(-50%)', zIndex: 10000 }}
          className="pointer-events-none"
        >
          <div className="px-3 py-1.5 bg-[#2B3674] dark:bg-slate-700 text-white text-[13px] font-bold rounded-[8px] shadow-lg whitespace-nowrap animate-tooltip-slide-in">
            {hoveredGroup}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
