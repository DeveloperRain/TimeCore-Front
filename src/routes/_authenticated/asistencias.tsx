import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getExcelAsistenciasUrl,
  getExcelPrenominaUrl,
  timecoreApi,
} from "@/lib/api/timecore";
import { CalendarIcon, Download, Filter, Save, Trash2, X } from "lucide-react";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { getErrorMessage } from "@/lib/api/errors";
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

type VistaTabla = "asistencias" | "prenomina";

type EmpleadoFront = {
  id: number;
  codigo: string;
  nombre: string;
  area: string;
  sucursal: string;
  empresa: string;
};

type AsistenciaFront = {
  id: number;
  codigo: string;
  area: string;
  trabajador: string;
  sucursal: string;
  fecha: string;
  entrada: string;
  estado: string;
  empresa: string;
};

type PrenominaDay = {
  date: string;
  label: string;
};

type PrenominaIncident = {
  id: number;
  user_id: string;
  fecha: string;
  hora: string;
  incidencia: string;
  descripcion?: string;
};

type PrenominaRow = {
  area: string;
  trabajador: string;
  codigo: string;
  hora: string;
  empresa: string;
  cells: Record<string, string>;
  incidents: Record<string, PrenominaIncident>;
};

type PrenominaData = {
  days: PrenominaDay[];
  hours: string[];
  rows: PrenominaRow[];
};

type IncidenciaForm = {
  id?: number;
  user_id: string;
  fecha: string;
  hora: string;
  incidencia: string;
};

const EMPTY_PRENOMINA: PrenominaData = {
  days: [],
  hours: [],
  rows: [],
};

function normalizePrenominaData(rawData: any): PrenominaData {
  const source = rawData ?? EMPTY_PRENOMINA;
  const rawRows = Array.isArray(source.rows) ? source.rows : [];

  return {
    days: Array.isArray(source.days) ? source.days : [],
    hours: Array.isArray(source.hours) ? source.hours : [],
    rows: rawRows.map((row: any, index: number) => {
      const codigo = String(
        row.codigo ??
          row.user_id ??
          row.uid ??
          row.employee_id ??
          row.id ??
          ""
      ).trim();

      const trabajador = String(
        row.trabajador ??
          row.name ??
          row.nombre ??
          row.employee_name ??
          codigo ??
          `Empleado ${index + 1}`
      ).trim();

      const incidentsSource = row.incidents ?? row.incidencias ?? {};
      const incidents: Record<string, PrenominaIncident> = {};

      Object.entries(incidentsSource).forEach(([fecha, value]: [string, any]) => {
        if (!value) return;

        incidents[fecha] = {
          id: Number(value.id ?? 0),
          user_id: String(value.user_id ?? codigo ?? trabajador),
          fecha: String(value.fecha ?? fecha),
          hora: String(value.hora ?? row.hora ?? ""),
          incidencia: String(value.incidencia ?? value.type ?? ""),
          descripcion: value.descripcion,
        };
      });

      return {
        area: String(row.area ?? row.department ?? row.departamento ?? ""),
        trabajador: trabajador || codigo || `Empleado ${index + 1}`,
        codigo: codigo || trabajador || `empleado-${index + 1}`,
        hora: String(row.hora ?? row.hour ?? ""),
        empresa: String(row.empresa ?? row.company ?? ""),
        cells: row.cells ?? {},
        incidents,
      };
    }),
  };
}

function getFechaFromTimestamp(value: any) {
  const rawDate = String(value ?? "");

  return rawDate.includes("T")
    ? rawDate.split("T")[0]
    : rawDate.split(" ")[0] || "Sin fecha";
}

function getHoraFromTimestamp(value: any) {
  const rawDate = String(value ?? "");
  const hora = rawDate.includes("T")
    ? rawDate.split("T")[1]?.slice(0, 5)
    : rawDate.split(" ")[1]?.slice(0, 5);

  return hora || "";
}

function getEmpleadoCodigo(user: any) {
  return String(user.user_id ?? user.uid ?? user.id ?? "");
}

function getAsistenciaCodigo(record: any) {
  return String(record.user_id ?? record.uid ?? record.employee_id ?? "");
}

