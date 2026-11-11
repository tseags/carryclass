"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { VendorProfile } from "@/lib/onboarding-db";
import { CALIFORNIA_COUNTIES, COUNTY_DISPLAY_NAMES } from "@/data/counties";
import { LocationInput } from "@/components/dashboard/LocationInput";
import type { CountyContactFields, CountyContactsMap } from "@/lib/county-contacts";
import { parseWebsiteInput } from "@/lib/vendor-website-url";
import { WhatToBringFields, type WhatToBringFieldsHandle } from "@/components/onboarding/WhatToBringFields";

const BADGE_OPTIONS = [
  "NRA Certified",
  "USCCA Certified",
  "Veteran Instructor",
  "Spanish Speaking",
  "Law Enforcement Background",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return "File too large (max 5MB)";
  const type = file.type;
  if (type === "image/jpeg" || type === "image/png") return null;
  if (type) return "Only JPG and PNG allowed";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return null;
  }
  return "Only JPG and PNG allowed";
}

interface Props {
  vendor: VendorProfile;
  prefilled?: boolean;
  /**
   * "onboarding" (default) navigates to the next step on save. "dashboard"
   * stays put, surfaces a saved state, and reports the updated profile via
   * `onSaved` so the dashboard can refresh its local state in place.
   */
  mode?: "onboarding" | "dashboard";
  onSaved?: (vendor: VendorProfile) => void;
}

