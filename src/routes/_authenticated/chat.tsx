import { createFileRoute, Outlet, useNavigate, useParams, Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Chat — WorkFlow AI" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeId = params.threadId;
  const qc = useQueryClient();
  const createFn = useServerFn(createThread);

  const threads = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_threads").select("id, title, updated_at").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () => createFn(),
    onSuccess: async ({ id }) => {
      await qc.invalidateQueries({ queryKey: ["chat-threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
      if (activeId === id) navigate({ to: "/chat" });
    },
  });

  const isIndex = pathname === "/chat";

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-7xl md:h-[calc(100dvh-0.5rem)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar/60 p-3 md:flex">
        <Button onClick={() => create.mutate()} disabled={create.isPending} className="mb-3 bg-gradient-brand text-primary-foreground shadow-brand">
          <Plus className="mr-1.5 h-4 w-4" /> New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {threads.data?.length ? threads.data.map((t) => (
            <div key={t.id} className={cn(
              "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
              activeId === t.id ? "bg-gradient-brand text-primary-foreground shadow-brand" : "hover:bg-sidebar-accent",
            )}>
              <Link to="/chat/$threadId" params={{ threadId: t.id }} className="flex min-w-0 flex-1 items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.title}</span>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); remove.mutate(t.id); }}
                className={cn("opacity-0 transition group-hover:opacity-100", activeId === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-destructive")}
                aria-label="Delete thread"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )) : (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {isIndex ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Ask WorkFlow AI anything</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Draft a message, ask about policies, summarize your day, or brainstorm — start a conversation to begin.
            </p>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="mt-5 bg-gradient-brand text-primary-foreground shadow-brand">
              <Plus className="mr-1.5 h-4 w-4" /> Start a chat
            </Button>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
