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

  if (isLoading) return <p className="text-stone-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col min-w-0 w-full">
      <div className="border border-stone-200 rounded-t-lg p-4 min-h-[400px] max-h-[60vh] overflow-y-auto space-y-3 bg-white">
        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-stone-900 text-stone-50"
                  : "bg-stone-100 text-stone-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex border border-t-0 border-stone-200 rounded-b-lg overflow-hidden bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) sendMutation.mutate(input.trim());
        }}
      >
        <input
          className="flex-1 px-4 py-3 text-sm bg-white text-stone-900 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-200"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sendMutation.isPending ? "Waiting for response…" : "Type how you're feeling…"}
          disabled={sendMutation.isPending}
        />
        <button
          type="submit"
          disabled={sendMutation.isPending || !input.trim()}
          className="px-5 py-3 text-sm bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Chat with AI</h2>
        <button
          onClick={() => newChatMutation.mutate()}
          disabled={newChatMutation.isPending}
          className="px-4 py-2 text-sm rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
        >
          {newChatMutation.isPending ? "Starting…" : "+ New chat"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-stone-500 text-sm">Loading…</p>
      ) : (
        <div className="flex gap-4">
          {/* Sidebar: past chats */}
          {chats && chats.length > 1 && (
            <div className="w-40 shrink-0 space-y-1">
              {chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChatId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                    c.id === activeChatId
                      ? "bg-stone-100 text-stone-900 font-medium"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  {c.title ?? new Date(c.createdAt).toLocaleDateString()}
                </button>
              ))}
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 min-w-0">
            {activeChatId ? (
              <ChatUI chatId={activeChatId} />
            ) : (
              <p className="text-stone-600 text-sm">
                Start a new chat to tell the AI how you&apos;re feeling.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
