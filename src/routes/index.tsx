import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, FileText, ListChecks, Search, Bot, Sparkles } from "lucide-react";
import logo from "@/assets/workflow-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WorkFlow AI — Your Intelligent Workplace Assistant" },
      { name: "description", content: "Draft emails, summarize meetings, plan tasks, research and get instant workplace answers — all in one AI-powered workspace." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mail, title: "Smart Email Generator", desc: "Draft, reply and rewrite emails in any tone." },
  { icon: FileText, title: "Meeting Notes", desc: "Turn transcripts into summaries and action items." },
  { icon: ListChecks, title: "AI Task Planner", desc: "Prioritise your day and stay on top of deadlines." },
  { icon: Search, title: "Research Assistant", desc: "Fast, sourced summaries on any workplace topic." },
  { icon: Bot, title: "AI Chatbot", desc: "Instant answers to your workplace questions." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="WorkFlow AI logo" width={36} height={36} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">WorkFlow AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <section className="text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by artificial intelligence
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Your Intelligent{" "}
            <span className="text-gradient-brand">Workplace Assistant</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Automate routine tasks, stay organised, and focus on what matters most.
            WorkFlow AI drafts emails, summarizes meetings, plans your day and answers workplace questions in seconds.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="rounded-lg border bg-card px-6 py-3 text-sm font-semibold shadow-card">
              Explore features
            </a>
          </div>
        </section>

        <section id="features" className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-brand">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center text-primary-foreground shadow-brand">
          <h2 className="text-3xl font-bold">Less admin. More impact.</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Get back hours every week. WorkFlow AI takes care of the busywork so you can focus on meaningful work.
          </p>
          <Link to="/auth" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-6 py-3 text-sm font-semibold text-primary shadow-card">
            Start now <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t bg-background/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WorkFlow AI — Your Intelligent Workplace Assistant
      </footer>
    </div>
  );
}
