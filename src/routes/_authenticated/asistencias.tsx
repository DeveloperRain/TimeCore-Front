import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { timecoreApi, getExcelAsistenciasUrl } from "@/lib/api/timecore";
import { Download, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

function dateToString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function stringToDate(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatearFechaVisual(value: string) {
  const date = stringToDate(value);

  if (!date) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = meses[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

function FechaPicker({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  max: string;
}) {
  const selectedDate = stringToDate(value);
  const today = stringToDate(max) ?? new Date();

  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selectedDate ?? today
  );

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [value]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const cells: Array<Date | null> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [currentMonth]);

  const goPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  const selectToday = () => {
    onChange(dateToString(today));
    setCurrentMonth(today);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? formatearFechaVisual(value) : "Seleccionar fecha"}
        </span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <p className="text-sm font-semibold text-foreground">
              {meses[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </p>

            <button
              type="button"
              onClick={goNextMonth}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {diasSemana.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-8" />;
              }

              const dateString = dateToString(date);
              const isSelected = value === dateString;
              const isToday = dateString === getTodayDateString();
              const disabled = dateString > max;

              return (
                <button
                  key={dateString}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(dateString);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-accent text-foreground"
                  } ${
                    disabled
                      ? "opacity-40 cursor-not-allowed hover:bg-transparent"
                      : ""
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
            <button
              type="button"
              onClick={clearDate}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={selectToday}
              className="text-xs text-primary hover:underline"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
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


  const obtenerNombreMes = (date: Date) => {
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return meses[date.getMonth()];
  };

  const limpiarNombreArchivo = (value: string) => {
    return value
      .trim()
      .replace(/\s+/g, "")
      .replace(/[\\/:*?"<>|]/g, "");
  };

  const construirNombreExcel = () => {
    const hoy = new Date();
    const diaActual = String(hoy.getDate()).padStart(2, "0");
    const mesActual = obtenerNombreMes(hoy);
    const añoActual = hoy.getFullYear();

    const fechaSeleccionada = fecha ? stringToDate(fecha) : hoy;
    const diaSeleccionado = fechaSeleccionada
      ? String(fechaSeleccionada.getDate()).padStart(2, "0")
      : diaActual;

    const nombreSucursal = sucursal
      ? limpiarNombreArchivo(sucursal)
      : "TodasLasSucursales";

    return `${nombreSucursal} ${diaSeleccionado}-${diaActual}_${mesActual}_${añoActual}.xlsx`;
  };

  const descargarExcel = async () => {
    try {
      const url = getExcelAsistenciasUrl(
        fecha
          ? {
              modo: "todas",
              startDate: fecha,
              endDate: getTodayDateString(),
            }
          : { modo }
      );

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("No se pudo descargar el archivo Excel");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = construirNombreExcel();
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    console.error("Error descargando Excel:", err);
  }
  };

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
              <FechaPicker
                value={fecha}
                onChange={setFecha}
                max={getTodayDateString()}
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
                onClick={descargarExcel}
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