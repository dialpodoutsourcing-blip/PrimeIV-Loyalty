import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, route: { params: Promise<{ id: string }> }) {
  const { id } = await route.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Staff access required." }, { status: 403 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error } = await admin.from("profiles").select("id,first_name,last_name,phone,gender,address_line_1,address_line_2,city,state,postal_code,member_code,created_at,ghl_contact_id,ghl_sync_status,ghl_synced_at").eq("id", id).eq("spa_id", membership.spa_id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: error?.message ?? "Customer not found." }, { status: 404 });
  const { data: auth } = await admin.auth.admin.getUserById(id);
  return NextResponse.json({ customer: { ...profile, email: auth.user?.email ?? "" } });
}
