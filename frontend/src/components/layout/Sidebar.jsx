import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { navigationGroups } from '../../config/navigation'
import { Icon } from '../ui/Icon'

export function Sidebar({ activeItem, onSelect, mobileOpen, onClose, onLogout, collapsedOnDesktop, user }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = Boolean(
    user?.cargo?.toLowerCase()?.includes('admin') || 
    user?.usuario?.toLowerCase()?.includes('admin') || 
    user?.usuario === 'diegobarturen'
  )

  const visibleNavigationGroups = navigationGroups.filter(
    (group) => !group.adminOnly || isAdmin
  )

  const isItemSelected = (item) => {
    if (!item) return false
    if (activeItem === item.label || activeItem === item.id) return true
    if (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'))) return true
    if (item.path === '/cursos' && location.pathname.includes('/cursos')) return true
    if (item.path === '/internamientos' && location.pathname.includes('/retenciones')) return true
    return false
  }

  const [expandedGroups, setExpandedGroups] = useState({
    'Administración': true,
    'Principal': true,
    'Padrón municipal': true,
    'Documentación': true,
    'Trámites': true,
    'Fiscalización': true
  })

  const [activeFlyoutGroup, setActiveFlyoutGroup] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const flyoutRef = useRef(null)

  const groupIconConfig = {
    'Administración': { icon: 'shieldCheck', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20' },
    'Principal': { icon: 'dashboard', color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20' },
    'Padrón municipal': { icon: 'people', color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20' },
    'Documentación': { icon: 'document', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20' },
    'Trámites': { icon: 'document', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-500/20' },
    'Fiscalización': { icon: 'ticket', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10 dark:bg-rose-500/20' },
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        setActiveFlyoutGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
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
      left: rect.right + 12
    })
    setActiveFlyoutGroup(group)
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
        className={`bg-white dark:bg-[#111C44] flex flex-col justify-between select-none z-50 transition-all duration-300 border-r border-[#E9EDF7]/60 dark:border-none shadow-[14px_0_30px_rgba(112,144,176,0.06)] min-h-screen py-7 fixed lg:static left-0 top-0 bottom-0 ${
          collapsedOnDesktop ? 'lg:w-[5.5rem] w-72' : 'w-72'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-purpose="sidebar-navigation"
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          {/* Brand Header */}
          <div className={`px-5 pb-8 pt-2 flex items-center justify-between gap-3 border-b border-[#F4F7FE] dark:border-white/10 ${collapsedOnDesktop ? 'lg:justify-center' : ''}`}>
            <div className={`flex items-center justify-center w-full px-2 ${collapsedOnDesktop ? 'lg:hidden' : ''}`}>
              <img src="/img/logo-mjlo.png" alt="Logo Municipalidad JLO" className="h-12 object-contain dark:hidden block" />
              <img src="/img/logo-mjlo-blanco.png" alt="Logo Municipalidad JLO" className="h-12 object-contain dark:block hidden" />
            </div>
            {collapsedOnDesktop && (
              <div className="hidden lg:flex items-center justify-center w-full">
                <span className="text-[26px] font-black text-[#2B3674] dark:text-white">JLO</span>
              </div>
            )}
            {/* Close button for mobile */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className={`mt-6 space-y-4 mb-6 ${collapsedOnDesktop ? 'lg:px-3' : 'px-5'}`}>
            {visibleNavigationGroups.map((group) => {
              const grpCfg = groupIconConfig[group.name] || { icon: 'dashboard', color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20' }
              const isSingle = group.items.length === 1
              const mainItem = group.items[0]
              const groupSelected = group.items.some(item => isItemSelected(item))

              if (collapsedOnDesktop) {
                return (
                  <div key={group.name} className="flex justify-center mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (isSingle) {
                          onSelect(mainItem.label)
                          navigate(mainItem.path)
                          if (mobileOpen) onClose()
                        } else {
                          openFlyout(group, e)
                        }
                      }}
                      title={isSingle ? mainItem.label : group.name}
                      className={`group flex size-11 items-center justify-center rounded-[14px] transition-all duration-200 cursor-pointer ${
                        groupSelected || activeFlyoutGroup?.name === group.name
                          ? 'bg-[#4318FF] text-white shadow-md'
                          : 'bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] dark:hover:bg-white/10'
                      }`}
                    >
                      <span className={`grid size-6 place-items-center rounded-lg ${groupSelected || activeFlyoutGroup?.name === group.name ? 'text-white' : grpCfg.color}`}>
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
                    className={`group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-all duration-200 cursor-pointer ${
                      selected
                        ? 'bg-[#4318FF] text-white shadow-md'
                        : 'text-[#A3AED0] dark:text-white/60 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-[#2B3674] dark:hover:text-white'
                    }`}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${selected ? 'bg-white/20' : grpCfg.bg}`}>
                      <Icon name={mainItem.icon} className={`size-4 ${selected ? 'text-white' : grpCfg.color}`} />
                    </span>
                    <span className="text-sm font-bold truncate flex-1">{mainItem.label}</span>
                  </button>
                )
              }

              return (
                <div key={group.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className={`group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-all duration-200 cursor-pointer ${
                      groupSelected && !expandedGroups[group.name]
                        ? 'bg-[#F4F7FE] dark:bg-white/5 text-[#2B3674] dark:text-white'
                        : 'text-[#A3AED0] dark:text-white/60 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-[#2B3674] dark:hover:text-white'
                    }`}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${grpCfg.bg}`}>
                      <Icon name={grpCfg.icon} className={`size-4 ${grpCfg.color}`} />
                    </span>
                    <span className={`text-sm font-bold truncate flex-1 ${groupSelected ? 'text-[#2B3674] dark:text-white' : ''}`}>{group.name}</span>
                    <Icon
                      name="chevronDown"
                      className={`size-3.5 transition-transform duration-200 ${expandedGroups[group.name] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div className={`grid transition-all duration-300 ease-in-out ${expandedGroups[group.name] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden space-y-1 pl-10 pr-2 pt-1">
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
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              selected
                                ? 'bg-[#4318FF]/10 dark:bg-[#4318FF]/20 text-[#4318FF] dark:text-white font-bold'
                                : 'text-[#A3AED0] dark:text-white/50 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-[#2B3674] dark:hover:text-white'
                            }`}
                          >
                            <Icon name={item.icon} className={`size-3.5 ${selected ? 'text-[#4318FF] dark:text-white' : ''}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Flyout Menu for Collapsed Desktop Sidebar */}
      {activeFlyoutGroup && createPortal(
        <div
          ref={flyoutRef}
          style={{ position: 'fixed', top: flyoutPos.top, left: flyoutPos.left, zIndex: 9999 }}
          className="min-w-[13rem] rounded-[16px] border border-[#E9EDF7]/60 dark:border-white/10 bg-white dark:bg-[#111C44] p-2.5 shadow-[0_20px_60px_rgba(112,144,176,0.15)] dark:shadow-none animate-enter"
        >
          <p className="px-2 pb-2 pt-0.5 text-[10px] font-black uppercase tracking-widest text-[#A3AED0] dark:text-white/50">
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
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'bg-[#4318FF] text-white shadow-md'
                      : 'text-[#A3AED0] dark:text-white/60 hover:bg-[#F4F7FE] dark:hover:bg-white/5 hover:text-[#2B3674] dark:hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} className={`size-3.5 ${selected ? 'text-white' : ''}`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
