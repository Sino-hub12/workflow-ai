import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, AlertTriangle, Flame } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; priority: string; due_at: string | null };

export function NotificationsBell() {
  const notifiedRef = useRef<Set<string>>(new Set());

  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("tasks")
        .select("id, title, priority, due_at, done")
        .eq("done", false)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(50);
      const rows = (data ?? []) as (Task & { done: boolean })[];
      return rows
        .filter((t) => t.priority === "high" || (t.due_at && t.due_at <= nowIso))
        .map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          due_at: t.due_at,
          overdue: !!(t.due_at && t.due_at <= nowIso),
        }));
    },
  });

  useEffect(() => {
    for (const it of items) {
      if (notifiedRef.current.has(it.id)) continue;
      notifiedRef.current.add(it.id);
      if (it.overdue) {
        toast.warning(`Overdue: ${it.title}`, { description: "This task is past its due date." });
      } else if (it.priority === "high") {
        toast(`🔥 High priority: ${it.title}`, { description: "Don't lose track of this one." });
      }
    }
  }, [items]);

  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <div className="text-sm font-semibold">Smart notifications</div>
          <div className="text-xs text-muted-foreground">High priority & overdue tasks</div>
        </div>
        {count === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up 🎉</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-auto">
            {items.map((it) => (
              <li key={it.id} className="p-3">
                <Link to="/planner" className="group flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      it.overdue ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground",
                    )}
                  >
                    {it.overdue ? <AlertTriangle className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium group-hover:text-primary">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {it.overdue
                        ? `Overdue · was due ${new Date(it.due_at!).toLocaleString()}`
                        : `High priority${it.due_at ? ` · due ${new Date(it.due_at).toLocaleDateString()}` : ""}`}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
