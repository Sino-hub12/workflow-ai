import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Mail, FileText, ListChecks, Search, Bot, LogOut, Menu, X } from "lucide-react";
import logo from "@/assets/workflow-logo.png";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email", icon: Mail },
  { to: "/meetings", label: "Meetings", icon: FileText },
  { to: "/planner", label: "Planner", icon: ListChecks },
  { to: "/research", label: "Research", icon: Search },
  { to: "/chat", label: "AI Chat", icon: Bot },
] as const;

function AppShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
          <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
            <img src={logo} alt="" width={32} height={32} />
            <div className="leading-tight">
              <div className="text-sm font-bold">WorkFlow AI</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Workplace assistant</div>
            </div>
          </Link>
          <nav className="flex-1 space-y-1">
            {nav.map((n) => {
              const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-gradient-brand text-primary-foreground shadow-brand"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-xl border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="" width={28} height={28} />
              <span className="text-sm font-bold">WorkFlow AI</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </header>

          {mobileOpen && (
            <div className="border-b bg-sidebar p-3 md:hidden">
              <nav className="grid grid-cols-2 gap-2">
                {nav.map((n) => (
                  <Link key={n.to} to={n.to}
                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium">
                    <n.icon className="h-4 w-4 text-primary" />
                    {n.label}
                  </Link>
                ))}
                <button onClick={signOut} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </nav>
            </div>
          )}

          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>

          {/* Bottom nav (mobile) */}
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
            {nav.slice(0, 5).map((n) => {
              const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                  <n.icon className="h-5 w-5" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
