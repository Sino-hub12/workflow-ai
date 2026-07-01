import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runResearch } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Loader2, Sparkles, Copy, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "./email";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({ meta: [{ title: "Research Assistant — WorkFlow AI" }] }),
  component: ResearchPage,
});

function ResearchPage() {
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(runResearch);

  const mutation = useMutation({
    mutationFn: () => fn({ data: { query } }),
    onSuccess: (r) => { setOutput(r.output); qc.invalidateQueries({ queryKey: ["research-history"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const history = useQuery({
    queryKey: ["research-history"],
    queryFn: async () => {
      const { data } = await supabase.from("research_reports").select("id, query, output, created_at").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<Search className="h-5 w-5" />} title="Research Assistant" desc="Ask a question — get a concise, structured workplace briefing." />

      <form
        onSubmit={(e) => { e.preventDefault(); if (query.trim().length > 2) mutation.mutate(); }}
        className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-card sm:flex-row"
      >
        <Input placeholder="e.g. Latest workplace cybersecurity trends" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={mutation.isPending || query.trim().length < 3} className="bg-gradient-brand text-primary-foreground shadow-brand">
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Research
        </Button>
      </form>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Report</h3>
          {output && (
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />Copy
            </Button>
          )}
        </div>
        {mutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Researching…</div>
        ) : output ? (
          <article className="prose prose-sm max-w-none"><ReactMarkdown>{output}</ReactMarkdown></article>
        ) : (
          <p className="text-sm text-muted-foreground">Your summary, findings, comparison, recommendations and sources will appear here.</p>
        )}
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Recent research</h3>
        {history.data && history.data.length ? (
          <ul className="divide-y">
            {history.data.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.query}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOutput(r.output)}>View</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No research yet.</p>
        )}
      </section>
    </div>
  );
}
