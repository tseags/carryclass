"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { VendorProfile, VendorClassType, VendorCalendarClass } from "@/lib/onboarding-db";

const CLASS_TYPE_LABELS: Record<string, string> = {
  initial: "CCW Initial License",
  renewal: "CCW Renewal",
  add_a_gun: "Add-A-Gun",
};

function policyLabel(
  policy: string | null,
  hours: number | null,
  refundPercent: number | null
): string {
  switch (policy) {
    case "none":
      return "No refunds — all sales are final";
    case "anytime":
      return "Full refund anytime before class";
    case "full_hours_before":
      return `Full refund up to ${hours} hours before class`;
    case "partial_hours_before":
      return `${refundPercent}% refund up to ${hours} hours before class`;
    default:
      return "Not set";
  }
}

interface Props {
  vendor: VendorProfile;
  classTypes: VendorClassType[];
  calendarClasses: VendorCalendarClass[];
}

export function Step6Review({ vendor, classTypes, calendarClasses }: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const activeTypes = classTypes.filter((ct) => ct.is_active);
  const activeClasses = calendarClasses.filter((c) => c.is_active);

  async function handlePublish() {
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/step/6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      router.push("/dashboard/vendor");
    } catch {
      setError("Failed to publish. Please try again.");
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <SummaryCard title="Profile" editHref="/onboard/step/1">
        <div className="flex items-start gap-3">
          {vendor.photo_url && (
            <img
              src={vendor.photo_url}
              alt={vendor.name ?? "Profile"}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div>
            <p className="font-medium text-zinc-800">{vendor.name ?? "(No name)"}</p>
            {vendor.county && (
              <p className="text-sm text-zinc-500">{vendor.county} County</p>
            )}
            {vendor.bio && (
              <p className="text-sm text-zinc-600 mt-1 line-clamp-2">
                {vendor.bio.slice(0, 100)}{vendor.bio.length > 100 ? "…" : ""}
              </p>
            )}
            {vendor.badge_tags && vendor.badge_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {vendor.badge_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </SummaryCard>

      {/* Class types */}
      <SummaryCard title="Class types" editHref="/onboard/step/2">
        {activeTypes.length > 0 ? (
          <div className="space-y-1">
            {activeTypes.map((ct) => (
              <div key={ct.id} className="flex justify-between items-center">
                <span className="text-sm text-zinc-700">
                  {CLASS_TYPE_LABELS[ct.class_type] ?? ct.class_type}
                </span>
                <span className="text-sm font-medium text-zinc-800">
                  ${Number(ct.price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No class types configured</p>
        )}
      </SummaryCard>

      {/* Schedule */}
      <SummaryCard title="Schedule" editHref="/onboard/step/3">
        {vendor.calendar_type === "google" && (
          <p className="text-sm text-zinc-700">
            Google Calendar connected ·{" "}
            <span className="font-medium">{activeClasses.length} classes imported</span>
          </p>
        )}
        {vendor.calendar_type === "ical" && (
          <p className="text-sm text-zinc-700">
            iCal feed ·{" "}
            <span className="font-medium">{activeClasses.length} classes imported</span>
          </p>
        )}
        {vendor.calendar_type === "manual" && (
          <p className="text-sm text-zinc-700">
            Manual schedule ·{" "}
            <span className="font-medium">{activeClasses.length} class slots added</span>
          </p>
        )}
        {!vendor.calendar_type && (
          <p className="text-sm text-zinc-400">No schedule configured</p>
        )}
      </SummaryCard>

      {/* Cancellation */}
      <SummaryCard title="Cancellation policy" editHref="/onboard/step/4">
        <p className="text-sm text-zinc-700">
          {policyLabel(
            vendor.cancellation_policy,
            vendor.cancellation_hours,
            vendor.cancellation_refund_percent
          )}
        </p>
      </SummaryCard>

      {/* Stripe */}
      <SummaryCard title="Payments" editHref="/onboard/step/5">
        {vendor.stripe_account_id ? (
          <div className="flex items-center gap-1.5 text-emerald-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Stripe connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-yellow-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm">Not connected — paid bookings unavailable until you connect</span>
          </div>
        )}
      </SummaryCard>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="btn-primary width-100 w-button onboard-publish-btn inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {publishing && <Spinner />}
          {publishing ? "Publishing…" : "Publish My Listing"}
        </button>
        <p className="text-xs text-center text-zinc-400 mt-3">
          Your listing will be visible to students on CarryClass after publishing.
        </p>
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/5")}
          className="btn-secondary w-button"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        <Link
          href={editHref}
          className="text-xs text-zinc-500 hover:text-zinc-800 underline"
        >
          Edit
        </Link>
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
