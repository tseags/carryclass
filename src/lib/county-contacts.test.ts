import { describe, expect, it } from "vitest";
import {
  buildContactBlocksFromOverrides,
  normalizeCountyContacts,
  resolveCountyContact,
} from "./county-contacts";

describe("normalizeCountyContacts", () => {
  it("keeps only selected counties and drops blank fields", () => {
    const result = normalizeCountyContacts(
      {
        alameda: { address: " 1 Main St ", phone: "", email: "a@test.com" },
        "contra-costa": { address: "  ", phone: "  " },
        orange: { phone: "555-1212" },
      },
      ["alameda", "contra-costa"]
    );
    expect(result).toEqual({
      ok: true,
      contacts: {
        alameda: { address: "1 Main St", email: "a@test.com" },
      },
    });
  });

  it("accepts null as empty overrides", () => {
    expect(normalizeCountyContacts(null, ["alameda"])).toEqual({
      ok: true,
      contacts: {},
    });
  });
});

describe("resolveCountyContact", () => {
  it("falls back to primary per field", () => {
    expect(
      resolveCountyContact(
        "alameda",
        { address: "Primary St", phone: "111", email: "primary@test.com" },
        { alameda: { phone: "222" } }
      )
    ).toEqual({
      address: "Primary St",
      phone: "222",
      email: "primary@test.com",
    });
  });
});

describe("buildContactBlocksFromOverrides", () => {
  it("groups counties that share the same resolved contact", () => {
    const blocks = buildContactBlocksFromOverrides(
      ["madera", "modoc", "tuolumne", "merced"],
      {
        address: "Shared HQ",
        phone: "559-555-0000",
        email: "hq@test.com",
      },
      {
        merced: { phone: "209-555-1111" },
      }
    );

    expect(blocks).toHaveLength(2);
    const shared = blocks.find((block) => block.phone === "559-555-0000");
    const merced = blocks.find((block) => block.phone === "209-555-1111");
    expect(shared?.counties).toEqual(["madera", "modoc", "tuolumne"]);
    expect(merced?.counties).toEqual(["merced"]);
    expect(merced?.address).toBe("Shared HQ");
  });
});
