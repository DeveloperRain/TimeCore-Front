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

    // FRONTEND: usar PostgreSQL
    getUsuarios: () => request("/db/users"),
    getAsistencias: () => request("/db/attendance"),
    getFechasAsistencia: () => request("/db/attendance/dates"),
    getReporteAsistencia: (startDate: string, endDate: string) =>
      request(`/db/attendance/report?start_date=${startDate}&end_date=${endDate}`),

    getDashboardSummary: () => request("/dashboard/summary"),
    getDashboardActivity: () => request("/dashboard/activity"),

    // SINCRONIZACIÓN: PostgreSQL -> reloj
    sincronizarDevice: (id: number) =>
  request(`/sync/device/${id}`, {
    method: "POST",
  }),

    // SINCRONIZACIÓN: reloj -> PostgreSQL
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

    // ENDPOINTS DIRECTOS AL RELOJ: solo pruebas técnicas
    getUsuariosReloj: () => request("/users/"),
    getAsistenciasReloj: () => request("/users/attendance"),
    getDispositivo: () => request("/device/info"),
    getDevices: () => request("/db/devices"),


  getBranches: () => request("/branches/"),

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
      

      actualizarEstadoEmpleado: (uid: number, status: "Activo" | "Inactivo" | "Baja") =>
  request(`/db/users/${uid}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }),
  
    eliminarUsuario: (uid: number) =>
      request(`/users/${uid}`, {
        method: "DELETE",
      }),
  };

  export function getExcelAsistenciasUrl() {
  return `${API_URL}/db/attendance/download`;
}

  export function getExcelReporteUrl(startDate: string, endDate: string) {
    return `${API_URL}/db/attendance/report/download?start_date=${startDate}&end_date=${endDate}`;
  }

  
  

