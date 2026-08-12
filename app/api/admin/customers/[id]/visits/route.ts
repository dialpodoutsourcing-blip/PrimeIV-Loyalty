import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncCustomerToGhl } from "@/lib/ghl-customer-sync";

async function contextFor(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: "Manager access required." }, { status: 403 }) };
  const { data: account } = await supabase.from("loyalty_accounts").select("id").eq("spa_id", membership.spa_id).eq("user_id", id).eq("active", true).maybeSingle();
  if (!account) return { error: NextResponse.json({ error: "Active customer loyalty account not found." }, { status: 404 }) };
  return { supabase, user, membership, account };
}

export async function POST(_request: NextRequest, route: { params: Promise<{ id: string }> }) {
  const { id } = await route.params; const ctx = await contextFor(id); if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase!.rpc("record_visit", { target_account_id: ctx.account!.id, request_id: crypto.randomUUID(), target_location_id: null, target_appointment_id: null });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await syncCustomerToGhl(admin, ctx.membership!.spa_id, id).catch(() => undefined);
  return NextResponse.json({ visit: data });
}

export async function DELETE(_request: NextRequest, route: { params: Promise<{ id: string }> }) {
  const { id } = await route.params; const ctx = await contextFor(id); if (ctx.error) return ctx.error;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: visit } = await admin.from("visit_events").select("id").eq("spa_id", ctx.membership!.spa_id).eq("account_id", ctx.account!.id).is("reversed_at", null).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
  if (!visit) return NextResponse.json({ error: "There is no visit to reverse." }, { status: 404 });
  await admin.from("reward_awards").update({ status: "voided", voided_at: new Date().toISOString(), voided_by: ctx.user!.id, void_reason: "Manual visit adjustment" }).eq("source_visit_id", visit.id).eq("status", "issued");
  const { error } = await admin.from("visit_events").update({ reversed_at: new Date().toISOString(), reversed_by: ctx.user!.id, reversal_reason: "Manual admin adjustment" }).eq("id", visit.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await syncCustomerToGhl(admin, ctx.membership!.spa_id, id).catch(() => undefined);
  return NextResponse.json({ reversedVisitId: visit.id });
}

export async function PATCH(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  const { id } = await route.params; const ctx = await contextFor(id); if (ctx.error) return ctx.error;
  const body = await request.json(); const desiredCount = Number(body.visitCount); const lastVisitAt = body.lastVisitAt ? new Date(body.lastVisitAt) : null;
  if (!Number.isInteger(desiredCount) || desiredCount < 0 || desiredCount > 100) return NextResponse.json({ error: "Visit count must be a whole number from 0 to 100." }, { status: 400 });
  if (lastVisitAt && Number.isNaN(lastVisitAt.getTime())) return NextResponse.json({ error: "Last visit date is invalid." }, { status: 400 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: current } = await admin.from("visit_events").select("id").eq("spa_id", ctx.membership!.spa_id).eq("account_id", ctx.account!.id).is("reversed_at", null).order("occurred_at", { ascending: false });
  const visits = current ?? [];
  if (desiredCount > visits.length) {
    for (let index = visits.length; index < desiredCount; index++) {
      const { error } = await ctx.supabase!.rpc("record_visit", { target_account_id: ctx.account!.id, request_id: crypto.randomUUID(), target_location_id: null, target_appointment_id: null });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (desiredCount < visits.length) {
    for (const visit of visits.slice(0, visits.length - desiredCount)) {
      await admin.from("reward_awards").update({ status: "voided", voided_at: new Date().toISOString(), voided_by: ctx.user!.id, void_reason: "Manual visit-count correction" }).eq("source_visit_id", visit.id).eq("status", "issued");
      const { error } = await admin.from("visit_events").update({ reversed_at: new Date().toISOString(), reversed_by: ctx.user!.id, reversal_reason: "Manual visit-count correction" }).eq("id", visit.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  if (desiredCount > 0 && lastVisitAt) {
    const { data: latest } = await admin.from("visit_events").select("id").eq("spa_id", ctx.membership!.spa_id).eq("account_id", ctx.account!.id).is("reversed_at", null).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    if (latest) { const { error } = await admin.from("visit_events").update({ occurred_at: lastVisitAt.toISOString() }).eq("id", latest.id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
  }
  await syncCustomerToGhl(admin, ctx.membership!.spa_id, id).catch(() => undefined);
  return NextResponse.json({ success: true });
}
