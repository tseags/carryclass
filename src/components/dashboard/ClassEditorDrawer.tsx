"use client";

import { useEffect, useState } from "react";
import type { VendorCalendarClass } from "@/lib/onboarding-db";
import { Drawer } from "./Drawer";
import { LocationInput } from "./LocationInput";
import { DASH_BTN_PRIMARY, DASH_BTN_SECONDARY, DASH_INPUT } from "./dashboard-theme";

interface Props {
  open: boolean;
  onClose: () => void;
  cls: VendorCalendarClass | null;
  onSaved: (updated: VendorCalendarClass) => void;
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine a YYYY-MM-DD date and HH:MM time (local) into an ISO string. */
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

const inputClass = DASH_INPUT;
const labelClass = "mb-1.5 block text-xs font-medium text-[#5C554C]";

export function ClassEditorDrawer({ open, onClose, cls, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [rangeLocation, setRangeLocation] = useState("");
  const [sameLocation, setSameLocation] = useState(true);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !cls) return;
    setTitle(cls.title ?? "");
    setDescription(cls.description ?? "");
    const classroom = cls.location ?? "";
    const range = cls.range_location ?? "";
    setLocation(classroom);
    setRangeLocation(range);
    setSameLocation(!range || range === classroom);
    setDate(toDateInput(cls.start_time));
    setStartTime(toTimeInput(cls.start_time));
    setEndTime(cls.end_time ? toTimeInput(cls.end_time) : "");
    setMaxStudents(cls.max_students != null ? String(cls.max_students) : "");
    setPrice(cls.price != null ? String(cls.price) : "");
    setError("");
  }, [open, cls]);

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

  if (!cls) return null;

  async function handleSave() {
    if (!cls) return;
    if (!date || !startTime) {
      setError("Date and start time are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const start_time = toIso(date, startTime);
      const end_time = endTime ? toIso(date, endTime) : cls.end_time;
      const classroom = location.trim();
      const range = sameLocation ? classroom : rangeLocation.trim();
      const res = await fetch(`/api/dashboard/classes/${cls.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim(),
          location: classroom,
          range_location: range,
          start_time,
          end_time,
          max_students: maxStudents,
          price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to save changes.");
        return;
      }
      onSaved(data.class as VendorCalendarClass);
      onClose();
    } catch {
      setError("Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Edit class"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={DASH_BTN_SECONDARY}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={DASH_BTN_PRIMARY}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label className={labelClass}>Class name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CCW Initial Training"
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-medium text-[#5C554C]">
              Class description
            </label>
            <button
              type="button"
              onClick={handlePolish}
              disabled={!description.trim() || polishing}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E3DDD4] bg-white px-2.5 py-1 text-xs font-medium text-[#3D3730] hover:bg-[#FBF9F6] disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
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

          <label className="flex items-center gap-2 text-xs font-medium text-[#5C554C]">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => setSameLocation(e.target.checked)}
              className="h-4 w-4 rounded border-[#D6CEC3] text-[#C1440E] focus:ring-[#C1440E]"
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#5C554C]">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5C554C]">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5C554C]">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5C554C]">Max students</label>
            <input
              type="number"
              min="0"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5C554C]">Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              className={inputClass}
            />
          </div>
        </div>

        <p className="text-xs text-[#8A837A]">
          {cls.is_recurring
            ? "This is a recurring class. Edits apply to this entry."
            : "This is a one-time class."}
        </p>
      </div>
    </Drawer>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin text-[#7A7268]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
