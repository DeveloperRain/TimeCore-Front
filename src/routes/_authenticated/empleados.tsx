import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { timecoreApi } from "@/lib/api/timecore";
import { Search, Plus, Pencil, X } from "lucide-react";

import { getErrorMessage } from "@/lib/api/errors";
export const Route = createFileRoute("/_authenticated/empleados")({
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
      { title: "Empleados — TimeCore" },
      {
        name: "description",
        content: "Gestión de empleados registrados en el sistema TimeCore.",
      },
    ],
  }),
  component: EmpleadosPage,
});

type EstadoEmpleado = "Activo" | "Inactivo";

type SucursalOption = {
  id: number;
  nombre: string;
};

type EmpleadoFront = {
  id: number;
  uid: number;
  nombre: string;
  area: string;
  puesto: string;
  sucursal: string;
  email: string;
  empresa: string;
  estado: EstadoEmpleado;
  branch_id?: number | null;
};

function normalizeEstado(value: any): EstadoEmpleado {
  const estado = String(value ?? "").toLowerCase().trim();

  if (
    value === true ||
    estado === "activo" ||
    estado === "active" ||
    estado === "1" ||
    estado === "true"
  ) {
    return "Activo";
  }

  return "Inactivo";
}

function EmpleadosPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const branchId = search.branch_id;
  const isBranchMode =
    branchId !== undefined && branchId !== null && !Number.isNaN(branchId);

  const branchParams = isBranchMode ? { branchId } : undefined;

  const [query, setQuery] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpleadoFront | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoFront[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;

  const [form, setForm] = useState({
    uid: "",
    nombre: "",
    area: "",
    puesto: "usuario",
    sucursal: "",
    email: "",
    empresa: "",
    estado: "Activo" as EstadoEmpleado,
  });

  useEffect(() => {
    cargarSucursales();
  }, [branchId]);

  useEffect(() => {
    setPage(1);
  }, [branchId, query, filterEstado]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cargarEmpleados();
    }, query ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [branchId, page, query, filterEstado]);

  const cargarSucursales = () => {
    return timecoreApi
      .getBranches()
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const opciones: SucursalOption[] = data
          .map((b: any) => ({
            id: Number(b.id),
            nombre: String(b.name ?? b.nombre ?? "").trim(),
          }))
          .filter((b: SucursalOption) => b.nombre !== "");

        setSucursales(opciones);

        if (isBranchMode) {
          const selected = opciones.find((s) => s.id === Number(branchId));
          setSelectedBranchName(selected?.nombre ?? "");
          setFilterSucursal("");
        } else {
          setSelectedBranchName("");
        }

        return opciones;
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
        setSelectedBranchName("");
        return [];
      });
  };

  const cargarEmpleados = () => {
    setLoading(true);

    timecoreApi
      .getUsuariosPaginados({
        page,
        limit: PAGE_SIZE,
        branchId: isBranchMode ? branchId : undefined,
        search: query,
        status: filterEstado,
      })
      .then((res) => {
        const payload = res?.data ?? {};
        const lista = payload.items ?? [];
        setTotal(Number(payload.total ?? 0));
        setTotalPages(Number(payload.pages ?? 1));

        const empleadosApi: EmpleadoFront[] = lista.map((u: any) => ({
          id: Number(u.id ?? u.uid),
          uid: Number(u.uid ?? u.id),
          nombre: String(u.name ?? u.nombre ?? "Sin nombre"),
          area: String(u.area ?? u.department ?? u.departamento ?? ""),
          puesto: String(u.role ?? u.puesto ?? "usuario"),
          sucursal: String(u.sucursal ?? u.branch_name ?? "Sin sucursal"),
          email: String(u.email ?? "Sin correo"),
          empresa: String(u.empresa ?? u.company ?? ""),
          estado: normalizeEstado(u.status ?? u.estado ?? "Activo"),
          branch_id:
            u.branch_id !== undefined && u.branch_id !== null
              ? Number(u.branch_id)
              : null,
        }));

        setEmpleados(empleadosApi);
      })
      .catch((err) => {
        console.error("Error cargando empleados:", err);
        setEmpleados([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
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
    cargarSucursales().then((opciones) => {
      const selected = isBranchMode
        ? opciones.find((s) => s.id === Number(branchId))
        : opciones[0];

      setEditing(null);
      setForm({
        uid: "",
        nombre: "",
        area: "",
        puesto: "usuario",
        sucursal: selected?.nombre ?? "",
        email: "",
        empresa: "",
        estado: "Activo",
      });
      setOpen(true);
    });
  };

  const openEdit = (e: EmpleadoFront) => {
    cargarSucursales();
    setEditing(e);
    setForm({
      uid: String(e.uid),
      nombre: e.nombre,
      area: e.area,
      puesto: e.puesto,
      sucursal: e.sucursal === "Sin sucursal" ? "" : e.sucursal,
      email: e.email === "Sin correo" ? "" : e.email,
      empresa: e.empresa,
      estado: e.estado,
    });
    setOpen(true);
  };

  const guardarEmpleado = () => {
    if (!form.uid.trim() || !form.area.trim() || !form.nombre.trim()) {
      alert("UID, Área y Nombre son obligatorios");
      return;
    }

    const selectedBranchId = isBranchMode
      ? Number(branchId)
      : getBranchIdBySucursalName(form.sucursal);

    const profilePayload = {
      role: form.puesto,
      sucursal: form.sucursal,
      email: form.email,
      area: form.area,
      empresa: form.empresa,
      branch_id: selectedBranchId,
    };

    if (!editing) {
      timecoreApi
        .crearUsuario({
          uid: Number(form.uid),
          name: form.nombre,
          role: form.puesto,
        })
        .then(() => {
          alert("Empleado creado con éxito");
        })
        .then(() =>
          timecoreApi.actualizarPerfilEmpleado(Number(form.uid), profilePayload)
        )
        .then(() => {
          if (form.estado !== "Activo") {
            return timecoreApi.actualizarEstadoEmpleado(
              Number(form.uid),
              form.estado
            );
          }
        })
        .then(() => {
          cargarEmpleados();
          setOpen(false);
        })
        .catch((err) => {
          console.error("Error creando empleado:", err);
          alert("No se pudo crear el empleado, revise si el reloj está conectado o la UID es correcta.");
        });

      return;
    }

    timecoreApi
      .actualizarUsuario(editing.uid, {
        name: form.nombre,
        role: form.puesto,
      })
      .then(() =>
        timecoreApi.actualizarPerfilEmpleado(editing.uid, profilePayload)
      )
      .then(() => timecoreApi.actualizarEstadoEmpleado(editing.uid, form.estado))
      .then(() => {
        alert("Empleado actualizado con éxito");
        cargarEmpleados();
        setOpen(false);
      })
      .catch((err) => {
        console.error("Error actualizando empleado:", err);
        alert("No se pudo actualizar el empleado, revise si el reloj está conectado o la UID es correcta.");
      });
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return empleados.filter((e) => {
      const matchSucursal =
        !filterSucursal || e.sucursal === filterSucursal;

      const matchEstado =
        !filterEstado || e.estado === filterEstado;

      const searchableText = [
        e.nombre,
        e.area,
        e.puesto,
        e.sucursal,
        e.email,
        e.empresa,
        String(e.uid),
      ]
        .join(" ")
        .toLowerCase();

      const matchQuery =
        !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchSucursal && matchEstado && matchQuery;
    });
  }, [empleados, query, filterSucursal, filterEstado]);

  const subtitle = loading
    ? "Cargando empleados..."
    : isBranchMode
      ? `${total} empleados en ${selectedBranchName || "esta sucursal"}`
      : `${total} empleados encontrados`;

  return (
    <AppShell
      title={isBranchMode ? `Empleados de ${selectedBranchName || "Sucursal"}`  
      : "Gestión de Empleados"
      }
      subtitle={subtitle}
    >
      {isBranchMode && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Vista filtrada por sucursal
            </p>
            <p className="text-xs text-muted-foreground">
              Mostrando únicamente empleados de{" "}
              {selectedBranchName || "la sucursal seleccionada"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/empleados",
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

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, área, empresa, puesto, sucursal o email..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isBranchMode && (
              <select
                value={filterSucursal}
                onChange={(e) => setFilterSucursal(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Área</th>
                <th className="text-left font-semibold px-5 py-3">Empleado</th>
                <th className="text-left font-semibold px-5 py-3">Puesto</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Email</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-left font-semibold px-5 py-3">Empresa</th>
                <th className="text-right font-semibold px-5 py-3">Editar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr
                  key={`${e.id}-${e.uid}-${e.empresa}`}
                  className="hover:bg-muted/40 transition-colors"
                >
                  <td className="px-5 py-3 text-foreground">
                    {e.area || ""}
                  </td>

                  <td className="px-5 py-3 font-medium text-foreground">
                    {e.nombre}
                  </td>

                  <td className="px-5 py-3 text-foreground">{e.puesto}</td>

                  <td className="px-5 py-3 text-foreground">{e.sucursal}</td>

                  <td className="px-5 py-3 text-muted-foreground">{e.email}</td>

                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        e.estado === "Activo"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.estado === "Activo"
                            ? "bg-success"
                            : "bg-destructive"
                        }`}
                      />
                      {e.estado}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-muted-foreground">
                    {e.empresa || ""}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando empleados..."
                      : isBranchMode
                        ? "No se encontraron empleados en esta sucursal."
                        : "No se encontraron empleados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} • {total} empleados
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? "Editar empleado" : "Nuevo empleado"}
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="UID en el Reloj"
                  value={form.uid}
                  disabled={!!editing}
                  onChange={(v) => setForm({ ...form, uid: v })}
                  placeholder="Ej. 23"
                />

                <Field
                  label="Nombre completo"
                  value={form.nombre}
                  onChange={(v) => setForm({ ...form, nombre: v })}
                  placeholder="Nombre del empleado"
                />

                <Field
                  label="Área"
                  value={form.area}
                  onChange={(v) => setForm({ ...form, area: v })}
                  placeholder="Ej. Riego"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Rol en el Reloj
                  </label>
                  <select
                    value={form.puesto}
                    onChange={(e) =>
                      setForm({ ...form, puesto: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="usuario">usuario</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

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
                    <option value="">Seleccionar...</option>
                    {sucursalesVisibles.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="Sin correo"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Empresa
                  </label>
                  <select
                    value={form.empresa}
                    onChange={(e) =>
                      setForm({ ...form, empresa: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="FISMAN">FISMAN</option>
                    <option value="SELEFF">SELEFF</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Estado
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estado: e.target.value as EstadoEmpleado,
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
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
                  type="button"
                  onClick={guardarEmpleado}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {editing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
      />
    </div>
  );
}
