import { describe, expect, it } from "vitest";
import {
  emailBodyToHtml,
  emailBodyToPlainText,
  resolveTemplateContent,
} from "./email-templates-defaults";

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
});
