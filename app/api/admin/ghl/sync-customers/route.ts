import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncCustomerToGhl } from "@/lib/ghl-customer-sync";

export async function POST() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: profiles, error }, { data: staff }] = await Promise.all([admin.from("profiles").select("id,ghl_contact_id,ghl_sync_status").eq("spa_id", membership.spa_id), admin.from("staff_memberships").select("user_id").eq("spa_id", membership.spa_id).eq("active", true)]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const staffIds = new Set((staff ?? []).map(item => item.user_id)); let synced = 0; let skipped = 0; let notInGhl = 0; const failures: string[] = [];
  for (const profile of (profiles ?? []).filter(item => !staffIds.has(item.id))) {
    try { const result = await syncCustomerToGhl(admin, membership.spa_id, profile.id, { skipLinked: profile.ghl_sync_status === "synced" }); if (result.skipped) skipped++; else if (result.notFound) notInGhl++; else synced++; }
    catch (cause) { failures.push(cause instanceof Error ? cause.message : "Unknown GHL sync error"); }
  }
  if (!synced && !skipped && !notInGhl && failures.length) return NextResponse.json({ error: failures.join("; ") }, { status: 400 });
  return NextResponse.json({ success: true, synced, skipped, notInGhl, failed: failures.length });
}
