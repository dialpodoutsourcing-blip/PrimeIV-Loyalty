import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership } = await supabase
    .from("staff_memberships")
    .select("spa_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["manager", "admin"])
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Manager access required." }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Service name is required." }, { status: 400 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await admin
    .from("services")
    .update({
      name,
      description: body.description || null,
      category: String(body.category || "service").trim(),
      is_bookable: Boolean(body.is_bookable),
      active: Boolean(body.active),
    })
    .eq("id", id)
    .eq("spa_id", membership.spa_id)
    .select("id,name,description,category,is_bookable,active,display_order")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Service was not found in your spa." }, { status: 404 });
  return NextResponse.json({ service: data });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  const { id } = await context.params;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  // Archive the row so historical appointments and rewards retain their references.
  const { data, error } = await admin.from("services").update({ active: false, is_bookable: false }).eq("id", id).eq("spa_id", membership.spa_id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Product or service was not found in your spa." }, { status: 404 });
  return NextResponse.json({ deleted: true, id });
}
