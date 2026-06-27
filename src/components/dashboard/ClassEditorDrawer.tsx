"use client";

import { useEffect, useState } from "react";
import type { VendorCalendarClass } from "@/lib/onboarding-db";
import { Drawer } from "./Drawer";
import { LocationInput } from "./LocationInput";

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

export function ClassEditorDrawer({ open, onClose, cls, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !cls) return;
    setTitle(cls.title ?? "");
    setLocation(cls.location ?? "");
    setDate(toDateInput(cls.start_time));
    setStartTime(toTimeInput(cls.start_time));
    setEndTime(cls.end_time ? toTimeInput(cls.end_time) : "");
    setMaxStudents(cls.max_students != null ? String(cls.max_students) : "");
    setPrice(cls.price != null ? String(cls.price) : "");
    setError("");
  }, [open, cls]);

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
      const res = await fetch(`/api/dashboard/classes/${cls.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          location,
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#C1440E] px-4 py-2 text-sm font-medium text-white hover:bg-[#a53a0c] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            Class name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CCW Initial Training"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            Location
          </label>
          <LocationInput
            value={location}
            onChange={setLocation}
            placeholder="Search for an address or range"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Max students</label>
            <input
              type="number"
              min="0"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          {cls.is_recurring
            ? "This is a recurring class. Edits apply to this entry."
            : "This is a one-time class."}
        </p>
      </div>
    </Drawer>
  );
}
