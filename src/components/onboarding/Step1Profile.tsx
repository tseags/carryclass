"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { VendorProfile } from "@/lib/onboarding-db";

const BADGE_OPTIONS = [
  "NRA Certified",
  "USCCA Certified",
  "Veteran Instructor",
  "Women-Friendly",
  "Spanish Speaking",
  "Law Enforcement Background",
];

interface Props {
  vendor: VendorProfile;
  prefilled?: boolean;
}

export function Step1Profile({ vendor, prefilled }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [bioLoading, setBioLoading] = useState<"polish" | "scratch" | null>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: vendor.name ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    website: vendor.website ?? "",
    address: vendor.address ?? "",
    county: vendor.county ?? "",
    bio: vendor.bio ?? "",
    badgeTags: vendor.badge_tags ?? ([] as string[]),
    photoUrl: vendor.photo_url ?? "",
    galleryUrls: vendor.gallery_urls ?? ([] as string[]),
  });

  const profileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function toggleBadge(tag: string) {
    setForm((f) => ({
      ...f,
      badgeTags: f.badgeTags.includes(tag)
        ? f.badgeTags.filter((t) => t !== tag)
        : [...f.badgeTags, tag],
    }));
  }

  async function handlePolish() {
    if (!form.bio.trim()) return;
    setBioLoading("polish");
    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "polish", content: form.bio }),
      });
      const data = await res.json();
      if (data.bio) setForm((f) => ({ ...f, bio: data.bio }));
    } finally {
      setBioLoading(null);
    }
  }

  async function handleScratch() {
    setBioLoading("scratch");
    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "scratch",
          name: form.name,
          county: form.county,
          badgeTags: form.badgeTags,
          profileData: {
            phone: form.phone,
            website: form.website,
            address: form.address,
          },
        }),
      });
      const data = await res.json();
      if (data.bio) setForm((f) => ({ ...f, bio: data.bio }));
    } finally {
      setBioLoading(null);
    }
  }

  async function uploadProfilePhoto(file: File) {
    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile");
      formData.append("vendorId", vendor.id);
      const res = await fetch("/api/upload-vendor-asset", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) setForm((f) => ({ ...f, photoUrl: data.url }));
    } finally {
      setUploadingProfile(false);
    }
  }

  async function uploadGalleryPhoto(file: File) {
    if (form.galleryUrls.length >= 5) return;
    setUploadingGallery(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "gallery");
      formData.append("vendorId", vendor.id);
      const res = await fetch("/api/upload-vendor-asset", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url)
        setForm((f) => ({ ...f, galleryUrls: [...f.galleryUrls, data.url] }));
    } finally {
      setUploadingGallery(false);
    }
  }

  function removeGalleryPhoto(url: string) {
    setForm((f) => ({
      ...f,
      galleryUrls: f.galleryUrls.filter((u) => u !== url),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/step/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          website: form.website,
          address: form.address,
          county: form.county,
          bio: form.bio,
          badgeTags: form.badgeTags,
          photoUrl: form.photoUrl,
          galleryUrls: form.galleryUrls,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/onboard/step/2");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {prefilled && (
        <div className="flex items-start gap-2 rounded-lg border border-[#c96442]/30 bg-[#c96442]/10 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#c96442]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[#141413]">
            We found existing info for your listing — review and update as needed.
          </p>
        </div>
      )}

      {/* Basic info */}
      <section>
        <h2 className="text-base font-semibold text-zinc-800 mb-4">
          Basic information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Your full name"
              required
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="input-field"
              placeholder="(555) 555-5555"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="input-field"
              placeholder="https://yoursite.com"
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="input-field"
              placeholder="Street address, city, CA ZIP"
            />
          </Field>
          <Field label="County">
            <input
              type="text"
              value={form.county}
              onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}
              className="input-field"
              placeholder="e.g. Los Angeles"
            />
          </Field>
        </div>
      </section>

      {/* Bio */}
      <section>
        <h2 className="text-base font-semibold text-zinc-800 mb-1">
          Your public description
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          This is what students see on your listing.
        </p>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={5}
          className="input-field w-full resize-none"
          placeholder="Tell students about your experience, certifications, and teaching style..."
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handlePolish}
            disabled={!form.bio.trim() || bioLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {bioLoading === "polish" ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
            Polish
          </button>
          <button
            type="button"
            onClick={handleScratch}
            disabled={bioLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {bioLoading === "scratch" ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Start from scratch
          </button>
        </div>
      </section>

      {/* Badge tags */}
      <section>
        <h2 className="text-base font-semibold text-zinc-800 mb-3">
          Certifications &amp; specializations
        </h2>
        <div className="flex flex-col gap-3">
          {BADGE_OPTIONS.map((tag) => (
            <label key={tag} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.badgeTags.includes(tag)}
                onChange={() => toggleBadge(tag)}
                className="h-4 w-4 shrink-0 rounded border-zinc-300 text-[#141413] focus:ring-[#141413]"
              />
              <span className="text-sm text-zinc-700">{tag}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Photos — optional */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-zinc-800">Photos</h2>
          <span className="rounded-full border border-[#c96442]/40 bg-[#c96442]/10 px-2 py-0.5 text-xs font-semibold text-[#c96442]">
            Optional
          </span>
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          You can add or change photos anytime from your dashboard.
        </p>

        {/* Profile photo */}
        <div className="mb-4">
          <p className="text-sm text-zinc-600 mb-2">Profile photo</p>
          <div className="flex items-center gap-4">
            {form.photoUrl ? (
              <div className="relative">
                <img
                  src={form.photoUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingProfile}
              className="text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              {uploadingProfile ? "Uploading..." : "Choose photo"}
            </button>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadProfilePhoto(file);
              }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">JPG or PNG, max 5MB</p>
        </div>

        {/* Gallery */}
        <div>
          <p className="text-sm text-zinc-600 mb-2">
            Gallery photos{" "}
            <span className="text-zinc-400">({form.galleryUrls.length}/5)</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {form.galleryUrls.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt="Gallery"
                  className="w-20 h-20 rounded-lg object-cover border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryPhoto(url)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            {form.galleryUrls.length < 5 && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 disabled:opacity-40 transition-colors"
              >
                {uploadingGallery ? (
                  <Spinner />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs mt-1">Add</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadGalleryPhoto(file);
            }}
          />
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Spinner white />}
          {saving ? "Saving…" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Spinner({ white }: { white?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 animate-spin ${white ? "text-white" : "text-zinc-500"}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
