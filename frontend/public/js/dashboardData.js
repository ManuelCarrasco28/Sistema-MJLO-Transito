export const summaryCards = [
  { label: 'Vehículos registrados', value: '1,284', detail: '+32 este mes', change: '+2.6%', positive: true, icon: 'vehicle', tone: 'blue' },
  { label: 'Documentos vigentes', value: '956', detail: '74.5% del total', change: '0%', positive: null, icon: 'document', tone: 'cyan' },
  { label: 'Inspecciones pendientes', value: '48', detail: '12 para hoy', change: '+8', positive: false, icon: 'inspection', tone: 'amber' },
  { label: 'Papeletas pendientes', value: '126', detail: 'S/ 38,460 por cobrar', change: '+14', positive: false, icon: 'ticket', tone: 'slate' },
]

export const quickActions = [
  { label: 'Registrar vehículo', description: 'Nueva unidad', icon: 'vehicle', tone: 'blue' },
  { label: 'Registrar inspección', description: 'Nueva evaluación', icon: 'inspection', tone: 'cyan' },
  { label: 'Registrar papeleta', description: 'Nueva infracción', icon: 'ticket', tone: 'amber' },
  { label: 'Registrar pago', description: 'Nuevo ingreso', icon: 'payment', tone: 'emerald' },
]

export const activity = [
  { action: 'Vehículo registrado', detail: 'Toyota Hiace · M4X-821', user: 'Ana Rojas', time: 'Hace 12 min', status: 'Completado' },
  { action: 'Inspección actualizada', detail: 'Expediente INS-2026-0842', user: 'Luis Campos', time: 'Hace 38 min', status: 'En revisión' },
  { action: 'Pago registrado', detail: 'Papeleta P-019284', user: 'Carla Díaz', time: 'Hace 1 h', status: 'Completado' },
  { action: 'Documento renovado', detail: 'Permiso de operación PO-4412', user: 'José Vera', time: 'Hace 2 h', status: 'Completado' },
  { action: 'Retención registrada', detail: 'Acta RET-2026-0178', user: 'Miguel Ruiz', time: 'Hace 3 h', status: 'Pendiente' },
]

export const chartMonths = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep']

export const sampleNotifications = [
  {
    id: 1,
    title: 'Nueva papeleta registrada',
    description: 'Papeleta P-019284 por falta grave G-28 en Av. Balta.',
    time: 'Hace 8 min',
    unread: true,
    icon: 'ticket',
    tone: 'rose',
  },
  {
    id: 2,
    title: 'Inspección técnica aprobada',
    description: 'Expediente INS-2026-0842 completado para Toyota Hiace M4X-821.',
    time: 'Hace 25 min',
    unread: true,
    icon: 'inspection',
    tone: 'emerald',
  },
  {
    id: 3,
    title: 'Permiso de operación por vencer',
    description: 'Empresa "Transportes Chiclayo" expira en 48 horas.',
    time: 'Hace 1 hora',
    unread: false,
    icon: 'document',
    tone: 'amber',
  },
  {
    id: 4,
    title: 'Pago de arancel procesado',
    description: 'Ingreso confirmado S/ 380.00 por tarjeta de circulación.',
    time: 'Hace 3 horas',
    unread: false,
    icon: 'payment',
    tone: 'blue',
  },
]
