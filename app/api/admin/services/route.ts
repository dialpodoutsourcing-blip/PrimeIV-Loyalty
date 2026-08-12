import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Manager access required." }, { status: 403 });

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Product or service name is required." }, { status: 400 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: latest } = await admin.from("services").select("display_order").eq("spa_id", membership.spa_id).order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await admin.from("services").insert({ spa_id: membership.spa_id, name, description: String(body.description ?? "").trim() || null, category: String(body.category ?? "service").trim() || "service", is_bookable: Boolean(body.is_bookable), active: true, display_order: (latest?.display_order ?? 0) + 10 }).select("id,name,description,category,is_bookable,active,display_order").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "A product or service with this name already exists." : error.message }, { status: 400 });
  return NextResponse.json({ service: data }, { status: 201 });
}
