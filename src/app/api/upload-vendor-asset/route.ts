import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

/** Prefer browser MIME; fall back to extension when type is empty (common on some OS pickers). */
function resolveImageContentType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  if (file.type) return null;

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vendor = await getVendorProfile(userId);
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file");
    const typeRaw = formData.get("type");
    const type = typeRaw === "profile" || typeRaw === "gallery" ? typeRaw : null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const contentType = resolveImageContentType(file);
    if (!contentType) {
      return NextResponse.json({ error: "Only JPG and PNG allowed" }, { status: 400 });
    }

    const ext = contentType === "image/png" ? "png" : "jpg";
    const timestamp = Date.now();
    // Object path inside the `vendor-assets` bucket (not a second bucket segment).
    const path =
      type === "profile"
        ? `${vendor.id}/profile.${ext}`
        : `${vendor.id}/gallery/${timestamp}.${ext}`;

    const buffer = await file.arrayBuffer();
    const db = supabaseAdmin();

    const { error } = await db.storage.from("vendor-assets").upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    const { data: publicUrl } = db.storage.from("vendor-assets").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload-vendor-asset]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
