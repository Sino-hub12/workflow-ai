import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./email";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — WorkFlow AI" }] }),
  component: CalendarPage,
});

type Item = { id: string; title: string; date: Date; kind: "meeting" | "task"; priority?: string };

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const { data: items = [] } = useQuery({
    queryKey: ["calendar-items", cursor.toISOString()],
    queryFn: async () => {
      const from = startOfMonth(cursor).toISOString();
      const to = new Date(endOfMonth(cursor).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const [meetings, tasks] = await Promise.all([
        supabase.from("meeting_notes").select("id, title, created_at").gte("created_at", from).lt("created_at", to),
        supabase.from("tasks").select("id, title, priority, due_at").not("due_at", "is", null).gte("due_at", from).lt("due_at", to),
      ]);
      const list: Item[] = [];
      for (const m of meetings.data ?? []) list.push({ id: `m-${m.id}`, title: m.title, date: new Date(m.created_at), kind: "meeting" });
      for (const t of tasks.data ?? []) list.push({ id: `t-${t.id}`, title: t.title, date: new Date(t.due_at!), kind: "task", priority: t.priority });
      return list;
    },
  });

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startOffset = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = new Date();

  const upcoming = [...items].filter((i) => i.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<CalendarDays className="h-5 w-5" />} title="Calendar" desc="Meetings and task deadlines, all in one place." />

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{monthLabel}</h3>
          <div className="flex gap-1">
            <Button size="icon-sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>Today</Button>
            <Button size="icon-sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, i) => {
            if (!day) return <div key={i} className="min-h-24 rounded-lg bg-muted/30" />;
            const dayItems = items.filter((it) => sameDay(it.date, day));
            const isToday = sameDay(day, today);
            return (
              <div key={i} className={cn("min-h-24 rounded-lg border bg-background p-1.5 text-left", isToday && "border-primary/60 bg-primary/5")}>
                <div className={cn("mb-1 text-xs font-semibold", isToday ? "text-primary" : "text-muted-foreground")}>{day.getDate()}</div>
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((it) => (
                    <div key={it.id} className={cn(
                      "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                      it.kind === "meeting" ? "bg-primary/15 text-primary" :
                        it.priority === "high" ? "bg-destructive/15 text-destructive" :
                          it.priority === "medium" ? "bg-warning/20 text-warning-foreground" :
                            "bg-success/15 text-success",
                    )}>
                      {it.kind === "meeting" ? <FileText className="h-2.5 w-2.5 shrink-0" /> : <ListChecks className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{it.title}</span>
                    </div>
                  ))}
                  {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h3 className="mb-3 font-semibold">Upcoming</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming meetings or deadlines this month.</p>
        ) : (
          <ul className="divide-y">
            {upcoming.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-2.5">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  it.kind === "meeting" ? "bg-primary/15 text-primary" : "bg-warning/20 text-warning-foreground",
                )}>
                  {it.kind === "meeting" ? <FileText className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {it.kind === "task" && it.priority ? ` · ${it.priority} priority` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
