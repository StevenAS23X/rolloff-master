"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, useCurrentAccount } from "@/lib/store";
import { Hydrated } from "@/components/Hydrated";
import { DumpsterStatusBadge } from "@/components/StatusBadge";
import { DumpsterStatus } from "@/lib/types";

export default function AdminDumpsterEditPage() {
  return (
    <Hydrated>
      <AdminDumpsterEditContent />
    </Hydrated>
  );
}

function AdminDumpsterEditContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const account = useCurrentAccount();
  const dumpsters = useStore((s) => s.dumpsters);
  const updateDumpster = useStore((s) => s.updateDumpster);
  const addDumpsterServiceNote = useStore((s) => s.addDumpsterServiceNote);

  const dumpster = dumpsters.find((d) => d.id === params.id);
  const [noteText, setNoteText] = useState("");

  if (account?.role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Admin access only.</p>
      </div>
    );
  }

  if (!dumpster) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">Dumpster not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const dumpsterId = dumpster.id;

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !account) return;
    addDumpsterServiceNote(dumpsterId, noteText.trim(), account.name);
    setNoteText("");
  }

  const history = dumpster.status_history.slice().sort((a, b) => (a.since < b.since ? 1 : -1));
  const notes = dumpster.service_notes.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <button
          onClick={() => router.push("/admin")}
          className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to admin
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Box #{dumpster.id} · {dumpster.size_yards}yd
          </h1>
          <DumpsterStatusBadge status={dumpster.status} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Status</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Current Status</span>
          <select
            value={dumpster.status}
            onChange={(e) => updateDumpster(dumpsterId, { status: e.target.value as DumpsterStatus })}
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="idle">Idle</option>
            <option value="in-service">In Service</option>
            <option value="out-of-service">Out of Service</option>
          </select>
        </label>

        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Status Timeline
        </h3>
        <ul className="flex flex-col divide-y divide-slate-100">
          {history.map((entry, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <DumpsterStatusBadge status={entry.status} />
              <span className="text-slate-500">{new Date(entry.since).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Service Record ({notes.length})
        </h2>
        {notes.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">No service notes logged yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="py-2">
                <p className="text-sm text-slate-800">{n.note}</p>
                <p className="text-xs text-slate-400">
                  {n.createdBy} — {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddNote} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Flat tire, sent to yard for repair"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            disabled={!noteText.trim()}
            className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add Note
          </button>
        </form>
      </div>
    </div>
  );
}
