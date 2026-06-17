import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { sucursalesNombres, type Empleado } from "@/lib/mock-data";
import { timecoreApi } from "@/lib/api/timecore";
import { Search, Plus, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/empleados")({
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

type EstadoEmpleado = "Activo" | "Inactivo" | "Baja";

type EmpleadoFront = Omit<Empleado, "estado"> & {
  estado: EstadoEmpleado;
};

function EmpleadosPage() {
  const [query, setQuery] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpleadoFront | null>(null);

  const [empleados, setEmpleados] = useState<EmpleadoFront[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoEdit, setEstadoEdit] = useState<EstadoEmpleado>("Activo");

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = () => {
    setLoading(true);

    timecoreApi
      .getUsuarios()
      .then((res) => {
        const lista = Array.isArray(res) ? res : res?.data ?? [];

        const empleadosApi: EmpleadoFront[] = lista.map((u: any) => ({
          id: u.uid,
          codigo: String(u.user_id ?? u.uid ?? ""),
          nombre: String(u.name ?? "Sin nombre"),
          puesto: String(u.role ?? "Empleado"),
          sucursal: "Reloj Principal",
          email: "Sin correo",
          estado: String(u.status ?? "Activo") as EstadoEmpleado,
        }));

        setEmpleados(empleadosApi);
      })
      .catch((err) => {
        console.error("Error cargando empleados:", err);
        setEmpleados([]);
      })
      .finally(() => setLoading(false));
  };

  const filtered = empleados.filter((e) => {
    const matchQ =
      !query ||
      e.nombre.toLowerCase().includes(query.toLowerCase()) ||
      e.codigo.toLowerCase().includes(query.toLowerCase()) ||
      e.email.toLowerCase().includes(query.toLowerCase());

    const matchS = !filterSucursal || e.sucursal === filterSucursal;
    const matchE = !filterEstado || e.estado === filterEstado;

    return matchQ && matchS && matchE;
  });

  const openAdd = () => {
  setEditing(null);
  setEstadoEdit("Activo");
  setOpen(true);
};

  const openEdit = (e: EmpleadoFront) => {
  setEditing(e);
  setEstadoEdit(e.estado);
  setOpen(true);
};

  const guardarEstadoEmpleado = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editing) {
      setOpen(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const estado = String(formData.get("estado")) as EstadoEmpleado;

    timecoreApi
      .actualizarEstadoEmpleado(editing.id, estado)
      .then(() => {
        setEmpleados((prev) =>
          prev.map((emp) =>
            emp.id === editing.id ? { ...emp, estado } : emp
          )
        );

        setOpen(false);
      })
      .catch((err) => {
        console.error("Error actualizando estado:", err);
      });
  };

  return (
    <AppShell
      title="Gestión de Empleados"
      subtitle={
        loading
          ? "Cargando empleados..."
          : `${filtered.length} empleados encontrados`
      }
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 flex-1 min-w-0">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, código o email..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterSucursal}
              onChange={(e) => setFilterSucursal(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas las sucursales</option>
              {sucursalesNombres.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
  value={estadoEdit}
  onChange={(e) => setEstadoEdit(e.target.value as EstadoEmpleado)}
  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
>
  <option value="Activo">Activo</option>
  <option value="Inactivo">Inactivo</option>
  <option value="Baja">Baja</option>
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
                <th className="text-left font-semibold px-5 py-3">Código</th>
                <th className="text-left font-semibold px-5 py-3">Nombre</th>
                <th className="text-left font-semibold px-5 py-3">Puesto</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Email</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
                <th className="text-right font-semibold px-5 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {e.codigo}
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
                          : e.estado === "Inactivo"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.estado === "Activo"
                            ? "bg-success"
                            : e.estado === "Inactivo"
                            ? "bg-muted-foreground"
                            : "bg-destructive"
                        }`}
                      />
                      {e.estado}
                    </span>
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
                    colSpan={7}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando datos..."
                      : "No se encontraron empleados."}
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
                {editing ? "Editar empleado" : "Nuevo empleado"}
              </h3>

              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={guardarEstadoEmpleado} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Código"
                  defaultValue={editing?.codigo}
                  placeholder="EMP-009"
                />
                <Field
                  label="Nombre completo"
                  defaultValue={editing?.nombre}
                  placeholder="Nombre Apellido"
                />
                <Field
                  label="Puesto"
                  defaultValue={editing?.puesto}
                  placeholder="Ej. Gerente"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Sucursal
                  </label>
                  <select
                    defaultValue={editing?.sucursal ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursalesNombres.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Email"
                  defaultValue={editing?.email}
                  placeholder="correo@empresa.com"
                  className="sm:col-span-2"
                />

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Estado
                  </label>
                  <select
                    name="estado"
                    defaultValue={editing?.estado ?? "Activo"}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Baja">Baja</option>
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
              onClick={() => {
    if (!editing) {
      setOpen(false);
      return;
    }

    console.log("Guardando estado:", editing.id, estadoEdit);

    timecoreApi
      .actualizarEstadoEmpleado(editing.id, estadoEdit)
      .then(() => {
        setEmpleados((prev) =>
          prev.map((emp) =>
            emp.id === editing.id ? { ...emp, estado: estadoEdit } : emp
          )
        );

        setOpen(false);
      })
      .catch((err) => {
        console.error("Error actualizando estado:", err);
      });
  }}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    Guardar cambios
                        </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({
  label,
  defaultValue,
  placeholder,
  className = "",
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}