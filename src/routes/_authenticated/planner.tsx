import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { planTasks } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2, Sparkles, Loader2, Wand2, CalendarClock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "./email";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Task Planner — WorkFlow AI" }] }),
  component: PlannerPage,
});

type Priority = "high" | "medium" | "low";
type Task = { id: string; title: string; priority: Priority; done: boolean; created_at: string; due_at: string | null };
const priorityColor: Record<Priority, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/20 text-warning-foreground",
  low: "bg-success/15 text-success",
};
const priorityDot: Record<Priority, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};
const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function PlannerPage() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [plan, setPlan] = useState("");
  const [smartSort, setSmartSort] = useState(false);
  const qc = useQueryClient();
  const planFn = useServerFn(planTasks);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title, priority, done, created_at, due_at").order("done").order("created_at", { ascending: true });
      return (data ?? []) as Task[];
    },
  });

  const displayed = useMemo(() => {
    if (!smartSort) return tasks;
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return ad - bd;
    });
  }, [tasks, smartSort]);

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { error } = await supabase.from("tasks").insert({
        title, priority, user_id: userData.user.id,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setDueAt(""); qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const planMutation = useMutation({
    mutationFn: () => planFn({ data: { tasks: tasks.map(({ id, title, priority, done }) => ({ id, title, priority, done })) } }),
    onSuccess: (r) => setPlan(r.plan),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pending = tasks.filter((t) => !t.done).length;

  function smartSchedule() {
    setSmartSort(true);
    planMutation.mutate();
    toast.success(`Rearranged ${pending} task${pending === 1 ? "" : "s"} — most important first`);
  }

  const now = Date.now();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<ListChecks className="h-5 w-5" />} title="Task Planner" desc="Organise your day, set priorities, and let AI plan the best order." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <form
            onSubmit={(e) => { e.preventDefault(); if (title.trim()) addTask.mutate(); }}
            className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card sm:flex-row sm:flex-wrap"
          >
            <Input placeholder="Add a new task…" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-40 flex-1" />
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="sm:w-40" aria-label="Due date" />
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!title.trim() || addTask.isPending} className="bg-gradient-brand text-primary-foreground shadow-brand">
              <Plus className="mr-1 h-4 w-4" />Add
            </Button>
          </form>

          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold">Today's tasks</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSmartSort((v) => !v)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    smartSort ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {smartSort ? "Smart order on" : "Sort by added"}
                </button>
                <span className="text-xs text-muted-foreground">{done}/{total} done</span>
              </div>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
            </div>
            {displayed.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet. Add one above.</p>
            ) : (
              <ul className="space-y-2">
                {displayed.map((t) => {
                  const overdue = !t.done && t.due_at && new Date(t.due_at).getTime() < now;
                  return (
                    <li key={t.id} className={cn("flex items-center gap-3 rounded-xl border bg-background p-3 transition", t.done && "opacity-60", overdue && "border-destructive/40")}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => toggleTask.mutate({ id: t.id, done: e.target.checked })}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[t.priority])} />
                      <div className="min-w-0 flex-1">
                        <div className={cn("truncate text-sm", t.done && "line-through")}>{t.title}</div>
                        {t.due_at && (
                          <div className={cn("mt-0.5 flex items-center gap-1 text-[11px]", overdue ? "text-destructive" : "text-muted-foreground")}>
                            <CalendarClock className="h-3 w-3" />
                            {overdue ? "Overdue · " : "Due "}{new Date(t.due_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", priorityColor[t.priority])}>{t.priority}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeTask.mutate(t.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-card">
          <div>
            <h3 className="font-semibold">Smart scheduling</h3>
            <p className="text-sm text-muted-foreground">Let AI rearrange your day from most to least important.</p>
          </div>
          <Button
            onClick={smartSchedule}
            disabled={planMutation.isPending || pending === 0}
            className="w-full bg-gradient-brand text-primary-foreground shadow-brand"
          >
            {planMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {pending > 0 ? `Rearrange my ${pending} task${pending === 1 ? "" : "s"}` : "Nothing to schedule"}
          </Button>
          <Button
            onClick={() => planMutation.mutate()}
            disabled={planMutation.isPending || pending === 0}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Plan my day (AI notes)
          </Button>
          {plan && (
            <article className="prose prose-sm max-w-none">
              <ReactMarkdown>{plan}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
