import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { navigationGroups } from '../../config/navigation'
import { Icon } from '../ui/Icon'

const groupIconConfig = {
  'Principal':        { icon: 'dashboard',    color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  'Padrón municipal': { icon: 'people',       color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  'Documentación':    { icon: 'folderShield', color: 'text-amber-400',   bg: 'bg-amber-500/20' },
  'Trámites':         { icon: 'routePermit',  color: 'text-violet-400',  bg: 'bg-violet-500/20' },
  'Fiscalización':    { icon: 'ticket',       color: 'text-rose-400',    bg: 'bg-rose-500/20' },
}

const itemIconConfig = {
  dashboard:      { color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  personas:       { color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  personal:       { color: 'text-sky-400',     bg: 'bg-sky-500/20' },
  organizaciones: { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  vehiculos:      { color: 'text-indigo-400',  bg: 'bg-indigo-500/20' },
  documentos:     { color: 'text-amber-400',   bg: 'bg-amber-500/20' },
  certicav:       { color: 'text-yellow-400',  bg: 'bg-yellow-500/20' },
  permisos:       { color: 'text-violet-400',  bg: 'bg-violet-500/20' },
  cursos:         { color: 'text-purple-400',  bg: 'bg-purple-500/20' },
  papeletas:      { color: 'text-rose-400',    bg: 'bg-rose-500/20' },
  pagos:          { color: 'text-green-400',   bg: 'bg-green-500/20' },
  internamientos: { color: 'text-orange-400',  bg: 'bg-orange-500/20' },
}

export function Sidebar({ activeItem, onSelect, mobileOpen, onClose, onLogout, collapsedOnDesktop, onExpandDesktop }) {
  const navigate = useNavigate()
  const activeGroupName = navigationGroups.find((g) =>
    g.items.some((item) => item.label === activeItem)
  )?.name

  const [expandedGroups, setExpandedGroups] = useState(() =>
    activeGroupName ? [activeGroupName] : []
  )
  const [flyout, setFlyout] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const flyoutRef = useRef(null)
  const buttonRefs = useRef({})

  useEffect(() => {
    if (!collapsedOnDesktop) setFlyout(null)
  }, [collapsedOnDesktop])

  useEffect(() => {
    function handleMouseDown(e) {
      if (!flyout) return
      const insideFlyout = flyoutRef.current?.contains(e.target)
      const insideButton = buttonRefs.current[flyout]?.contains(e.target)
      if (!insideFlyout && !insideButton) {
        setFlyout(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [flyout])

  const openFlyout = (groupName) => {
    const btn = buttonRefs.current[groupName]
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setFlyoutPos({ top: rect.top, left: rect.right + 10 })
    setFlyout((prev) => (prev === groupName ? null : groupName))
  }

  const toggleGroup = (groupName) => {
    setExpandedGroups((current) =>
      current.includes(groupName)
        ? current.filter((n) => n !== groupName)
        : [...current, groupName]
    )
  }

  const goToItem = (item) => {
    onSelect(item.label)
    navigate(item.path)
    onClose()
    setFlyout(null)
  }

  const activeFlyoutGroup = flyout ? navigationGroups.find((g) => g.name === flyout) : null

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
        className={`fixed inset-y-0 left-0 z-50 flex h-svh flex-col overflow-hidden bg-[#0d1730] text-slate-200 shadow-2xl transition-[width,transform] duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 lg:shadow-[8px_0_24px_rgba(15,23,42,0.08)] ${
          collapsedOnDesktop ? 'lg:w-[4.75rem]' : 'lg:w-full'
        } ${
          mobileOpen ? 'w-72 max-w-[88vw] translate-x-0' : 'w-72 max-w-[88vw] -translate-x-full lg:translate-x-0'
        }`}
      >
        <div
          className={`relative shrink-0 border-b border-white/10 bg-[#111d3a] ${
            collapsedOnDesktop ? 'lg:flex lg:flex-col lg:items-center lg:px-2 lg:py-3' : 'px-3 pt-3 pb-2.5'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="absolute right-2.5 top-2.5 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" />
          </button>

          <div
            className={`flex items-center justify-center rounded-xl bg-white px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.22)] ring-1 ring-white/15 ${
              collapsedOnDesktop ? 'lg:hidden' : ''
            }`}
          >
            <img
              src="/img/logo-mjlo.png"
              alt="Municipalidad Distrital de José Leonardo Ortiz"
              className="h-10 w-auto max-w-full object-contain"
            />
          </div>
          <p
            className={`mt-1.5 text-center text-[11px] font-black uppercase leading-tight tracking-wider text-white drop-shadow-[0_2px_6px_rgba(59,130,246,0.55)] ${
              collapsedOnDesktop ? 'lg:hidden' : ''
            }`}
          >
            TRÁNSITO MUNICIPAL
          </p>

          <button
            type="button"
            onClick={onExpandDesktop}
            aria-label="Expandir menú lateral"
            className={`hidden size-11 mx-auto place-items-center rounded-2xl bg-white/8 text-blue-300 ring-1 ring-white/10 hover:bg-white/14 hover:text-white transition-colors ${
              collapsedOnDesktop ? 'lg:grid' : ''
            }`}
          >
            <Icon name="menu" className="size-5" />
          </button>
        </div>



        <nav
          aria-label="Navegación principal"
          className={`flex-1 overflow-y-auto no-scrollbar py-2 ${
            collapsedOnDesktop ? 'lg:px-2 lg:py-4' : 'px-2.5'
          }`}
        >
          <div className="space-y-1.5">
            {navigationGroups.map((group) => {
              const isSingle = group.items.length === 1
              const groupSelected = group.name === activeGroupName
              const isExpanded = expandedGroups.includes(group.name)
              const mainItem = group.items[0]
              const grpCfg = groupIconConfig[group.name] || { icon: 'dashboard', color: 'text-blue-400', bg: 'bg-blue-500/20' }
              const mainCfg = itemIconConfig[mainItem.id] || { color: 'text-blue-400', bg: 'bg-blue-500/20' }
              const isFlyoutOpen = flyout === group.name

              if (collapsedOnDesktop) {
                const selected = isSingle ? activeItem === mainItem.label : groupSelected
                const cfg = isSingle ? mainCfg : grpCfg
                const iconName = isSingle ? mainItem.icon : grpCfg.icon

                return (
                  <div key={group.name} className="hidden lg:flex justify-center">
                    <button
                      ref={(el) => { buttonRefs.current[group.name] = el }}
                      type="button"
                      onClick={() => {
                        if (isSingle) {
                          goToItem(mainItem)
                        } else {
                          openFlyout(group.name)
                        }
                      }}
                      title={isSingle ? mainItem.label : group.name}
                      className={`flex size-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                        selected || isFlyoutOpen
                          ? 'bg-blue-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)]'
                          : 'bg-white/8 ring-1 ring-white/8 hover:bg-white/14 hover:scale-105'
                      }`}
                    >
                      <span className={`grid size-6 place-items-center rounded-lg ${(selected || isFlyoutOpen) ? 'bg-white/20' : cfg.bg}`}>
                        <Icon
                          name={iconName}
                          className={`size-3.5 ${(selected || isFlyoutOpen) ? 'text-white' : cfg.color}`}
                        />
                      </span>
                    </button>
                  </div>
                )
              }

              if (isSingle) {
                const selected = activeItem === mainItem.label
                return (
                  <button
                    key={group.name}
                    type="button"
                    onClick={() => goToItem(mainItem)}
                    title={mainItem.label}
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-[12.5px] font-semibold transition-all duration-200 ${
                      selected
                        ? 'bg-blue-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)]'
                        : 'bg-white/8 text-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.14)] ring-1 ring-white/8 hover:-translate-y-0.5 hover:bg-white/12 hover:text-white'
                    }`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${selected ? 'bg-white/20' : mainCfg.bg}`}>
                      <Icon name={mainItem.icon} className={`size-3.5 ${selected ? 'text-white' : mainCfg.color}`} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{mainItem.label}</span>
                  </button>
                )
              }

              return (
                <div key={group.name}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.name)}
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-[12.5px] font-semibold transition-all duration-200 ${
                      groupSelected
                        ? 'bg-blue-500 text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)]'
                        : 'bg-white/8 text-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.14)] ring-1 ring-white/8 hover:-translate-y-0.5 hover:bg-white/12 hover:text-white'
                    }`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${groupSelected ? 'bg-white/20' : grpCfg.bg}`}>
                      <Icon name={grpCfg.icon} className={`size-3.5 ${groupSelected ? 'text-white' : grpCfg.color}`} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                    <Icon
                      name="chevronDown"
                      className={`size-3 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                      {group.items.map((item) => {
                        const selected = activeItem === item.label
                        const cfg = itemIconConfig[item.id] || { color: 'text-blue-400', bg: 'bg-blue-500/20' }
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => goToItem(item)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[12.5px] font-medium transition-all duration-200 ${
                              selected
                                ? 'bg-white/12 text-white'
                                : 'text-slate-400 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            <span className={`grid size-5 shrink-0 place-items-center rounded-md ${selected ? 'bg-white/20' : cfg.bg}`}>
                              <Icon name={item.icon} className={`size-3 ${selected ? 'text-white' : cfg.color}`} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <div
          className={`shrink-0 border-t border-white/10 bg-[#0d1730]/95 py-2.5 ${
            collapsedOnDesktop ? 'lg:flex lg:justify-center lg:px-2' : 'px-2.5'
          }`}
        >
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className={`group transition-all cursor-pointer ${
              collapsedOnDesktop
                ? 'hidden lg:flex size-11 items-center justify-center rounded-2xl bg-white/8 ring-1 ring-white/8 text-red-400 hover:bg-red-500/15 hover:text-red-300 hover:scale-105'
                : 'flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-[12.5px] font-semibold text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:border-red-500/30 hover:bg-red-500/10 hover:text-white active:scale-[0.98]'
            }`}
          >
            <Icon name="logout" className="size-3.5 text-red-500 group-hover:scale-110 transition-transform" />
            {!collapsedOnDesktop && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {activeFlyoutGroup && createPortal(
        <div
          ref={flyoutRef}
          style={{ position: 'fixed', top: flyoutPos.top, left: flyoutPos.left, zIndex: 9999 }}
          className="min-w-[13rem] rounded-2xl border border-white/10 bg-[#0f1e3a] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/5"
        >
          <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {activeFlyoutGroup.name}
          </p>
          <div className="space-y-0.5">
            {activeFlyoutGroup.items.map((item) => {
              const selected = activeItem === item.label
              const cfg = itemIconConfig[item.id] || { color: 'text-blue-400', bg: 'bg-blue-500/20' }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToItem(item)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold transition-all duration-200 ${
                    selected
                      ? 'bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${selected ? 'bg-white/20' : cfg.bg}`}>
                    <Icon name={item.icon} className={`size-3.5 ${selected ? 'text-white' : cfg.color}`} />
                  </span>
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
