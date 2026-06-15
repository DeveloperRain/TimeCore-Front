import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { timecoreApi } from "@/lib/api/timecore";
import { Building2, MapPin, Users, Fingerprint } from "lucide-react";

type SucursalFront = {
  id: number;
  nombre: string;
  ubicacion: string;
  empleados: number;
  relojes: number;
};

export const Route = createFileRoute("/sucursales")({
  head: () => ({
    meta: [
      { title: "Sucursales — TimeCore" },
      {
        name: "description",
        content:
          "Sucursales registradas en TimeCore con el conteo de empleados y relojes biométricos.",
      },
    ],
  }),
  component: SucursalesPage,
});

function SucursalesPage() {
  const [sucursales, setSucursales] = useState<SucursalFront[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    timecoreApi
      .getUsuarios()
      .then((res) => {
        const totalEmpleados = res.data?.length ?? 0;

        setSucursales([
          {
            id: 1,
            nombre: "Reloj Principal",
            ubicacion: "Sucursal principal / Reloj de prueba",
            empleados: totalEmpleados,
            relojes: 1,
          },
        ]);
      })
      .catch((err) => {
        console.error("Error cargando sucursales:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AppShell
      title="Gestión de Sucursales"
      subtitle={
        loading
          ? "Cargando sucursales..."
          : `${sucursales.length} sucursales registradas`
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {sucursales.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{s.nombre}</h3>
                <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{s.ubicacion}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Empleados
                </p>
                <p className="text-xl font-bold text-foreground">{s.empleados}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" />
                  Relojes
                </p>
                <p className="text-xl font-bold text-foreground">{s.relojes}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Listado de sucursales</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-5 py-3">Nombre</th>
              <th className="text-left font-semibold px-5 py-3">Ubicación</th>
              <th className="text-right font-semibold px-5 py-3">Empleados</th>
              <th className="text-right font-semibold px-5 py-3">Relojes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {sucursales.map((s) => (
              <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{s.nombre}</td>
                <td className="px-5 py-3 text-muted-foreground">{s.ubicacion}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                  {s.empleados}
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                  {s.relojes}
                </td>
              </tr>
            ))}

            {sucursales.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  {loading ? "Cargando sucursales..." : "No hay sucursales registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}