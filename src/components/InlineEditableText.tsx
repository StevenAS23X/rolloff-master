"use client";

import { useEffect, useRef, useState } from "react";

export function InlineEditableText({
  value,
  onSave,
  editable,
  placeholder = "No notes yet.",
}: {
  value: string;
  onSave: (value: string) => void;
  editable: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(draft.length, draft.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function startEditing() {
    if (!editable) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
        rows={3}
        className="w-full rounded-md border border-slate-400 dark:border-slate-600 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      disabled={!editable}
      className={`w-full rounded-md border border-transparent px-3 py-2 text-left text-sm ${
        editable ? "cursor-text hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" : "cursor-default"
      } ${value ? "text-slate-800 dark:text-slate-200" : "italic text-slate-400 dark:text-slate-500"}`}
      title={editable ? "Click to edit" : undefined}
    >
      {value || placeholder}
    </button>
  );
}
