import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { relojes } from "@/lib/mock-data";
import { Plug, RefreshCw, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/relojes")({
  head: () => ({
    meta: [
      { title: "Relojes — TimeCore" },
      { name: "description", content: "Administra los relojes biométricos ZKTeco distribuidos en cada sucursal." },
    ],
  }),
  component: RelojesPage,
});

function RelojesPage() {
  const conectados = relojes.filter((r) => r.estado === "Conectado").length;

  return (
    <AppShell
      title="Gestión de Relojes"
      subtitle={`${conectados} de ${relojes.length} relojes conectados`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de relojes" value={relojes.length} accent="bg-primary/10 text-primary" icon={Plug} />
        <StatCard label="Conectados" value={conectados} accent="bg-success/10 text-success" icon={Wifi} />
        <StatCard
          label="Desconectados"
          value={relojes.length - conectados}
          accent="bg-destructive/10 text-destructive"
          icon={WifiOff}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-5 py-3">Nombre</th>
              <th className="text-left font-semibold px-5 py-3">Dirección IP</th>
              <th className="text-left font-semibold px-5 py-3">Puerto</th>
              <th className="text-left font-semibold px-5 py-3">Ubicación</th>
              <th className="text-left font-semibold px-5 py-3">Estado</th>
              <th className="text-left font-semibold px-5 py-3">Última sincronización</th>
              <th className="text-right font-semibold px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {relojes.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{r.nombre}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{r.ip}</td>
                <td className="px-5 py-3 tabular-nums text-foreground">{r.puerto}</td>
                <td className="px-5 py-3 text-foreground">{r.ubicacion}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      r.estado === "Conectado"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        r.estado === "Conectado" ? "bg-success animate-pulse" : "bg-destructive"
                      }`}
                    />
                    {r.estado}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground tabular-nums">{r.ultimaSync}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent">
                      <Plug className="h-3.5 w-3.5" />
                      Conectar
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sincronizar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: typeof Plug;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
