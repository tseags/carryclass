"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LookupOk = {
  vendorName: string;
  vendorSlug: string;
  classTitle: string | null;
  startsAt: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  classAmountCents: number;
  serviceFeeCents: number;
  totalAmountCents: number;
  status: string;
};

type Props = { slug: string; sessionId: string };

export function BookingSuccessClient({ slug, sessionId }: Props) {
  const [data, setData] = useState<LookupOk | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    async function tick() {
      const res = await fetch(`/api/bookings/lookup?session_id=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const json = (await res.json()) as LookupOk;
        if (!cancelled) setData(json);
        return true;
      }
      return false;
    }

    async function run() {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        const ok = await tick();
        if (ok) return;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!data) {
    return <p className="text-zinc-600">Confirming your booking...</p>;
  }

  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: data.timezone || "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(data.startsAt));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">You're booked</p>
        <h2 className="mt-2 text-xl font-bold text-zinc-900">{data.vendorName}</h2>
        <p className="mt-1 text-zinc-700">{data.classTitle ?? "CCW class"} - {when}</p>
      </div>

      <Link href={`/vendors/${slug}`} className="btn-primary bg-secondary-2 small w-button inline-block w-full text-center">
        Back to vendor
      </Link>
    </div>
  );
}
