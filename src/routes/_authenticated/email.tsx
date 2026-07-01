import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateEmail } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Sparkles, History } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/email")({
  head: () => ({ meta: [{ title: "Email Generator — WorkFlow AI" }] }),
  component: EmailPage,
});

const tones = ["professional", "friendly", "persuasive", "apologetic", "confident", "formal"] as const;

function EmailPage() {
  const [purpose, setPurpose] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]>("professional");
  const [recipient, setRecipient] = useState("");
  const [details, setDetails] = useState("");
  const [output, setOutput] = useState("");
  const qc = useQueryClient();
  const gen = useServerFn(generateEmail);

  const mutation = useMutation({
    mutationFn: () => gen({ data: { purpose, tone, recipient, details } }),
    onSuccess: (r) => {
      setOutput(r.output);
      qc.invalidateQueries({ queryKey: ["email-history"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate"),
  });

  const history = useQuery({
    queryKey: ["email-history"],
    queryFn: async () => {
      const { data } = await supabase.from("emails").select("id, purpose, tone, output, created_at").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  function copy() {
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader icon={<Mail className="h-5 w-5" />} title="Email Generator" desc="Draft professional emails in any tone — in seconds." />

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => { e.preventDefault(); if (purpose.trim()) mutation.mutate(); }}
          className="space-y-4 rounded-2xl border bg-card p-5 shadow-card"
        >
          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <Input required placeholder="e.g. Request a 3-day deadline extension" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tones.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recipient</Label>
              <Input placeholder="Manager, HR, Client…" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Extra details (optional)</Label>
            <Textarea rows={5} placeholder="Add any context, dates, names, or specific points to include." value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <Button type="submit" disabled={mutation.isPending || !purpose.trim()} className="w-full bg-gradient-brand text-primary-foreground shadow-brand">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate email
          </Button>
        </form>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Generated email</h3>
            {output && <Button variant="ghost" size="sm" onClick={copy}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</Button>}
          </div>
          {mutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
            </div>
          ) : output ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{output}</div>
          ) : (
            <p className="text-sm text-muted-foreground">Your generated email will appear here.</p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Recent emails</h3>
        {history.data && history.data.length > 0 ? (
          <ul className="divide-y">
            {history.data.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.purpose}</div>
                    <div className="text-xs text-muted-foreground capitalize">{e.tone} · {new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setOutput(e.output)}>View</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No emails yet — generate your first above.</p>
        )}
      </section>
    </div>
  );
}

export function PageHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">{icon}</div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </header>
  );
}
// keep ReactMarkdown import in case referenced by others
export const _rm = ReactMarkdown;
