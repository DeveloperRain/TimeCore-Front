import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authStorage } from "@/lib/api/timecore";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!authStorage.isAuthenticated()) {
      throw redirect({
        to: "/auth",
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}