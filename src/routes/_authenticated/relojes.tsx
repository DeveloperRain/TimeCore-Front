import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { timecoreApi } from "@/lib/api/timecore";
import {
  Plug,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Pencil,
  X,
} from "lucide-react";

type RelojFront = {
  id: number;
  nombre: string;
  ip: string;
  puerto: number;
  sucursal: string;
  ubicacion: string;
  estado: "Conectado" | "Desconectado" | "Desconocido" | "Inactivo";
  ultimaSync: string;
  activo: boolean;
};

type SucursalFront = {
  id: number;
  nombre: string;
  direccion: string;
  activo: boolean;
};

export const Route = createFileRoute("/_authenticated/relojes")({
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
  const [relojes, setRelojes] = useState<RelojFront[]>([]);
  const [sucursales, setSucursales] = useState<SucursalFront[]>([]);
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
    activo: true,
  });

  useEffect(() => {
    cargarRelojes();
    cargarSucursales();
  }, []);

  const cargarSucursales = () => {
    timecoreApi
      .getBranches()
      .then((res) => {
        const data = res.data ?? [];

        const branches: SucursalFront[] = data.map((b: any) => ({
          id: Number(b.id),
          nombre: String(b.name ?? ""),
          direccion: String(b.address ?? ""),
          activo: Boolean(b.is_active),
        }));

        setSucursales(branches);
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
      });
  };

  const cargarRelojes = () => {
    setLoading(true);

    timecoreApi
      .getDevices()
      .then((res) => {
        const data = res.data ?? [];

        const relojesApi: RelojFront[] = data.map((r: any) => ({
          id: Number(r.id),
          nombre: String(r.nombre ?? r.name ?? "Reloj sin nombre"),
          ip: String(r.ip ?? "—"),
          puerto: Number(r.puerto ?? r.port ?? 4370),
          sucursal: String(r.sucursal ?? r.location ?? "Sin sucursal"),
          ubicacion: String(r.ubicacion ?? r.description ?? "Sin ubicación"),
          estado: !Boolean(r.activo ?? r.is_active ?? true)
            ? "Inactivo"
            : (String(r.estado ?? r.status ?? "Desconocido") as
                | "Conectado"
                | "Desconectado"
                | "Desconocido"),
          ultimaSync: r.ultima_sincronizacion
            ? new Date(r.ultima_sincronizacion).toLocaleString("es-MX")
            : "Sin sincronización",
          activo: Boolean(r.activo ?? r.is_active ?? true),
        }));

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

  const openAdd = () => {
    const primeraSucursal = sucursales.find((s) => s.activo);

    setEditing(null);
    setForm({
      nombre: "",
      ip: "",
      puerto: 4370,
      sucursal: primeraSucursal?.nombre ?? "",
      ubicacion: "",
      activo: true,
    });
    setOpen(true);
  };

  const openEdit = (r: RelojFront) => {
    setEditing(r);
    setForm({
      nombre: r.nombre,
      ip: r.ip,
      puerto: r.puerto,
      sucursal: r.sucursal,
      ubicacion: r.ubicacion,
      activo: r.activo,
    });
    setOpen(true);
  };

  const guardarReloj = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      nombre: form.nombre,
      ip: form.ip,
      puerto: Number(form.puerto),
      sucursal: form.sucursal,
      ubicacion: form.ubicacion,
      activo: form.activo,
    };

    const request = editing
      ? timecoreApi.actualizarDevice(editing.id, payload)
      : timecoreApi.crearDevice(payload);

    request
      .then(() => {
        setOpen(false);
        cargarRelojes();
      })
      .catch((err) => {
        console.error("Error guardando reloj:", err);
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
        console.log("Reloj sincronizado:", res);
        cargarRelojes();
      })
      .catch((err) => {
        console.error("Error sincronizando reloj:", err);
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
      title="Gestión de Relojes"
      subtitle={
        loading
          ? "Cargando relojes registrados..."
          : `${conectados} de ${relojes.length} relojes conectados`
      }
    >
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
            <h3 className="font-semibold text-foreground">Relojes registrados</h3>
            <p className="text-xs text-muted-foreground">
              Administra dispositivos ZKTeco registrados en PostgreSQL.
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
                <th className="text-left font-semibold px-5 py-3">Dirección IP</th>
                <th className="text-left font-semibold px-5 py-3">Puerto</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Ubicación</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-left font-semibold px-5 py-3">
                  Última sincronización
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
                  <td className="px-5 py-3">
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">
                    {r.ultimaSync}
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
                        {syncingId === r.id ? "Sincronizando..." : "Sincronizar"}
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
                    colSpan={8}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando relojes registrados..."
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
                <X className="h-4 w-4" />l
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
                  onChange={(v) => setForm({ ...form, puerto: Number(v) })}
                  placeholder="4370"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Sucursal
                  </label>
                  <select
                    value={form.sucursal}
                    onChange={(e) =>
                      setForm({ ...form, sucursal: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {sucursales
                      .filter((s) => s.activo)
                      .map((s) => (
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
                  placeholder="Indique una área"
                  className="sm:col-span-2"
                />
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