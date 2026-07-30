import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getExcelAsistenciasUrl,
  getExcelPrenominaUrl,
  timecoreApi,
} from "@/lib/api/timecore";
import { CalendarIcon, Download, Filter, Pencil, Plus, Save, Trash2 } from "lucide-react";
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
  device_id: number | null;
  assignment_key: string;
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
  device_id: number | null;
  assignment_key: string;
};

type PrenominaDay = {
  date: string;
  label: string;
};

type PrenominaIncident = {
  id: number;
  device_id: number | null;
  assignment_key: string;
  user_id: string;
  fecha: string;
  hora: string;
  incidencia: string;
  descripcion?: string;
  color: string;
  source_fecha?: string;
  source_hora?: string;
  moved_attendance?: string;
};

type PrenominaRow = {
  area: string;
  sucursal: string;
  trabajador: string;
  codigo: string;
  device_id: number | null;
  assignment_key: string;
  hora: string;
  empresa: string;
  cells: Record<string, string>;
  incidents: Record<string, PrenominaIncident[]>;
};

type PrenominaData = {
  days: PrenominaDay[];
  hours: string[];
  rows: PrenominaRow[];
};

type IncidenciaForm = {
  id?: number;
  assignment_key: string;
  device_id: number | null;
  user_id: string;
  fecha: string;
  hora: string;
  incidencia: string;
  color: string;
  original_assignment_key?: string;
  original_fecha?: string;
  original_hora?: string;
};

const EMPTY_PRENOMINA: PrenominaData = {
  days: [],
  hours: [],
  rows: [],
};

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

function normalizeHexColor(value: string) {
  const raw = String(value ?? "").trim().toUpperCase();

  if (/^#[0-9A-F]{6}$/.test(raw)) {
    return raw;
  }

  return "#BAE6FD";
}

