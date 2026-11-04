import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const authMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

function icsWithEvent(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:class-1",
    "DTSTART:20261107T170000Z",
    "DTEND:20261107T220000Z",
    "SUMMARY:CCW Initial",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

describe("POST /api/calendar/ical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns 401 when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/calendar/ical", {
        method: "POST",
        body: JSON.stringify({ ics: icsWithEvent() }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("parses an uploaded .ics file", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/calendar/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ics: icsWithEvent() }),
      }) as never
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.events[0].title).toBe("CCW Initial");
    expect(data.events[0].external_event_id).toBe("class-1");
  });

  it("fetches a webcal feed as https", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(icsWithEvent(), {
        status: 200,
        headers: { "Content-Type": "text/calendar" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/calendar/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "webcal://calendars.example/feed.ics" }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://calendars.example/feed.ics",
      expect.objectContaining({ headers: { "User-Agent": "CarryClass/1.0 Calendar Sync" } })
    );
  });

  it("rejects a missing url and file", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/calendar/ical", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
