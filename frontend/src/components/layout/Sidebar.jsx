import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { navigationGroups } from '../../config/navigation'
import { Icon } from '../ui/Icon'

export function Sidebar({ activeItem, onSelect, mobileOpen, onClose, onLogout, collapsedOnDesktop, user, onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()

  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isSuperAdmin = rolNormalizado === 'SUPERADMIN'
  const isAdmin = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE'].includes(rolNormalizado)
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes(rolNormalizado)

  const visibleNavigationGroups = navigationGroups
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
    .filter(Boolean)

  const isItemSelected = (item) => {
    if (!item) return false
    if (activeItem === item.label || activeItem === item.id) return true
    if (item.path === '/superadmin') return location.pathname === '/superadmin'
    if (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'))) return true
    if (item.path === '/cursos' && location.pathname.includes('/cursos')) return true
    if (item.path === '/internamientos' && location.pathname.includes('/retenciones')) return true
    return false
  }

  const [expandedGroups, setExpandedGroups] = useState({
    'Principal': true,
    'Super Admin': true,
    'Padrón municipal': true,
    'Trámites': true,
    'Inspecciones Técnicas': true,
    'Fiscalización': true
  })

  useEffect(() => {
    visibleNavigationGroups.forEach((group) => {
      if (group.items.some((item) => isItemSelected(item))) {
        setExpandedGroups((prev) => ({ ...prev, [group.name]: true }))
      }
    })
  }, [activeItem, location.pathname, isAdmin])

  const [activeFlyoutGroup, setActiveFlyoutGroup] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const flyoutRef = useRef(null)

  const [hoveredGroup, setHoveredGroup] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const tooltipTimeoutRef = useRef(null)

  const groupIconConfig = {
    'Super Admin': { icon: 'shieldCheck', color: 'text-cyan-500 dark:text-cyan-300', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
    'Administración': { icon: 'settings', color: 'text-emerald-500 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    'Mantenimiento': { icon: 'lock', color: 'text-slate-500 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-[var(--bg-subtle)]' },
    'Principal': { icon: 'dashboard', color: 'text-[#4318FF]', bg: 'bg-[#EEF2FF] dark:bg-blue-950/40' },
    'Padrón municipal': { icon: 'people', color: 'text-[#4318FF] dark:text-indigo-400', bg: 'bg-[#EEF2FF] dark:bg-indigo-950/40' },
    'Trámites': { icon: 'document', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    'Inspecciones Técnicas': { icon: 'certificate', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    'Fiscalización': { icon: 'ticket', color: 'text-[#EE5D50] dark:text-rose-400', bg: 'bg-[#FEEFEE] dark:bg-rose-950/40' },
    'Pagos': { icon: 'receiptCheck', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
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
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen h-dvh max-h-dvh flex-col overflow-hidden bg-white dark:bg-[#111C44] text-slate-800 dark:text-slate-100 border-r border-slate-200/80 dark:border-white/10 shadow-2xl transition-all duration-300 lg:relative lg:z-auto lg:h-full lg:max-h-full lg:translate-x-0 lg:shadow-none shrink-0 select-none ${
          collapsedOnDesktop ? 'w-20' : 'w-[19.5rem]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-purpose="sidebar-navigation"
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-100 dark:border-white/10 px-3.5 relative group/header">
          {/* Logo Container */}
          <div className={`flex items-center transition-opacity duration-200 ${
            collapsedOnDesktop 
              ? 'justify-center w-full absolute inset-0 opacity-100 group-hover/header:opacity-0 pointer-events-none' 
              : 'w-full justify-center pr-2'
          }`}>
            {collapsedOnDesktop ? (
              <span className="text-xl font-black text-[#2B3674] dark:text-white">JLO</span>
            ) : (
              <>
                <img
                  src="/img/logo-mjlo.png"
                  alt="Logo Municipalidad JLO"
                  className="h-[52px] max-w-[11rem] object-contain dark:hidden block"
                  onError={(event) => { event.currentTarget.src = '/escudo-jlo.png' }}
                />
                <img
                  src="/img/logo-mjlo-blanco.png"
                  alt="Logo Municipalidad JLO"
                  className="h-[52px] max-w-[11rem] object-contain dark:block hidden"
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
            className="rounded-lg p-1 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden ml-auto relative z-10"
          >
            <Icon name="close" />
          </button>

          {/* Desktop toggle button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 p-1.5 cursor-pointer relative z-10 ${
              collapsedOnDesktop ? 'mx-auto opacity-0 group-hover/header:opacity-100' : 'ml-auto'
            }`}
            onMouseEnter={(e) => handleMouseEnter(collapsedOnDesktop ? "Expandir panel" : "Ocultar panel", e, null)}
            onMouseLeave={handleMouseLeave}
          >
            <Icon name="sidebarRight" className="size-5" />
          </button>
        </div>

        <nav className={`no-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1 py-2 px-3 ${collapsedOnDesktop ? 'lg:px-2 px-3' : 'px-3'}`} aria-label="Navegación principal">
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
                    onMouseEnter={(e) => handleMouseEnter(isSingle ? mainItem.label : group.name, e, group.name)}
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
                        : 'hover:bg-slate-50 dark:hover:bg-[#111C44]'
                    }`}
                  >
                    <span className={`grid size-[32px] place-items-center rounded-[10px] transition-all duration-200 ${
                      groupSelected 
                        ? 'bg-[#4318FF] text-white shadow-md' 
                        : activeFlyoutGroup?.name === group.name
                          ? `ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700 ${grpCfg.bg} ${grpCfg.color}`
                          : `${grpCfg.bg} ${grpCfg.color} hover:brightness-95 dark:hover:brightness-110`
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
                  onClick={() => {
                    onSelect(mainItem.label)
                    navigate(mainItem.path)
                    if (mobileOpen) onClose()
                  }}
                  className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-1 text-left transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'bg-[#4318FF] text-white shadow-[0_6px_16px_rgba(67,24,255,0.25)]'
                      : 'text-[#2B3674] dark:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-lg transition-all duration-200 ${selected ? 'bg-white/20 text-white' : `${grpCfg.bg} ${grpCfg.color}`}`}>
                    <Icon name={mainItem.icon} className="size-3.5" />
                  </span>
                  <span className="text-[12.5px] font-bold tracking-tight truncate flex-1">{mainItem.label}</span>
                </button>
              )
            }

            return (
              <div key={group.name} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-1 text-left transition-all duration-200 cursor-pointer ${
                    groupSelected && !expandedGroups[group.name]
                      ? 'bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white'
                      : 'text-[#2B3674] dark:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${grpCfg.bg} ${grpCfg.color}`}>
                    <Icon name={grpCfg.icon} className="size-3.5" />
                  </span>
                  <span className="text-[12.5px] font-bold tracking-tight truncate flex-1 text-[#2B3674] dark:text-white">{group.name}</span>
                  <Icon
                    name="chevronDown"
                    className={`size-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${expandedGroups[group.name] ? 'rotate-180 text-[#4318FF]' : ''}`}
                  />
                </button>

                <div className={`grid transition-all duration-150 ease-in-out ${expandedGroups[group.name] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden space-y-0.5 pl-2.5 ml-2.5 border-l-2 border-slate-100 dark:border-white/10 pt-0.5 pb-0.5">
                    {group.items.map((item) => {
                      const selected = isItemSelected(item)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelect(item.label)
                            navigate(item.path)
                            if (mobileOpen) onClose()
                          }}
                          className={`group/sub flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[12px] font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                            selected
                              ? 'bg-[#4318FF] text-white shadow-[0_3px_10px_rgba(67,24,255,0.3)] font-bold'
                              : 'text-[#2B3674]/85 dark:text-white/85 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-[#4318FF] dark:hover:text-white'
                          }`}
                        >
                          <Icon name={item.icon} className={`size-3.5 shrink-0 transition-transform duration-150 group-hover/sub:scale-110 ${selected ? 'text-white' : `${grpCfg.color} opacity-75 group-hover/sub:opacity-100`}`} />
                          <span className="truncate flex-1">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-100 dark:border-white/10 px-3 py-2 bg-white dark:bg-[#111C44]">
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
          className="min-w-[13rem] rounded-[16px] border border-[#E9EDF7]/60 dark:border-white/10 bg-white dark:bg-[#111C44] p-2.5 shadow-[0_20px_60px_rgba(112,144,176,0.15)] dark:shadow-none animate-enter"
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
                  onClick={() => {
                    onSelect(item.label)
                    navigate(item.path)
                    setActiveFlyoutGroup(null)
                  }}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] font-bold transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'bg-[#4318FF] text-white shadow-md'
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
