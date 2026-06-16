import { Bell, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !active) return;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("id", data.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      ]);
      if (!active) return;
      const isAdmin = roles?.some((r) => r.role === "admin");
      setUser({
        name: profile?.full_name || profile?.email || data.user.email || "Usuario",
        role: isAdmin ? "Administrador" : "Usuario",
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-4">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {user && (
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-medium text-foreground leading-tight">{user.name}</span>
              <span className="text-xs text-muted-foreground leading-tight">{user.role}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
