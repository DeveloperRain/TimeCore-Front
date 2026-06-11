import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Users,
  Fingerprint,
  ClipboardCheck,
  Building2,
  TrendingUp,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TimeCore" },
      { name: "description", content: "Resumen general del sistema TimeCore: empleados, asistencias, relojes y sucursales." },
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

const kpis: Kpi[] = [
  { label: "Total de empleados", value: "125", delta: "+3 este mes", icon: Users, accent: "bg-primary/10 text-primary" },
  { label: "Relojes conectados", value: "4 / 5", delta: "1 sin conexión", icon: Fingerprint, accent: "bg-success/10 text-success" },
  { label: "Asistencias del día", value: "98", delta: "+12% vs ayer", icon: ClipboardCheck, accent: "bg-chart-2/10 text-chart-2" },
  { label: "Sucursales activas", value: "5", delta: "Sin cambios", icon: Building2, accent: "bg-warning/20 text-warning-foreground" },
];

const barData = [
  { day: "Lun", value: 92 },
  { day: "Mar", value: 105 },
  { day: "Mié", value: 98 },
  { day: "Jue", value: 110 },
  { day: "Vie", value: 115 },
  { day: "Sáb", value: 60 },
  { day: "Dom", value: 20 },
];
const maxBar = Math.max(...barData.map((d) => d.value));

const distribucion = [
  { label: "Matriz CDMX", value: 42, color: "bg-primary" },
  { label: "Sucursal Norte", value: 18, color: "bg-chart-2" },
  { label: "Sucursal Sur", value: 15, color: "bg-chart-3" },
  { label: "Guadalajara", value: 22, color: "bg-success" },
  { label: "Monterrey", value: 28, color: "bg-warning" },
];
const totalDist = distribucion.reduce((s, d) => s + d.value, 0);

const actividad = [
  { hora: "09:12", texto: "Reloj ZKTeco K40-Matriz sincronizó 42 registros", tipo: "sync" },
  { hora: "09:08", texto: "Empleado EMP-005 marcó entrada en Sucursal Guadalajara", tipo: "in" },
  { hora: "08:45", texto: "Reloj ZKTeco K40-Sur quedó desconectado", tipo: "warn" },
  { hora: "08:30", texto: "Nuevo empleado registrado: Sofía Hernández", tipo: "new" },
  { hora: "08:02", texto: "Patricia Núñez marcó entrada en Sucursal Monterrey", tipo: "in" },
];

function Dashboard() {
  return (
    <AppShell title="Dashboard" subtitle="Resumen general del sistema">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">{k.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{k.value}</p>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {k.delta}
                </p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${k.accent}`}>
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
              <h3 className="text-base font-semibold text-foreground">Asistencias por día</h3>
              <p className="text-xs text-muted-foreground">Últimos 7 días</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
              Semana actual
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 h-56">
            {barData.map((b) => (
              <div key={b.day} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-primary to-chart-2 transition-all"
                    style={{ height: `${(b.value / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{b.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Empleados por sucursal</h3>
          <p className="text-xs text-muted-foreground mb-5">Distribución actual</p>
          <div className="space-y-4">
            {distribucion.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground truncate">{d.label}</span>
                  <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${d.color} rounded-full`}
                    style={{ width: `${(d.value / totalDist) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Actividad reciente</h3>
        </div>
        <ul className="divide-y divide-border">
          {actividad.map((a, i) => (
            <li key={i} className="flex items-start gap-4 py-3">
              <span className="text-xs font-mono text-muted-foreground w-12 shrink-0 pt-0.5">{a.hora}</span>
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
        </ul>
      </div>
    </AppShell>
  );
}
