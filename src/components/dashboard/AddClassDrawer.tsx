"use client";

import { useEffect, useState } from "react";
import type { VendorCalendarClass, VendorClassType } from "@/lib/onboarding-db";
import { Drawer } from "./Drawer";
import { LocationInput } from "./LocationInput";

interface Props {
  open: boolean;
  onClose: () => void;
  classTypes: VendorClassType[];
  onSaved: (created: VendorCalendarClass, classTypes: VendorClassType[]) => void;
}

type Recurrence = "one-time" | "weekly" | "biweekly" | "monthly";

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "one-time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480, 960];

const WEEKDAY_RRULE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CLASS_TYPE_LABELS: Record<string, string> = {
  initial: "CCW Initial Training",
  renewal: "CCW Renewal Training",
  add_a_gun: "Add a Gun",
};

type GunKey = "gun2" | "gun3" | "gun4" | "gun5" | "gun6";
const GUN_FIELDS: { key: GunKey; label: string }[] = [
  { key: "gun2", label: "2nd Gun" },
  { key: "gun3", label: "3rd Gun" },
  { key: "gun4", label: "4th Gun" },
  { key: "gun5", label: "5th Gun" },
  { key: "gun6", label: "6th Gun" },
];

type GunPricingForm = {
  rangeFee: string;
  gun2: string;
  gun3: string;
  gun4: string;
  gun5: string;
  gun6: string;
  sameForAll: boolean;
};

const EMPTY_GUN_PRICING: GunPricingForm = {
  rangeFee: "",
  gun2: "",
  gun3: "",
  gun4: "",
  gun5: "",
  gun6: "",
  sameForAll: true,
};

/** Canonical class types — always offered regardless of what the vendor has active. */
const CANONICAL_CLASS_TYPES = ["initial", "renewal", "add_a_gun"] as const;

