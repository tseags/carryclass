import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are assisting a California CCW firearms instructor writing their public-facing 
description on CarryClass, a booking marketplace. Tone: professional, approachable, 
and safety-focused. First person. No placeholder brackets. Only use data provided. 
Return only the description text, no preamble.

For "polish" mode: preserve the instructor's own words and voice as much as possible. 
Fix grammar, improve flow, and tighten the writing without changing the meaning or 
making it sound generic. Keep it first person.

For "scratch" mode: write a fresh 100–150 word first-person description using the 
name, county, badge tags, and any available profile data provided.`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, content, name, county, badgeTags, profileData } =
    await req.json();

  if (!["polish", "scratch"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  let userMessage: string;
  if (mode === "polish") {
    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content required for polish mode" },
        { status: 400 }
      );
    }
    userMessage = content;
  } else {
    const parts = [
      name && `Instructor name: ${name}`,
      county && `County: ${county}`,
      badgeTags?.length && `Certifications/tags: ${badgeTags.join(", ")}`,
      profileData?.phone && `Phone: ${profileData.phone}`,
      profileData?.website && `Website: ${profileData.website}`,
      profileData?.address && `Address: ${profileData.address}`,
    ].filter(Boolean);
    userMessage = parts.join("\n") || "Write a generic professional CCW instructor bio.";
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ bio: text });
}
