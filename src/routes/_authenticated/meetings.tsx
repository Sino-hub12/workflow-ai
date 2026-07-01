import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { summarizeMeeting } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Loader2, Sparkles, Copy, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PageHeader } from "./email";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meeting Notes — WorkFlow AI" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const qc = useQueryClient();
  const gen = useServerFn(summarizeMeeting);

  const mutation = useMutation({
    mutationFn: () => gen({ data: { title: title || "Untitled meeting", transcript } }),
    onSuccess: (r) => {
      setSummary(r.summary);
      qc.invalidateQueries({ queryKey: ["meeting-history"] });
      toast.success("Meeting summarised");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const history = useQuery({
    queryKey: ["meeting-history"],
    queryFn: async () => {
      const { data } = await supabase.from("meeting_notes").select("id, title, summary, created_at").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<FileText className="h-5 w-5" />} title="Meeting Notes" desc="Turn a transcript into a clean summary with action items." />

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => { e.preventDefault(); if (transcript.trim().length > 10) mutation.mutate(); }}
          className="space-y-4 rounded-2xl border bg-card p-5 shadow-card"
        >
          <div className="space-y-1.5">
            <Label>Meeting title</Label>
            <Input placeholder="Weekly product sync" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Transcript</Label>
            <Textarea rows={14} placeholder="Paste the meeting transcript or your notes here…" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </div>
          <Button type="submit" disabled={mutation.isPending || transcript.trim().length < 10} className="w-full bg-gradient-brand text-primary-foreground shadow-brand">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Summarize meeting
          </Button>
        </form>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Summary</h3>
            {summary && (
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Copied"); }}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />Copy
              </Button>
            )}
          </div>
          {mutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</div>
          ) : summary ? (
            <article className="prose prose-sm max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">Your summary, decisions, action items and next steps will appear here.</p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Recent meetings</h3>
        {history.data && history.data.length ? (
          <ul className="divide-y">
            {history.data.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSummary(m.summary)}>View</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No summaries yet.</p>
        )}
      </section>
    </div>
  );
}
