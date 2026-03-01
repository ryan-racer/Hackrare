"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

type Result = { name: string; email: string; tempPassword?: string; linked?: boolean };

export function CreatePatientForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);

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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 text-sm"
      >
        + Add patient
      </button>
    );
  }

  return (
    <div className="border dark:border-neutral-700 rounded-lg p-4 max-w-md">
      <h2 className="font-semibold mb-3">Register new patient</h2>
      {result ? (
        <div className="space-y-2 text-sm">
          <p className="text-green-600 dark:text-green-400 font-medium">
            {result.linked ? "Existing patient linked." : "Patient account created."}
          </p>
          <p><span className="text-neutral-500">Name:</span> {result.name}</p>
          <p><span className="text-neutral-500">Email:</span> {result.email}</p>
          {result.tempPassword && (
            <p>
              <span className="text-neutral-500">Temp password:</span>{" "}
              <code className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">
                {result.tempPassword}
              </code>
              <span className="text-neutral-400 ml-2">(share this with the patient)</span>
            </p>
          )}
          <button
            onClick={() => { setResult(null); setOpen(false); }}
            className="mt-2 px-3 py-1.5 rounded bg-neutral-800 text-white hover:bg-neutral-700 text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Patient name</label>
            <input
              className="w-full border dark:border-neutral-600 rounded px-3 py-2 text-sm dark:bg-neutral-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
            <input
              className="w-full border dark:border-neutral-600 rounded px-3 py-2 text-sm dark:bg-neutral-900"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="patient@example.com"
            />
          </div>
          {mutation.error && (
            <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded bg-neutral-800 text-white hover:bg-neutral-700 text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "Creating…" : "Create patient"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded border dark:border-neutral-600 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
