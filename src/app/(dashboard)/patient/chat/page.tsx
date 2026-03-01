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
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-4">Chat</h1>
        <p className="text-stone-600 leading-relaxed">Select a check-in from My check-ins or start a new one.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-4">Check-in</h1>
      <ChatThread checkInId={checkInId} />
    </div>
  );
}

export default function PatientChatPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ChatContent />
    </Suspense>
  );
}
