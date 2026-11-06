import { describe, expect, it } from "vitest";
import {
  emailBodyToHtml,
  emailBodyToPlainText,
  publicEmailAppUrl,
  resolveTemplateContent,
} from "./email-templates-defaults";

describe("confirmation email links", () => {
  it("points student emails at production when the app is running locally", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";
    expect(publicEmailAppUrl()).toBe("https://www.getcarryclass.com");
    process.env.NEXT_PUBLIC_APP_URL = "https://www.getcarryclass.com/";
    expect(publicEmailAppUrl()).toBe("https://www.getcarryclass.com");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  });
});

describe("confirmation email rendering", () => {
  it("bolds the class-details heading and links the packing-list word", () => {
    const body = resolveTemplateContent("confirmation", undefined).body;
    const filled = body.replace(
      "{what_to_bring_link}",
      "https://www.getcarryclass.com/instructors/all-american-safety-llc-d3f3cfd6bd?tab=what-to-bring"
    );
    const html = emailBodyToHtml(filled);
    const text = emailBodyToPlainText(filled);

    expect(html).toContain("<strong>Here are your class details:</strong>");
    expect(html).toContain(
      'href="https://www.getcarryclass.com/instructors/all-american-safety-llc-d3f3cfd6bd?tab=what-to-bring"'
    );
    expect(html).toContain(">here</a>");
    expect(text).toContain("Here are your class details:");
    expect(text).not.toContain("**");
    expect(text).toContain(
      "here (https://www.getcarryclass.com/instructors/all-american-safety-llc-d3f3cfd6bd?tab=what-to-bring)"
    );
  });

  it("replaces an unchanged legacy confirmation with the new default", () => {
    const resolved = resolveTemplateContent("confirmation", {
      subject: "You're booked, {student_name} — {class_type} on {class_date}",
      body: `Hi {student_name},

Thanks for booking your {class_type} with {instructor_name}. Your spot is confirmed.

Here are your class details:
• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please arrive a few minutes early and bring a valid photo ID.

If you have any questions before class, you can reach out to {instructor_name} here: {instructor_email}.`,
    });
    expect(resolved.body).toContain("**Here are your class details:**");
    expect(resolved.body).toContain("[here]({what_to_bring_link})");
    expect(resolved.body).toContain("Hi {first_name},");
  });

  it("includes the confirmation number in the default and upgrades the previous default", () => {
    expect(resolveTemplateContent("confirmation", undefined).body).toContain(
      "Confirmation #: {confirmation_code}"
    );

    const previous = resolveTemplateContent("confirmation", {
      body: `Hi {first_name},

Thanks for booking your {class_type} with {company_name}. Your spot is confirmed.

**Here are your class details:**
• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please bring a valid photo ID and the following items listed [here]({what_to_bring_link}).

Please keep all firearms unloaded and leave all ammunition in your vehicle.

If you have any questions before class, you can respond directly to this email.

Thank you,
{instructor_name}`,
    });
    expect(previous.body).toContain("Confirmation #: {confirmation_code}");

    const custom = resolveTemplateContent("confirmation", { body: "Hi {first_name},\n\nCustom." });
    expect(custom.body).not.toContain("{confirmation_code}");
  });

  it("greets with the student first name in every template", () => {
    for (const type of ["confirmation", "reminder", "followup"] as const) {
      expect(resolveTemplateContent(type, undefined).body.startsWith("Hi {first_name},")).toBe(
        true
      );
    }

    const savedReminder = resolveTemplateContent("reminder", {
      body: "Hi {student_name},\n\nSee you soon.",
    });
    expect(savedReminder.body.startsWith("Hi {first_name},")).toBe(true);
    expect(savedReminder.body).toContain("See you soon.");
  });
});
