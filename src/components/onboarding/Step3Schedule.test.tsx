import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VendorClassType } from "@/lib/onboarding-db";
import { Step3Schedule } from "./Step3Schedule";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => null }),
}));

const classTypes: VendorClassType[] = [
  {
    id: "ct_1",
    vendor_id: "v_1",
    class_type: "initial",
    price: 150,
    is_active: true,
    display_name: "CCW Initial",
  },
];

const sampleEvent = {
  external_event_id: "class-1",
  title: "Saturday Initial",
  start_time: "2026-11-07T17:00:00.000Z",
  end_time: "2026-11-07T22:00:00.000Z",
  is_recurring: false,
  recurrence_rule: null,
};

function renderStep() {
  render(
    <Step3Schedule
      classTypes={classTypes}
      googleConnected={false}
      calendarType={null}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /^iCal/i }));
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe("Step3Schedule iCal import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("explains feed URLs and file drop", () => {
    renderStep();
    expect(screen.getByText(/paste a calendar url or drop an \.ics file/i)).toBeInTheDocument();
    expect(
      screen.getByText(/paste a public feed url to keep classes in sync/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/file → export and drop the \.ics file/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add an \.ics file/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose a file/i })).toBeInTheDocument();
  });

  it("imports a dropped .ics file and does not save it as a feed URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [sampleEvent] }));
    vi.stubGlobal("fetch", fetchMock);
    renderStep();

    const zone = screen.getByText(/drop an \.ics file here/i).closest("div");
    expect(zone).toBeTruthy();
    const file = new File(["BEGIN:VCALENDAR\nEND:VCALENDAR"], "classes.ics", {
      type: "text/calendar",
    });
    fireEvent.drop(zone!, {
      dataTransfer: { files: [file], dropEffect: "copy" },
    });

    expect(await screen.findByText("Saturday Initial")).toBeInTheDocument();
    expect(screen.getByText("classes.ics")).toBeInTheDocument();
    expect(screen.getByText("One-time import")).toBeInTheDocument();
    expect(screen.getByLabelText("File uploaded")).toBeInTheDocument();

    const importCall = fetchMock.mock.calls[0];
    expect(importCall[0]).toBe("/api/calendar/ical");
    expect(JSON.parse(importCall[1].body)).toEqual({
      ics: "BEGIN:VCALENDAR\nEND:VCALENDAR",
    });

    fireEvent.click(screen.getByRole("button", { name: /save & continue/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const saveCall = fetchMock.mock.calls[1];
    expect(saveCall[0]).toBe("/api/onboarding/step/3");
    expect(JSON.parse(saveCall[1].body).icalFeedUrl).toBeNull();
  });

  it("rejects a dropped file that is not an .ics calendar", () => {
    renderStep();
    const zone = screen.getByText(/drop an \.ics file here/i).closest("div");
    const file = new File(["notes"], "notes.pdf", { type: "application/pdf" });
    fireEvent.drop(zone!, { dataTransfer: { files: [file] } });
    expect(screen.getByText(/drop a \.ics calendar file/i)).toBeInTheDocument();
  });

  it("still fetches a pasted feed URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ events: [sampleEvent] }));
    vi.stubGlobal("fetch", fetchMock);
    renderStep();

    fireEvent.change(screen.getByPlaceholderText(/webcal:\/\//i), {
      target: { value: "https://example.com/cal.ics" },
    });
    fireEvent.click(screen.getByRole("button", { name: /fetch events/i }));

    expect(await screen.findByText("Saturday Initial")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      url: "https://example.com/cal.ics",
    });
  });
});
