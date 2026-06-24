import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authStorage, timecoreApi } from "@/lib/api/timecore";

type HeaderUser = {
  name: string;
  role: string;
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
  level: "danger" | "warning" | "info";
};

type DeviceApi = {
  id?: number;
  name?: string;
  nombre?: string;
  ip?: string;
  status?: string;
  is_active?: boolean;
  activo?: boolean;
  estado?: string;
};

type BranchApi = {
  id?: number;
  name?: string;
  status?: string;
  is_active?: boolean;
};

type UserApi = {
  uid?: number;
  user_id?: string;
  name?: string;
  status?: string;
};

function normalizarEstado(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizar(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getData(res: any) {
  return Array.isArray(res) ? res : res?.data ?? [];
}

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [devices, setDevices] = useState<DeviceApi[]>([]);
  const [branches, setBranches] = useState<BranchApi[]>([]);
  const [users, setUsers] = useState<UserApi[]>([]);
  const [openAlerts, setOpenAlerts] = useState(false);

  function cargarNotificaciones() {
    Promise.allSettled([
      timecoreApi.getDevices().then(getData),
      timecoreApi.getBranches().then(getData),
      timecoreApi.getUsuarios().then(getData),
    ])
      .then(([devicesRes, branchesRes, usersRes]) => {
        if (devicesRes.status === "fulfilled") {
          setDevices(getData(devicesRes.value));
        }
        if (branchesRes.status === "fulfilled") {
          setBranches(getData(branchesRes.value));
        }
        if (usersRes.status === "fulfilled") {
          setUsers(getData(usersRes.value));
        }
      });
  }

  useEffect(() => {
    const storedUser = authStorage.getUser();

    if (storedUser) {
      setUser({
        name: storedUser.full_name || storedUser.email || "Usuario",
        role:
          storedUser.role === "admin"
            ? "Administrador"
            : storedUser.role || "Usuario",
      });
    }

    cargarNotificaciones();
    const interval = window.setInterval(() => {
      cargarNotificaciones();
    }, 15000); // Actualizar cada 15 segundos (15000 ms)

    window.addEventListener("focus", cargarNotificaciones);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", cargarNotificaciones);
    };
  }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const nextAlerts: AlertItem[] = [];

    if (devices.length === 0) {
      nextAlerts.push({
        id: "no-devices",
        title: "No hay relojes registrados",
        description: "Registra al menos un reloj para comenzar a sincronizar asistencias.",
        level: "warning",
      });
    }

    devices.forEach((device) => {
      const name = device.name ?? device.nombre ?? `Reloj #${device.id ?? ""}`;
      const ip = device.ip ? ` (${device.ip})` : "";
      const status = normalizar(device.status ?? device.estado);
      const isActive = device.is_active ?? device.activo ?? true;

      if (status === "baja") {
        nextAlerts.push({
          id: `device-baja-${device.id ?? name}`,
          title: `${name} dado de baja`,
          description: `El reloj${ip} está marcado como baja.`,
          level: "warning",
        });
        return;
      }

      if (status === "inactivo" || isActive === false) {
        nextAlerts.push({
          id: `device-inactive-${device.id ?? name}`,
          title: `${name} inactivo`,
          description: `El reloj${ip} está marcado como inactivo.`,
          level: "warning",
        });
        return;
      }

      if (
        status === "inactivo" ||
        status === "offline" ||
        status === "desconectado" ||
        status === "sin conexión"
      ) {
        nextAlerts.push({
          id: `offline-device-${device.id ?? name}`,
          title: `${name} sin conexión`,
          description: `No se ha podido confirmar conexión con el reloj${ip}.`,
          level: "danger",
        });
      }
    });

    branches.forEach((branch) => {
      const name = branch.name ?? `Sucursal #${branch.id ?? ""}`;
      const status = normalizarEstado(branch.status);
      const isActive = Boolean(branch.is_active ?? true);

      if (status === "baja") {
        nextAlerts.push({
          id: `branch-baja-${branch.id ?? name}`,
          title: `${name} dada de baja`,
          description: "La sucursal está marcada como baja.",
          level: "warning",
        });
        return;
      }

      if (status === "inactivo" || !isActive) {
        nextAlerts.push({
          id: `branch-inactive-${branch.id ?? name}`,
          title: `${name} inactiva`,
          description: "La sucursal está marcada como inactiva.",
          level: "warning",
        });
      }
    });

    users.forEach((employee) => {
      const name = employee.name ?? `Empleado ${employee.user_id ?? employee.uid ?? ""}`;
      const status = normalizarEstado(employee.status);

      if (status === "baja") {
        nextAlerts.push({
          id: `employee-baja-${employee.uid ?? employee.user_id ?? name}`,
          title: `${name} dado de baja`,
          description: "El empleado está marcado como baja.",
          level: "info",
        });
        return;
      }

      if (status === "inactivo") {
        nextAlerts.push({
          id: `employee-inactive-${employee.uid ?? employee.user_id ?? name}`,
          title: `${name} inactivo`,
          description: "El empleado está marcado como inactivo.",
          level: "info",
        });
      }
    });

    return nextAlerts;
  }, [devices, branches, users]);

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
            {title}
          </h2>

          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                cargarNotificaciones();
                setOpenAlerts((value) => !value);
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
              aria-label="Ver notificaciones"
            >
              <Bell className="h-4 w-4" />

              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {alerts.length}
                </span>
              )}
            </button>

            {openAlerts && (
              <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Notificaciones
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alertas de relojes, sucursales y empleados
                  </p>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {alerts.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      No hay alertas pendientes.
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-md px-3 py-2 hover:bg-muted/60"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              alert.level === "danger"
                                ? "bg-destructive"
                                : alert.level === "warning"
                                  ? "bg-warning"
                                  : "bg-primary"
                            }`}
                          />

                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {user && (
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-medium text-foreground leading-tight">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {user.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
