import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VendorProfile } from "@/lib/onboarding-db";
import { Step1Profile } from "./Step1Profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const longBio = [
  "It looks like this submission is a test record rather than a real instructor profile.",
  "",
  "If you're ready to generate an actual instructor description, provide the instructor's name, county, badge tags, and teaching style notes so students can read the full copy.",
].join("\n");

const vendor = {
  id: "v1",
  clerk_user_id: "user_1",
  canonical_name: "Test Instructor",
  normalized_name: "test instructor",
  name: "Test Instructor",
  phone: null,
  email: null,
  website: null,
  address: null,
  county: null,
  counties_served: [],
  county_contacts: null,
  bio: longBio,
  photo_url: null,
  gallery_urls: [],
  badge_tags: [],
  cancellation_policy: null,
  cancellation_hours: null,
  cancellation_refund_percent: null,
  stripe_account_id: null,
  is_published: false,
  onboarding_step: 1,
  calendar_type: null,
  ical_feed_url: null,
  google_calendar_id: null,
  google_refresh_token: null,
  what_to_bring: null,
  require_application_ack: true,
  booking_notification_enabled: true,
  booking_notification_emails: null,
  slug: "test-instructor",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} satisfies VendorProfile;

function descriptionField() {
  return screen.getByPlaceholderText(
    "Tell students about your experience, certifications, and teaching style..."
  );
}

describe("Step1Profile public description", () => {
  it("opens an editor that shows and keeps edits to the full description", () => {
    render(<Step1Profile vendor={vendor} />);

    expect(screen.queryByRole("dialog", { name: "Your public description" })).not.toBeInTheDocument();
    expect(descriptionField()).toHaveValue(longBio);

    fireEvent.click(screen.getByRole("button", { name: "Expand description" }));

    const dialog = screen.getByRole("dialog", { name: "Your public description" });
    const editor = within(dialog).getByRole("textbox");
    expect(editor).toHaveValue(longBio);
    expect(editor).toHaveFocus();
    expect(editor).toHaveStyle({ flex: "1 1 auto" });

    const updated = `${longBio}\n\nStudents leave knowing the qualification course cold.`;
    fireEvent.change(editor, { target: { value: updated } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog", { name: "Your public description" })).not.toBeInTheDocument();
    expect(descriptionField()).toHaveValue(updated);
    expect(screen.getByRole("button", { name: "Expand description" })).toHaveFocus();
  });

  it("closes the editor from the collapse button, the backdrop, and Escape", () => {
    render(<Step1Profile vendor={vendor} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand description" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse description" }));
    expect(screen.queryByRole("dialog", { name: "Your public description" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand description" }));
    fireEvent.click(screen.getByRole("button", { name: "Close description editor" }));
    expect(screen.queryByRole("dialog", { name: "Your public description" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand description" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Your public description" })).not.toBeInTheDocument();
    expect(descriptionField()).toHaveValue(longBio);
  });
});
