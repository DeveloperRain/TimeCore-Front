import { ApiError, type ApiErrorPayload } from "@/lib/api/errors";

const API_URL = "http://127.0.0.1:8000";

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  };
};

type BranchScopedParams = {
  branchId?: number | string | null;
};

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

function branchQuery(params?: BranchScopedParams) {
  return buildQuery({
    branch_id: params?.branchId ?? undefined,
  });
}

async function request(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem("timecore-token");
  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (error) {
    throw new ApiError({
      message: "No se pudo conectar con TimeCore API.",
      status: 0,
      code: "NETWORK_ERROR",
      details: error instanceof Error ? error.message : error,
    });
  }

  const rawText = await response.text();
  let payload: any = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as ApiErrorPayload)
        : undefined;

    throw new ApiError({
      message:
        errorPayload?.message ??
        errorPayload?.error?.message ??
        `La solicitud falló con estado ${response.status}.`,
      status: response.status,
      code: errorPayload?.error?.code ?? `HTTP_${response.status}`,
      details: errorPayload?.error?.details ?? payload,
      requestId: errorPayload?.request_id,
    });
  }

  return payload;
}

export const authStorage = {
  saveSession: (data: LoginResponse) => {
    localStorage.setItem("timecore-token", data.access_token);
    localStorage.setItem("timecore-user", JSON.stringify(data.user));
    sessionStorage.removeItem("timecore-sync-notice-hidden");
  },

  clearSession: () => {
    localStorage.removeItem("timecore-token");
    localStorage.removeItem("timecore-user");
    sessionStorage.removeItem("timecore-sync-notice-hidden");
  },

  getToken: () => localStorage.getItem("timecore-token"),

  getUser: () => {
    const rawUser = localStorage.getItem("timecore-user");

    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return Boolean(localStorage.getItem("timecore-token"));
  },
};

