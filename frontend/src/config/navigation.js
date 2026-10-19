// Mapa de prefetch por path: cada función dispara un import() dinámico silencioso.
export const PREFETCH_MAP = {
  '/dashboard':               () => import('../pages/DashboardHome'),
  '/vehiculos':               () => import('../pages/Vehiculos'),
  '/personas':                () => import('../pages/Personas'),
  '/superadmin/personas':     () => import('../pages/Personas'),
  '/trabajadores':            () => import('../pages/Trabajadores'),
  '/superadmin/trabajadores': () => import('../pages/Trabajadores'),
  '/asociaciones':            () => import('../pages/Asociaciones'),
  '/documentos':              () => import('../pages/Documentos'),
  '/impresion':               () => import('../pages/CentroImpresion'),
  '/inspecciones':            () => import('../pages/Inspecciones'),
  '/papeletas':               () => import('../pages/Papeletas'),
  '/cursos':                  () => import('../pages/CursosSeguridad'),
  '/cursos-seguridad':        () => import('../pages/CursosSeguridad'),
  '/pagos':                   () => import('../pages/Pagos'),
  '/internamientos':          () => import('../pages/Retenciones'),
  '/retenciones':             () => import('../pages/Retenciones'),
  '/permisos':                () => import('../pages/Permisos'),
  '/procedimientos-tarifas':   () => import('../pages/ProcedimientosTarifas'),
  '/operativos':              () => import('../pages/Operativos'),
  '/superadmin':              () => import('../pages/SuperAdminDashboard'),
  '/superadmin/usuarios':     () => import('../pages/Usuarios'),
}

export const navigationGroups = [
  {
    name: 'Super Admin',
    superAdminOnly: true,
    items: [
      { id: 'superadmin', label: 'Dashboard Super Admin', icon: 'shieldCheck', path: '/superadmin' }
    ]
  },
  {
    name: 'Padrón municipal',
    superAdminOnly: true,
    items: [
      { id: 'superadmin-personas', label: 'Personas', icon: 'idCard', path: '/superadmin/personas' },
      { id: 'superadmin-trabajadores', label: 'Trabajadores', icon: 'workerBadge', path: '/superadmin/trabajadores' }
    ]
  },
  {
    name: 'Administración',
    superAdminOnly: true,
    items: [
      { id: 'superadmin-usuarios', label: 'Gestión de usuarios', icon: 'people', path: '/superadmin/usuarios' },
      { id: 'superadmin-roles', label: 'Roles y permisos', icon: 'shieldCheck', path: '/superadmin/roles' },
      { id: 'superadmin-configuracion', label: 'Configuración', icon: 'settings', path: '/superadmin/configuracion' },
      { id: 'superadmin-auditoria', label: 'Auditoría y logs', icon: 'document', path: '/superadmin/auditoria' }
    ]
  },
  {
    name: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard' }
    ]
  },
  {
    name: 'Padrón municipal',
    items: [
      { id: 'personas',      label: 'Personas',      icon: 'idCard',       path: '/personas',      officeOnly: true },
      { id: 'trabajadores',  label: 'Trabajadores',  icon: 'workerBadge',  path: '/trabajadores',  officeOnly: true },
      { id: 'asociaciones',  label: 'Asociaciones',  icon: 'office',       path: '/asociaciones',  officeOnly: true },
      { id: 'vehiculos',     label: 'Vehículos',     icon: 'motoTaxi',     path: '/vehiculos' },
    ]
  },
  {
    name: 'Trámites',
    officeOnly: true,
    items: [
      { id: 'permisos',    label: 'Permisos y Autorizaciones', icon: 'routePermit',  path: '/permisos' },
      { id: 'procedimientos-tarifas', label: 'Procedimientos y tarifas', icon: 'document', path: '/procedimientos-tarifas' },
      { id: 'cursos',      label: 'Cursos de Seguridad Vial',   icon: 'course',       path: '/cursos' },
      { id: 'documentos',  label: 'Documentos del Vehículo',   icon: 'folderShield', path: '/documentos' },
      { id: 'impresion',   label: 'Centro de impresión',       icon: 'print',        path: '/impresion' },
    ]
  },
  {
    name: 'Control y Operativos',
    items: [
      { id: 'certicav',   label: 'Inspección Técnica Vehicular', icon: 'certificate', path: '/inspecciones' },
      { id: 'operativos', label: 'Operativos', icon: 'operations',  path: '/operativos' },
    ]
  },
  {
    name: 'Fiscalización',
    items: [
      { id: 'papeletas',     label: 'Papeletas',     icon: 'ticket', path: '/papeletas' },
      { id: 'internamientos',label: 'Internamientos',icon: 'garage', path: '/internamientos' },
    ]
  },
  {
    name: 'Pagos',
    officeOnly: true,
    items: [
      { id: 'pagos', label: 'Pagos', icon: 'receiptCheck', path: '/pagos' },
    ]
  }
];

export const navigation = navigationGroups.flatMap((group) =>
  group.items.map((item) => [item.icon, item.label])
);
