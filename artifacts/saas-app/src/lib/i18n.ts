import { es } from "date-fns/locale";

export const locale = es;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const t = {
  app: {
    name: "Practitioner",
    tagline: "Gestiona tu consulta, clientes e ingresos",
  },

  nav: {
    dashboard: "Panel",
    clients: "Clientes",
    sessions: "Sesiones",
    logout: "Cerrar sesión",
  },

  auth: {
    loginTitle: "Iniciar sesión",
    loginDesc: "Bienvenido de nuevo. Introduce tus credenciales para continuar.",
    registerTitle: "Crear cuenta",
    registerDesc: "Empieza creando tu cuenta de profesional.",
    email: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    passwordMinPlaceholder: "Mín. 6 caracteres",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Ana García",
    loginButton: "Iniciar sesión",
    registerButton: "Crear cuenta",
    noAccount: "¿No tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    signUp: "Regístrate",
    signIn: "Inicia sesión",
    loginError: "Error al iniciar sesión. Comprueba tus credenciales.",
    registerError: "Error al crear la cuenta. Inténtalo de nuevo.",
    emailInvalid: "Introduce un correo electrónico válido",
    passwordRequired: "La contraseña es obligatoria",
    nameMin: "El nombre debe tener al menos 2 caracteres",
    passwordMin: "La contraseña debe tener al menos 6 caracteres",
  },

  dashboard: {
    title: "Panel",
    subtitle: "Resumen de tu consulta",
    totalClients: "Clientes totales",
    totalClientsDesc: "Clientes activos",
    weeklySessions: "Sesiones esta semana",
    weeklySessionsDesc: "Programadas esta semana",
    monthlyRevenue: "Ingresos del mes",
    monthlyRevenueDesc: "Sesiones completadas este mes",
    unpaidBalance: "Pendiente de cobro",
    unpaidBalanceDesc: "Pagos pendientes",
    revenueChart: "Evolución de ingresos",
    revenueChartDesc: "Ingresos mensuales de sesiones completadas en los últimos 6 meses",
    revenueTooltipLabel: "Ingresos",
    noRevenueData: "Sin datos de ingresos. Completa sesiones para ver la evolución.",
    recentSessions: "Sesiones recientes",
    recentSessionsDesc: "Las últimas 10 sesiones de todos los clientes",
    viewAll: "Ver todas",
    noSessions: "Sin sesiones todavía.",
    createFirstSession: "Crea tu primera sesión.",
  },

  clients: {
    title: "Clientes",
    subtitle: "Gestiona tu lista de clientes",
    addClient: "Añadir cliente",
    newClient: "Nuevo cliente",
    allClients: "Todos los clientes",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Ana García",
    phone: "Teléfono",
    phoneOptional: "(opcional)",
    phonePlaceholder: "+34 600 000 000",
    notes: "Notas",
    notesOptional: "(opcional)",
    notesPlaceholder: "Información relevante...",
    cancel: "Cancelar",
    add: "Añadir cliente",
    noClients: "Aún no hay clientes",
    noClientsDesc: "Añade tu primer cliente para empezar",
    deleteTitle: (name: string) => `¿Eliminar a ${name}?`,
    deleteDesc: "Se eliminará este cliente y todas sus sesiones de forma permanente.",
    deleteConfirm: "Eliminar",
    deleteCancelled: "Cancelar",
    nameRequired: "El nombre es obligatorio",
    profile: "Perfil del cliente",
    contactInfo: "Información de contacto",
    noPhone: "Sin número de teléfono",
    clientSessions: "Sesiones",
    viewAllSessions: "Ver todas",
    noSessionsForClient: "Este cliente aún no tiene sesiones",
  },

  sessions: {
    title: "Sesiones",
    subtitle: "Registra todas las sesiones con tus clientes",
    newSession: "Nueva sesión",
    newSessionTitle: "Nueva sesión",
    editTitle: "Editar sesión",
    editSubtitle: "Actualiza los datos de la sesión",
    sessionDetails: "Datos de la sesión",
    client: "Cliente",
    selectClient: "Selecciona un cliente",
    dateTime: "Fecha y hora",
    status: "Estado",
    price: "Precio (€)",
    pricePlaceholder: "0,00",
    markAsPaid: "Marcar como pagado",
    sessionNotes: "Notas",
    notesOptional: "(opcional)",
    notesPlaceholder: "Notas de la sesión...",
    cancel: "Cancelar",
    create: "Crear sesión",
    save: "Guardar cambios",
    filterAll: "Todas",
    filterPending: "Pendiente",
    filterCompleted: "Completada",
    filterCancelled: "Cancelada",
    sessionCount: (n: number, status: string) => {
      const label = n === 1 ? "sesión" : "sesiones";
      const filter = status !== "all" ? ` · ${statusLabel(status).toLowerCase()}` : "";
      return `${n} ${label}${filter}`;
    },
    noSessions: "Sin sesiones",
    noSessionsDesc: (status: string) =>
      status !== "all"
        ? `No hay sesiones con estado "${statusLabel(status).toLowerCase()}"`
        : "Crea tu primera sesión para empezar",
    unknownClient: "Cliente desconocido",
    paid: "Pagado",
    unpaid: "Pendiente",
    deleteTitle: "¿Eliminar esta sesión?",
    deleteDesc: "Esta acción no se puede deshacer.",
    deleteConfirm: "Eliminar",
    clientRequired: "Debes seleccionar un cliente",
    dateRequired: "La fecha es obligatoria",
    priceMin: "El precio debe ser 0 o más",
  },

  status: {
    pending: "Pendiente",
    completed: "Completada",
    cancelled: "Cancelada",
  },

  notFound: {
    title: "404 · Página no encontrada",
    desc: "La página que buscas no existe.",
  },

  common: {
    loading: "Cargando...",
    saving: "Guardando...",
    deleting: "Eliminando...",
    optional: "(opcional)",
  },
} as const;

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t.status.pending,
    completed: t.status.completed,
    cancelled: t.status.cancelled,
  };
  return map[status] ?? status;
}
