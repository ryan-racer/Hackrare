"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";

type Message = { id: string; role: string; content: string; createdAt: string };

function ChatUI({ chatId }: { chatId: string }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["general-chat-messages", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/general-chat/${chatId}/messages`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/general-chat/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["general-chat-messages", chatId], data);
      setInput("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col min-w-[720px]">
      <div className="border dark:border-neutral-700 rounded-t-lg p-4 min-h-[600px] max-h-[65vh] overflow-y-auto space-y-3">
        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex border-x border-b dark:border-neutral-700 rounded-b-lg overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) sendMutation.mutate(input.trim());
        }}
      >
        <input
          className="flex-1 px-4 py-3 text-sm dark:bg-neutral-900 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sendMutation.isPending ? "Waiting for response…" : "Type how you're feeling…"}
          disabled={sendMutation.isPending}
        />
        <button
          type="submit"
          disabled={sendMutation.isPending || !input.trim()}
          className="px-5 py-3 text-sm bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {sendMutation.error && (
        <p className="text-red-500 text-xs mt-1">{(sendMutation.error as Error).message}</p>
      )}
    </div>
  );
}

export function GeneralChatSection() {
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const { data: chats, isLoading } = useQuery<{ id: string; title: string | null; createdAt: string }[]>({
    queryKey: ["general-chats"],
    queryFn: async () => {
      const res = await fetch("/api/general-chat");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const newChatMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/general-chat", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start chat");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["general-chats"] });
      setActiveChatId(data.id);
    },
  });

  // Auto-open latest chat
  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Chat with AI</h2>
        <button
          onClick={() => newChatMutation.mutate()}
          disabled={newChatMutation.isPending}
          className="px-3 py-1.5 text-sm rounded bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {newChatMutation.isPending ? "Starting…" : "+ New chat"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : (
        <div className="flex gap-4">
          {/* Sidebar: past chats */}
          {chats && chats.length > 1 && (
            <div className="w-40 shrink-0 space-y-1">
              {chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChatId(c.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${
                    c.id === activeChatId
                      ? "bg-neutral-200 dark:bg-neutral-700"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {c.title ?? new Date(c.createdAt).toLocaleDateString()}
                </button>
              ))}
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 min-w-[860px]">
            {activeChatId ? (
              <ChatUI chatId={activeChatId} />
            ) : (
              <p className="text-neutral-500 text-sm">
                Start a new chat to tell the AI how you&apos;re feeling.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
