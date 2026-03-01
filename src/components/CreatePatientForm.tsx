"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

type Result = {
  name: string;
  email: string;
  linked?: boolean;
  inviteUrl?: string;
  emailSent?: boolean;
};

export function CreatePatientForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/doctor/create-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create patient");
      }
      return res.json() as Promise<Result>;
    },
    onSuccess: (data) => {
      setResult(data);
      setName("");
      setEmail("");
      onCreated?.();
    },
  });

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors text-sm"
      >
        + Add patient
      </button>
    );
  }

  return (
    <div className="border border-stone-200 rounded-lg p-5 max-w-md bg-white">
      <h2 className="font-semibold text-stone-900 mb-3">Register new patient</h2>
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="text-green-700 font-medium">
            {result.linked ? "Existing patient linked." : "Patient account created."}
          </p>
          <p className="text-stone-700">
            <span className="text-stone-500">Name:</span> {result.name}
          </p>
          <p className="text-stone-700">
            <span className="text-stone-500">Email:</span> {result.email}
          </p>

          {result.emailSent ? (
            <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
              <span className="text-green-600 mt-0.5">✓</span>
              <p className="text-green-700">
                A password setup email has been sent to <strong>{result.email}</strong>.
                The link expires in 7 days.
              </p>
            </div>
          ) : result.inviteUrl ? (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <p className="text-amber-700 text-xs mb-1.5">
                  Email invite not configured — share this login link with the patient manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1 text-stone-700 truncate">
                    {result.inviteUrl}
                  </code>
                  <button
                    onClick={() => copyLink(result.inviteUrl!)}
                    className="shrink-0 text-xs px-2.5 py-1 rounded border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-400">
                To enable automatic invite emails, add a Management API M2M app in your Auth0 dashboard and set{" "}
                <code className="bg-stone-100 px-1 rounded">AUTH0_MANAGEMENT_CLIENT_ID</code> /{" "}
                <code className="bg-stone-100 px-1 rounded">AUTH0_MANAGEMENT_CLIENT_SECRET</code> in{" "}
                <code className="bg-stone-100 px-1 rounded">.env</code>.
              </p>
            </div>
          ) : null}

          <button
            onClick={() => { setResult(null); setOpen(false); setCopied(false); }}
            className="mt-1 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 text-sm transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-stone-600 mb-1">Patient name</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-600 mb-1">Email</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="patient@example.com"
            />
          </div>
          <p className="text-xs text-stone-400">
            An invite email will be sent to the patient to set up their password.
          </p>
          {mutation.error && (
            <p className="text-red-600 text-sm">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 text-sm disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? "Creating…" : "Create patient"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium text-sm hover:bg-stone-50 hover:border-stone-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}