import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  MapPin,
  Plus,
  X,
  ChevronDown,
  Pencil,
  Fingerprint,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { timecoreApi } from "@/lib/api/timecore";

import { getErrorMessage } from "@/lib/api/errors";
export const Route = createFileRoute("/_authenticated/sucursales")({
  head: () => ({
    meta: [
      { title: "Sucursales — TimeCore" },
      {
        name: "description",
        content:
          "Sucursales registradas en TimeCore. Edita nombre, dirección, estado y consulta empleados y relojes.",
      },
    ],
  }),
  component: SucursalesPage,
});

type EstadoSucursal = "Activo" | "Inactivo";

type Sucursal = {
  id: number;
  nombre: string;
  direccion: string;
  estado: EstadoSucursal;
};

type Empleado = {
  uid?: number;
  name?: string;
  sucursal?: string;
  user_id?: string;
  branch_id?: number | null;
};

type Reloj = {
  id: number;
  nombre?: string;
  name?: string;
  sucursal?: string;
  location?: string;
  branch_id?: number | null;
};

function getBadgeClasses(estado: EstadoSucursal) {
  if (estado === "Activo") {
    return {
      badge: "bg-success/10 text-success",
      dot: "bg-success",
    };
  }

  if (estado === "Inactivo") {
    return {
      badge: "bg-destructive/10 text-destructive",
      dot: "bg-destructive",
    };
  }

  return {
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  };
}

function normalizeEstadoSucursal(value: unknown): EstadoSucursal {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    normalized === "activo" ||
    normalized === "active" ||
    normalized === "true" ||
    normalized === "1"
  ) {
    return "Activo";
  }

  return "Inactivo";
}

function normalizeText(value?: string | null) {
  return String(value ?? "").toLowerCase().trim();
}

