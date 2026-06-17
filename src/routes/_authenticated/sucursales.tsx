import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Building2, MapPin, Plus, Trash2, X } from "lucide-react";
import { useSucursales } from "@/lib/sucursales-store";

export const Route = createFileRoute("/_authenticated/sucursales")({
  head: () => ({
    meta: [
      { title: "Sucursales — TimeCore" },
      {
        name: "description",
        content:
          "Sucursales registradas en TimeCore. Agrega y administra las sucursales de tu empresa.",
      },
    ],
  }),
  component: SucursalesPage,
});

function SucursalesPage() {
  const { sucursales, agregar, eliminar } = useSucursales();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", direccion: "" });

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.direccion.trim()) return;
    agregar(form.nombre, form.direccion);
    setForm({ nombre: "", direccion: "" });
    setOpen(false);
  };

  return (
    <AppShell
      title="Gestión de Sucursales"
      subtitle={`${sucursales.length} sucursales registradas`}
    >
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Sucursales</h3>
            <p className="text-xs text-muted-foreground">
              Agrega sucursales para asignarlas a los relojes biométricos.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Agregar sucursal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
          {sucursales.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-background p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{s.nombre}</h3>
                    <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{s.direccion}</span>
                    </p>
                  </div>
                </div>

                {s.id !== "matriz" && (
                  <button
                    onClick={() => eliminar(s.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Nueva sucursal</h3>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Sucursal Norte"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Av. Reforma 123, CDMX"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  Crear sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
