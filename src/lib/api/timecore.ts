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

  getUsuarios: () => request("/users/"),

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



  eliminarUsuario: (uid: number) =>
    request(`/users/${uid}`, {
      method: "DELETE",
    }),

  getAsistencias: () => request("/users/attendance"),

  getFechasAsistencia: () => request("/users/attendance/dates"),

  getReporteAsistencia: (startDate: string, endDate: string) =>
    request(`/users/attendance/report?start_date=${startDate}&end_date=${endDate}`),

  getDispositivo: () => request("/device/info"),
};

export function getExcelAsistenciasUrl() {
  return `${API_URL}/users/attendance/download`;
}

export function getExcelReporteUrl(startDate: string, endDate: string) {
  return `${API_URL}/users/attendance/report/download?start_date=${startDate}&end_date=${endDate}`;
}