const API_URL = "http://127.0.0.1:8000";

async function request(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const timecoreApi = {
  health: () => request("/"),

  getUsuarios: () => request("/db/users"),
  getAsistencias: () => request("/db/attendance"),
  getFechasAsistencia: () => request("/db/attendance/dates"),
  getReporteAsistencia: (startDate: string, endDate: string) =>
    request(`/db/attendance/report?start_date=${startDate}&end_date=${endDate}`),
  getDashboardSummary: () => request("/dashboard/summary"),
  getDashboardActivity: () => request("/dashboard/activity"),
  getDevices: () => request("/db/devices"),
  getBranches: () => request("/branches/"),
  getUsuariosReloj: () => request("/users/"),
  getAsistenciasReloj: () => request("/users/attendance"),
  getDispositivo: () => request("/device/info"),
  getAsistenciasHoy: () => request("/db/attendance/today"),
  getAsistenciasSemana: () => request("/db/attendance/week"),

  crearBranch: (data: { name: string; address?: string }) =>
    request("/branches/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarBranch: (
    id: number,
    data: { name?: string; address?: string; is_active?: boolean }
  ) =>
    request(`/branches/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  crearDevice: (data: {
    nombre: string;
    ip: string;
    puerto: number;
    sucursal?: string;
    ubicacion?: string;
  }) =>
    request("/db/devices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarDevice: (
    id: number,
    data: {
      nombre?: string;
      ip?: string;
      puerto?: number;
      sucursal?: string;
      ubicacion?: string;
      activo?: boolean;
    }
  ) =>
    request(`/db/devices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  eliminarDevice: (id: number) =>
    request(`/db/devices/${id}`, {
      method: "DELETE",
    }),

  activarDevice: (id: number) =>
    request(`/db/devices/${id}/activate`, {
      method: "PUT",
    }),

  sincronizarDevice: (id: number) =>
    request(`/sync/device/${id}`, {
      method: "POST",
    }),

  sincronizarUsuarios: () =>
    request("/sync/users", {
      method: "POST",
    }),

  sincronizarAsistencias: () =>
    request("/sync/attendance", {
      method: "POST",
    }),

  sincronizarTodo: () =>
    request("/sync/all", {
      method: "POST",
    }),

  crearUsuario: (data: {
    uid: number;
    user_id: string;
    name: string;
    role: string;
  }) =>
    request("/users/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarUsuario: (
    uid: number,
    data: {
      user_id?: string;
      name?: string;
      role?: string;
    }
  ) =>
    request(`/users/${uid}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  actualizarPerfilEmpleado: (
    uid: number,
    data: {
      role?: string;
      sucursal?: string;
      email?: string;
    }
  ) =>
    request(`/db/users/${uid}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  actualizarEstadoEmpleado: (
    uid: number,
    status: "Activo" | "Inactivo" | "Baja"
  ) =>
    request(`/db/users/${uid}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  eliminarUsuario: (uid: number) =>
    request(`/users/${uid}`, {
      method: "DELETE",
    }),
  };

  export const getExcelAsistenciasUrl = (params?: {
  modo?: "hoy" | "semana" | "todas";
  startDate?: string;
  endDate?: string;
}) => {
  const url = new URL(`${API_URL}/users/attendance/download`);

  if (params?.modo) {
    url.searchParams.set("modo", params.modo);
  }

  if (params?.startDate && params?.endDate) {
    url.searchParams.set("start_date", params.startDate);
    url.searchParams.set("end_date", params.endDate);
  }

  return url.toString();
};

  export const getExcelReporteUrl = (startDate: string, endDate: string) => {
  return `${API_URL}/db/attendance/report/download?start_date=${startDate}&end_date=${endDate}`;
  }