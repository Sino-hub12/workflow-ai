import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Bot } from "lucide-react";
import logo from "@/assets/workflow-logo.png";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: initialMessages } = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: async (): Promise<UIMessage[]> => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, parts, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      return (data ?? []).map((r) => ({
        id: r.id,
        role: r.role as UIMessage["role"],
        parts: r.parts as UIMessage["parts"],
      }));
    },
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token ?? "";
          return {
            body: { messages, threadId, ...body },
            headers: { Authorization: `Bearer ${token}` },
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId,
    transport,
    onError: (e) => console.error(e),
  });

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [threadId, status]);

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={logo} alt="" width={48} height={48} className="rounded-xl" />}
              title="How can I help today?"
              description="Ask about workplace policies, draft an email, summarize a document, or plan your day."
            />
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent
                  className={m.role === "assistant" ? "bg-transparent p-0 text-foreground" : undefined}
                >
                  {m.parts.map((p, i) =>
                    p.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">{p.text}</span>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent className="bg-transparent p-0 text-foreground">
                <span className="inline-flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <Shimmer>Thinking…</Shimmer>
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-3 pb-4">
        <PromptInput
          onSubmit={(_msg, e) => { e.preventDefault(); void handleSend(); }}
        >
          <PromptInputTextarea
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask WorkFlow AI…"
            disabled={busy}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={busy || !input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
