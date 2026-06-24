import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { timecoreApi, getExcelAsistenciasUrl } from "@/lib/api/timecore";
import { Download, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/asistencias")({
  head: () => ({
    meta: [
      { title: "Asistencias — TimeCore" },
      {
        name: "description",
        content:
          "Consulta y exporta los registros de asistencia capturados por los relojes biométricos.",
      },
    ],
  }),
  component: AsistenciasPage,
});

type ModoVista = "hoy" | "todas" | "semana";

type EmpleadoFront = {
  id: number;
  codigo: string;
  nombre: string;
  puesto: string;
  sucursal: string;
  email: string;
  estado: string;
};

type AsistenciaFront = {
  id: number;
  codigo: string;
  empleado: string;
  sucursal: string;
  fecha: string;
  entrada: string;
  estado: string;
};

function formatearHora12(hora?: string) {
  if (!hora) return "—";

  const partes = hora.split(":");
  const horas = Number(partes[0]);
  const minutos = partes[1] ?? "00";

  if (Number.isNaN(horas)) return hora;

  const periodo = horas >= 12 ? "PM" : "AM";
  const hora12 = horas % 12 || 12;

  return `${hora12}:${minutos} ${periodo}`;
}

function normalizarEstadoAsistencia(estado: any) {
  const value = String(estado ?? "").trim().toLowerCase();

  if (value === "check_in" || value === "checkin" || value === "entrada") {
    return "Asistió";
  }

  if (value === "check_out" || value === "checkout" || value === "salida") {
    return "Salida";
  }

  if (value === "a tiempo" || value === "on_time") {
    return "Asistió";
  }

  if (value === "retardo" || value === "late") {
    return "Retardo";
  }

  return estado ? String(estado) : "Asistió";
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function AsistenciasPage() {
  const [modo, setModo] = useState<ModoVista>("hoy");
  const [fecha, setFecha] = useState("");
  const [empleado, setEmpleado] = useState("");
  const [sucursal, setSucursal] = useState("");

  const [asistencias, setAsistencias] = useState<AsistenciaFront[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoFront[]>([]);
  const [sucursales, setSucursales] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(true);

  useEffect(() => {
    cargarSucursales();
    cargarTodo();
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [modo, fecha]);

  const cargarSucursales = () => {
    setLoadingSucursales(true);

    timecoreApi
      .getBranches()
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const nombres: string[] = data
          .map((b: any) => String(b.name))
          .map((name: string) => name.trim())
          .filter((name: string) => name !== "");

        setSucursales(nombres);
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
      })
      .finally(() => {
        setLoadingSucursales(false);
      });
  };

  const cargarTodo = () => {
    setLoading(true);

    timecoreApi
      .getUsuarios()
      .then((resUsuarios) => {
        const listaUsuarios = Array.isArray(resUsuarios)
          ? resUsuarios
          : resUsuarios?.data ?? [];

        const empleadosApi: EmpleadoFront[] = listaUsuarios.map((u: any) => ({
          id: Number(u.uid),
          codigo: String(u.user_id ?? u.uid ?? ""),
          nombre: String(u.name ?? "Sin nombre"),
          puesto: String(u.role ?? "Empleado"),
          sucursal: String(u.sucursal ?? "Sin sucursal"),
          email: String(u.email ?? "Sin correo"),
          estado: String(u.status ?? "Activo"),
        }));

        setEmpleados(empleadosApi);

        const request = fecha
          ? timecoreApi.getAsistencias()
          : modo === "hoy"
            ? timecoreApi.getAsistenciasHoy()
            : modo === "semana"
              ? timecoreApi.getAsistenciasSemana()
              : timecoreApi.getAsistencias();

        return request.then((resAsistencias) => {
          const registros = resAsistencias.data ?? [];

          const asistenciasApi: AsistenciaFront[] = registros.map(
            (a: any, index: number) => {
              const rawDate = String(a.timestamp ?? a.punch_time ?? a.time ?? "");

              const fecha = rawDate.includes("T")
                ? rawDate.split("T")[0]
                : rawDate.split(" ")[0] || "Sin fecha";

              const hora = rawDate.includes("T")
                ? rawDate.split("T")[1]?.slice(0, 5)
                : rawDate.split(" ")[1]?.slice(0, 5);

              const codigo = String(a.user_id ?? a.uid ?? "Sin código");

              const empleadoEncontrado = empleadosApi.find(
                (e) => e.codigo === codigo || String(e.id) === codigo
              );

              return {
                id: Number(a.id ?? index + 1),
                codigo,
                empleado: String(
                  a.name ??
                    a.user_name ??
                    empleadoEncontrado?.nombre ??
                    `Usuario ${codigo}`
                ),
                sucursal: String(
                  a.sucursal ??
                    empleadoEncontrado?.sucursal ??
                    "Sin sucursal"
                ),
                fecha,
                entrada: formatearHora12(hora) || "—",
                estado: normalizarEstadoAsistencia(a.status),
              };
            }
          );

          setAsistencias(asistenciasApi);
          console.log("Asistencias cargadas:", asistenciasApi);
        });
      })
      .catch((err) => {
        console.error("Error cargando asistencias:", err);
        setEmpleados([]);
        setAsistencias([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const filtered = asistencias.filter((a) => {
    const today = getTodayDateString();
    const mF = !fecha || (a.fecha >= fecha && a.fecha <= today);
    const mE = !empleado || a.codigo === empleado;
    const mS = !sucursal || a.sucursal === sucursal;
    return mF && mE && mS;
  });

  return (
    <AppShell
      title="Gestión de Asistencias"
      subtitle={
        loading
          ? "Cargando registros..."
          : `${filtered.length} registros capturados por los relojes biométricos`
      }
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 md:p-5 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
            <Filter className="h-4 w-4 text-primary" />
            Filtros
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Por bloques</label>
              <select
                value={modo}
                onChange={(e) => setModo(e.target.value as ModoVista)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="hoy">Hoy</option>
                <option value="todas">Todas</option>
                <option value="semana">Semana</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Desde fecha</label>
              <input
                type="date"
                value={fecha}
                max={getTodayDateString()}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Empleado</label>
              <select
                value={empleado}
                onChange={(e) => setEmpleado(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {empleados.map((e) => (
                  <option key={e.codigo} value={e.codigo}>
                    {e.codigo} — {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Sucursal</label>
              <select
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {loadingSucursales && (
                  <option value="" disabled>
                    Cargando sucursales...
                  </option>
                )}
                {sucursales.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  window.location.href = getExcelAsistenciasUrl(
                    fecha
                      ? {
                          modo: "todas",
                          startDate: fecha,
                          endDate: getTodayDateString(),
                        }
                      : { modo }
                  );
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-semibold px-5 py-3">Código</th>
                <th className="text-left font-semibold px-5 py-3">Empleado</th>
                <th className="text-left font-semibold px-5 py-3">Sucursal</th>
                <th className="text-left font-semibold px-5 py-3">Fecha</th>
                <th className="text-left font-semibold px-5 py-3">Entrada</th>
                <th className="text-left font-semibold px-5 py-3">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {a.codigo}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {a.empleado}
                  </td>
                  <td className="px-5 py-3 text-foreground">{a.sucursal}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">
                    {a.fecha}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-foreground">
                    {a.entrada}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        a.estado === "Asistió"
                          ? "bg-success/10 text-success"
                          : a.estado === "Retardo"
                            ? "bg-warning/20 text-warning-foreground"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {a.estado}
                    </span>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "Cargando registros de asistencia..."
                      : "Sin registros para los filtros seleccionados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
