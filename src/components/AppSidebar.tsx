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
  Fingerprint,
  Building2,
  LogOut,
  Clock,
} from "lucide-react";
import { authStorage } from "@/lib/api/timecore";
import logoHorizontal from "@/assets/timecore-logo-horizontal.png.asset.json";
import timeCoreLogo from "@/imgs/TIMECORE_LOGO_Blanco.png";

const generalItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, preserveBranch: true },
  { title: "Relojes", url: "/relojes", icon: Clock, preserveBranch: true },
  { title: "Sucursales", url: "/sucursales", icon: Building2, preserveBranch: false },
];

const branchItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, preserveBranch: true },
  { title: "Empleados", url: "/empleados", icon: Users, preserveBranch: true },
  { title: "Asistencias", url: "/asistencias", icon: ClipboardList, preserveBranch: true },
  { title: "Relojes", url: "/relojes", icon: Clock, preserveBranch: true },
  { title: "Sucursales", url: "/sucursales", icon: Building2, preserveBranch: false },
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
          title={collapsed ? "Mostrar menu" : "Ocultar menu"}
          aria-label={collapsed ? "Mostrar menu" : "Ocultar menu"}
          className="flex items-center justify-center rounded-lg transition-transform hover:scale-105 active:scale-95 bg-white p-1"
        >
          {collapsed ? (
            <img
              src={timeCoreLogo}
              alt="TimeCore"
              className="h-12 w-12 object-contain"
            />
          )
          
          : (
            <img
              src={timeCoreLogo}
              alt="TimeCore"
              className="h-12 w-auto object-contain"
            />
          )}
        </button>
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
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
