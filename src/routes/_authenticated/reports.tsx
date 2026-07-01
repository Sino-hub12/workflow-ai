import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateWeeklyReport } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, Sparkles, CheckCircle2, Mail, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "./email";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Weekly Report — WorkFlow AI" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [report, setReport] = useState("");
  const [stats, setStats] = useState<{ completedTasks: number; pendingTasks: number; emails: number; meetings: number; research: number } | null>(null);
  const fn = useServerFn(generateWeeklyReport);

  const mutation = useMutation({
    mutationFn: () => fn(),
    onSuccess: (r) => { setReport(r.report); setStats(r.stats); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate report"),
  });

  const cards = stats ? [
    { label: "Tasks completed", value: stats.completedTasks, icon: CheckCircle2, tint: "bg-success/15 text-success" },
    { label: "Emails drafted", value: stats.emails, icon: Mail, tint: "bg-primary/15 text-primary" },
    { label: "Meetings summarised", value: stats.meetings, icon: FileText, tint: "bg-warning/20 text-warning-foreground" },
    { label: "Research reports", value: stats.research, icon: Search, tint: "bg-accent/40 text-foreground" },
  ] : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<BarChart3 className="h-5 w-5" />} title="Weekly Report" desc="A motivating recap of everything you achieved this week." />

      {!report && (
        <div className="rounded-3xl bg-gradient-brand p-8 text-center text-primary-foreground shadow-brand">
          <h2 className="text-2xl font-bold">Ready for your weekly recap?</h2>
          <p className="mx-auto mt-2 max-w-md text-primary-foreground/90">
            WorkFlow AI will look back at the past 7 days and celebrate what you got done.
          </p>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            size="lg"
            className="mt-6 bg-white text-primary hover:bg-white/90"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate my report
          </Button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tint}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {report && (
        <article className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
