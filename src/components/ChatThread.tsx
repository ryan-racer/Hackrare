"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";

export function ChatThread({ checkInId }: { checkInId: string }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["check-in-messages", checkInId],
    queryFn: async () => {
      const res = await fetch(`/api/check-ins/${checkInId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/check-ins/${checkInId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["check-in-messages", checkInId], data);
      setInput("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) return <p className="text-neutral-500">Loading…</p>;

  const lastMessage = messages?.length ? messages[messages.length - 1] : null;
  const isAssistantLast = lastMessage?.role === "assistant";

  return (
    <div className="flex flex-col max-w-2xl">
      <div className="border dark:border-neutral-700 rounded-t-lg p-4 min-h-[300px] max-h-[50vh] overflow-y-auto space-y-3">
        {messages?.map((m: { id: string; role: string; content: string }) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {isAssistantLast && (
        <form
          className="flex gap-2 border border-t-0 dark:border-neutral-700 rounded-b-lg p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = input.trim();
            if (text && !sendMutation.isPending) {
              sendMutation.mutate(text);
            }
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            className="flex-1 rounded px-3 py-2 border dark:border-neutral-700 dark:bg-neutral-900"
            disabled={sendMutation.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="px-4 py-2 bg-neutral-800 text-white rounded hover:bg-neutral-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
      {sendMutation.isError && (
        <p className="text-red-600 text-sm mt-2">{(sendMutation.error as Error).message}</p>
      )}
    </div>
  );
}
