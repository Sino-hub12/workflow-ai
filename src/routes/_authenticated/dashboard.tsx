import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, FileText, ListChecks, Search, Bot, ArrowRight, CheckCircle2 } from "lucide-react";
import { Route as AuthedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WorkFlow AI" }] }),
  component: Dashboard,
});

const quickActions = [
  { to: "/email", label: "Generate Email", icon: Mail, desc: "Draft a professional email in seconds" },
  { to: "/meetings", label: "Meeting Notes", icon: FileText, desc: "Summarize a transcript into action items" },
  { to: "/planner", label: "Task Planner", icon: ListChecks, desc: "Plan and prioritise your day" },
  { to: "/research", label: "Research", icon: Search, desc: "Get a sourced workplace summary" },
  { to: "/chat", label: "AI Chat", icon: Bot, desc: "Ask any workplace question" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { user } = AuthedRoute.useRouteContext();
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ?? "there";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user.id],
    queryFn: async () => {
      const [tasks, emails, meetings, research] = await Promise.all([
        supabase.from("tasks").select("id, done").eq("user_id", user.id),
        supabase.from("emails").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("meeting_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("research_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const total = tasks.data?.length ?? 0;
      const done = tasks.data?.filter((t) => t.done).length ?? 0;
      return {
        totalTasks: total,
        doneTasks: done,
        pendingTasks: total - done,
        productivity: total ? Math.round((done / total) * 100) : 0,
        emails: emails.count ?? 0,
        meetings: meetings.count ?? 0,
        research: research.count ?? 0,
      };
    },
  });

  const productivity = stats?.productivity ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="rounded-3xl bg-gradient-brand p-6 text-primary-foreground shadow-brand md:p-8">
        <p className="text-sm font-medium text-primary-foreground/85">{greeting()},</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{displayName} 👋</h1>
        <p className="mt-2 max-w-lg text-primary-foreground/90">
          Here's your workspace at a glance. Let WorkFlow AI take care of the busywork.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Productivity" value={`${productivity}%`} />
          <StatCard label="Tasks pending" value={String(stats?.pendingTasks ?? 0)} />
          <StatCard label="Emails drafted" value={String(stats?.emails ?? 0)} />
          <StatCard label="Meetings summarised" value={String(stats?.meetings ?? 0)} />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((a) => (
            <Link key={a.to} to={a.to} className="group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-brand">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                  <a.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-4 font-semibold">{a.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Today's progress</h3>
            <p className="text-sm text-muted-foreground">
              {stats?.doneTasks ?? 0} of {stats?.totalTasks ?? 0} tasks completed
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${productivity}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {productivity >= 80
            ? "Fantastic work — you're almost done for today!"
            : productivity >= 40
              ? "Nice momentum. Keep going."
              : "Let's get started — check the planner to pick your first task."}
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
