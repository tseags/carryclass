import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_WHAT_TO_BRING_ITEMS } from "@/lib/what-to-bring";
import { WhatToBringFields, type WhatToBringFieldsHandle } from "./WhatToBringFields";

describe("WhatToBringFields", () => {
  it("starts with every default selected and can clear them with Select all", () => {
    render(<WhatToBringFields items={null} />);
    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    expect(selectAll).toBeChecked();
    for (const item of DEFAULT_WHAT_TO_BRING_ITEMS) {
      expect(screen.getByRole("checkbox", { name: item })).toBeChecked();
    }

    fireEvent.click(selectAll);
    expect(selectAll).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Holster" })).not.toBeChecked();
  });

  it("collects selected defaults plus a typed item", () => {
    const ref = createRef<WhatToBringFieldsHandle>();
    render(<WhatToBringFields ref={ref} items={["Holster"]} />);
    fireEvent.change(screen.getByLabelText("Additional item"), {
      target: { value: "Closed-toe shoes" },
    });

    expect(ref.current?.collect()).toEqual({
      ok: true,
      items: ["Holster", "Closed-toe shoes"],
    });
  });
});
