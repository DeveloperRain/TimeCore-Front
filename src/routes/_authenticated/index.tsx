import { timecoreApi } from "@/lib/api/timecore";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Users,
  Fingerprint,
  ClipboardCheck,
  Building2,
  TrendingUp,
  Activity,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
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
      { title: "Dashboard TimeCore" },
      {
        name: "description",
        content: "Dashboard general del sistema TimeCore.",
      },
    ],
  }),
  component: Dashboard,
});

type Kpi = {
  label: string;
  value: string;
  delta: string;
  icon: typeof Users;
  accent: string;
};

type ActividadItem = {
  hora: string;
  texto: string;
  tipo: "sync" | "in" | "warn" | "new";
};

type BarItem = {
  day: string;
  value: number;
};

type SucursalStat = {
  id?: number;
  nombre: string;
  empleados: number;
};

type BranchInfo = {
  id: number;
  name: string;
  address?: string;
  status?: string;
  is_active?: boolean;
};

const emptyWeekData: BarItem[] = [
  { day: "Lun", value: 0 },
  { day: "Mar", value: 0 },
  { day: "Mié", value: 0 },
  { day: "Jue", value: 0 },
  { day: "Vie", value: 0 },
  { day: "Sáb", value: 0 },
  { day: "Dom", value: 0 },
];

function getFechaFromTimestamp(value: any) {
  const rawDate = String(value ?? "");

  return rawDate.includes("T")
    ? rawDate.split("T")[0]
    : rawDate.split(" ")[0] || "";
}

function getHoraFromTimestamp(value: any) {
  const rawDate = String(value ?? "");

  const hora = rawDate.includes("T")
    ? rawDate.split("T")[1]?.slice(0, 5)
    : rawDate.split(" ")[1]?.slice(0, 5);

  return hora || "--:--";
}

function getDiaSemana(fecha: string) {
  if (!fecha) return "";

  const [year, month, day] = fecha.split("-").map(Number);

  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);

  const mapDays: Record<number, string> = {
    0: "Dom",
    1: "Lun",
    2: "Mar",
    3: "Mié",
    4: "Jue",
    5: "Vie",
    6: "Sáb",
  };

  return mapDays[date.getDay()] ?? "";
}

function normalizeText(value?: string | null) {
  return String(value ?? "").toLowerCase().trim();
}

