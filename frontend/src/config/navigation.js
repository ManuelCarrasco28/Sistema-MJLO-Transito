export const navigationGroups = [
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
      { id: 'personal', label: 'Trabajadores', icon: 'workerBadge', path: '/personal' },
      { id: 'organizaciones', label: 'Organizaciones', icon: 'office', path: '/organizaciones' },
      { id: 'vehiculos', label: 'Vehículos', icon: 'motoTaxi', path: '/vehiculos' },
    ]
  },
  {
    name: 'Documentación',
    items: [
      { id: 'documentos', label: 'Documentos vehículo', icon: 'folderShield', path: '/documentos' },
      { id: 'certicav', label: 'Certicav', icon: 'certificate', path: '/inspecciones' },
    ]
  },
  {
    name: 'Trámites',
    items: [
      { id: 'permisos', label: 'Permisos', icon: 'routePermit', path: '/permisos' },
      { id: 'cursos', label: 'Cursos viales', icon: 'course', path: '/cursos' },
    ]
  },
  {
    name: 'Fiscalización',
    items: [
      { id: 'operativos', label: 'Operativos', icon: 'operations', path: '/operativos' },
      { id: 'papeletas', label: 'Papeletas', icon: 'ticket', path: '/papeletas' },
      { id: 'pagos', label: 'Pagos', icon: 'receiptCheck', path: '/pagos' },
      { id: 'internamientos', label: 'Internamientos', icon: 'garage', path: '/internamientos' },
    ]
  }
];

export const navigation = navigationGroups.flatMap((group) =>
  group.items.map((item) => [item.icon, item.label])
);