/** Build an iCal RRULE string from a recurrence choice + start date. */
function buildRecurrenceRule(
  recurrence: Recurrence,
  startDate: string,
  endDate: string
): string | null {
  if (recurrence === "one-time" || !startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const parts: string[] = [];
  if (recurrence === "weekly") {
    parts.push("FREQ=WEEKLY", `BYDAY=${WEEKDAY_RRULE[start.getDay()]}`);
  } else if (recurrence === "biweekly") {
    parts.push("FREQ=WEEKLY", "INTERVAL=2", `BYDAY=${WEEKDAY_RRULE[start.getDay()]}`);
  } else if (recurrence === "monthly") {
    parts.push("FREQ=MONTHLY", `BYMONTHDAY=${start.getDate()}`);
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (!Number.isNaN(end.getTime())) {
      parts.push(`UNTIL=${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    }
  }
  return parts.join(";");
}

/** Human-readable summary like "Every Monday at 9:00 AM". */
function describeRecurrence(
  recurrence: Recurrence,
  date: string,
  startTime: string
): string {
  const time = startTime
    ? new Date(`2000-01-01T${startTime}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const start = date ? new Date(`${date}T00:00:00`) : null;
  const weekday = start ? WEEKDAY_NAMES[start.getDay()] : "";
  switch (recurrence) {
    case "weekly":
      return `Every ${weekday}${time ? ` at ${time}` : ""}`;
    case "biweekly":
      return `Every other ${weekday}${time ? ` at ${time}` : ""}`;
    case "monthly":
      return `Monthly on day ${start ? start.getDate() : ""}${time ? ` at ${time}` : ""}`;
    default:
      return "";
  }
}

/**
 * Convert the gun-pricing form into the payload shape. When "same price for
 * every additional gun" is on, the 2nd-gun value is applied to guns 3–6.
 */
function buildGunPricingPayload(form: GunPricingForm) {
  const perGun = form.sameForAll
    ? {
        gun2: form.gun2,
        gun3: form.gun2,
        gun4: form.gun2,
        gun5: form.gun2,
        gun6: form.gun2,
      }
    : {
        gun2: form.gun2,
        gun3: form.gun3,
        gun4: form.gun4,
        gun5: form.gun5,
        gun6: form.gun6,
      };
  return {
    rangeFee: form.rangeFee,
    ...perGun,
    sameForAll: form.sameForAll,
  };
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]";
const labelClass = "mb-1.5 block text-xs font-medium text-gray-600";

export function AddClassDrawer({ open, onClose, classTypes, onSaved }: Props) {
  // Always offer the three canonical types; merge in the vendor's own rows for
  // price defaults, but never drop a type just because it isn't active yet.
  const allClassTypes: VendorClassType[] = CANONICAL_CLASS_TYPES.map((key) => {
    const existing = classTypes.find((ct) => ct.class_type === key);
    return (
      existing ?? { id: key, vendor_id: "", class_type: key, price: 0, is_active: true }
    );
  });

  const [recurrence, setRecurrence] = useState<Recurrence>("one-time");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [classType, setClassType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [rangeLocation, setRangeLocation] = useState("");
  const [sameLocation, setSameLocation] = useState(true);
  const [maxStudents, setMaxStudents] = useState("");
  const [price, setPrice] = useState("");
  const [gunPricing, setGunPricing] = useState<GunPricingForm>(EMPTY_GUN_PRICING);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = allClassTypes[0];
    setRecurrence("one-time");
    setDate("");
    setEndDate("");
    setStartTime("");
    setDuration(60);
    setClassType(first?.class_type ?? "initial");
    setDescription("");
    setLocation("");
    setRangeLocation("");
    setSameLocation(true);
    setMaxStudents("");
    setPrice(first ? String(first.price || "") : "");
    setGunPricing(EMPTY_GUN_PRICING);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function priceForType(typeKey: string): string {
    return String(classTypes.find((ct) => ct.class_type === typeKey)?.price ?? "");
  }

  async function handlePolish() {
    if (!description.trim() || polishing) return;
    setPolishing(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/classes/polish-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to polish description.");
        return;
      }
      if (data.description) setDescription(data.description);
    } catch {
      setError("Unable to polish description.");
    } finally {
      setPolishing(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const summary = describeRecurrence(recurrence, date, startTime);

  async function handleSave() {
    if (!date || !startTime) {
      setError("Please fill in date and start time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const startDt = new Date(`${date}T${startTime}`);
      const endDt = new Date(startDt.getTime() + duration * 60000);
      const recurrenceRule = buildRecurrenceRule(recurrence, date, endDate);
      const isAddAGun = classType === "add_a_gun";
      const classroom = location.trim();
      const range = sameLocation ? classroom : rangeLocation.trim();

      const res = await fetch("/api/dashboard/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_type: classType,
          title: CLASS_TYPE_LABELS[classType] ?? classType,
          description: description.trim(),
          location: classroom,
          range_location: range,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          max_students: maxStudents,
          price: isAddAGun ? "" : price,
          gun_pricing: isAddAGun ? buildGunPricingPayload(gunPricing) : null,
          is_recurring: recurrence !== "one-time",
          recurrence_rule: recurrenceRule,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to add class.");
        return;
      }
      onSaved(
        data.class as VendorCalendarClass,
        (data.classTypes as VendorClassType[]) ?? []
      );
      onClose();
    } catch {
      setError("Unable to add class.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a class"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium !text-white hover:bg-black disabled:opacity-60 transition-colors"
            >
              {saving ? "Adding…" : "Add class"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label className={labelClass}>Repeats</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className={inputClass}
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {recurrence !== "one-time" && date && summary && (
            <p className="mt-1.5 text-xs text-gray-500">{summary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {recurrence === "one-time" ? "Date" : "Start date"}
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          {recurrence !== "one-time" && (
            <div>
              <label className={labelClass}>
                End date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={date || today}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputClass}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Class type</label>
          <select
            value={classType}
            onChange={(e) => {
              const val = e.target.value;
              setClassType(val);
              const next = priceForType(val);
              if (next) setPrice(next);
            }}
            className={inputClass}
          >
            {allClassTypes.map((ct) => (
              <option key={ct.class_type} value={ct.class_type}>
                {CLASS_TYPE_LABELS[ct.class_type] ?? ct.class_type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-600">
              Class description
            </label>
            <button
              type="button"
              onClick={handlePolish}
              disabled={!description.trim() || polishing}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              {polishing ? (
                <Spinner />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
              Polish
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What students will learn, what to bring, prerequisites…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Classroom location</label>
            <LocationInput
              value={location}
              onChange={setLocation}
              placeholder="Search for an address"
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => setSameLocation(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#C1440E] focus:ring-[#C1440E]"
            />
            Range location is the same as the classroom
          </label>

          {!sameLocation && (
            <div>
              <label className={labelClass}>Range location (for qualification)</label>
              <LocationInput
                value={rangeLocation}
                onChange={setRangeLocation}
                placeholder="Search for a range address"
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Max students</label>
            <input
              type="number"
              min="1"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
          {classType !== "add_a_gun" && (
            <div>
              <label className={labelClass}>Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {classType === "add_a_gun" && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-600">Add-a-Gun pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Range Fee Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gunPricing.rangeFee}
                  onChange={(e) =>
                    setGunPricing((p) => ({ ...p, rangeFee: e.target.value }))
                  }
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={gunPricing.sameForAll}
                onChange={(e) =>
                  setGunPricing((p) => ({ ...p, sameForAll: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-[#C1440E] focus:ring-[#C1440E]"
              />
              Same price for every additional gun
            </label>

            {gunPricing.sameForAll ? (
              <div>
                <label className={labelClass}>Price per additional gun ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gunPricing.gun2}
                  onChange={(e) =>
                    setGunPricing((p) => ({ ...p, gun2: e.target.value }))
                  }
                  placeholder="0.00"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Applies to the 2nd through 6th gun.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {GUN_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelClass}>{label} ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={gunPricing[key]}
                      onChange={(e) =>
                        setGunPricing((p) => ({ ...p, [key]: e.target.value }))
                      }
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
