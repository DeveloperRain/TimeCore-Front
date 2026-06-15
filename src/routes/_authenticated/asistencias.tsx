import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { sucursalesNombres, type Asistencia, type Empleado } from "@/lib/mock-data";
import { timecoreApi, getExcelAsistenciasUrl } from "@/lib/api/timecore";
import { Download, Filter } from "lucide-react";

export const Route = createFileRoute("/asistencias")({
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

function AsistenciasPage() {
  const [fecha, setFecha] = useState("");
  const [empleado, setEmpleado] = useState("");
  const [sucursal, setSucursal] = useState("");

  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    timecoreApi
      .getUsuarios()
      .then((res) => {
        const empleadosApi: Empleado[] = res.data.map((u: any) => ({
          id: u.uid,
          codigo: String(u.user_id ?? u.uid),
          nombre: String(u.name ?? "Sin nombre"),
          puesto: String(u.role ?? "Empleado"),
          sucursal: "Reloj Principal",
          email: "Sin correo",
          estado: "Activo",
        }));

        setEmpleados(empleadosApi);
      })
      .catch((err) => {
        console.error("Error cargando empleados:", err);
      });
  }, []);

  useEffect(() => {
    timecoreApi
      .getAsistencias()
      .then((res) => {
        const asistenciasApi: Asistencia[] = res.data.map((a: any, index: number) => {
          const rawDate = String(a.timestamp ?? a.punch_time ?? a.time ?? "");
          const fecha = rawDate.includes("T")
            ? rawDate.split("T")[0]
            : rawDate.split(" ")[0] || "Sin fecha";

          const hora = rawDate.includes("T")
            ? rawDate.split("T")[1]?.slice(0, 5)
            : rawDate.split(" ")[1]?.slice(0, 5);

          const codigo = String(a.user_id ?? a.uid ?? "Sin código");

          return {
            id: index + 1,
            codigo,
            empleado: String(a.name ?? a.user_name ?? `Usuario ${codigo}`),
            sucursal: "Reloj Principal",
            fecha,
            entrada: hora || "—",
            salida: "—",
            estado: "A tiempo",
          };
        });

        setAsistencias(asistenciasApi);
        console.log("Asistencias cargadas:", asistenciasApi);
      })
      .catch((err) => {
        console.error("Error cargando asistencias:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = asistencias.filter((a) => {
    const mF = !fecha || a.fecha === fecha;
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Fecha</label>
              <input
                type="date"
                value={fecha}
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
                <option value="Reloj Principal">Reloj Principal</option>
                {sucursalesNombres.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  window.location.href = getExcelAsistenciasUrl();
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
                <th className="text-left font-semibold px-5 py-3">Salida</th>
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
                  <td className="px-5 py-3 tabular-nums text-foreground">
                    {a.salida}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        a.estado === "A tiempo"
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
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
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