function normalizeEstadoAsistencia(value: any) {
  const estado = String(value ?? "").trim();

  if (!estado || estado === "check_in" || estado === "A tiempo") {
    return "Asistió";
  }

  return estado;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function parseTypedDate(value: string) {
  const rawValue = value.trim();

  if (!rawValue) {
    return undefined;
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const spanishMatch = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (spanishMatch) {
    const [, day, month, year] = spanishMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return undefined;
}

function getDefaultStartDate() {
  return toDateInputValue(addDays(new Date(), -7));
}

function getDefaultEndDate() {
  return toDateInputValue(new Date());
}

function getEndDateFromStart(startDate: string) {
  const date = parseLocalDate(startDate);

  if (!date) {
    return getDefaultEndDate();
  }

  return toDateInputValue(addDays(date, 7));
}

function formatSpanishDate(value: string) {
  const date = parseLocalDate(value);

  if (!date) {
    return "Seleccionar fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPrenominaDays(startDate: string, endDate: string): PrenominaDay[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end || start > end) {
    return [];
  }

  const days: PrenominaDay[] = [];
  const current = new Date(start);

  while (current <= end) {
    const date = toDateInputValue(current);
    const label = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .format(current)
      .toUpperCase();

    days.push({ date, label });
    current.setDate(current.getDate() + 1);
  }

  return days;
}


function getPrenominaCellKey(codigo: string, hora: string, fecha: string) {
  return `${codigo}__${hora}__${fecha}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getDefaultIncidenciaForm(): IncidenciaForm {
  return {
    id: undefined,
    user_id: "",
    fecha: getDefaultStartDate(),
    hora: "06:00",
    incidencia: "",
  };
}

function AsistenciasPage() {
  const [vista, setVista] = useState<VistaTabla>(() => {
    if (typeof window === "undefined") return "asistencias";

    const savedView = window.localStorage.getItem("timecore-asistencias-vista");

    return savedView === "prenomina" ? "prenomina" : "asistencias";
  });
  const [fechaInicio, setFechaInicio] = useState(getDefaultStartDate);
  const [fechaFin, setFechaFin] = useState(getDefaultEndDate);
  const [empleado, setEmpleado] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [prenominaEmpleadosSeleccionados, setPrenominaEmpleadosSeleccionados] =
    useState<string[]>([]);
  const [sucursal, setSucursal] = useState("");

  const [asistencias, setAsistencias] = useState<AsistenciaFront[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoFront[]>([]);
  const [sucursales, setSucursales] = useState<string[]>([]);
  const [prenomina, setPrenomina] = useState<PrenominaData>(EMPTY_PRENOMINA);
  const [incidenciaForm, setIncidenciaForm] = useState(getDefaultIncidenciaForm);
  const [loading, setLoading] = useState(true);
  const [savingIncident, setSavingIncident] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendancePages, setAttendancePages] = useState(1);
  const ATTENDANCE_PAGE_SIZE = 50;
  const incidenciaFormRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollIncidentRef = useRef<{
    userId: string;
    fecha: string;
    hora: string;
  } | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("timecore-asistencias-vista", vista);
  }, [vista]);

  useEffect(() => {
    cargarTodo();
  }, [fechaInicio, fechaFin, attendancePage]);

  useEffect(() => {
    setAttendancePage(1);
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    if (vista === "prenomina") {
      cargarPrenomina();
    }
  }, [vista, fechaInicio, fechaFin]);

  useEffect(() => {
    const target = pendingScrollIncidentRef.current;

    if (!target || vista !== "prenomina") return;

    let attempts = 0;
    let timerId: number | undefined;

    const buscarYDesplazar = () => {
      const celdas = Array.from(
        document.querySelectorAll<HTMLElement>("[data-prenomina-incidencia]")
      );

      const celda = celdas.find(
        (item) =>
          item.dataset.userId === target.userId &&
          item.dataset.fecha === target.fecha &&
          item.dataset.hora === target.hora
      );

      if (!celda) {
        attempts += 1;

        if (attempts < 30) {
          timerId = window.setTimeout(buscarYDesplazar, 120);
        }

        return;
      }

      pendingScrollIncidentRef.current = null;

      const targetKey = String(celda.dataset.prenominaCell ?? "");

      celda.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      setHighlightedCell(targetKey);

      window.setTimeout(() => {
        setHighlightedCell((current) =>
          current === targetKey ? null : current
        );
      }, 2500);
    };

    timerId = window.setTimeout(buscarYDesplazar, 250);

    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [prenomina.rows, vista]);

  useEffect(() => {
    if (vista !== "prenomina") return;

    const empleadosVisibles =
      prenominaEmpleadosSeleccionados.length === 0
        ? empleados
        : empleados.filter((item) =>
            prenominaEmpleadosSeleccionados.includes(item.codigo)
          );

    const empleadoSigueVisible = empleadosVisibles.some(
      (item) => item.codigo === empleado
    );

    if (!empleadoSigueVisible) {
      setEmpleado(empleadosVisibles[0]?.codigo ?? "");
      return;
    }

    setIncidenciaForm((current) => ({
      ...current,
      user_id: empleado,
    }));
  }, [vista, empleado, empleados, prenominaEmpleadosSeleccionados]);

  const cambiarFechaInicio = (value: string) => {
    setFechaInicio(value);
    setFechaFin(getEndDateFromStart(value));
    setIncidenciaForm((current) => ({ ...current, fecha: value }));
  };

  const cargarSucursales = () => {
    timecoreApi
      .getBranches()
      .then((res) => {
        const data = res.data ?? [];

        const nombres: string[] = data
          .filter((b: any) => b.is_active ?? b.activo ?? true)
          .map((b: any) => String(b.name ?? b.nombre ?? ""))
          .filter((name: string) => name.trim() !== "");

        setSucursales(nombres);
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
        setSucursales([]);
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

        const empleadosApi: EmpleadoFront[] = listaUsuarios.map((u: any) => {
          const codigo = getEmpleadoCodigo(u);

          return {
            id: Number(u.uid ?? u.id ?? 0),
            codigo,
            nombre: String(u.name ?? u.nombre ?? "Sin nombre"),
            area: String(u.area ?? u.department ?? u.departamento ?? ""),
            sucursal: String(u.sucursal ?? u.branch_name ?? "Sin sucursal"),
            empresa: String(u.empresa ?? u.company ?? ""),
          };
        });

        setEmpleados(empleadosApi);

        return timecoreApi
          .getAsistenciasPaginadas({
            page: attendancePage,
            limit: ATTENDANCE_PAGE_SIZE,
            startDate: fechaInicio || undefined,
            endDate: fechaFin || undefined,
          })
          .then((resAsistencias) => {
          const payload = resAsistencias.data ?? {};
          const registros = payload.items ?? [];
          setAttendanceTotal(Number(payload.total ?? 0));
          setAttendancePages(Number(payload.pages ?? 1));

          const asistenciasApi: AsistenciaFront[] = registros.map(
            (a: any, index: number) => {
              const rawDate = a.timestamp ?? a.punch_time ?? a.time ?? "";
              const codigo = getAsistenciaCodigo(a);

              const empleadoEncontrado = empleadosApi.find(
                (e) => e.codigo === codigo || String(e.id) === codigo
              );

              return {
                id: Number(a.id ?? index + 1),
                codigo,
                area: String(
                  a.area ??
                    a.department ??
                    a.departamento ??
                    empleadoEncontrado?.area ??
                    ""
                ),
                trabajador: String(
                  a.name ??
                    a.user_name ??
                    a.trabajador ??
                    empleadoEncontrado?.nombre ??
                    `Usuario ${codigo}`
                ),
                sucursal: String(
                  a.sucursal ??
                    a.branch_name ??
                    empleadoEncontrado?.sucursal ??
                    "Sin sucursal"
                ),
                fecha: getFechaFromTimestamp(rawDate),
                entrada: getHoraFromTimestamp(rawDate) || "-",
                estado: normalizeEstadoAsistencia(a.status ?? a.estado),
                empresa: String(a.empresa ?? empleadoEncontrado?.empresa ?? ""),
              };
            }
          );

          setAsistencias(asistenciasApi);
        });
      })
      .catch((err) => {
        console.error("Error cargando asistencias:", err);
        setEmpleados([]);
        setAsistencias([]);
        setAttendanceTotal(0);
        setAttendancePages(1);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const cargarPrenomina = () => {
    if (!fechaInicio || !fechaFin) return Promise.resolve();

    // Importante: la prenómina se consulta completa por rango y el filtro de
    // empleados se aplica en el front. Así evitamos perder incidencias cuando
    // el backend recibe un user_id que no coincide exactamente con el código
    // visible del empleado.
    return timecoreApi
      .getPrenomina(fechaInicio, fechaFin)
      .then((res) => {
        setPrenomina(normalizePrenominaData(res.data));
      })
      .catch((err) => {
        console.error("Error cargando prenomina:", err);
        setPrenomina(EMPTY_PRENOMINA);
      });
  };

  const guardarIncidencia = () => {
    const empleadoObjetivo = incidenciaForm.user_id || empleado;

    if (!empleadoObjetivo || !incidenciaForm.fecha || !incidenciaForm.hora) {
      window.alert("Selecciona empleado, fecha y hora.");
      return;
    }

    if (!incidenciaForm.incidencia.trim()) {
      window.alert("Escribe la incidencia.");
      return;
    }

    const debeRegresarACelda = Boolean(incidenciaForm.id);

    if (debeRegresarACelda) {
      pendingScrollIncidentRef.current = {
        userId: empleadoObjetivo,
        fecha: incidenciaForm.fecha,
        hora: incidenciaForm.hora,
      };
    }

    setSavingIncident(true);

    timecoreApi
      .guardarIncidenciaPrenomina({
        user_id: empleadoObjetivo,
        fecha: incidenciaForm.fecha,
        hora: incidenciaForm.hora,
        incidencia: incidenciaForm.incidencia,
      })
      .then(() => {
        setIncidenciaForm((current) => ({
          ...current,
          id: undefined,
          incidencia: "",
        }));

        return cargarPrenomina();
      })
      .catch((err) => {
        pendingScrollIncidentRef.current = null;
        console.error("Error guardando incidencia:", err);
        window.alert(getErrorMessage(err, "No se pudo guardar la incidencia."));
      })
      .finally(() => {
        setSavingIncident(false);
      });
  };

  const seleccionarCeldaPrenomina = (
    row: PrenominaRow,
    day: PrenominaDay
  ) => {
    const incident = row.incidents[day.date];

    const incidentUserId = String(incident?.user_id ?? row.codigo);

    const owner =
      empleados.find((item) => item.codigo === incidentUserId) ??
      empleados.find((item) => item.codigo === row.codigo) ??
      empleados.find(
        (item) =>
          item.nombre.trim().toLowerCase() ===
          row.trabajador.trim().toLowerCase()
      );

    const ownerCode = owner?.codigo ?? incidentUserId;

    setEmpleado(ownerCode);
    setIncidenciaForm({
      id: incident?.id,
      user_id: ownerCode,
      fecha: day.date,
      hora: row.hora,
      incidencia: incident?.incidencia ?? "",
    });

    window.setTimeout(() => {
      incidenciaFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const limpiarIncidencia = () => {
    setIncidenciaForm((current) => ({
      ...current,
      id: undefined,
      incidencia: "",
      }));
  };

  const borrarIncidencia = (incidentId: number) => {
    const confirmar = window.confirm("¿Seguro que deseas borrar esta incidencia?");

    if (!confirmar) return;

    timecoreApi
      .eliminarIncidenciaPrenomina(incidentId)
      .then(() => {
        limpiarIncidencia();
        cargarPrenomina();
      })
      .catch((err) => {
        console.error("Error eliminando incidencia:", err);
        window.alert(getErrorMessage(err, "No se pudo borrar la incidencia."));
      });
  };

  const filtered = asistencias.filter((a) => {
    const mF =
      (!fechaInicio || a.fecha >= fechaInicio) &&
      (!fechaFin || a.fecha <= fechaFin);
    const mE =
      empleadosSeleccionados.length === 0 ||
      empleadosSeleccionados.includes(a.codigo);
    const mS = !sucursal || a.sucursal === sucursal;

    return mF && mE && mS;
  });

  const prenominaRows = useMemo(() => {
    if (prenominaEmpleadosSeleccionados.length === 0) {
      return prenomina.rows;
    }

    const selectedCodes = new Set(
      prenominaEmpleadosSeleccionados.map((value) => String(value).trim())
    );

    const selectedNames = new Set(
      empleados
        .filter((item) => selectedCodes.has(item.codigo))
        .map((item) => item.nombre.trim().toLowerCase())
    );

    return prenomina.rows.filter((row) => {
      const rowCode = String(row.codigo ?? "").trim();
      const rowName = String(row.trabajador ?? "").trim().toLowerCase();

      if (selectedCodes.has(rowCode)) return true;
      if (selectedNames.has(rowName)) return true;

      return Object.values(row.incidents ?? {}).some((incident) => {
        const incidentUserId = String(incident?.user_id ?? "").trim();
        return selectedCodes.has(incidentUserId);
      });
    });
  }, [prenomina.rows, prenominaEmpleadosSeleccionados, empleados]);

  const empleadosVisiblesPrenomina = useMemo(() => {
    return prenominaEmpleadosSeleccionados.length === 0
      ? empleados
      : empleados.filter((item) =>
          prenominaEmpleadosSeleccionados.includes(item.codigo)
        );
  }, [empleados, prenominaEmpleadosSeleccionados]);

  const empleadoSeleccionado = useMemo(() => {
    return empleados.find((item) => item.codigo === empleado);
  }, [empleados, empleado]);

  const prenominaDays = useMemo(() => {
    return prenomina.days.length > 0
      ? prenomina.days
      : getPrenominaDays(fechaInicio, fechaFin);
  }, [prenomina.days, fechaInicio, fechaFin]);

  const sucursalesEnVista = Array.from(
    new Set(
      filtered
        .map((a) => a.sucursal)
        .filter((value) => value && value !== "Sin sucursal")
    )
  );

  const nombreSucursalTitulo =
    sucursal || (sucursalesEnVista.length === 1 ? sucursalesEnVista[0] : "");

  const totalRegistros =
    vista === "prenomina" ? prenominaRows.length : attendanceTotal;

  return (
    <AppShell
      title={`Asistencias de ${nombreSucursalTitulo ? ` ${nombreSucursalTitulo}` : ""}`}
      subtitle={
        loading
          ? "Cargando registros..."
          : vista === "prenomina"
            ? `${totalRegistros} filas de prenómina generadas`
            : `${totalRegistros} registros capturados por los relojes biométricos`
      }
    >
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 md:p-5 border-b border-border">
          <div className="mb-4 inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setVista("asistencias")}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                vista === "asistencias"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Asistencias
            </button>
            <button
              type="button"
              onClick={() => setVista("prenomina")}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                vista === "prenomina"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Prenómina
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
            <Filter className="h-4 w-4 text-primary" />
            Filtros
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Desde fecha
              </label>
              <SpanishDatePicker
                value={fechaInicio}
                onChange={cambiarFechaInicio}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Hasta fecha
              </label>
              <SpanishDatePicker value={fechaFin} onChange={setFechaFin} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Empleado</label>
              {vista === "asistencias" ? (
                <EmployeeMultiSelect
                  empleados={empleados}
                  selected={empleadosSeleccionados}
                  onChange={setEmpleadosSeleccionados}
                />
              ) : (
                <EmployeeMultiSelect
                  empleados={empleados}
                  selected={prenominaEmpleadosSeleccionados}
                  onChange={setPrenominaEmpleadosSeleccionados}
                />
              )}
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    vista === "prenomina"
                      ? getExcelPrenominaUrl(fechaInicio, fechaFin, {
                          userIds: prenominaEmpleadosSeleccionados,
                        })
                      : getExcelAsistenciasUrl({
                          startDate: fechaInicio,
                          endDate: fechaFin,
                          userIds: empleadosSeleccionados,
                        });           
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
            </div>
          </div>

          {vista === "prenomina" && empleadosVisiblesPrenomina.length > 0 && (
            <div ref={incidenciaFormRef} className="mt-5 rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-3 text-sm font-semibold text-foreground">
                {incidenciaForm.id ? "Editar incidencia" : "Agregar incidencia"}
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                {empleadosVisiblesPrenomina.length === 1 ? (
                  <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                    {empleadoSeleccionado?.nombre ?? "Empleado seleccionado"}
                  </div>
                ) : (
                  <select
                    value={empleado}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmpleado(value);
                      setIncidenciaForm((current) => ({
                        ...current,
                        user_id: value,
                      }));
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {empleadosVisiblesPrenomina.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={incidenciaForm.fecha}
                  onChange={(e) =>
                    setIncidenciaForm((current) => ({
                      ...current,
                      fecha: e.target.value,
                    }))
                  }
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {prenominaDays.map((day) => (
                    <option key={day.date} value={day.date}>
                      {day.label}
                    </option>
                  ))}
                </select>


                <input
                  value={incidenciaForm.incidencia}
                  onChange={(e) =>
                    setIncidenciaForm((current) => ({
                      ...current,
                      incidencia: e.target.value,
                    }))
                  }
                  placeholder="Incidencia obligatoria. Ej. VACACIONES"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />


                <button
                  type="button"
                  disabled={savingIncident}
                  onClick={guardarIncidencia}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {savingIncident
                    ? "Guardando..."
                    : incidenciaForm.id
                      ? "Actualizar"
                      : "Guardar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {vista === "asistencias" ? (
          <TablaAsistencias
            loading={loading}
            registros={filtered}
            page={attendancePage}
            pages={attendancePages}
            total={attendanceTotal}
            onPageChange={setAttendancePage}
          />
        ) : (
          <TablaPrenomina
            days={prenominaDays}
            rows={prenominaRows}
            hasSelectedEmployee={empleadosVisiblesPrenomina.length > 0}
            onSelectCell={seleccionarCeldaPrenomina}
            onDeleteIncident={borrarIncidencia}
            highlightedCell={highlightedCell}
          />
        )}
      </div>
    </AppShell>
  );
}

function TablaAsistencias({
  loading,
  registros,
  page,
  pages,
  total,
  onPageChange,
}: {
  loading: boolean;
  registros: AsistenciaFront[];
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-semibold px-5 py-3">Área</th>
            <th className="text-left font-semibold px-5 py-3">Empleado</th>
            <th className="text-left font-semibold px-5 py-3">Sucursal</th>
            <th className="text-left font-semibold px-5 py-3">Fecha</th>
            <th className="text-left font-semibold px-5 py-3">Entrada</th>
            <th className="text-left font-semibold px-5 py-3">Estado</th>
            <th className="text-left font-semibold px-5 py-3">Empresa</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {registros.map((a) => (
            <tr key={a.id} className="hover:bg-muted/40 transition-colors">
              <td className="px-5 py-3 text-foreground">{a.area}</td>
              <td className="px-5 py-3 font-medium text-foreground">
                {a.trabajador}
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
                    a.estado === "Asistió" ||
                    a.estado === "A tiempo" ||
                    a.estado === "check_in"
                      ? "bg-success/10 text-success"
                      : a.estado === "Retardo"
                        ? "bg-warning/20 text-warning-foreground"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {a.estado}
                </span>
              </td>
              <td className="px-5 py-3 text-muted-foreground">{a.empresa}</td>
            </tr>
          ))}

          {registros.length === 0 && (
            <tr>
              <td
                colSpan={7}
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

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Página {page} de {pages} • {total} registros
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => onPageChange(Math.min(pages, page + 1))}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeMultiSelect({
  empleados,
  selected,
  onChange,
}: {
  empleados: EmpleadoFront[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const selectedSet = new Set(selected);
  const label =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
        ? empleados.find((empleado) => empleado.codigo === selected[0])?.nombre ??
          selected[0]
        : `${selected.length} empleados seleccionados`;

  const toggleEmployee = (codigo: string) => {
    const normalizedCodigo = String(codigo).trim();

    if (selectedSet.has(normalizedCodigo)) {
      onChange(selected.filter((value) => value !== normalizedCodigo));
      return;
    }

    onChange([...selected, normalizedCodigo]);
  };

  return (
    <details className="relative">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="text-xs text-muted-foreground">v</span>
      </summary>

      <div className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-card p-2 text-sm shadow-lg">
        <div className="mb-2 flex gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Limpiar
          </button>
        </div>

        <div className="space-y-1">
          {empleados.map((empleado) => (
            <label
              key={empleado.codigo}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(empleado.codigo)}
                onChange={() => toggleEmployee(empleado.codigo)}
                className="h-4 w-4"
              />
              <span className="truncate">{empleado.nombre}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function TablaPrenomina({
  days,
  rows,
  hasSelectedEmployee,
  onSelectCell,
  onDeleteIncident,
  highlightedCell,
}: {
  days: PrenominaDay[];
  rows: PrenominaRow[];
  hasSelectedEmployee: boolean;
  onSelectCell: (row: PrenominaRow, day: PrenominaDay) => void;
  onDeleteIncident: (incidentId: number) => void;
  highlightedCell: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/70 text-muted-foreground uppercase tracking-wider">
            <th className="border border-border px-3 py-2 text-left font-semibold">
              Área
            </th>
            <th className="border border-border px-3 py-2 text-left font-semibold">
              Trabajador
            </th>
            {days.map((day) => (
              <th
                key={day.date}
                className="border border-border px-3 py-2 text-center font-semibold"
              >
                {day.label}
              </th>
            ))}
            <th className="border border-border px-3 py-2 text-left font-semibold">
              Empresa
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const sameAsPrev =
              rowIndex > 0 && rows[rowIndex - 1].codigo === row.codigo;
            return (
            <tr
              key={`${row.codigo}-${row.hora}-${rowIndex}`}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="border border-border px-3 py-2">
                {sameAsPrev ? "" : row.area}
              </td>
              <td className="border border-border px-3 py-2 font-medium">
                {sameAsPrev ? "" : row.trabajador}
              </td>
              {days.map((day) => {
                const value = row.cells[day.date] ?? "";
                const incident = row.incidents[day.date];
                const hasIncident = Boolean(incident);
                const cellKey = getPrenominaCellKey(
                  row.codigo,
                  row.hora,
                  day.date
                );
                const isHighlighted = highlightedCell === cellKey;

                return (
                  <td
                    key={day.date}
                    data-prenomina-incidencia="true"
                    data-user-id={String(incident?.user_id ?? row.codigo)}
                    data-fecha={day.date}
                    data-hora={row.hora}
                    data-prenomina-cell={cellKey}
                    className={`relative border border-border p-0 transition-all duration-500 ${
                      hasIncident ? "bg-sky-100" : ""
                    } ${
                      isHighlighted
                        ? "z-10 ring-4 ring-primary ring-inset bg-primary/20"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onDoubleClick={() => onSelectCell(row, day)}
                      className={`min-h-9 w-full px-2 py-1 text-center text-[11px] hover:bg-primary/10 ${
                        hasIncident ? "pr-7 font-semibold" : ""
                      }`}
                      title={
                        hasIncident
                          ? "Doble click para editar esta incidencia"
                          : "Doble click para cargar esta celda en incidencia"
                      }
                    >
                      {value}
                    </button>

                    {incident && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteIncident(incident.id);
                        }}
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        title="Borrar incidencia"
                        aria-label="Borrar incidencia"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                );
              })}
              <td className="border border-border px-3 py-2">{row.empresa}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={days.length + 3}
                className="border border-border px-5 py-10 text-center text-muted-foreground"
              >
                {hasSelectedEmployee
                  ? "Sin datos de prenómina para el rango seleccionado."
                  : "Selecciona un empleado para generar su prenómina."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SpanishDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const selected = parseLocalDate(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitTypedDate = () => {
    const parsed = parseTypedDate(draft);

    if (!parsed) {
      setDraft(value);
      return;
    }

    onChange(toDateInputValue(parsed));
  };

  return (
    <div className="flex w-full overflow-hidden rounded-md border border-input bg-background">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitTypedDate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="YYYY-MM-DD"
        title={formatSpanishDate(value)}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex w-10 items-center justify-center border-l border-input text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            locale={es}
            weekStartsOn={1}
            onSelect={(date) => {
              if (!date) return;

              onChange(toDateInputValue(date));
              setOpen(false);
            }}
            formatters={{
              formatCaption: (date) =>
                new Intl.DateTimeFormat("es-MX", {
                  month: "long",
                  year: "numeric",
                }).format(date),
              formatWeekdayName: (date) =>
                new Intl.DateTimeFormat("es-MX", {
                  weekday: "short",
                }).format(date),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}