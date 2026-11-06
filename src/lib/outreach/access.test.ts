import { afterEach, describe, expect, it } from "vitest";
import { isLoopbackHost, outreachSurfaceAllowed } from "./access";

describe("outreach local access", () => {
  const previous = process.env.VERCEL;

  afterEach(() => {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  });

  it("treats loopback hosts as local", () => {
    expect(isLoopbackHost("localhost:3001")).toBe(true);
    expect(isLoopbackHost("127.0.0.1:3001")).toBe(true);
    expect(isLoopbackHost("[::1]:3001")).toBe(true);
    expect(isLoopbackHost("www.getcarryclass.com")).toBe(false);
    expect(isLoopbackHost(null)).toBe(false);
  });

  it("hides the CRM on the public host and on Vercel", () => {
    delete process.env.VERCEL;
    expect(outreachSurfaceAllowed("localhost:3001")).toBe(true);
    expect(outreachSurfaceAllowed("www.getcarryclass.com")).toBe(false);
    process.env.VERCEL = "1";
    expect(outreachSurfaceAllowed("localhost:3001")).toBe(false);
  });
});
