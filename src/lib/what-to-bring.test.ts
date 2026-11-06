import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHAT_TO_BRING_ITEMS,
  normalizeWhatToBring,
  resolveWhatToBringItems,
} from "./what-to-bring";

describe("normalizeWhatToBring", () => {
  it("canonicalizes default items and keeps custom text", () => {
    const result = normalizeWhatToBring([
      " holster ",
      "Range bag",
      "HOLSTER",
      "  extra   magazines  ",
    ]);
    expect(result).toEqual({
      ok: true,
      items: ["Holster", "Range bag", "extra magazines"],
    });
  });

  it("requires at least one item", () => {
    expect(normalizeWhatToBring(["  ", ""])).toEqual({
      ok: false,
      error: "Select at least one item.",
    });
  });
});

describe("resolveWhatToBringItems", () => {
  it("uses the shared defaults until an instructor saves a list", () => {
    expect(resolveWhatToBringItems(null)).toEqual([...DEFAULT_WHAT_TO_BRING_ITEMS]);
    expect(resolveWhatToBringItems(undefined)).toEqual([...DEFAULT_WHAT_TO_BRING_ITEMS]);
  });

  it("uses the saved list on the live profile", () => {
    expect(resolveWhatToBringItems(["Holster", "Notebook"])).toEqual([
      "Holster",
      "Notebook",
    ]);
  });
});
