import { timecoreApi } from "@/lib/api/timecore";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Users,
  Fingerprint,
  ClipboardCheck,
  Building2,
  TrendingUp,
  Activity,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TimeCore" },
      {
        name: "description",
        content:
          "Resumen general del sistema TimeCore: empleados, asistencias, relojes y sucursales.",
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

function Dashboard() {
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalAsistencias, setTotalAsistencias] = useState(0);
  const [relojesConectados, setRelojesConectados] = useState(0);
  const [totalRelojes, setTotalRelojes] = useState(0);
  const [sucursalesActivas, setSucursalesActivas] = useState(0);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [barData, setBarData] = useState<BarItem[]>([
    { day: "Lun", value: 0 },
    { day: "Mar", value: 0 },
    { day: "Mié", value: 0 },
    { day: "Jue", value: 0 },
    { day: "Vie", value: 0 },
    { day: "Sáb", value: 0 },
    { day: "Dom", value: 0 },
  ]);
  const [showSyncNotice, setShowSyncNotice] = useState(
    sessionStorage.getItem("timecore-sync-notice-hidden") !== "true",
  );

  useEffect(() => {
    timecoreApi
      .getDashboardSummary()
      .then((res) => {
        const data = res.data ?? {};

        setTotalUsuarios(data.total_empleados ?? 0);
        setTotalAsistencias(data.asistencias_registradas ?? 0);
        setRelojesConectados(data.relojes_conectados ?? 0);
        setTotalRelojes(data.total_relojes ?? 0);
        setSucursalesActivas(data.sucursales_activas ?? 0);
      })
      .catch((err) => {
        console.error("Error obteniendo resumen:", err);
      });

    timecoreApi
      .getAsistencias()
      .then((res) => {
        const registros = res.data ?? [];

        const ultimas: ActividadItem[] = registros.slice(0, 8).map((a: any) => {
          const rawDate = String(a.timestamp ?? a.punch_time ?? a.time ?? "");
          const hora = rawDate.includes("T")
            ? rawDate.split("T")[1]?.slice(0, 5)
            : rawDate.split(" ")[1]?.slice(0, 5);

          const codigo = String(a.user_id ?? a.uid ?? "Sin código");
          const nombre = String(a.name ?? a.user_name ?? `Usuario ${codigo}`);

          return {
            hora: hora || "--:--",
            texto: `${nombre} registró asistencia`,
            tipo: "in",
          };
        });

        setActividad(ultimas);

        const counts: Record<string, number> = {
          Lun: 0,
          Mar: 0,
          Mié: 0,
          Jue: 0,
          Vie: 0,
          Sáb: 0,
          Dom: 0,
        };

        registros.forEach((a: any) => {
          const rawDate = String(a.timestamp ?? a.punch_time ?? a.time ?? "");
          const fecha = rawDate.includes("T")
            ? rawDate.split("T")[0]
            : rawDate.split(" ")[0];

          const date = new Date(fecha);
          const day = date.getDay();

          const mapDays: Record<number, string> = {
            0: "Dom",
            1: "Lun",
            2: "Mar",
            3: "Mié",
            4: "Jue",
            5: "Vie",
            6: "Sáb",
          };

          const label = mapDays[day];

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
      })
      .catch((err) => {
        console.error("Error obteniendo asistencias:", err);
      });
  }, []);

  const kpis: Kpi[] = [
    {
      label: "Total de empleados",
      value: String(totalUsuarios),
      delta: "Desde PostgreSQL",
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
      label: "Asistencias registradas",
      value: String(totalAsistencias),
      delta: "Registros del reloj",
      icon: ClipboardCheck,
      accent: "bg-chart-2/10 text-chart-2",
    },
    {
      label: "Sucursales activas",
      value: String(sucursalesActivas),
      delta: "Desde PostgreSQL",
      icon: Building2,
      accent: "bg-warning/20 text-warning-foreground",
    },
  ];

  const maxBar = Math.max(...barData.map((d) => d.value), 1);

  return (
    <AppShell title="Dashboard" subtitle="Resumen general del sistema">
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Asistencias por día
              </h3>
              <p className="text-xs text-muted-foreground">
                Registros agrupados por día
              </p>
            </div>

            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
              Datos reales
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 h-56">
            {barData.map((b) => (
              <div
                key={b.day}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div
                  className="w-full flex items-end justify-center"
                  style={{ height: "100%" }}
                >
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-primary to-chart-2 transition-all"
                    style={{ height: `${(b.value / maxBar) * 100}%` }}
                    title={`${b.value} registros`}
                  />
                </div>

                <span className="text-xs text-muted-foreground">{b.day}</span>
                <span className="text-xs font-semibold text-foreground">
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            Empleados por sucursal
          </h3>
          <p className="text-xs text-muted-foreground mb-5">
            Distribución actual
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-foreground truncate">Registrados</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {totalUsuarios}
                </span>
              </div>

              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full w-full" />
              </div>
            </div>
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

              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  a.tipo === "warn"
                    ? "bg-destructive"
                    : a.tipo === "sync"
                      ? "bg-chart-2"
                      : a.tipo === "new"
                        ? "bg-warning"
                        : "bg-success"
                }`}
              />

              <span className="text-sm text-foreground flex-1">{a.texto}</span>
            </li>
          ))}

          {actividad.length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">
              No hay actividad reciente disponible.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}