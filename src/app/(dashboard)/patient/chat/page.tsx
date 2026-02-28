"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatThread } from "@/components/ChatThread";

function ChatContent() {
  const searchParams = useSearchParams();
  const checkInId = searchParams.get("id");

  if (!checkInId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Chat</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Select a check-in from My check-ins or start a new one.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Check-in</h1>
      <ChatThread checkInId={checkInId} />
    </div>
  );
}

export default function PatientChatPage() {
  return (
    <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
      <ChatContent />
    </Suspense>
  );
}
