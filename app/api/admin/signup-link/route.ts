import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: spa, error } = await admin.from("spas").select("signup_token").eq("id", membership.spa_id).single();
  if (error) {
    const missingColumn = error.message.includes("signup_token") || error.code === "PGRST204" || error.code === "42703";
    return NextResponse.json({ error: missingColumn ? "The signup-link database migration has not been run. Run supabase/add_spa_signup_links.sql in Supabase." : error.message }, { status: 400 });
  }
  let token = spa.signup_token as string | null;
  if (!token) {
    token = randomUUID();
    const { error: updateError } = await admin.from("spas").update({ signup_token: token }).eq("id", membership.spa_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ url: `${request.nextUrl.origin}/signup/${token}` });
}
