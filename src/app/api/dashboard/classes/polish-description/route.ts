import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are assisting a California CCW firearms instructor polishing the 
description for a single class they offer on CarryClass, a booking marketplace. The class 
is something like CCW Initial Training, CCW Renewal Training, or Add a Gun. Tone: 
professional, approachable, and safety-focused.

Preserve the instructor's own words and voice as much as possible. Fix grammar, improve 
flow, and tighten the writing without changing the meaning or making it sound generic. 
Keep it concise. No placeholder brackets. Only use the information provided. Return only 
the polished description text, with no preamble.`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content required to polish" },
      { status: 400 }
    );
  }

  const message = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ description: text });
}
