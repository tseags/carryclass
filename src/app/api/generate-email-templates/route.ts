import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are writing transactional email templates for a California CCW firearms instructor 
using CarryClass, a booking marketplace. Write professional, warm, and concise emails. 
Use these merge tags where appropriate: {student_name}, {class_type}, {class_date}, 
{class_time}, {instructor_name}, {location}, {rebooking_link}.
Return valid JSON only with exactly these keys: confirmation_subject, confirmation_body, 
reminder_subject, reminder_body, followup_subject, followup_body. 
No preamble, no markdown formatting, no backticks.`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vendorName, classTypes } = await req.json();

  const userMessage = [
    `Instructor name: ${vendorName || "the instructor"}`,
    classTypes?.length
      ? `Active class types: ${classTypes.join(", ")}`
      : "Class types: CCW Initial License, CCW Renewal",
  ].join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";

  let templates: Record<string, string>;
  try {
    templates = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  return NextResponse.json(templates);
}
