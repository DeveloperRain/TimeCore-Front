import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Auth guard temporalmente desactivado — el login se implementará con FastAPI.
  // Para reactivar: descomenta el beforeLoad de abajo.
  // beforeLoad: async () => {
  //   const { data, error } = await supabase.auth.getUser();
  //   if (error || !data.user) {
  //     throw redirect({ to: "/auth" });
  //   }
  //   return { user: data.user };
  // },
  component: () => <Outlet />,
});
