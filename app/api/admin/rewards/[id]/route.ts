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
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin
    .from("reward_definitions")
    .update({
      name: String(body.name ?? "").trim(),
      description: body.description || null,
      terms: body.terms || null,
      valid_days: body.valid_days || null,
      active: Boolean(body.active),
    })
    .eq("id", id)
    .eq("spa_id", membership.spa_id)
    .select("id,visit_number,name,description,terms,valid_days,is_free_product,active")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Reward was not found in your spa." }, { status: 404 });
  return NextResponse.json({ reward: data });
}
