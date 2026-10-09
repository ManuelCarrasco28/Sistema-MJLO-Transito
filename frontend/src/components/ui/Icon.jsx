const iconPaths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  vehicle: (
    <>
      <path d="M5 17h14l-1-5-2-3H8l-2 3-1 5Z" />
      <path d="M3.5 13.5h17M7 17v2M17 17v2M8 13h.01M16 13h.01" />
    </>
  ),
  people: (
    <>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5l8-3 8 3v16M2 21h20" />
      <path d="M8 8h2M14 8h2M8 12h2M14 12h2M9 21v-5h6v5" />
    </>
  ),
  document: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  inspection: (
    <>
      <path d="M9 5H6a2 2 0 0 0-2 2v13h12v-3" />
      <path d="M9 3h6v4H9zM11 13l2 2 6-7" />
    </>
  ),
  course: (
    <>
      <path d="m3 6 9-4 9 4-9 4-9-4Z" />
      <path d="M7 8v5c0 1.5 2.2 3 5 3s5-1.5 5-3V8M21 6v7" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4Z" />
      <path d="M12 7v2M12 12v1M12 16v1" />
    </>
  ),
  operations: (
    <>
      <path d="M9 3h6l1 3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-3Z" />
      <path d="M9 13l2 2 4-5" />
      <path d="M8 6h8" />
    </>
  ),
  payment: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  retention: (
    <>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.2 7 9.5 4.1-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="M9 12h6" />
    </>
  ),
  permit: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 16h7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  idCard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M6.5 16c.6-1.5 1.7-2.3 2.5-2.3s1.9.8 2.5 2.3M14 10h4M14 14h3" />
    </>
  ),
  workerBadge: (
    <>
      <path d="M12 3 5 6.5v5.2c0 4 2.8 7.4 7 8.8 4.2-1.4 7-4.8 7-8.8V6.5L12 3Z" />
      <circle cx="12" cy="10" r="2.3" />
      <path d="M8.5 16c.8-1.8 2.1-2.7 3.5-2.7s2.7.9 3.5 2.7" />
    </>
  ),
  office: (
    <>
      <path d="M4 21V4.8A1.8 1.8 0 0 1 5.8 3h8.4A1.8 1.8 0 0 1 16 4.8V21" />
      <path d="M16 9h2.2A1.8 1.8 0 0 1 20 10.8V21M2 21h20M8 7h4M8 11h4M8 15h4" />
    </>
  ),
  motoTaxi: (
    <>
      <path d="M4 15h9l2.5-4H20l1 4" />
      <path d="M5 15l2-5h4l2 5M9 10V7h4l2.5 4" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  folderShield: (
    <>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M12 10.5 9.5 12v2.2c0 1.8 1 3.3 2.5 3.8 1.5-.5 2.5-2 2.5-3.8V12L12 10.5Z" />
    </>
  ),
  certificate: (
    <>
      <path d="M7 3h10v7a5 5 0 0 1-10 0Z" />
      <path d="M9 17 8 22l4-2 4 2-1-5M10 8h4M10 11h4" />
    </>
  ),
  routePermit: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 8h3a2 2 0 1 1 0 4H9a2 2 0 1 0 0 4h7M16 8h.01M16 16h.01" />
    </>
  ),
  receiptCheck: (
    <>
      <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M9 8h6M9 12h3M14 13l1.2 1.2L18 11.5" />
    </>
  ),
  garage: (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M7 21v-8h10v8M7 16h10" />
      <path d="M9 13h6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </>
  ),
  print: (
    <>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  arrowLeft: <path d="M19 12H5M10 19l-7-7 7-7" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  command: <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />,
  trendUp: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  trendDown: (
    <>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  filterX: (
    <>
      <path d="M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.06" />
      <path d="m22 3-5 5" />
      <path d="m17 3 5 5" />
    </>
  ),
  rotateCcw: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  fileSpreadsheet: (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2M8 17h2M14 13h2M14 17h2" />
    </>
  ),
  filePdf: (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 12v6M10 15h2a1.5 1.5 0 0 0 0-3h-2" />
    </>
  ),
  fileCheck: (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  'file-check': (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  fileText: (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 11v2" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  batteryCharging: (
    <>
      <path d="M5 7h4l-2 5h3l-4 5" />
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 11v2" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  batteryLow: (
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <rect x="3.5" y="8.5" width="3" height="7" rx="0.5" fill="currentColor" stroke="none" />
      <path d="M22 11v2" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),

  plus: <path d="M5 12h14M12 5v14" />,
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.5.66.86.86.26.15.56.23.86.23H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  deviceMobile: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <path d="M12 18h.01" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sidebarRight: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  creditCard: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </>
  ),
  chartBar: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3.5" height="8" />
      <rect x="12" y="7" width="3.5" height="13" />
      <rect x="18" y="15" width="0" height="5" />
      <rect x="15.5" y="15" width="3.5" height="5" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M6 8l-3.5 7a3.5 3.5 0 0 0 7 0L6 8ZM18 8l-3.5 7a3.5 3.5 0 0 0 7 0L18 8Z" />
      <path d="M6 8h12M8 21h8" />
    </>
  ),
  hand: (
    <>
      <path d="M9 12V6a1.5 1.5 0 0 1 3 0v5M12 11V4.5a1.5 1.5 0 0 1 3 0V11M15 11.5V6a1.5 1.5 0 0 1 3 0v9c0 3.5-2.5 6-6 6h-1c-2.5 0-3.8-.8-5-2.5L4 15.5c-.6-.9-.3-2 .6-2.5.7-.4 1.6-.2 2.1.4L9 16" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  maximize: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </>
  ),
  parking: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
      <circle cx="17" cy="18.5" r="2.5" />
      <circle cx="7" cy="18.5" r="2.5" />
    </>
  ),
  table: (
    <>
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </>
  ),
  imageOff: (
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
      <line x1="13.5" y1="13.5" x2="6" y2="21" />
      <line x1="18" y1="12" x2="21" y2="15" />
      <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
      <path d="M21 15V5a2 2 0 0 0-2-2H9" />
    </>
  ),
  'image-off': (
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
      <line x1="13.5" y1="13.5" x2="6" y2="21" />
      <line x1="18" y1="12" x2="21" y2="15" />
      <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
      <path d="M21 15V5a2 2 0 0 0-2-2H9" />
    </>
  ),
}

const aliasMap = {
  'file-check': 'fileCheck',
  'file-text': 'fileText',
  'alert-triangle': 'alert',
  'image-off': 'imageOff',
  add: 'plus',
  edit: 'pencil',
  car: 'vehicle',
  refresh: 'rotateCcw',
  x: 'close',
  chart: 'chartBar',
}

export function Icon({ name, className = 'size-5' }) {
  const content = iconPaths[name] || (aliasMap[name] && iconPaths[aliasMap[name]])
  if (!content) return null

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {content}
    </svg>
  )
}