function SucursalesPage() {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", direccion: "" });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [relojes, setRelojes] = useState<Reloj[]>([]);

  useEffect(() => {
    cargarSucursales();
    cargarDatosRelacionados();
  }, []);

  const cargarSucursales = () => {
    timecoreApi
      .getBranches()
      .then((res) => {
        const data = res.data ?? [];

        const branches: Sucursal[] = data.map((b: any) => {
          const id = Number(b.id);

          return {
            id,
            nombre: String(b.name ?? ""),
            direccion: String(b.address ?? ""),
            estado: normalizeEstadoSucursal(
              b.status ?? b.estado ?? b.is_active ?? b.activo ?? true
            ),
          };
        });

        setSucursales(branches);
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
      });
  };

  const cargarDatosRelacionados = () => {
    timecoreApi
      .getUsuarios()
      .then((r) => setEmpleados(r.data ?? r ?? []))
      .catch(() => setEmpleados([]));

    timecoreApi
      .getDevices()
      .then((r) => setRelojes(r.data ?? r ?? []))
      .catch(() => setRelojes([]));
  };

  const guardar = (e: FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.direccion.trim()) return;

    timecoreApi
      .crearBranch({
        name: form.nombre.trim(),
        address: form.direccion.trim(),
        is_active: true,
        status: "Activo",
      })
      .then(() => {
        setForm({ nombre: "", direccion: "" });
        setOpen(false);
        cargarSucursales();
        cargarDatosRelacionados();
      })
      .catch((err) => {
        console.error("Error creando sucursal:", err);
      });
  };

  const actualizarSucursal = (
    id: number,
    data: { nombre: string; direccion: string; estado: EstadoSucursal }
  ) => {
    return timecoreApi
      .actualizarBranch(id, {
        name: data.nombre.trim(),
        address: data.direccion.trim(),
        is_active: data.estado === "Activo",
        status: data.estado,
      })
      .then(() => {
        cargarSucursales();
        cargarDatosRelacionados();
        alert("Sucursal actualizada con éxito");
      })
      .catch((err) => {
        console.error("Error actualizando sucursal:", err);
        alert("Error al actualizar la sucursal");
      });
  };


  const abrirDashboardSucursal = (sucursal: Sucursal) => {
  navigate({
    to: "/",
    search: {
      branch_id: sucursal.id,
    },
  });
  };

  const empleadosDe = (s: Sucursal) =>
    empleados.filter((e) => {
      if (e.branch_id !== undefined && e.branch_id !== null) {
        return Number(e.branch_id) === s.id;
      }

      return normalizeText(e.sucursal) === normalizeText(s.nombre);
    });

  const relojesDe = (s: Sucursal) =>
    relojes.filter((r) => {
      if (r.branch_id !== undefined && r.branch_id !== null) {
        return Number(r.branch_id) === s.id;
      }

      return (
        normalizeText(r.sucursal ?? r.location ?? "Sin sucursal") ===
        normalizeText(s.nombre)
      );
    });

  return (
    <AppShell
      title="Gestión de Sucursales"
      subtitle={`${sucursales.length} sucursales registradas`}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Sucursales</h3>
            <p className="text-xs text-muted-foreground">
              Da clic en una sucursal para abrir su dashboard. Usa la flecha para ver detalles.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Agregar sucursal
          </button>
        </div>

        <div className="divide-y divide-border">
          {sucursales.map((s) => {
            const emps = empleadosDe(s);
            const rels = relojesDe(s);
            const isOpen = expanded === s.id;

            return (
              <SucursalRow
                key={s.id}
                sucursal={s}
                empleados={emps}
                relojes={rels}
                isOpen={isOpen}
                onOpenDashboard={() => abrirDashboardSucursal(s)}
                onToggle={() => setExpanded(isOpen ? null : s.id)}
                onUpdate={(data) => actualizarSucursal(s.id, data)}
              />
            );
          })}

          {sucursales.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Cargando sucursales...
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Nueva sucursal
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Matriz"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  placeholder="Dirección de la sucursal"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
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
                  Crear sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SucursalRow({
  sucursal,
  empleados,
  relojes,
  isOpen,
  onOpenDashboard,
  onToggle,
  onUpdate,
}: {
  sucursal: Sucursal;
  empleados: Empleado[];
  relojes: Reloj[];
  isOpen: boolean;
  onOpenDashboard: () => void;
  onToggle: () => void;
  onUpdate: (data: {
    nombre: string;
    direccion: string;
    estado: EstadoSucursal;
  }) => Promise<any>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    nombre: sucursal.nombre,
    direccion: sucursal.direccion,
    estado: sucursal.estado,
  });

  useEffect(() => {
    setDraft({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      estado: sucursal.estado,
    });
  }, [sucursal.nombre, sucursal.direccion, sucursal.estado]);

  const guardar = () => {
    if (!draft.nombre.trim() || !draft.direccion.trim()) return;

    onUpdate(draft)
      .then(() => {
        setEditing(false);
      })
      .catch((err) => {
        console.error("Error actualizando sucursal:", err);
      });
  };

  const badgeClasses = getBadgeClasses(sucursal.estado);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDashboard}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onOpenDashboard();
          }
        }}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left cursor-pointer group"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {sucursal.nombre}
            </h3>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClasses.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${badgeClasses.dot}`} />
              {sucursal.estado}
            </span>

            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {sucursal.direccion}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Fingerprint className="h-3.5 w-3.5" />
            {relojes.length}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Mostrar detalles de sucursal"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 bg-muted/20 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  Información
                </h4>

                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                ) : (
                  <button
                    onClick={guardar}
                    className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                  >
                    <Check className="h-3 w-3" /> Guardar
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nombre
                </label>
                <input
                  type="text"
                  disabled={!editing}
                  value={draft.nombre}
                  onChange={(e) =>
                    setDraft({ ...draft, nombre: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Dirección
                </label>
                <input
                  type="text"
                  disabled={!editing}
                  value={draft.direccion}
                  onChange={(e) =>
                    setDraft({ ...draft, direccion: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <select
                  disabled={!editing}
                  value={draft.estado}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      estado: e.target.value as EstadoSucursal,
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            {!editing && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Fingerprint className="h-4 w-4" />
                    Relojes ({relojes.length})
                  </h4>

                  {relojes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sin relojes asignados.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border max-h-48 overflow-y-auto">
                      {relojes.map((r) => (
                        <li key={r.id} className="py-2 text-sm text-foreground">
                          {r.nombre ?? r.name ?? `Reloj #${r.id}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    Resumen
                  </h4>

                  <p className="text-xs text-muted-foreground">
                    {empleados.length} empleados registrados en esta sucursal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