function Dashboard() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const branchId = search.branch_id;
  const isBranchMode =
    branchId !== undefined && branchId !== null && !Number.isNaN(branchId);

  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [empleadosPorSucursal, setEmpleadosPorSucursal] = useState<SucursalStat[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalAsistencias, setTotalAsistencias] = useState(0);
  const [relojesConectados, setRelojesConectados] = useState(0);
  const [totalRelojes, setTotalRelojes] = useState(0);
  const [sucursalesActivas, setSucursalesActivas] = useState(0);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [barData, setBarData] = useState<BarItem[]>(emptyWeekData);
  const [loading, setLoading] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const branchParams = isBranchMode ? { branchId } : undefined;

  const dashboardTitle =
    isBranchMode && branchInfo?.name
      ? `Dashboard  ${branchInfo.name}`
      : isBranchMode
        ? "Dashboard de Sucursal"
        : "Dashboard";

  const dashboardSubtitle =
    isBranchMode && branchInfo?.address
      ? `Resumen de Sucursal • ${branchInfo.address}`
      : isBranchMode
        ? "Resumen filtrado por la sucursal seleccionada"
        : "Resumen general de todas las sucursales";

  function cargarDashboard() {
    setLoading(true);
    setLoadingSucursales(true);
    setError(null);

    Promise.all([
      timecoreApi.getDashboardSummary(branchParams),
      timecoreApi.getAsistenciasSemana(branchParams),
      timecoreApi.getDashboardActivity(branchParams),
      timecoreApi.getBranches(),
    ])
      .then(([resSummary, resSemana, resActivity, resBranches]) => {
        const summaryData = resSummary.data ?? {};
        const registrosSemana = resSemana.data ?? [];
        const actividadData = resActivity.data ?? [];
        const branches = resBranches.data ?? [];

        setTotalUsuarios(summaryData.total_empleados ?? 0);
        setTotalAsistencias(summaryData.asistencias_registradas ?? 0);
        setRelojesConectados(summaryData.relojes_conectados ?? 0);
        setTotalRelojes(summaryData.total_relojes ?? 0);
        setSucursalesActivas(summaryData.sucursales_activas ?? 0);

        if (isBranchMode) {
          const selectedBranch =
            summaryData.branch ??
            branches.find((branch: any) => Number(branch.id) === Number(branchId)) ??
            null;

          setBranchInfo(
            selectedBranch
              ? {
                  id: Number(selectedBranch.id),
                  name: String(selectedBranch.name ?? ""),
                  address: selectedBranch.address ?? "",
                  status: selectedBranch.status ?? "",
                  is_active: selectedBranch.is_active,
                }
              : null
          );
        } else {
          setBranchInfo(null);
        }

        const counts: Record<string, number> = {
          Lun: 0,
          Mar: 0,
          Mié: 0,
          Jue: 0,
          Vie: 0,
          Sáb: 0,
          Dom: 0,
        };

        registrosSemana.forEach((a: any) => {
          const fecha = getFechaFromTimestamp(
            a.timestamp ?? a.punch_time ?? a.time
          );

          const label = getDiaSemana(fecha);

          if (label) {
            counts[label] += 1;
          }
        });

        setBarData([
          { day: "Lun", value: counts.Lun },
          { day: "Mar", value: counts.Mar },
          { day: "Mié", value: counts.Mié },
          { day: "Jue", value: counts.Jue },
          { day: "Vie", value: counts.Vie },
          { day: "Sáb", value: counts.Sáb },
          { day: "Dom", value: counts.Dom },
        ]);

        const ultimas: ActividadItem[] = actividadData
          .slice(0, 8)
          .map((a: any) => {
            const rawDate = a.timestamp ?? a.punch_time ?? a.time ?? "";
            const uid = String(a.user_id ?? a.uid ?? "Sin UID");
            const nombre = String(a.name ?? a.user_name ?? `Usuario ${uid}`);

            return {
              hora: getHoraFromTimestamp(rawDate),
              texto: `${nombre} registró asistencia`,
              tipo: "in",
            };
          });

        setActividad(ultimas);

        if (isBranchMode) {
          const selectedBranch =
            summaryData.branch ??
            branches.find((branch: any) => Number(branch.id) === Number(branchId));

          const nombreSucursal = String(
            selectedBranch?.name ?? branchInfo?.name ?? "Sucursal seleccionada"
          );

          setEmpleadosPorSucursal([
            {
              id: Number(branchId),
              nombre: nombreSucursal,
              empleados: summaryData.total_empleados ?? 0,
            },
          ]);
        } else {
          const stats: SucursalStat[] = Array.isArray(
            summaryData.empleados_por_sucursal
          )
            ? summaryData.empleados_por_sucursal
            : branches.map((branch: any) => ({
                id: Number(branch.id),
                nombre: String(branch.name ?? ""),
                empleados: 0,
              }));

          setEmpleadosPorSucursal(stats);
        }

        setLoadingSucursales(false);
      })
      .catch((err) => {
        console.error("Error cargando dashboard:", err);
        setError("No se pudo cargar la información del dashboard.");

        setTotalUsuarios(0);
        setTotalAsistencias(0);
        setRelojesConectados(0);
        setTotalRelojes(0);
        setSucursalesActivas(0);
        setActividad([]);
        setBarData(emptyWeekData);
        setEmpleadosPorSucursal([]);
        setBranchInfo(null);
        setLoadingSucursales(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    cargarDashboard();
  }, [branchId]);

  const kpis: Kpi[] = useMemo(
    () => [
      {
        label: isBranchMode ? "Empleados de sucursal" : "Total de empleados",
        value: String(totalUsuarios),
        delta: isBranchMode ? "Filtrado por sucursal" : "Desde el servidor",
        icon: Users,
        accent: "bg-primary/10 text-primary",
      },
      {
        label: "Relojes conectados",
        value: `${relojesConectados} / ${totalRelojes}`,
        delta: relojesConectados > 0 ? "Conexión activa" : "Sin conexión",
        icon: Fingerprint,
        accent:
          relojesConectados > 0
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive",
      },
      {
        label: "Asistencias Totales registradas",
        value: String(totalAsistencias),
        delta: isBranchMode ? "Registros de esta sucursal" : "Registros del reloj",
        icon: ClipboardCheck,
        accent: "bg-chart-2/10 text-chart-2",
      },
      {
        label: isBranchMode ? "Estado de sucursal" : "Sucursales activas",
        value: isBranchMode
          ? String(branchInfo?.status ?? "Activo")
          : String(sucursalesActivas),
        delta: isBranchMode ? "Sucursal seleccionada" : "Desde el servidor",
        icon: Building2,
        accent:
          isBranchMode && branchInfo?.status && branchInfo.status !== "Activo"
            ? "bg-muted text-muted-foreground"
            : "bg-warning/20 text-warning-foreground",
      },
    ],
    [
      isBranchMode,
      totalUsuarios,
      relojesConectados,
      totalRelojes,
      totalAsistencias,
      sucursalesActivas,
      branchInfo,
    ]
  );

  const maxBar = Math.max(...barData.map((d) => d.value), 1);

  return (
    <AppShell title={dashboardTitle} subtitle={dashboardSubtitle}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {isBranchMode ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Modo Vista filtrada
            </p>
            <p className="text-xs text-muted-foreground">
              Mostrando únicamente empleados, relojes y asistencias de la Sucursal{" "}
              {branchInfo?.name ?? "la sucursal seleccionada"}.
            </p>
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isBranchMode && (
            <>

             <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/",
                  search: {
                    branch_id: undefined,
                  },
                })
              }
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Ver general
            </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-5 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Cargando información del dashboard...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {k.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-foreground">
                  {k.value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {k.delta}
                </p>
              </div>

              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${k.accent}`}
              >
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            Asistencias por día
          </h3>

          <p className="text-xs text-muted-foreground">
            {isBranchMode
              ? "Registros reales de la semana actual para esta sucursal"
              : "Registros reales de la semana actual"}
          </p>

          <div className="mt-6 flex h-56 items-end justify-between gap-3">
            {barData.map((b) => {
              const height =
                b.value === 0 ? 4 : Math.max((b.value / maxBar) * 180, 12);

              return (
                <div
                  key={b.day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-44 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[44px] rounded-t-md bg-primary transition-all"
                      style={{ height: `${height}px` }}
                      title={`${b.value} registros`}
                    />
                  </div>

                  <span className="text-xs text-muted-foreground">{b.day}</span>

                  <span className="text-xs font-semibold text-foreground">
                    {b.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            {isBranchMode ? "Sucursal seleccionada" : "Empleados por sucursal"}
          </h3>

          <p className="text-xs text-muted-foreground mb-5">
            {isBranchMode ? "Distribución filtrada" : "Distribución actual"}
          </p>

          <div className="space-y-4">
            {empleadosPorSucursal.map((s) => {
              const max = Math.max(
                ...empleadosPorSucursal.map((item) => item.empleados),
                1
              );

              const width =
                s.empleados === 0
                  ? "0%"
                  : `${Math.max((s.empleados / max) * 100, 8)}%`;

              return (
                <div key={`${s.id ?? s.nombre}-${s.nombre}`}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground truncate">{s.nombre}</span>

                    <span className="font-semibold text-foreground tabular-nums">
                      {s.empleados}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}

            {loadingSucursales && empleadosPorSucursal.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cargando sucursales...
              </p>
            )}

            {!loadingSucursales && empleadosPorSucursal.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isBranchMode
                  ? "No hay empleados registrados en esta sucursal."
                  : "No hay sucursales registradas."}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />

          <h3 className="text-base font-semibold text-foreground">
            Actividad reciente
          </h3>
        </div>

        <ul className="divide-y divide-border">
          {actividad.map((a, i) => (
            <li key={i} className="flex items-start gap-4 py-3">
              <span className="text-xs font-mono text-muted-foreground w-12 shrink-0 pt-0.5">
                {a.hora}
              </span>

              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />

              <span className="text-sm text-foreground flex-1">{a.texto}</span>
            </li>
          ))}

          {actividad.length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">
              {isBranchMode
                ? "No hay actividad reciente disponible para esta sucursal."
                : "No hay actividad reciente disponible."}
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}