import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { timecoreApi } from "@/lib/api/timecore";
import {
  ArrowLeft,
  Plug,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Pencil,
  X,
} from "lucide-react";

import { getErrorMessage } from "@/lib/api/errors";
type RelojFront = {
  id: number;
  nombre: string;
  ip: string;
  puerto: number;
  sucursal: string;
  ubicacion: string;
  empresa: "FISMAN" | "SELEFF";
  password: string;
  estado: "Conectado" | "Desconectado" | "Desconocido" | "Inactivo";
  ultimaSync: string;
  proximaSync: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  activo: boolean;
  branch_id?: number | null;
};

type SucursalFront = {
  id: number;
  nombre: string;
  direccion: string;
  activo: boolean;
};

const getCurrentTime = () =>
  new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const showSyncLog = (rows: { time: string; message: string }[]) => {
  window.dispatchEvent(
    new CustomEvent("timecore:sync-log", {
      detail: {
        title: "Sincronización realizada con éxito",
        rows,
      },
    })
  );
};

export const Route = createFileRoute("/_authenticated/relojes")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawBranchId = search.branch_id;

    return {
      branch_id:
        rawBranchId !== undefined && rawBranchId !== null && rawBranchId !== ""
          ? Number(rawBranchId)
          : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Relojes — TimeCore" },
      {
        name: "description",
        content:
          "Administra los relojes biométricos ZKTeco distribuidos en cada sucursal.",
      },
    ],
  }),
  component: RelojesPage,
});

function RelojesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const branchId = search.branch_id;
  const isBranchMode =
    branchId !== undefined && branchId !== null && !Number.isNaN(branchId);

  const branchParams = isBranchMode ? { branchId } : undefined;

  const [relojes, setRelojes] = useState<RelojFront[]>([]);
  const [sucursales, setSucursales] = useState<SucursalFront[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<RelojFront | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    ip: "",
    puerto: 4370,
    sucursal: "",
    ubicacion: "",
    empresa: "FISMAN" as "FISMAN" | "SELEFF",
    password: "0",
    autoSyncEnabled: true,
    syncIntervalMinutes: 4,
    activo: true,
  });

  useEffect(() => {
    cargarRelojes();
    cargarSucursales();
  }, [branchId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      if (!document.hidden) actualizarEstadosRelojes();
    }, 600);

    const interval = window.setInterval(() => {
      if (!document.hidden) actualizarEstadosRelojes();
    }, 30000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [branchId]);

  const normalizarEstadoReloj = (r: any): RelojFront["estado"] => {
    if (!Boolean(r.activo ?? r.is_active ?? true)) {
      return "Inactivo";
    }

    const estado = String(r.estado ?? r.status ?? "Desconocido");

    if (estado === "Conectado" || estado === "Desconectado") {
      return estado;
    }

    return "Desconocido";
  };

  const mapRelojApi = (r: any): RelojFront => ({
    id: Number(r.id),
    nombre: String(r.nombre ?? r.name ?? "Reloj sin nombre"),
    ip: String(r.ip ?? r.ip_address ?? "—"),
    puerto: Number(r.puerto ?? r.port ?? 4370),
    sucursal: String(r.sucursal ?? r.location ?? "Sin sucursal"),
    ubicacion: String(r.ubicacion ?? r.description ?? "Sin ubicación"),
    empresa: String(r.empresa ?? "FISMAN").toUpperCase() === "SELEFF"
      ? "SELEFF"
      : "FISMAN",
    password: String(r.password ?? r.device_password ?? "0"),
    estado: normalizarEstadoReloj(r),
    ultimaSync:
      r.ultima_sincronizacion || r.last_sync_at || r.last_connection
        ? new Date(
            r.ultima_sincronizacion ?? r.last_sync_at ?? r.last_connection
          ).toLocaleString("es-MX")
        : "Sin sincronización",
    proximaSync:
      r.next_sync_at
        ? new Date(r.next_sync_at).toLocaleString("es-MX")
        : Boolean(r.auto_sync_enabled ?? true)
          ? "Al iniciar / pendiente"
          : "Desactivada",
    autoSyncEnabled: Boolean(r.auto_sync_enabled ?? true),
    syncIntervalMinutes: Number(r.sync_interval_minutes ?? 4),
    activo: Boolean(r.activo ?? r.is_active ?? true),
    branch_id:
      r.branch_id !== undefined && r.branch_id !== null
        ? Number(r.branch_id)
        : null,
  });

  const cargarSucursales = () => {
    return timecoreApi
      .getBranches()
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const branches: SucursalFront[] = data
          .map((b: any) => ({
            id: Number(b.id),
            nombre: String(b.name ?? "").trim(),
            direccion: String(b.address ?? ""),
            activo: Boolean(b.is_active ?? true),
          }))
          .filter((b: SucursalFront) => b.nombre !== "");

        setSucursales(branches);

        if (isBranchMode) {
          const selected = branches.find((b) => b.id === Number(branchId));
          setSelectedBranchName(selected?.nombre ?? "");
        } else {
          setSelectedBranchName("");
        }

        return branches;
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
        setSelectedBranchName("");
        return [];
      });
  };

  const cargarRelojes = () => {
    setLoading(true);

    timecoreApi
      .getDevices(branchParams)
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const relojesApi: RelojFront[] = data.map(mapRelojApi);

        setRelojes(relojesApi);
      })
      .catch((err) => {
        console.error("Error cargando relojes:", err);
        setRelojes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const actualizarEstadosRelojes = () => {
    timecoreApi
      .verificarEstadoRelojes(branchParams)
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];
        const estados = new Map<number, RelojFront>(
          data.map((r: any) => [Number(r.id), mapRelojApi(r)])
        );

        setRelojes((actuales) =>
          actuales.length === 0
            ? data.map(mapRelojApi)
            : actuales.map((reloj) => estados.get(reloj.id) ?? reloj)
        );
      })
      .catch((err) => {
        console.error("Error verificando estado de relojes:", err);
      });
  };

  const sucursalesVisibles = useMemo(() => {
    if (!isBranchMode) return sucursales;

    return sucursales.filter((s) => s.id === Number(branchId));
  }, [sucursales, isBranchMode, branchId]);

  const getBranchIdBySucursalName = (nombre: string) => {
    const found = sucursales.find(
      (s) => s.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    );

    return found?.id;
  };

  const openAdd = () => {
    cargarSucursales().then((branches) => {
      const selected = isBranchMode
        ? branches.find((b) => b.id === Number(branchId))
        : branches[0];

      setEditing(null);
      setForm({
        nombre: "",
        ip: "",
        puerto: 4370,
        sucursal: selected?.nombre ?? "",
        ubicacion: "",
        empresa: "FISMAN",
        password: "0",
        autoSyncEnabled: true,
        syncIntervalMinutes: 4,
        activo: true,
      });
      setOpen(true);
    });
  };

  const openEdit = (r: RelojFront) => {
    cargarSucursales();
    setEditing(r);
    setForm({
      nombre: r.nombre,
      ip: r.ip,
      puerto: r.puerto,
      sucursal: r.sucursal === "Sin sucursal" ? "" : r.sucursal,
      ubicacion: r.ubicacion === "Sin ubicación" ? "" : r.ubicacion,
      empresa: r.empresa,
      password: r.password || "0",
      autoSyncEnabled: r.autoSyncEnabled,
      syncIntervalMinutes: r.syncIntervalMinutes,
      activo: r.activo,
    });
    setOpen(true);
  };

  const guardarReloj = (e: FormEvent) => {
    e.preventDefault();

    if (!form.password.trim()) {
      alert("La contraseña del reloj es obligatoria.");
      return;
    }

    const selectedBranchId = isBranchMode
      ? Number(branchId)
      : getBranchIdBySucursalName(form.sucursal);

    const payload = {
      nombre: form.nombre,
      ip: form.ip,
      puerto: Number(form.puerto),
      sucursal: form.sucursal,
      ubicacion: form.ubicacion,
      empresa: form.empresa,
      password: form.password.trim(),
      auto_sync_enabled: form.autoSyncEnabled,
      sync_interval_minutes: form.syncIntervalMinutes,
      activo: form.activo,
      branch_id: selectedBranchId,
    };

    const request = editing
      ? timecoreApi.actualizarDevice(editing.id, payload as any)
      : timecoreApi.crearDevice(payload as any);

    request
      .then(() => {
        setOpen(false);
        cargarRelojes();
        alert(`Reloj ${editing ? "actualizado" : "creado"} con éxito`);
      })
      .catch((err) => {
        console.error("Error guardando reloj:", err);
        alert("No se pudo guardar el reloj");
      });
  };

  const eliminarReloj = (id: number) => {
    const confirmar = window.confirm("¿Seguro que quieres desactivar este reloj?");

    if (!confirmar) return;

    timecoreApi
      .eliminarDevice(id)
      .then(() => cargarRelojes())
      .catch((err) => console.error("Error desactivando reloj:", err));
  };

  const activarReloj = (id: number) => {
    const confirmar = window.confirm("¿Seguro que quieres activar este reloj?");

    if (!confirmar) return;

    timecoreApi
      .activarDevice(id)
      .then(() => cargarRelojes())
      .catch((err) => console.error("Error activando reloj:", err));
  };

  const sincronizarReloj = (id: number) => {
    setSyncingId(id);

    timecoreApi
      .sincronizarDevice(id)
      .then((res) => {
        const data = res.data ?? {};
        const ip = data.ip ?? relojes.find((reloj) => reloj.id === id)?.ip ?? "";
        const obtainedEvents =
          data.attendance_obtained ?? data.events_obtained ?? data.attendance_synced ?? 0;
        const downloadedEvents =
          data.attendance_synced ?? data.events_downloaded ?? 0;

        showSyncLog([
          {
            time: getCurrentTime(),
            message: ip ? `Conectando '${ip}'` : "Conectando al reloj",
          },
          {
            time: getCurrentTime(),
            message: "Descargando",
          },
          {
            time: getCurrentTime(),
            message: `Datos en el reloj:  ${obtainedEvents} Datos`,
          },
          {
            time: getCurrentTime(),
            message: `Se descargaron ${downloadedEvents} eventos`,
          },
        ]);

        cargarRelojes();
      })
      .catch((err) => {
        console.error("Error sincronizando reloj:", err);
        alert("No se pudo sincronizar el reloj");
      })
      .finally(() => {
        setSyncingId(null);
      });
  };

  const totalRelojes = relojes.length;

  const inactivos = relojes.filter((r) => !r.activo).length;

  const conectados = relojes.filter(
    (r) => r.activo && r.estado === "Conectado"
  ).length;

  const desconectados = relojes.filter(
    (r) => r.activo && r.estado !== "Conectado"
  ).length;

  return (
    <AppShell
      title={
        isBranchMode
          ? `Relojes de ${selectedBranchName || "Sucursal"}`
          : "Gestión de Relojes"
      }
      subtitle={
        loading
          ? "Cargando relojes registrados..."
          : isBranchMode
            ? `${conectados} de ${relojes.length} relojes conectados en ${
                selectedBranchName || "esta sucursal"
              }`
            : `${conectados} de ${relojes.length} relojes conectados`
      }
    >
      {isBranchMode && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Vista filtrada por sucursal
            </p>
            <p className="text-xs text-muted-foreground">
              Mostrando únicamente relojes de{" "}
              {selectedBranchName || "la sucursal seleccionada"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/relojes",
                  search: {
                    branch_id: undefined,
                  },
                })
              }
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Ver todos
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total de relojes"
          value={totalRelojes}
          accent="bg-primary/10 text-primary"
          icon={Plug}
        />

        <StatCard
          label="Conectados"
          value={conectados}
          accent="bg-success/10 text-success"
          icon={Wifi}
        />

        <StatCard
          label="Desconectados"
          value={desconectados}
          accent="bg-destructive/10 text-destructive"
          icon={WifiOff}
        />

        <StatCard
          label="Inactivos"
          value={inactivos}
          accent="bg-muted/10 text-muted-foreground"
          icon={Plug}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">
              Relojes registrados
            </h3>

            <p className="text-xs text-muted-foreground">
              {isBranchMode
                ? `Dispositivos asignados a ${
                    selectedBranchName || "esta sucursal"
                  }.`
                : "Administra relojes ZKTeco / Steren registrados."}
            </p>
          </div>

          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Agregar reloj
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Nombre</th>
                <th className="text-left font-semibold px-5 py-3">
                  Dirección IP
                </th>
                <th className="text-left font-semibold px-5 py-3">Puerto</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Ubicación</th>
                <th className="text-left font-semibold px-5 py-3">Empresa</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-left font-semibold px-5 py-3">
                  Sincronización automática
                </th>
                <th className="text-left font-semibold px-5 py-3">
                  Última sincronización
                </th>
                <th className="text-left font-semibold px-5 py-3">
                  Próxima sincronización
                </th>
                <th className="text-right font-semibold px-5 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {relojes.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {r.nombre}
                  </td>

                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {r.ip}
                  </td>

                  <td className="px-5 py-3 tabular-nums text-foreground">
                    {r.puerto}
                  </td>

                  <td className="px-5 py-3 text-foreground">{r.sucursal}</td>

                  <td className="px-5 py-3 text-muted-foreground">
                    {r.ubicacion}
                  </td>

                  <td className="px-5 py-3 text-foreground">{r.empresa}</td>

                  <td className="px-5 py-3">
                    <EstadoBadge estado={r.estado} />
                  </td>

                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.autoSyncEnabled
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.autoSyncEnabled
                        ? `Cada ${r.syncIntervalMinutes} min`
                        : "Desactivada"}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-muted-foreground tabular-nums">
                    {r.ultimaSync}
                  </td>

                  <td className="px-5 py-3 text-muted-foreground tabular-nums">
                    {r.proximaSync}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        disabled={!r.activo}
                        onClick={() => {
                          if (!r.activo) return;
                          sincronizarReloj(r.id);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          r.activo
                            ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                        }`}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            syncingId === r.id ? "animate-spin" : ""
                          }`}
                        />
                        {syncingId === r.id
                          ? "Sincronizando..."
                          : "Sincronizar"}
                      </button>

                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {r.activo ? (
                        <button
                          onClick={() => eliminarReloj(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Desactivar"
                        >
                          <Plug className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => activarReloj(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-success/10 hover:text-success"
                          title="Activar"
                        >
                          <Plug className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {relojes.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando relojes registrados..."
                      : isBranchMode
                        ? "No se encontraron relojes en esta sucursal."
                        : "No se encontraron relojes registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? "Editar reloj" : "Nuevo reloj"}
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={guardarReloj} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Nombre"
                  value={form.nombre}
                  onChange={(v) => setForm({ ...form, nombre: v })}
                  placeholder="Reloj Principal"
                />

                <Field
                  label="IP"
                  value={form.ip}
                  onChange={(v) => setForm({ ...form, ip: v })}
                  placeholder="192.168.1.50"
                />

                <Field
                  label="Puerto"
                  value={String(form.puerto)}
                  onChange={(v) =>
                    setForm({ ...form, puerto: Number(v) || 4370 })
                  }
                  placeholder="4370"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Sucursal
                  </label>

                  <select
                    value={form.sucursal}
                    disabled={isBranchMode}
                    onChange={(e) =>
                      setForm({ ...form, sucursal: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                  >
                    <option value="">Seleccionar sucursal...</option>

                    {sucursalesVisibles.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Ubicación"
                  value={form.ubicacion}
                  onChange={(v) => setForm({ ...form, ubicacion: v })}
                  placeholder="Indique un área"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Empresa
                  </label>

                  <select
                    value={form.empresa}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        empresa: e.target.value as "FISMAN" | "SELEFF",
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="FISMAN">FISMAN</option>
                    <option value="SELEFF">SELEFF</option>
                  </select>
                </div>

                <Field
                  label="Contraseña del reloj"
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  placeholder="Ej. 0"
                />

                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Sincronización automática
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Descarga asistencias del reloj sin intervención del usuario.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.autoSyncEnabled}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          autoSyncEnabled: e.target.checked,
                        })
                      }
                      className="h-5 w-5 accent-primary"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Sincronizar cada
                      </label>
                      <select
                        value={form.syncIntervalMinutes}
                        disabled={!form.autoSyncEnabled}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            syncIntervalMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {[1, 2, 4, 5, 10, 15, 30, 60].map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} {minutes === 1 ? "minuto" : "minutos"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {editing ? "Guardar cambios" : "Crear reloj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EstadoBadge({ estado }: { estado: RelojFront["estado"] }) {
  const isConectado = estado === "Conectado";
  const isDesconectado = estado === "Desconectado";
  const isInactivo = estado === "Inactivo";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isConectado
          ? "bg-success/10 text-success"
          : isDesconectado
            ? "bg-destructive/10 text-destructive"
            : isInactivo
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isConectado
            ? "bg-success animate-pulse"
            : isDesconectado
              ? "bg-destructive"
              : "bg-muted-foreground"
        }`}
      />
      {estado}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: typeof Plug;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
