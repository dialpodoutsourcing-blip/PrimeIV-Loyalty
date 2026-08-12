import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const bucket = "profile-avatars";
function adminClient() { return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); }

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const path = typeof user.user_metadata.avatar_path === "string" ? user.user_metadata.avatar_path : "";
  if (!path) return NextResponse.json({ url: null });
  const { data, error } = await adminClient().storage.from(bucket).createSignedUrl(path, 3600);
  return NextResponse.json({ url: error ? null : data.signedUrl });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const form = await request.formData(); const file = form.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image." }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Profile images must be 3 MB or smaller." }, { status: 400 });
  const admin = adminClient(); await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: 3145728, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${extension}`; const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: metadataError } = await supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_path: path } });
  if (metadataError) return NextResponse.json({ error: metadataError.message }, { status: 400 });
  const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
  return NextResponse.json({ url: signed?.signedUrl ?? null });
}
