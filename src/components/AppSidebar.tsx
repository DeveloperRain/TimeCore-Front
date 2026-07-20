import {
  Link,
  useLocation,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Building2,
  LogOut,
  Clock,
} from "lucide-react";
import { authStorage } from "@/lib/api/timecore";
import timeCoreLogo from "@/imgs/TIMECORE_LOGO_Blanco.png";

const generalItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, preserveBranch: true },
  { title: "Relojes", url: "/relojes", icon: Clock, preserveBranch: true },
  {
    title: "Sucursales",
    url: "/sucursales",
    icon: Building2,
    preserveBranch: false,
  },
];

const branchItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, preserveBranch: true },
  { title: "Empleados", url: "/empleados", icon: Users, preserveBranch: true },
  {
    title: "Asistencias",
    url: "/asistencias",
    icon: ClipboardList,
    preserveBranch: true,
  },
  { title: "Relojes", url: "/relojes", icon: Clock, preserveBranch: true },
  {
    title: "Sucursales",
    url: "/sucursales",
    icon: Building2,
    preserveBranch: false,
  },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.searchStr);
  const currentBranchId = searchParams.get("branch_id");

  const isBranchMode =
    currentBranchId !== null &&
    currentBranchId !== "" &&
    !Number.isNaN(Number(currentBranchId));

  const branchSearch = {
    branch_id: isBranchMode ? Number(currentBranchId) : undefined,
  };

  const items = isBranchMode ? branchItems : generalItems;

  function handleSignOut() {
    const confirmSignOut = window.confirm("¿Seguro que desea cerrar sesión?");

    if (!confirmSignOut) return;

    authStorage.clearSession();

    navigate({
      to: "/auth",
      replace: true,
    });
  }

  return (
    <aside
      className={`hidden md:flex md:flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-in-out ${
        collapsed ? "md:w-20" : "md:w-64"
      }`}
    >
      <div
        className={`flex items-center border-b border-sidebar-border ${
          collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-4"
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Mostrar menú" : "Ocultar menú"}
          aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
          className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1 transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src={timeCoreLogo}
            alt="TimeCore"
            className={collapsed ? "h-13 w-13 object-contain" : "h-10 w-10 object-contain"}
          />
        </button>

        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-lg font-bold tracking-[0.08em] text-white">
              TIMECORE
            </p>
            <p className="mt-1 truncate text-xs font-medium text-white/75">
              Control de asistencia
            </p>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Menú principal
            </p>

            {items.map((item) => {
              const active =
                item.url === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.url);

              return (
                <Link
                  key={item.url}
                  to={item.url}
                  search={item.preserveBranch ? branchSearch : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border px-4 py-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="truncate">Cerrar sesión</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}