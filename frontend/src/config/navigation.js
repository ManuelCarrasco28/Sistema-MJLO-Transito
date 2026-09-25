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
      { id: 'personas', label: 'Personas', icon: 'idCard', path: '/personas' },
      { id: 'trabajadores', label: 'Trabajadores', icon: 'workerBadge', path: '/trabajadores' },
      { id: 'asociaciones', label: 'Asociaciones', icon: 'office', path: '/asociaciones' },
      { id: 'vehiculos', label: 'Vehículos', icon: 'motoTaxi', path: '/vehiculos' },
    ]
  },
  {
    name: 'Trámites',
    items: [
      { id: 'permisos', label: 'Permisos y Autorizaciones', icon: 'routePermit', path: '/permisos' },
      { id: 'cursos', label: 'Curso de Seguridad Vial', icon: 'course', path: '/cursos' },
      { id: 'documentos', label: 'Documentos del Vehículo', icon: 'folderShield', path: '/documentos' },
    ]
  },
  {
    name: 'Inspecciones Técnicas',
    items: [
      { id: 'certicav', label: 'Certicav', icon: 'certificate', path: '/inspecciones' },
      { id: 'operativos', label: 'Operativos', icon: 'operations', path: '/operativos' },
    ]
  },
  {
    name: 'Fiscalización',
    items: [
      { id: 'papeletas', label: 'Papeletas', icon: 'ticket', path: '/papeletas' },
      { id: 'internamientos', label: 'Internamientos', icon: 'garage', path: '/internamientos' },
    ]
  },
  {
    name: 'Pagos',
    items: [
      { id: 'pagos', label: 'Pagos', icon: 'receiptCheck', path: '/pagos' },
    ]
  }
];

export const navigation = navigationGroups.flatMap((group) =>
  group.items.map((item) => [item.icon, item.label])
);