function hexToHsv(hex: string): HsvColor {
  const normalized = normalizeHexColor(hex);
  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex({ h, s, v }: HsvColor) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const toHex = (channel: number) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function makeAssignmentKey(
  deviceId: number | null | undefined,
  userId: string | number | null | undefined
) {
  return `${deviceId ?? 0}:${String(userId ?? "").trim()}`;
}

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
          row.UID ??
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

      const deviceId =
        row.device_id !== undefined && row.device_id !== null
          ? Number(row.device_id)
          : null;
      const assignmentKey = String(
        row.assignment_key ?? makeAssignmentKey(deviceId, codigo)
      );

      const incidentsSource = row.incidents ?? row.incidencias ?? {};
      const incidents: Record<string, PrenominaIncident[]> = {};

      Object.entries(incidentsSource).forEach(([fecha, value]: [string, any]) => {
        const rawIncidents = Array.isArray(value) ? value : [value];

        const normalizedIncidents = rawIncidents
          .filter(Boolean)
          .map((incidentValue: any): PrenominaIncident => {
            const incidentDeviceId =
              incidentValue.device_id !== undefined &&
              incidentValue.device_id !== null
                ? Number(incidentValue.device_id)
                : deviceId;
            const incidentUserId = String(
              incidentValue.user_id ?? codigo ?? trabajador
            );

            return {
              id: Number(incidentValue.id ?? 0),
              device_id: incidentDeviceId,
              assignment_key: String(
                incidentValue.assignment_key ??
                  makeAssignmentKey(incidentDeviceId, incidentUserId)
              ),
              user_id: incidentUserId,
              fecha: String(incidentValue.fecha ?? fecha),
              hora: String(incidentValue.hora ?? row.hora ?? ""),
              incidencia: String(
                incidentValue.incidencia ?? incidentValue.type ?? ""
              ),
              descripcion: incidentValue.descripcion,
              color: normalizeHexColor(
                String(incidentValue.color ?? "#BAE6FD")
              ),
              source_fecha: incidentValue.source_fecha
                ? String(incidentValue.source_fecha)
                : undefined,
              source_hora: incidentValue.source_hora
                ? String(incidentValue.source_hora)
                : undefined,
              moved_attendance: incidentValue.moved_attendance
                ? String(incidentValue.moved_attendance)
                : undefined,
            };
          })
          .sort((a, b) => {
            const byHour = a.hora.localeCompare(b.hora);
            return byHour !== 0 ? byHour : a.id - b.id;
          });

        if (normalizedIncidents.length > 0) {
          incidents[fecha] = normalizedIncidents;
        }
      });

      return {
        area: String(row.area ?? row.department ?? row.departamento ?? ""),
        sucursal: String(
          row.sucursal ??
            row.branch_name ??
            row.nombre_sucursal ??
            row.branch?.name ??
            ""
        ),
        trabajador: trabajador || codigo || `Empleado ${index + 1}`,
        codigo: codigo || trabajador || `empleado-${index + 1}`,
        device_id: deviceId,
        assignment_key: assignmentKey,
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

function getMaxEndDateFromStart(startDate: string) {
  const date = parseLocalDate(startDate);

  if (!date) {
    return getDefaultEndDate();
  }

  // Máximo 62 días incluyendo la fecha inicial:
  // primera página 31 días y segunda página otros 31 días.
  return toDateInputValue(addDays(date, 61));
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

function formatCompactDate(value: string) {
  const date = parseLocalDate(value);

  if (!date) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
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


function getPrenominaCellKey(
  assignmentKey: string,
  hora: string,
  fecha: string
) {
  return `${assignmentKey}__${hora}__${fecha}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
}

function getDefaultIncidenciaForm(): IncidenciaForm {
  return {
    id: undefined,
    assignment_key: "",
    device_id: null,
    user_id: "",
    fecha: getDefaultStartDate(),
    hora: "06:00",
    incidencia: "",
    color: "#BAE6FD",
    original_assignment_key: undefined,
    original_fecha: undefined,
    original_hora: undefined,
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
  const [prenominaPage, setPrenominaPage] = useState(1);
  const ATTENDANCE_PAGE_SIZE = 50;
  const PRENOMINA_DAYS_PER_PAGE = 31;
  const incidenciaFormRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollIncidentRef = useRef<{
    assignmentKey: string;
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
    setPrenominaPage(1);
  }, [
    fechaInicio,
    fechaFin,
    prenominaEmpleadosSeleccionados,
  ]);

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
          item.dataset.assignmentKey === target.assignmentKey &&
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
            prenominaEmpleadosSeleccionados.includes(item.assignment_key)
          );

    const empleadoSigueVisible = empleadosVisibles.some(
      (item) => item.assignment_key === empleado
    );

    const selectedEmployee = empleadoSigueVisible
      ? empleadosVisibles.find((item) => item.assignment_key === empleado)
      : empleadosVisibles[0];

    if (!selectedEmployee) {
      setEmpleado("");
      setIncidenciaForm((current) => ({
        ...current,
        assignment_key: "",
        device_id: null,
        user_id: "",
      }));
      return;
    }

    if (!empleadoSigueVisible) {
      setEmpleado(selectedEmployee.assignment_key);
    }

    setIncidenciaForm((current) => ({
      ...current,
      assignment_key: selectedEmployee.assignment_key,
      device_id: selectedEmployee.device_id,
      user_id: selectedEmployee.codigo,
    }));
  }, [vista, empleado, empleados, prenominaEmpleadosSeleccionados]);

  const cambiarFechaInicio = (value: string) => {
    setFechaInicio(value);

    const currentEnd = parseLocalDate(fechaFin);
    const nextStart = parseLocalDate(value);
    const maxEnd = parseLocalDate(getMaxEndDateFromStart(value));

    if (
      !currentEnd ||
      !nextStart ||
      !maxEnd ||
      currentEnd < nextStart ||
      currentEnd > maxEnd
    ) {
      setFechaFin(getEndDateFromStart(value));
    }

    setIncidenciaForm((current) => ({ ...current, fecha: value }));
  };

  const cambiarFechaFin = (value: string) => {
    const start = parseLocalDate(fechaInicio);
    const end = parseLocalDate(value);
    const maxEnd = parseLocalDate(getMaxEndDateFromStart(fechaInicio));

    if (!start || !end || !maxEnd) {
      setFechaFin(value);
      return;
    }

    if (end < start) {
      window.alert("La fecha final no puede ser anterior a la fecha inicial.");
      setFechaFin(fechaInicio);
      return;
    }

    if (end > maxEnd) {
      window.alert("La prenómina permite consultar un máximo de 2 meses o 62 días.");
      setFechaFin(getMaxEndDateFromStart(fechaInicio));
      return;
    }

    setFechaFin(value);
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
            id: Number(u.id ?? 0),
            codigo,
            nombre: String(u.name ?? u.nombre ?? "Sin nombre"),
            area: String(u.area ?? u.department ?? u.departamento ?? ""),
            sucursal: String(u.sucursal ?? u.branch_name ?? "Sin sucursal"),
            empresa: String(u.empresa ?? u.company ?? ""),
            device_id:
              u.device_id !== undefined && u.device_id !== null
                ? Number(u.device_id)
                : null,
            assignment_key: makeAssignmentKey(
              u.device_id !== undefined && u.device_id !== null
                ? Number(u.device_id)
                : null,
              codigo
            ),
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

              const attendanceDeviceId =
                a.device_id !== undefined && a.device_id !== null
                  ? Number(a.device_id)
                  : null;

              /*
               * La UID sólo es única dentro de un reloj. Por eso una
               * asistencia debe relacionarse con el empleado mediante:
               *
               *   device_id + uid/user_id
               *
               * Esto evita que una marca del reloj SELEFF tome el área y la
               * empresa de otro empleado con la misma UID en el reloj FISMAN.
               */
              const empleadoEncontrado =
                empleadosApi.find(
                  (e) =>
                    e.device_id === attendanceDeviceId &&
                    e.codigo === codigo
                ) ??
                (attendanceDeviceId === null
                  ? empleadosApi.find((e) => e.codigo === codigo)
                  : undefined);

              return {
                id: Number(a.id ?? index + 1),
                codigo,
                device_id: attendanceDeviceId,
                assignment_key: makeAssignmentKey(
                  attendanceDeviceId,
                  codigo
                ),
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
                empresa: String(
                  a.empresa ??
                    a.device_empresa ??
                    empleadoEncontrado?.empresa ??
                    ""
                ),
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

  const guardarIncidencia = async () => {
    const assignmentKey =
      incidenciaForm.assignment_key || empleado;
    const empleadoObjetivo = empleados.find(
      (item) => item.assignment_key === assignmentKey
    );

    if (
      !empleadoObjetivo ||
      empleadoObjetivo.device_id === null ||
      !incidenciaForm.fecha ||
      !incidenciaForm.hora
    ) {
      window.alert("Selecciona empleado, reloj, fecha y hora.");
      return;
    }

    if (!incidenciaForm.incidencia.trim()) {
      window.alert("Escribe la incidencia.");
      return;
    }

    if (!/^#[0-9A-F]{6}$/i.test(incidenciaForm.color)) {
      window.alert("Escribe un color hexadecimal válido. Ejemplo: #BAE6FD.");
      return;
    }

    pendingScrollIncidentRef.current = {
      assignmentKey: empleadoObjetivo.assignment_key,
      fecha: incidenciaForm.fecha,
      hora: incidenciaForm.hora,
    };

    setSavingIncident(true);

    try {
      /*
       * Cuando existe id se actualiza únicamente esa incidencia. Cuando no
       * existe id se crea una nueva, aunque ya haya otras el mismo día y hora.
       */
      await timecoreApi.guardarIncidenciaPrenomina({
        id: incidenciaForm.id,
        device_id: empleadoObjetivo.device_id,
        user_id: empleadoObjetivo.codigo,
        fecha: incidenciaForm.fecha,
        hora: incidenciaForm.hora,
        incidencia: incidenciaForm.incidencia,
        color: incidenciaForm.color,
      });

      setIncidenciaForm((current) => ({
        ...current,
        id: undefined,
        assignment_key: empleadoObjetivo.assignment_key,
        device_id: empleadoObjetivo.device_id,
        user_id: empleadoObjetivo.codigo,
        incidencia: "",
        color: "#BAE6FD",
        original_assignment_key: undefined,
        original_fecha: undefined,
        original_hora: undefined,
      }));

      await cargarPrenomina();
    } catch (err) {
      pendingScrollIncidentRef.current = null;
      console.error("Error guardando incidencia:", err);
      window.alert(getErrorMessage(err, "No se pudo guardar la incidencia."));
    } finally {
      setSavingIncident(false);
    }
  };

  const obtenerEmpleadoDeFila = (
    row: PrenominaRow,
    incident?: PrenominaIncident
  ) => {
    const assignmentKey = incident?.assignment_key || row.assignment_key;

    return (
      empleados.find(
        (item) => item.assignment_key === assignmentKey
      ) ??
      empleados.find(
        (item) =>
          item.device_id === row.device_id &&
          item.codigo === row.codigo
      )
    );
  };

  const desplazarAFormularioIncidencia = () => {
    window.setTimeout(() => {
      incidenciaFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const prepararNuevaIncidencia = (
    row: PrenominaRow,
    day: PrenominaDay
  ) => {
    const owner = obtenerEmpleadoDeFila(row);

    if (!owner) {
      window.alert(
        "No se pudo identificar la asignación del empleado en ese reloj."
      );
      return;
    }

    setEmpleado(owner.assignment_key);
    setIncidenciaForm({
      id: undefined,
      assignment_key: owner.assignment_key,
      device_id: owner.device_id,
      user_id: owner.codigo,
      fecha: day.date,
      hora: row.hora || "06:00",
      incidencia: "",
      color: "#BAE6FD",
      original_assignment_key: undefined,
      original_fecha: undefined,
      original_hora: undefined,
    });

    desplazarAFormularioIncidencia();
  };

  const editarIncidencia = (
    row: PrenominaRow,
    day: PrenominaDay,
    incident: PrenominaIncident
  ) => {
    const owner = obtenerEmpleadoDeFila(row, incident);

    if (!owner) {
      window.alert(
        "No se pudo identificar la asignación del empleado en ese reloj."
      );
      return;
    }

    setEmpleado(owner.assignment_key);
    setIncidenciaForm({
      id: incident.id,
      assignment_key: owner.assignment_key,
      device_id: owner.device_id,
      user_id: owner.codigo,
      fecha: day.date,
      hora: incident.hora || row.hora || "06:00",
      incidencia: incident.incidencia,
      color: incident.color || "#BAE6FD",
      original_assignment_key: incident.assignment_key,
      original_fecha: incident.fecha,
      original_hora: incident.hora,
    });

    desplazarAFormularioIncidencia();
  };

  const limpiarIncidencia = () => {
    setIncidenciaForm((current) => ({
      ...current,
      id: undefined,
      incidencia: "",
      color: "#BAE6FD",
      original_assignment_key: undefined,
      original_fecha: undefined,
      original_hora: undefined,
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
      empleadosSeleccionados.includes(a.assignment_key);
    const mS = !sucursal || a.sucursal === sucursal;

    return mF && mE && mS;
  });

  const prenominaRows = useMemo(() => {
    const selectedAssignments = new Set(
      prenominaEmpleadosSeleccionados.map((value) =>
        String(value).trim()
      )
    );

    const rowsFiltradas = prenomina.rows.filter((row) => {
      if (selectedAssignments.size === 0) {
        return true;
      }

      if (selectedAssignments.has(row.assignment_key)) {
        return true;
      }

      return Object.values(row.incidents ?? {}).some(
        (incidentList) =>
          incidentList.some((incident) =>
            selectedAssignments.has(incident.assignment_key)
          )
      );
    });

    const empleadosAgrupados = new Map<string, PrenominaRow>();

    rowsFiltradas.forEach((row) => {
      /*
       * La identidad real es reloj + código. Empresa o nombre pueden
       * coincidir, pero jamás se deben mezclar asignaciones distintas.
       */
      const employeeKey = row.assignment_key;
      const empleadoRelacionado =
        empleados.find(
          (item) => item.assignment_key === row.assignment_key
        ) ??
        empleados.find(
          (item) =>
            item.device_id === row.device_id &&
            item.codigo === row.codigo
        );

      const areaFila = row.area || empleadoRelacionado?.area || "";
      const sucursalFila =
        row.sucursal || empleadoRelacionado?.sucursal || "Sin sucursal";
      const empresaFila =
        row.empresa || empleadoRelacionado?.empresa || "";

      const existente = empleadosAgrupados.get(employeeKey);

      if (!existente) {
        empleadosAgrupados.set(employeeKey, {
          area: areaFila,
          sucursal: sucursalFila,
          trabajador:
            row.trabajador || empleadoRelacionado?.nombre || row.codigo,
          codigo: row.codigo,
          device_id: row.device_id,
          assignment_key: row.assignment_key,
          hora: row.hora || "06:00",
          empresa: empresaFila,
          cells: { ...row.cells },
          incidents: Object.fromEntries(
            Object.entries(row.incidents).map(([fecha, incidentList]) => [
              fecha,
              [...incidentList],
            ])
          ),
        });

        return;
      }

      Object.entries(row.cells ?? {}).forEach(([fecha, value]) => {
        const nuevoValor = String(value ?? "").trim();

        if (!nuevoValor) return;

        const valorActual = String(
          existente.cells[fecha] ?? ""
        ).trim();

        if (!valorActual) {
          existente.cells[fecha] = nuevoValor;
          return;
        }

        const valoresActuales = valorActual
          .split(" | ")
          .map((item) => item.trim())
          .filter(Boolean);
        const valoresNuevos = nuevoValor
          .split(" | ")
          .map((item) => item.trim())
          .filter(Boolean);

        const combinados = Array.from(
          new Set([...valoresActuales, ...valoresNuevos])
        );

        existente.cells[fecha] = combinados.join(" | ");
      });

      Object.entries(row.incidents ?? {}).forEach(
        ([fecha, incidentList]) => {
          const currentList = existente.incidents[fecha] ?? [];
          const incidentsByKey = new Map<string, PrenominaIncident>();

          [...currentList, ...incidentList].forEach((incident) => {
            const incidentKey = incident.id
              ? `id:${incident.id}`
              : [
                  incident.assignment_key,
                  incident.fecha,
                  incident.hora,
                  incident.incidencia,
                ].join("|");

            incidentsByKey.set(incidentKey, incident);
          });

          existente.incidents[fecha] = Array.from(
            incidentsByKey.values()
          ).sort((a, b) => {
            const byHour = a.hora.localeCompare(b.hora);
            return byHour !== 0 ? byHour : a.id - b.id;
          });
        }
      );

      if (!existente.area && areaFila) {
        existente.area = areaFila;
      }

      if (
        (!existente.sucursal || existente.sucursal === "Sin sucursal") &&
        sucursalFila
      ) {
        existente.sucursal = sucursalFila;
      }

      if (!existente.empresa && empresaFila) {
        existente.empresa = empresaFila;
      }

      if (!existente.hora && row.hora) {
        existente.hora = row.hora;
      }
    });

    return Array.from(empleadosAgrupados.values()).sort(
      (a, b) => {
        const byName = a.trabajador.localeCompare(
          b.trabajador,
          "es",
          { sensitivity: "base" }
        );

        if (byName !== 0) return byName;

        return a.empresa.localeCompare(b.empresa, "es", {
          sensitivity: "base",
        });
      }
    );
  }, [
    prenomina.rows,
    prenominaEmpleadosSeleccionados,
    empleados,
  ]);

  const empleadosVisiblesPrenomina = useMemo(() => {
    return prenominaEmpleadosSeleccionados.length === 0
      ? empleados
      : empleados.filter((item) =>
          prenominaEmpleadosSeleccionados.includes(
            item.assignment_key
          )
        );
  }, [empleados, prenominaEmpleadosSeleccionados]);

  const empleadoSeleccionado = useMemo(() => {
    return empleados.find(
      (item) => item.assignment_key === empleado
    );
  }, [empleados, empleado]);

  const prenominaDays = useMemo(() => {
    return prenomina.days.length > 0
      ? prenomina.days
      : getPrenominaDays(fechaInicio, fechaFin);
  }, [prenomina.days, fechaInicio, fechaFin]);

  const prenominaTotalPages = Math.max(
    1,
    Math.ceil(prenominaDays.length / PRENOMINA_DAYS_PER_PAGE)
  );

  const prenominaDaysPaginados = useMemo(() => {
    const start = (prenominaPage - 1) * PRENOMINA_DAYS_PER_PAGE;
    return prenominaDays.slice(start, start + PRENOMINA_DAYS_PER_PAGE);
  }, [prenominaDays, prenominaPage]);

  useEffect(() => {
    if (prenominaPage > prenominaTotalPages) {
      setPrenominaPage(prenominaTotalPages);
    }
  }, [prenominaPage, prenominaTotalPages]);

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
              <SpanishDatePicker value={fechaFin} onChange={cambiarFechaFin} />
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                {empleadosVisiblesPrenomina.length === 1 ? (
                  <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                    {empleadoSeleccionado
                      ? `${empleadoSeleccionado.nombre}${
                          empleadoSeleccionado.empresa
                            ? ` — ${empleadoSeleccionado.empresa}`
                            : ""
                        }`
                      : "Empleado seleccionado"}
                  </div>
                ) : (
                  <select
                    value={empleado}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selectedEmployee =
                        empleadosVisiblesPrenomina.find(
                          (item) => item.assignment_key === value
                        );

                      setEmpleado(value);
                      setIncidenciaForm((current) => ({
                        ...current,
                        assignment_key: value,
                        device_id: selectedEmployee?.device_id ?? null,
                        user_id: selectedEmployee?.codigo ?? "",
                      }));
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {empleadosVisiblesPrenomina.map((item) => (
                      <option
                        key={item.assignment_key}
                        value={item.assignment_key}
                      >
                        {item.nombre}
                        {item.empresa ? ` — ${item.empresa}` : ""}
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
                  placeholder="Incidencia obligatoria."
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />


                <HexColorPicker
                  value={incidenciaForm.color}
                  onChange={(color) =>
                    setIncidenciaForm((current) => ({
                      ...current,
                      color,
                    }))
                  }
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
            days={prenominaDaysPaginados}
            rows={prenominaRows}
            hasSelectedEmployee={empleadosVisiblesPrenomina.length > 0}
            page={prenominaPage}
            pages={prenominaTotalPages}
            total={prenominaDays.length}
            onPageChange={setPrenominaPage}
            onAddIncident={prepararNuevaIncidencia}
            onEditIncident={editarIncidencia}
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
            <th className="text-left font-semibold px-5 py-3">Empresa</th>
            <th className="text-left font-semibold px-5 py-3">Sucursal</th>
            <th className="text-left font-semibold px-5 py-3">Área</th>
            <th className="text-left font-semibold px-5 py-3">Empleado</th>
            <th className="text-left font-semibold px-5 py-3">Fecha</th>
            <th className="text-left font-semibold px-5 py-3">Entrada</th>
            <th className="text-left font-semibold px-5 py-3">Estado</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {registros.map((a) => (
            <tr key={a.id} className="hover:bg-muted/40 transition-colors">

              <td className="px-5 py-3 text-muted-foreground">{a.empresa}</td>

              <td className="px-5 py-3 text-foreground">{a.sucursal}</td>

              <td className="px-5 py-3 text-foreground">{a.area}</td>
              
              <td className="px-5 py-3 font-medium text-foreground">
                {a.trabajador}
                
              </td>
              
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
  const selectedEmployee =
    selected.length === 1
      ? empleados.find(
          (empleado) =>
            empleado.assignment_key === selected[0]
        )
      : undefined;

  const label =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
        ? selectedEmployee
          ? `${selectedEmployee.nombre}${
              selectedEmployee.empresa
                ? ` — ${selectedEmployee.empresa}`
                : ""
            }`
          : selected[0]
        : `${selected.length} empleados seleccionados`;

  const toggleEmployee = (assignmentKey: string) => {
    if (selectedSet.has(assignmentKey)) {
      onChange(
        selected.filter((value) => value !== assignmentKey)
      );
      return;
    }

    onChange([...selected, assignmentKey]);
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
              key={empleado.assignment_key}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(
                  empleado.assignment_key
                )}
                onChange={() =>
                  toggleEmployee(empleado.assignment_key)
                }
                className="h-4 w-4"
              />
              <span className="truncate">
                {empleado.nombre}
                {empleado.empresa
                  ? ` — ${empleado.empresa}`
                  : ""}
              </span>
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
  onAddIncident,
  onEditIncident,
  onDeleteIncident,
  highlightedCell,
  page,
  pages,
  total,
  onPageChange,
}: {
  days: PrenominaDay[];
  rows: PrenominaRow[];
  hasSelectedEmployee: boolean;
  onAddIncident: (row: PrenominaRow, day: PrenominaDay) => void;
  onEditIncident: (
    row: PrenominaRow,
    day: PrenominaDay,
    incident: PrenominaIncident
  ) => void;
  onDeleteIncident: (incidentId: number) => void;
  highlightedCell: string | null;
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-xs">
        <thead>
          <tr className="bg-muted/70 text-muted-foreground uppercase tracking-wider">
            <th className="border border-border px-3 py-2 text-left font-semibold">
              Empresa
            </th>
             <th className="border border-border px-3 py-2 text-left font-semibold">
              Sucursal
            </th>
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
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const previousRow = rowIndex > 0 ? rows[rowIndex - 1] : undefined;

            const sameAsPrev =
              Boolean(previousRow) &&
              previousRow?.assignment_key === row.assignment_key;

            return (
            <tr
              key={`${row.assignment_key}-${row.hora}-${rowIndex}`}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="border border-border px-3 py-2">
                {sameAsPrev ? "" : row.empresa}
              </td>
              <td className="border border-border px-3 py-2">
                {sameAsPrev ? "" : row.sucursal}
              </td>
              <td className="border border-border px-3 py-2">
                {sameAsPrev ? "" : row.area}
              </td>
              <td className="border border-border px-3 py-2 font-medium">
                {sameAsPrev ? "" : row.trabajador}
              </td>
              {days.map((day) => {
                const value = row.cells[day.date] ?? "";
                const incidents = row.incidents[day.date] ?? [];
                const hasIncident = incidents.length > 0;
                const cleanValue = String(value ?? "").trim();

                const dateTimeLines = Array.from(
                  new Set(
                    cleanValue.match(
                      /(?:\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+\d{1,2}:\d{2}/g
                    ) ?? []
                  )
                );

                const isEmptyCell = !cleanValue && !hasIncident;
                const cellKey = getPrenominaCellKey(
                  row.assignment_key,
                  row.hora,
                  day.date
                );
                const isHighlighted = highlightedCell === cellKey;

                return (
                  <td
                    key={day.date}
                    data-prenomina-incidencia="true"
                    data-assignment-key={row.assignment_key}
                    data-user-id={String(row.codigo)}
                    data-fecha={day.date}
                    data-hora={row.hora}
                    data-prenomina-cell={cellKey}
                    className={`relative border border-border p-0 transition-all duration-500 ${
                      isHighlighted
                        ? "z-10 ring-4 ring-primary ring-inset"
                        : ""
                    }`}
                    onDoubleClick={(event) => {
                      const target = event.target as HTMLElement;

                      if (target.closest("[data-incident-action]")) {
                        return;
                      }

                      onAddIncident(row, day);
                    }}
                  >
                    <div
                      className={`flex min-h-14 w-full flex-col gap-2 px-2 py-2 text-[11px] ${
                        isEmptyCell
                          ? "italic text-muted-foreground"
                          : "text-foreground"
                      }`}
                      title="Doble click para agregar otra incidencia"
                    >
                      {hasIncident && (
                        <div className="flex w-full flex-col gap-1.5 not-italic">
                          {incidents.map((incident) => (
                            <div
                              key={incident.id}
                              className="group flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 shadow-sm"
                              style={{
                                backgroundColor:
                                  incident.color || "#BAE6FD",
                              }}
                            >
                              <button
                                type="button"
                                data-incident-action="edit"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditIncident(row, day, incident);
                                }}
                                className="flex min-w-0 flex-1 items-center gap-1 text-left font-bold uppercase leading-tight underline-offset-2 hover:underline"
                                title="Editar esta incidencia"
                              >
                                <span className="truncate">
                                  {incident.incidencia || "Incidencia"}
                                </span>
                              </button>

                              <button
                                type="button"
                                data-incident-action="delete"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteIncident(incident.id);
                                }}
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                title="Borrar esta incidencia"
                                aria-label={`Borrar incidencia ${incident.incidencia}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {cleanValue ? (
                        dateTimeLines.length > 0 ? (
                          <ul className="w-full list-disc space-y-1 pl-4 text-left font-normal not-italic text-foreground">
                            {dateTimeLines.map((line, index) => {
                            const [fecha, hora] = line.trim().split(/\s+/);
                            return (
                              <li
                                key={`${line}-${index}`}
                                className="whitespace-normal leading-tight"
                              >
                                <span>{fecha} </span>

                                <span className="font-bold text-blue-600">
                                  {hora}
                                </span>
                              </li>
                            );
                          })}
                          </ul>
                        ) : (
                          <span className="whitespace-pre-line text-left not-italic text-foreground">
                            {cleanValue}
                          </span>
                        )
                      ) : !hasIncident ? (
                        <span>Sin incidencia/s</span>
                      ) : null}

                      <button
                        type="button"
                        data-incident-action="add"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAddIncident(row, day);
                        }}
                        className="mt-auto inline-flex items-center justify-center gap-1 rounded px-1 py-1 text-[10px] font-semibold not-italic text-primary hover:bg-primary/10"
                        title="Agregar otra incidencia a este día"
                      >
                        <Plus className="h-3 w-3" />
                        {hasIncident
                          ? "Agregar otra incidencia"
                          : "Agregar incidencia"}
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={days.length + 4}
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

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Página {page} de {pages} 
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={page >= pages}
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


function HexColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedValue = normalizeHexColor(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(normalizedValue);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(normalizedValue));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const next = normalizeHexColor(value);
    setDraft(next);
    setHsv(hexToHsv(next));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const applyHsv = (next: HsvColor) => {
    const bounded = {
      h: Math.max(0, Math.min(359.999, next.h)),
      s: Math.max(0, Math.min(1, next.s)),
      v: Math.max(0, Math.min(1, next.v)),
    };

    const hex = hsvToHex(bounded);

    setHsv(bounded);
    setDraft(hex);
    onChange(hex);
  };

  const updateSaturationValue = (
    element: HTMLDivElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = element.getBoundingClientRect();
    const saturation = (clientX - rect.left) / rect.width;
    const brightness = 1 - (clientY - rect.top) / rect.height;

    applyHsv({
      ...hsv,
      s: saturation,
      v: brightness,
    });
  };

  const updateHue = (element: HTMLDivElement, clientX: number) => {
    const rect = element.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;

    applyHsv({
      ...hsv,
      h: ratio * 360,
    });
  };

  const commitHex = () => {
    if (!/^#[0-9A-F]{6}$/i.test(draft)) {
      setDraft(normalizedValue);
      return;
    }

    const next = draft.toUpperCase();

    setDraft(next);
    setHsv(hexToHsv(next));
    onChange(next);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2"
        aria-label="Seleccionar color"
        aria-expanded={open}
        title="Seleccionar color"
      >
        <span
          className="h-7 w-9 shrink-0 rounded border border-border"
          style={{ backgroundColor: normalizedValue }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-xl">
          <div
            className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-md"
            style={{
              backgroundColor: `hsl(${hsv.h} 100% 50%)`,
              backgroundImage:
                "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, transparent)",
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateSaturationValue(
                event.currentTarget,
                event.clientX,
                event.clientY
              );
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
              }

              updateSaturationValue(
                event.currentTarget,
                event.clientX,
                event.clientY
              );
            }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
              }}
            />
          </div>

          <div
            className="relative mt-3 h-4 w-full cursor-pointer rounded-full"
            style={{
              background:
                "linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)",
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateHue(event.currentTarget, event.clientX);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                return;
              }

              updateHue(event.currentTarget, event.clientX);
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white shadow"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-9 w-9 shrink-0 rounded-md border border-border"
              style={{ backgroundColor: normalizedValue }}
              aria-hidden="true"
            />

            <input
              type="text"
              value={draft}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => {
                let next = event.target.value.toUpperCase();

                if (next && !next.startsWith("#")) {
                  next = `#${next}`;
                }

                next = next
                  .replace(/[^#0-9A-F]/g, "")
                  .replace(/(?!^)#/g, "")
                  .slice(0, 7);

                setDraft(next);

                if (/^#[0-9A-F]{6}$/.test(next)) {
                  setHsv(hexToHsv(next));
                  onChange(next);
                }
              }}
              onBlur={commitHex}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              placeholder="#BAE6FD"
              pattern="^#[0-9A-Fa-f]{6}$"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-primary"
              aria-label="Color hexadecimal"
            />

            <span className="text-xs font-bold text-muted-foreground">
              HEX
            </span>
          </div>
        </div>
      )}
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