export const timecoreApi = {
  health: () => request("/"),

  login: (data: { email: string; password: string }) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: { full_name: string; email: string; password: string }) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request("/auth/me"),

  // =========================
  // DASHBOARD GENERAL / POR SUCURSAL
  // =========================

  getDashboardSummary: (params?: BranchScopedParams) =>
    request(`/dashboard/summary${branchQuery(params)}`),

  getDashboardActivity: (params?: BranchScopedParams) =>
    request(`/dashboard/activity${branchQuery(params)}`),

  getAsistenciasSemana: (params?: BranchScopedParams) =>
    request(`/db/attendance/week${branchQuery(params)}`),

  getAsistenciasHoy: (params?: BranchScopedParams) =>
    request(`/db/attendance/today${branchQuery(params)}`),

  getBranchDashboard: (branchId: number | string) =>
    request(`/branches/${branchId}/dashboard`),

  getBranchUsuarios: (branchId: number | string) =>
    request(`/branches/${branchId}/users`),

  getBranchAttendance: (branchId: number | string) =>
    request(`/branches/${branchId}/attendance`),

  getBranchDevices: (branchId: number | string) =>
    request(`/branches/${branchId}/devices`),

  // =========================
  // BD LOCAL
  // =========================

  getUsuarios: (params?: BranchScopedParams) =>
    request(`/db/users${branchQuery(params)}`),

  getUsuariosPaginados: (params?: {
    page?: number;
    limit?: number;
    branchId?: number | string | null;
    search?: string;
    status?: string;
  }) =>
    request(`/db/users/paginated${buildQuery({
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      branch_id: params?.branchId ?? undefined,
      search: params?.search ?? undefined,
      status: params?.status ?? undefined,
    })}`),

  getAsistencias: (params?: BranchScopedParams) =>
    request(`/db/attendance${branchQuery(params)}`),

  getAsistenciasPaginadas: (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    branchId?: number | string | null;
    userIds?: string[];
  }) =>
    request(`/db/attendance/paginated${buildQuery({
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      start_date: params?.startDate ?? undefined,
      end_date: params?.endDate ?? undefined,
      branch_id: params?.branchId ?? undefined,
      user_ids: params?.userIds?.length ? params.userIds.join(",") : undefined,
    })}`),

  getFechasAsistencia: (params?: BranchScopedParams) =>
    request(`/db/attendance/dates${branchQuery(params)}`),

  getReporteAsistencia: (
    startDate: string,
    endDate: string,
    params?: BranchScopedParams
  ) =>
    request(
      `/db/attendance/report${buildQuery({
        start_date: startDate,
        end_date: endDate,
        branch_id: params?.branchId ?? undefined,
      })}`
    ),

  getPrenomina: (
    startDate: string,
    endDate: string,
    params?: {
      branchId?: number | string | null;
      userIds?: string[];
    }
  ) => {
    const query = buildQuery({
      start_date: startDate,
      end_date: endDate,
      branch_id: params?.branchId ?? undefined,
      user_ids:
        params?.userIds && params.userIds.length > 0
          ? params.userIds.join(",")
          : undefined,
    });

    return request(`/db/prenomina${query}`);
  },

  guardarIncidenciaPrenomina: (data: {
    id?: number;
    device_id: number;
    user_id: string;
    fecha: string;
    hora: string;
    incidencia: string;
    descripcion?: string;
    color?: string;
  }) =>
    request("/db/prenomina/incidencias", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  eliminarIncidenciaPrenomina: (incidentId: number) =>
    request(`/db/prenomina/incidencias/${incidentId}`, {
      method: "DELETE",
    }),

  getDevices: (params?: BranchScopedParams) =>
    request(`/db/devices${branchQuery(params)}`),

  verificarEstadoRelojes: (params?: BranchScopedParams) =>
    request(`/db/devices/check-status${branchQuery(params)}`, {
      method: "POST",
    }),

  getBranches: () => request("/branches/"),

  // =========================
  // RELOJ FÍSICO
  // =========================

  getUsuariosReloj: () => request("/users/"),
  getAsistenciasReloj: () => request("/users/attendance"),
  getDispositivo: () => request("/device/info"),

  // =========================
  // SUCURSALES
  // =========================

  crearBranch: (data: {
    name: string;
    address?: string;
    is_active?: boolean;
    status?: "Activo" | "Inactivo";
  }) =>
    request("/branches/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarBranch: (
    id: number,
    data: {
      name?: string;
      address?: string;
      is_active?: boolean;
      status?: "Activo" | "Inactivo";
    }
  ) =>
    request(`/branches/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // =========================
  // RELOJES / DISPOSITIVOS
  // =========================

  crearDevice: (data: {
    nombre: string;
    ip: string;
    puerto: number;
    sucursal?: string;
    ubicacion?: string;
    empresa?: "FISMAN" | "SELEFF";
    password: string;
    branch_id?: number;
    auto_sync_enabled?: boolean;
    sync_interval_minutes?: number;
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
      empresa?: "FISMAN" | "SELEFF";
      password?: string;
      activo?: boolean;
      branch_id?: number;
      auto_sync_enabled?: boolean;
      sync_interval_minutes?: number;
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

  getDeviceTimeStatus: (id: number) =>
    request(`/db/devices/${id}/time-status`),

  syncDeviceTime: (id: number) =>
    request(`/db/devices/${id}/sync-time`, {
      method: "POST",
    }),

  // =========================
  // SINCRONIZACIÓN
  // =========================

  sincronizarDevice: (
    id: number,
    params?: { failFast?: boolean }
  ) =>
    request(
      `/sync/device/${id}${buildQuery({
        fail_fast: params?.failFast ? true : undefined,
      })}`,
      {
        method: "POST",
      }
    ),

  sincronizarTodosLosRelojes: () =>
    request("/sync/devices/all", {
      method: "POST",
    }),

  sincronizarUsuarios: (params?: BranchScopedParams) =>
    request(`/sync/users${branchQuery(params)}`, {
      method: "POST",
    }),

  sincronizarAsistencias: (params?: BranchScopedParams) =>
    request(`/sync/attendance${branchQuery(params)}`, {
      method: "POST",
    }),

  sincronizarTodo: (params?: BranchScopedParams) =>
    request(`/sync/all${branchQuery(params)}`, {
      method: "POST",
    }),

  sincronizarBranch: (branchId: number | string) =>
    request(`/sync/branches/${branchId}`, {
      method: "POST",
    }),

  // =========================
  // USUARIOS DEL RELOJ
  // =========================

  getSiguienteUidReloj: (deviceId: number | string) =>
    request(`/users/device/${deviceId}/next-uid`),

  crearEmpleadoEnOtroReloj: (
    sourceUserId: number,
    targetDeviceId: number | string
  ) =>
    request(`/users/by-id/${sourceUserId}/copy-to-device`, {
      method: "POST",
      body: JSON.stringify({
        target_device_id: Number(targetDeviceId),
      }),
    }),

  crearUsuario: (
    data: {
      uid: number;
      name: string;
      role: string;
      user_id?: string;
    },
    params: {
      deviceId: number | string;
      branchId?: number | string | null;
    }
  ) =>
    request(`/users/${buildQuery({
      device_id: params.deviceId,
      branch_id: params.branchId ?? undefined,
    })}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarUsuarioPorId: (
    id: number,
    data: {
      user_id?: string;
      name?: string;
      role?: string;
    }
  ) =>
    request(`/users/by-id/${id}`, {
      method: "PUT",
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

  eliminarUsuario: (uid: number) =>
    request(`/users/${uid}`, {
      method: "DELETE",
    }),

  // =========================
  // PERFIL LOCAL DE EMPLEADO
  // =========================

  actualizarPerfilEmpleadoPorId: (
    id: number,
    data: {
      role?: string;
      sucursal?: string;
      email?: string;
      area?: string;
      empresa?: string;
      branch_id?: number;
    }
  ) =>
    request(`/db/users/by-id/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  actualizarEstadoEmpleadoPorId: (
    id: number,
    status: "Activo" | "Inactivo"
  ) =>
    request(`/db/users/by-id/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  actualizarPerfilEmpleado: (
    uid: number,
    data: {
      role?: string;
      sucursal?: string;
      email?: string;
      area?: string;
      empresa?: string;
      branch_id?: number;
    }
  ) =>
    request(`/db/users/${uid}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  actualizarEstadoEmpleado: (
    uid: number,
    status: "Activo" | "Inactivo"
  ) =>
    request(`/db/users/${uid}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

export const getExcelAsistenciasUrl = (params?: {
  startDate?: string;
  endDate?: string;
  branchId?: number | string | null;
  userIds?: string[];
}) => {
  const url = new URL(`${API_URL}/db/attendance/report/download`);
  const token = authStorage.getToken();

  if (params?.startDate) {
    url.searchParams.set("start_date", params.startDate);
  }

  if (params?.endDate) {
    url.searchParams.set("end_date", params.endDate);
  }

  if (params?.branchId) {
    url.searchParams.set("branch_id", String(params.branchId));
  }

  if (params?.userIds && params.userIds.length > 0) {
    url.searchParams.set("user_ids", params.userIds.join(","));
  }

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
};

export const getExcelPrenominaUrl = (
  startDate: string,
  endDate: string,
  params?: {
    branchId?: number | string | null;
    userIds?: string[];
  }
) => {
  const url = new URL(`${API_URL}/db/prenomina/download`);
  const token = authStorage.getToken();

  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  if (params?.branchId) {
    url.searchParams.set("branch_id", String(params.branchId));
  }

  if (params?.userIds && params.userIds.length > 0) {
    url.searchParams.set("user_ids", params.userIds.join(","));
  }

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
};

export const getExcelReporteUrl = (
  startDate: string,
  endDate: string,
  params?: {
    branchId?: number | string | null;
  }
) => {
  const url = new URL(`${API_URL}/db/attendance/report/download`);
  const token = authStorage.getToken();

  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  if (params?.branchId) {
    url.searchParams.set("branch_id", String(params.branchId));
  }

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
};