export function Step1Profile({ vendor, prefilled, mode = "onboarding", onSaved }: Props) {
  const router = useRouter();
  const isDashboard = mode === "dashboard";
  const whatToBringRef = useRef<WhatToBringFieldsHandle>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioExpandButtonRef = useRef<HTMLButtonElement>(null);
  const bioEditorRef = useRef<HTMLTextAreaElement>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [websiteError, setWebsiteError] = useState("");

  const [form, setForm] = useState({
    name: vendor.name ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    website: vendor.website ?? "",
    address: vendor.address ?? "",
    county: vendor.county ?? "",
    countiesServed: vendor.counties_served ?? ([] as string[]),
    countyContacts: (vendor.county_contacts ?? {}) as CountyContactsMap,
    bio: vendor.bio ?? "",
    badgeTags: vendor.badge_tags ?? ([] as string[]),
    photoUrl: vendor.photo_url ?? "",
    galleryUrls: vendor.gallery_urls ?? ([] as string[]),
  });

  const [countyQuery, setCountyQuery] = useState("");
  const [countyOpen, setCountyOpen] = useState(false);
  const [countyHighlight, setCountyHighlight] = useState(0);
  const [expandedCounty, setExpandedCounty] = useState<string | null>(
    () => (vendor.counties_served && vendor.counties_served.length > 1
      ? vendor.counties_served[0]
      : null)
  );

  useEffect(() => {
    if (!bioExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const editor = bioEditorRef.current;
    if (editor) {
      editor.focus();
      const end = editor.value.length;
      editor.setSelectionRange(end, end);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBioExpanded(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      bioExpandButtonRef.current?.focus();
    };
  }, [bioExpanded]);

  useEffect(() => {
    if (form.countiesServed.length <= 1) {
      setExpandedCounty(null);
      return;
    }
    setExpandedCounty((current) =>
      current && form.countiesServed.includes(current)
        ? current
        : form.countiesServed[0]
    );
  }, [form.countiesServed]);

  const countyMatches = useMemo(() => {
    const q = countyQuery.trim().toLowerCase();
    return CALIFORNIA_COUNTIES.filter(
      (slug) => q === "" || COUNTY_DISPLAY_NAMES[slug].toLowerCase().includes(q)
    );
  }, [countyQuery]);

  function toggleCounty(slug: string) {
    setForm((f) => {
      const removing = f.countiesServed.includes(slug);
      const countiesServed = removing
        ? f.countiesServed.filter((c) => c !== slug)
        : [...f.countiesServed, slug];
      const countyContacts = { ...f.countyContacts };
      if (removing) delete countyContacts[slug];
      return { ...f, countiesServed, countyContacts };
    });
  }

  function removeCounty(slug: string) {
    setForm((f) => {
      const countyContacts = { ...f.countyContacts };
      delete countyContacts[slug];
      return {
        ...f,
        countiesServed: f.countiesServed.filter((c) => c !== slug),
        countyContacts,
      };
    });
  }

  function updateCountyContact(
    slug: string,
    field: keyof CountyContactFields,
    value: string
  ) {
    setForm((f) => {
      const current = f.countyContacts[slug] ?? {};
      const nextFields: CountyContactFields = { ...current, [field]: value };
      const countyContacts = { ...f.countyContacts };
      if (
        !nextFields.address?.trim() &&
        !nextFields.phone?.trim() &&
        !nextFields.email?.trim()
      ) {
        delete countyContacts[slug];
      } else {
        countyContacts[slug] = nextFields;
      }
      return { ...f, countyContacts };
    });
  }

  function handleCountyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCountyOpen(true);
      setCountyHighlight((i) => Math.min(i + 1, countyMatches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCountyHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (countyOpen && countyMatches[countyHighlight]) {
        e.preventDefault();
        toggleCounty(countyMatches[countyHighlight]);
      }
    } else if (e.key === "Escape") {
      setCountyOpen(false);
    } else if (e.key === "Backspace" && countyQuery === "" && form.countiesServed.length > 0) {
      removeCounty(form.countiesServed[form.countiesServed.length - 1]);
    }
  }

  function toggleBadge(tag: string) {
    setForm((f) => ({
      ...f,
      badgeTags: f.badgeTags.includes(tag)
        ? f.badgeTags.filter((t) => t !== tag)
        : [...f.badgeTags, tag],
    }));
  }

  async function handlePolish() {
    if (!form.bio.trim() || bioLoading) return;
    setBioLoading(true);
    setBioError("");
    try {
      const res = await fetch("/api/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "polish", content: form.bio }),
      });
      const data = (await res.json().catch(() => null)) as
        | { bio?: string; error?: string }
        | null;
      if (!res.ok) {
        setBioError(data?.error ?? "Unable to polish description.");
        return;
      }
      if (data?.bio) setForm((f) => ({ ...f, bio: data.bio! }));
      else setBioError("Unable to polish description.");
    } catch {
      setBioError("Unable to polish description.");
    } finally {
      setBioLoading(false);
    }
  }

  async function uploadVendorAsset(
    file: File,
    type: "profile" | "gallery"
  ): Promise<string> {
    const clientError = validateImageFile(file);
    if (clientError) throw new Error(clientError);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/upload-vendor-asset", {
      method: "POST",
      body: formData,
    });
    const data = (await res.json().catch(() => null)) as
      | { url?: string; error?: string }
      | null;
    if (!res.ok || !data?.url) {
      throw new Error(
        (typeof data?.error === "string" && data.error) ||
          `Upload failed (${res.status})`
      );
    }
    return data.url;
  }

  async function uploadProfilePhoto(file: File) {
    setUploadingProfile(true);
    setPhotoError("");
    try {
      const url = await uploadVendorAsset(file, "profile");
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingProfile(false);
    }
  }

  async function uploadGalleryPhotos(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploadingGallery(true);
    setPhotoError("");
    try {
      let remaining = 5 - form.galleryUrls.length;
      if (remaining <= 0) {
        setPhotoError("Gallery is full (max 5 photos)");
        return;
      }

      let uploaded = 0;
      for (const file of list) {
        if (remaining <= 0) break;
        const url = await uploadVendorAsset(file, "gallery");
        setForm((f) => ({ ...f, galleryUrls: [...f.galleryUrls, url] }));
        uploaded += 1;
        remaining -= 1;
      }
      if (list.length > uploaded && remaining <= 0) {
        setPhotoError("Gallery is full (max 5 photos). Extra files were skipped.");
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
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

  function normalizeWebsiteField(): string | null | false {
    const result = parseWebsiteInput(form.website);
    if (!result.ok) {
      setWebsiteError(result.error);
      return false;
    }
    setWebsiteError("");
    const next = result.value ?? "";
    if (next !== form.website) {
      setForm((f) => ({ ...f, website: next }));
    }
    return result.value;
  }

  function handleWebsiteBlur() {
    normalizeWebsiteField();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const website = normalizeWebsiteField();
    if (website === false) return;

    const whatToBring = whatToBringRef.current?.collect();
    if (!whatToBring?.ok) {
      setError(whatToBring?.error ?? "Select at least one item.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/onboarding/step/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          website,
          address: form.address,
          county: form.county,
          countiesServed: form.countiesServed,
          countyContacts: form.countyContacts,
          bio: form.bio,
          badgeTags: form.badgeTags,
          photoUrl: form.photoUrl,
          galleryUrls: form.galleryUrls,
          whatToBring: whatToBring.items,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 400 && typeof data?.error === "string") {
          if (data.field === "whatToBring" || data.field === "countyContacts") {
            setError(data.error);
          } else setWebsiteError(data.error);
          return;
        }
        throw new Error("Save failed");
      }
      if (isDashboard) {
        onSaved?.({
          ...vendor,
          name: form.name || null,
          canonical_name: form.name || vendor.canonical_name,
          phone: form.phone || null,
          email: form.email || null,
          website,
          address: form.address || null,
          county: form.county || null,
          counties_served: form.countiesServed,
          county_contacts: form.countyContacts,
          bio: form.bio || null,
          badge_tags: form.badgeTags,
          photo_url: form.photoUrl || null,
          gallery_urls: form.galleryUrls,
          what_to_bring: whatToBring.items,
        });
        setSaved(true);
      } else {
        router.push("/onboard/step/2");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" inert={bioExpanded}>
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
      <section id="listing-basic" className="scroll-mt-[calc(var(--header-height)+1rem)]">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">
          General Information
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
          <Field label="Website" error={websiteError}>
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              value={form.website}
              onChange={(e) => {
                setWebsiteError("");
                setForm((f) => ({ ...f, website: e.target.value }));
              }}
              onBlur={handleWebsiteBlur}
              aria-invalid={Boolean(websiteError)}
              className="input-field"
              placeholder="mysite.com or https://mysite.com"
            />
          </Field>
          <Field label="Primary address" className="sm:col-span-2">
            <LocationInput
              value={form.address}
              onChange={(address) => setForm((f) => ({ ...f, address }))}
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

      {/* Counties served */}
      <section id="listing-counties" className="scroll-mt-[calc(var(--header-height)+1rem)]">
        <h2 className="text-base font-semibold text-zinc-800 mb-1">
          Counties you serve
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          Add every county where you teach so students can find you.
        </p>

        <Field label="Search counties">
          <div className="relative">
            <input
              type="text"
              value={countyQuery}
              onChange={(e) => {
                setCountyQuery(e.target.value);
                setCountyOpen(true);
                setCountyHighlight(0);
              }}
              onFocus={() => setCountyOpen(true)}
              onBlur={() => setCountyOpen(false)}
              onKeyDown={handleCountyKeyDown}
              className="input-field"
              placeholder="Start typing a county name…"
              role="combobox"
              aria-expanded={countyOpen}
              aria-controls="counties-served-listbox"
              aria-autocomplete="list"
            />
            {countyOpen && countyMatches.length > 0 && (
              <ul
                id="counties-served-listbox"
                role="listbox"
                className="absolute z-10 mt-1 max-h-60 w-full list-none overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                style={{ margin: 0, paddingLeft: 0, paddingRight: 0 }}
              >
                {countyMatches.map((slug, i) => {
                  const isSelected = form.countiesServed.includes(slug);
                  return (
                    <li key={slug} role="option" aria-selected={isSelected} style={{ margin: 0, paddingLeft: 0 }}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          toggleCounty(slug);
                        }}
                        onMouseEnter={() => setCountyHighlight(i)}
                        className={`flex w-full items-center gap-2 py-2 pl-2.5 pr-3 text-left text-sm ${
                          i === countyHighlight ? "bg-zinc-100" : ""
                        } ${isSelected ? "font-medium text-[#c96442]" : "text-zinc-700"}`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected ? "border-[#c96442] bg-[#c96442]" : "border-zinc-300"
                          }`}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        {COUNTY_DISPLAY_NAMES[slug]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Field>

        {form.countiesServed.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.countiesServed.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-800"
              >
                {COUNTY_DISPLAY_NAMES[slug] ?? slug}
                <button
                  type="button"
                  onClick={() => removeCounty(slug)}
                  aria-label={`Remove ${COUNTY_DISPLAY_NAMES[slug] ?? slug}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {form.countiesServed.length > 1 && (
          <div className="mt-5 space-y-2">
            <div>
              <h3 className="text-sm font-medium text-zinc-800">
                Contact info by county
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Optional. Leave blank to use your primary address, phone, and email.
              </p>
            </div>
            <div className="space-y-2">
              {form.countiesServed.map((slug) => {
                const open = expandedCounty === slug;
                const contact = form.countyContacts[slug] ?? {};
                const countyLabel = COUNTY_DISPLAY_NAMES[slug] ?? slug;
                return (
                  <div
                    key={slug}
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCounty((current) => (current === slug ? null : slug))
                      }
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-zinc-800">
                        {countyLabel} County
                      </span>
                      <svg
                        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {open && (
                      <div className="space-y-3 border-t border-zinc-100 px-4 py-3">
                        <Field label="Address">
                          <LocationInput
                            value={contact.address ?? ""}
                            onChange={(address) =>
                              updateCountyContact(slug, "address", address)
                            }
                            className="input-field"
                            placeholder="Street address, city, CA ZIP"
                          />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Phone">
                            <input
                              type="tel"
                              value={contact.phone ?? ""}
                              onChange={(e) =>
                                updateCountyContact(slug, "phone", e.target.value)
                              }
                              className="input-field"
                              placeholder="(555) 555-5555"
                            />
                          </Field>
                          <Field label="Email">
                            <input
                              type="email"
                              value={contact.email ?? ""}
                              onChange={(e) =>
                                updateCountyContact(slug, "email", e.target.value)
                              }
                              className="input-field"
                              placeholder="you@example.com"
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Bio */}
      <section id="listing-description" className="scroll-mt-[calc(var(--header-height)+1rem)]">
        <h2 className="text-base font-semibold text-zinc-800 mb-1">
          Your public description
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          This is what students see on your listing.
        </p>
        <div className="relative">
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={5}
            className="input-field w-full resize-none pr-11"
            placeholder="Tell students about your experience, certifications, and teaching style..."
          />
          <button
            ref={bioExpandButtonRef}
            type="button"
            onClick={() => setBioExpanded(true)}
            aria-label="Expand description"
            aria-expanded={bioExpanded}
            aria-controls="public-description-editor"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            <ExpandIcon />
          </button>
        </div>
        <div className="mt-2">
          <PolishWithAi
            disabled={!form.bio.trim() || bioLoading}
            loading={bioLoading}
            onClick={handlePolish}
          />
        </div>
        {bioError && (
          <p className="mt-2 text-sm text-red-600">{bioError}</p>
        )}
        {bioExpanded &&
          createPortal(
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-8">
              <button
                type="button"
                className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[1px]"
                aria-label="Close description editor"
                onClick={() => setBioExpanded(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="public-description-editor-title"
                className="relative z-[211] h-[min(820px,92vh)] w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-2xl"
                style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
                  <div>
                    <h2
                      id="public-description-editor-title"
                      className="!m-0 text-base font-semibold text-zinc-900"
                    >
                      Your public description
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      This is what students see on your listing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBioExpanded(false)}
                    aria-label="Collapse description"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                  >
                    <CollapseIcon />
                  </button>
                </div>
                <textarea
                  id="public-description-editor"
                  ref={bioEditorRef}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full resize-none border-0 bg-transparent px-5 py-4 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                  style={{ flex: "1 1 auto", minHeight: 0 }}
                  placeholder="Tell students about your experience, certifications, and teaching style..."
                />
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3">
                  <div>
                    <PolishWithAi
                      disabled={!form.bio.trim() || bioLoading}
                      loading={bioLoading}
                      onClick={handlePolish}
                    />
                    {bioError && (
                      <p className="mt-2 text-sm text-red-600">{bioError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBioExpanded(false)}
                    className="inline-flex shrink-0 items-center rounded-md bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </section>

      {/* Badge tags */}
      <section id="listing-certifications" className="scroll-mt-[calc(var(--header-height)+1rem)]">
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
      <section id="listing-photos" className="scroll-mt-[calc(var(--header-height)+1rem)]">
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
                  aria-label="Remove profile photo"
                  style={{ color: "#ffffff" }}
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
            {/* Label + sr-only input: more reliable than display:none + programmatic click */}
            <label
              className={`inline-flex cursor-pointer items-center text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors ${
                uploadingProfile ? "pointer-events-none opacity-40" : ""
              }`}
            >
              {uploadingProfile ? "Uploading..." : "Choose photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="sr-only"
                disabled={uploadingProfile}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadProfilePhoto(file);
                }}
              />
            </label>
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
                  aria-label="Remove gallery photo"
                  style={{ color: "#ffffff" }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            {form.galleryUrls.length < 5 && (
              <label
                className={`w-20 h-20 rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 transition-colors cursor-pointer ${
                  uploadingGallery ? "pointer-events-none opacity-40" : ""
                }`}
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
                <input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  multiple
                  className="sr-only"
                  disabled={uploadingGallery}
                  onChange={(e) => {
                    // Copy before clearing — FileList is live and empties with value="".
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) void uploadGalleryPhotos(files);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {photoError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {photoError}
          </p>
        )}
      </section>

      <section id="listing-what-to-bring" className="scroll-mt-[calc(var(--header-height)+1rem)]">
        <h2 className="mb-1 text-base font-semibold text-zinc-800">What students need to bring</h2>
        <p className="mb-4 text-sm text-zinc-500">
          These items appear on the What To Bring tab of your live profile.
        </p>
        <WhatToBringFields ref={whatToBringRef} items={vendor.what_to_bring} />
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {isDashboard && saved && !saving && (
          <span className="text-sm font-medium text-emerald-600">Saved ✓</span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Spinner white />}
          {saving ? "Saving…" : isDashboard ? "Save changes" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
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
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PolishWithAi({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-zinc-300 bg-zinc-100 text-zinc-700 shadow-sm hover:bg-zinc-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Spinner />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        )}
        Polish with AI
      </button>
      <span className="relative inline-flex group">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 text-zinc-400 hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          aria-label="About Polish with AI"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-full z-10 mb-2 w-52 -translate-x-1/2 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs leading-snug text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Use AI to rewrite or optimize your writing.
        </span>
      </span>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
      />
    </svg>
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
