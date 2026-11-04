"use client";

import { useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import {
  CALL_DISPOSITIONS,
  DISPOSITION_LABELS,
  formatDayShort,
  stageAfterCall,
  type CallDisposition,
  type OutreachStageId,
  STAGE_LABELS,
} from "@/lib/outreach/sequence";
import { formatDuration, primaryButtonClass, secondaryButtonClass, telHref } from "./outreach-ui";

let devicePromise: Promise<Device> | null = null;

async function fetchVoiceToken(): Promise<string> {
  const res = await fetch("/api/outreach/twilio/token");
  const json = (await res.json()) as { token?: string; error?: string };
  if (!res.ok || !json.token) throw new Error(json.error ?? "Couldn't start calling");
  return json.token;
}

/** One browser Device for the page; created on the first call. */
function getDevice(): Promise<Device> {
  devicePromise ??= (async () => {
    const { Device } = await import("@twilio/voice-sdk");
    const device = new Device(await fetchVoiceToken(), { closeProtection: true });
    device.on("tokenWillExpire", async () => {
      device.updateToken(await fetchVoiceToken());
    });
    return device;
  })().catch((e) => {
    devicePromise = null;
    throw e;
  });
  return devicePromise;
}

function toE164(phone: string): string {
  return `+1${phone.replace(/\D/g, "").slice(-10)}`;
}

type CallState =
  | { kind: "idle" }
  | { kind: "connecting"; phone: string }
  | { kind: "live"; phone: string; startedAt: number }
  | { kind: "log"; phone: string | null; seconds: number | null; callSid: string | null };

export interface LogCallInput {
  disposition: CallDisposition;
  phone: string | null;
  durationSeconds: number | null;
  twilioCallSid: string | null;
  body: string | null;
}

export function OutreachCallPanel({
  contactId,
  phones,
  stage,
  disabled,
  voiceMissing,
  callerId,
  onLog,
  onActiveChange,
}: {
  contactId: string;
  phones: string[];
  stage: OutreachStageId;
  disabled: boolean;
  voiceMissing: string[];
  callerId: string | null;
  onLog: (input: LogCallInput) => Promise<void>;
  onActiveChange: (active: boolean) => void;
}) {
  const voiceReady = voiceMissing.length === 0;
  const [state, setState] = useState<CallState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [disposition, setDisposition] = useState<CallDisposition | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const callRef = useRef<Call | null>(null);

  const live = state.kind === "connecting" || state.kind === "live";
  useEffect(() => onActiveChange(live), [live, onActiveChange]);

  useEffect(() => {
    if (state.kind !== "live") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - state.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => () => callRef.current?.disconnect(), []);

  async function startCall(phone: string) {
    setError(null);
    setMuted(false);
    setElapsed(0);
    setState({ kind: "connecting", phone });
    try {
      const device = await getDevice();
      const call = await device.connect({ params: { To: toE164(phone), contactId } });
      callRef.current = call;
      let startedAt: number | null = null;
      call.on("accept", () => {
        startedAt = Date.now();
        setState({ kind: "live", phone, startedAt });
      });
      const finish = () => {
        callRef.current = null;
        const sid = (call.parameters?.CallSid as string | undefined) ?? null;
        setState({
          kind: "log",
          phone,
          seconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
          callSid: sid,
        });
      };
      call.on("disconnect", finish);
      call.on("cancel", finish);
      call.on("reject", finish);
      call.on("error", (e: { message?: string }) => {
        setError(e?.message ?? "The call failed");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the call");
      setState({ kind: "idle" });
    }
  }

  function hangUp() {
    callRef.current?.disconnect();
  }

  function toggleMute() {
    const next = !muted;
    callRef.current?.mute(next);
    setMuted(next);
  }

  async function saveLog() {
    if (state.kind !== "log" || !disposition) return;
    setSaving(true);
    setError(null);
    try {
      await onLog({
        disposition,
        phone: state.phone,
        durationSeconds: state.seconds,
        twilioCallSid: state.callSid,
        body: note.trim() || null,
      });
      setState({ kind: "idle" });
      setDisposition(null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the call");
    } finally {
      setSaving(false);
    }
  }

  const after = stageAfterCall({ stage, nextActionAt: null });
  const stageHint =
    after.stage !== stage
      ? `Saving moves this to ${STAGE_LABELS[after.stage]}${
          after.nextActionAt ? ` and sets the email for ${formatDayShort(after.nextActionAt)}` : ""
        }.`
      : null;

  if (disabled) {
    return <p className="text-sm text-gray-500">Calling is off for contacts marked do not contact.</p>;
  }

  if (state.kind === "connecting" || state.kind === "live") {
    return (
      <div className="rounded-lg border border-[#C1440E]/30 bg-[#C1440E]/5 p-4">
        <p className="text-sm font-medium text-gray-900">
          {state.kind === "connecting" ? "Calling" : "On call with"} {state.phone}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {state.kind === "live" ? formatDuration(elapsed) : "Ringing…"} · Not recorded
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={hangUp} className={primaryButtonClass}>
            Hang up
          </button>
          {state.kind === "live" && (
            <button type="button" onClick={toggleMute} className={secondaryButtonClass}>
              {muted ? "Unmute" : "Mute"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (state.kind === "log") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">How did the call go?</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {[state.phone, formatDuration(state.seconds)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CALL_DISPOSITIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDisposition(d)}
              aria-pressed={disposition === d}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                disposition === d
                  ? "border-[#C1440E]/40 bg-[#C1440E]/5 font-medium text-[#C1440E]"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {DISPOSITION_LABELS[d]}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="What did they say? (optional)"
          className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30"
        />
        {stageHint && <p className="mt-2 text-xs text-gray-500">{stageHint}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={saveLog} disabled={!disposition || saving} className={primaryButtonClass}>
            {saving ? "Saving…" : "Save call"}
          </button>
          <button
            type="button"
            onClick={() => {
              setState({ kind: "idle" });
              setDisposition(null);
            }}
            className={secondaryButtonClass}
          >
            Discard
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phones.length === 0 ? (
        <p className="text-sm text-gray-500">No phone number on file.</p>
      ) : (
        <ul className="space-y-2">
          {phones.map((phone) => (
            <li key={phone} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-gray-900">{phone}</span>
              <span className="flex items-center gap-3">
                <a
                  href={telHref(phone)}
                  onClick={() => setState({ kind: "log", phone, seconds: null, callSid: null })}
                  className="text-sm font-medium text-[#C1440E] hover:underline"
                >
                  Call on my phone
                </a>
                {voiceReady && (
                  <button type="button" onClick={() => startCall(phone)} className={primaryButtonClass}>
                    Call
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {voiceReady ? (
        callerId && <p className="text-xs text-gray-500">Calls show caller ID {callerId}. Calls are not recorded.</p>
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Browser calling is off. Missing: {voiceMissing.join(", ")}.
        </p>
      )}
      <button
        type="button"
        onClick={() => setState({ kind: "log", phone: phones[0] ?? null, seconds: null, callSid: null })}
        className="!bg-transparent text-sm font-medium text-[#C1440E] hover:underline"
      >
        Log a call I made
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
