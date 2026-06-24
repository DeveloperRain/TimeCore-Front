import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem("timecore-token");

    if (!token) {
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