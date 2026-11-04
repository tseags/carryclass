"use client";

import { useEffect, useState } from "react";
import type { ZohoMessageSummary } from "@/lib/outreach/zoho";

type ThreadState =
  | { kind: "loading" }
  | { kind: "not-connected"; missing: string[] }
  | { kind: "error"; message: string }
  | { kind: "ready"; messages: ZohoMessageSummary[] };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function OutreachZohoThread({
  contactId,
  emails,
  loggedMessageIds,
  onLogSent,
}: {
  contactId: string;
  emails: string[];
  loggedMessageIds: Set<string>;
  onLogSent: (message: ZohoMessageSummary) => Promise<void>;
}) {
  const [state, setState] = useState<ThreadState>({ kind: "loading" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [loggingId, setLoggingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    setOpenId(null);
    fetch(`/api/outreach/contacts/${contactId}/emails`)
      .then(async (res) => {
        const json = (await res.json()) as {
          connected?: boolean;
          missing?: string[];
          messages?: ZohoMessageSummary[];
          error?: string;
        };
        if (cancelled) return;
        if (json.connected === false) setState({ kind: "not-connected", missing: json.missing ?? [] });
        else if (!res.ok) setState({ kind: "error", message: json.error ?? "Couldn't load email" });
        else setState({ kind: "ready", messages: json.messages ?? [] });
      })
      .catch(() => !cancelled && setState({ kind: "error", message: "Couldn't load email" }));
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  async function toggle(message: ZohoMessageSummary) {
    if (openId === message.messageId) {
      setOpenId(null);
      return;
    }
    setOpenId(message.messageId);
    if (bodies[message.messageId] !== undefined) return;
    const res = await fetch(
      `/api/outreach/contacts/${contactId}/emails?messageId=${encodeURIComponent(message.messageId)}`
    );
    const json = (await res.json().catch(() => ({}))) as { text?: string };
    setBodies((prev) => ({ ...prev, [message.messageId]: json.text || message.summary || "(empty)" }));
  }

  if (state.kind === "not-connected") {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Zoho not connected. Missing: {state.missing.join(", ")}.
      </p>
    );
  }
  if (emails.length === 0) {
    return <p className="text-sm text-gray-500">No email address on file, so there&apos;s no thread to show.</p>;
  }
  if (state.kind === "loading") return <p className="text-sm text-gray-500">Loading email…</p>;
  if (state.kind === "error") return <p className="text-sm text-red-600">{state.message}</p>;
  if (state.messages.length === 0) {
    return <p className="text-sm text-gray-500">No emails with {emails.join(", ")} yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {state.messages.map((m) => {
        const open = openId === m.messageId;
        const outbound = m.direction === "outbound";
        return (
          <li key={m.messageId}>
            <button
              type="button"
              onClick={() => toggle(m)}
              className="block w-full !bg-transparent px-3 py-2.5 text-left hover:!bg-gray-50"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-gray-900">{m.subject}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    outbound ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {outbound ? "Sent" : "Received"}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {dateFormat.format(new Date(m.receivedAt))} · {outbound ? `to ${m.to}` : `from ${m.from}`}
              </span>
            </button>
            {open && (
              <div className="px-3 pb-3">
                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
                  {bodies[m.messageId] ?? "Loading…"}
                </p>
                {outbound && !loggedMessageIds.has(m.messageId) && (
                  <button
                    type="button"
                    disabled={loggingId === m.messageId}
                    onClick={async () => {
                      setLoggingId(m.messageId);
                      try {
                        await onLogSent(m);
                      } finally {
                        setLoggingId(null);
                      }
                    }}
                    className="mt-2 !bg-transparent text-sm font-medium text-[#C1440E] hover:underline disabled:opacity-50"
                  >
                    Log this as my outreach email
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
