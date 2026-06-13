import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as "profile" | "gallery";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return NextResponse.json({ error: "Only JPG and PNG allowed" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const timestamp = Date.now();
  const path =
    type === "profile"
      ? `vendor-assets/${vendor.id}/profile.${ext}`
      : `vendor-assets/${vendor.id}/gallery/${timestamp}.${ext}`;

  const buffer = await file.arrayBuffer();
  const db = supabaseAdmin();

  const { error } = await db.storage
    .from("vendor-assets")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const { data: publicUrl } = db.storage
    .from("vendor-assets")
    .getPublicUrl(path);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
