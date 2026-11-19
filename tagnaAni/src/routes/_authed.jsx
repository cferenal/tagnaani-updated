import "@/api/base44Client";
import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { refreshSession } from "@/api/base44Client";
import AppShell from "@/components/farm/AppShell";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: async () => {
    const user = await refreshSession();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.mustChangePassword) throw redirect({ to: "/change-temporary-password" });
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin") return <Outlet />;
  return (
    <AppShell hideNav={pathname === "/onboarding"}>
      <Outlet />
    </AppShell>
  );
}