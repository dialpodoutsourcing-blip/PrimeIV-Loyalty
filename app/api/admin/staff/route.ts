import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: "Manager access required." }, { status: 403 }) };
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, membership, admin };
}

export async function GET() {
  const ctx = await context(); if (ctx.error) return ctx.error;
  const { data: memberships, error } = await ctx.admin!.from("staff_memberships").select("id,user_id,role,active,created_at").eq("spa_id", ctx.membership!.spa_id).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: profiles } = await ctx.admin!.from("profiles").select("id,first_name,last_name").eq("spa_id", ctx.membership!.spa_id);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const staff = await Promise.all((memberships ?? []).map(async (item) => {
    const { data } = await ctx.admin!.auth.admin.getUserById(item.user_id);
    return { ...item, email: data.user?.email ?? "", profile: profileMap.get(item.user_id) ?? null };
  }));
  return NextResponse.json({ staff });
}

export async function POST(request: NextRequest) {
  const ctx = await context(); if (ctx.error) return ctx.error;
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const role = ["staff", "manager", "admin"].includes(body.role) ? body.role : "staff";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "The temporary password must be at least 8 characters." }, { status: 400 });

  const { data: created, error: createError } = await ctx.admin!.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { spa_id: ctx.membership!.spa_id, first_name: firstName, last_name: lastName, account_type: "staff" } });
  if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? "Unable to create staff account." }, { status: 400 });
  const userId = created.user.id;
  const { error: membershipError } = await ctx.admin!.from("staff_memberships").insert({ spa_id: ctx.membership!.spa_id, user_id: userId, role, active: true });
  if (membershipError) {
    await ctx.admin!.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }
  // The new-user trigger creates a loyalty account for ordinary signups. Staff are not customers.
  await ctx.admin!.from("loyalty_accounts").delete().eq("spa_id", ctx.membership!.spa_id).eq("user_id", userId);
  await ctx.admin!.from("audit_events").insert({ spa_id: ctx.membership!.spa_id, actor_id: ctx.user!.id, action: "staff.created", entity_type: "staff_membership", metadata: { user_id: userId, email, role } });
  return NextResponse.json({ success: true, staff: { user_id: userId, email, role, active: true, profile: { first_name: firstName, last_name: lastName } } });
}
