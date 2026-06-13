"use client";

import { useState, useEffect } from "react";
import { EmailTemplateEditor } from "@/components/dashboard/EmailTemplateEditor";
import type { VendorEmailTemplate } from "@/lib/onboarding-db";

interface Props {
  vendorId: string;
  vendorName: string;
  activeClassTypes: string[];
  initialTemplates: Record<string, VendorEmailTemplate>;
}

const TEMPLATE_TYPES = ["confirmation", "reminder", "followup"] as const;

export function EmailSettingsClient({
  vendorId,
  vendorName,
  activeClassTypes,
  initialTemplates,
}: Props) {
  const [templates, setTemplates] =
    useState<Record<string, Partial<VendorEmailTemplate>>>(initialTemplates);
  const [generating, setGenerating] = useState(false);

  // Auto-generate templates on first load if none exist
  useEffect(() => {
    const hasAny = TEMPLATE_TYPES.some((t) => initialTemplates[t]);
    if (!hasAny) {
      generateTemplates();
    }
  }, []);

  async function generateTemplates() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName, classTypes: activeClassTypes }),
      });
      const data = await res.json();
      if (res.ok) {
        const newTemplates: Record<string, Partial<VendorEmailTemplate>> = {
          confirmation: {
            type: "confirmation",
            subject: data.confirmation_subject,
            body: data.confirmation_body,
            is_active: true,
          },
          reminder: {
            type: "reminder",
            subject: data.reminder_subject,
            body: data.reminder_body,
            is_active: true,
            send_timing: "24h_before",
          },
          followup: {
            type: "followup",
            subject: data.followup_subject,
            body: data.followup_body,
            is_active: true,
            send_timing: "1d_after",
          },
        };
        setTemplates(newTemplates);
        // Save generated templates
        for (const [type, tmpl] of Object.entries(newTemplates)) {
          await saveTemplate(type, tmpl);
        }
      }
    } finally {
      setGenerating(false);
    }
  }

  async function saveTemplate(
    type: string,
    fields: Partial<VendorEmailTemplate>
  ) {
    await fetch(`/api/onboarding/email-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, type, ...fields }),
    });
    setTemplates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...fields },
    }));
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm">Generating your email templates…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {TEMPLATE_TYPES.map((type) => (
        <EmailTemplateEditor
          key={type}
          type={type}
          initial={templates[type] ?? {}}
          onSave={(fields) => saveTemplate(type, fields)}
        />
      ))}
    </div>
  );
}
