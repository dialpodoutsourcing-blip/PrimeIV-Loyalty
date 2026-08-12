import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { syncCustomerToGhl } from "@/lib/ghl-customer-sync";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json();
  const scannedValue = String(body.qrToken ?? "").trim();
  const scannedToken = scannedValue.replace(/^primeiv:\/\/member\//i, "").replace(/\/$/, "");
  if (!scannedToken) return NextResponse.json({ error: "No QR token was provided." }, { status: 400 });

  let member: { user_id: string; first_name: string | null; last_name: string | null; member_code: string; account_id: string; completed_visits?: number } | undefined;
  if (/^PIV-/i.test(scannedToken)) {
    const { data: membership } = await supabase.from("staff_memberships").select("spa_id").eq("user_id", user.id).eq("active", true).maybeSingle();
    if (!membership) return NextResponse.json({ error: "Staff access is required." }, { status: 403 });
    const { data: profile } = await supabase.from("profiles").select("id,first_name,last_name,member_code").eq("spa_id", membership.spa_id).ilike("member_code", scannedToken).maybeSingle();
    if (profile) {
      const { data: account } = await supabase.from("loyalty_accounts").select("id").eq("spa_id", membership.spa_id).eq("user_id", profile.id).eq("active", true).maybeSingle();
      if (account) member = { user_id: profile.id, first_name: profile.first_name, last_name: profile.last_name, member_code: profile.member_code, account_id: account.id };
    }
  } else {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(scannedToken)) return NextResponse.json({ error: "Enter a valid member code (PIV-...) or scan the member QR." }, { status: 400 });
    const { data: members, error: lookupError } = await supabase.rpc("lookup_member_by_qr", { scanned_token: scannedToken });
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    member = members?.[0];
  }
  if (!member) return NextResponse.json({ error: "This QR is invalid or belongs to another spa." }, { status: 404 });

  // Match only this customer's nearest active appointment around check-in time.
  // The appointment remains in history, but record_visit marks it completed.
  const now = Date.now();
  const { data: candidates } = await supabase
    .from("appointments")
    .select("id,scheduled_start")
    .eq("user_id", member.user_id)
    .in("status", ["requested", "confirmed"])
    .order("scheduled_start");
  const today = new Date(now).toISOString().slice(0, 10);
  const sameDayCandidates = (candidates ?? []).filter(item => new Date(item.scheduled_start).toISOString().slice(0, 10) === today);
  const matchedAppointment = sameDayCandidates.sort(
    (a, b) => Math.abs(+new Date(a.scheduled_start) - now) - Math.abs(+new Date(b.scheduled_start) - now),
  )[0];

  const { data: visit, error: visitError } = await supabase.rpc("record_visit", {
    target_account_id: member.account_id,
    request_id: crypto.randomUUID(),
    target_location_id: null,
    target_appointment_id: matchedAppointment?.id ?? null,
  });
  if (visitError) return NextResponse.json({ error: visitError.message }, { status: 400 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (membership) { const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); await syncCustomerToGhl(admin, membership.spa_id, member.user_id).catch(() => undefined); }
  return NextResponse.json({ member, visit, completedAppointmentId: matchedAppointment?.id ?? null });
}
