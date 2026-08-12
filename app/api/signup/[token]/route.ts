import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncCustomerToGhl } from "@/lib/ghl-customer-sync";

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return {
    admin: createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }),
    publicClient: createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export async function GET(_request: NextRequest, route: { params: Promise<{ token: string }> }) {
  const { token } = await route.params; const { admin } = clients();
  const { data: spa } = await admin.from("spas").select("name,active").eq("signup_token", token).eq("active", true).maybeSingle();
  if (!spa) return NextResponse.json({ error: "This signup link is invalid or inactive." }, { status: 404 });
  return NextResponse.json({ spa: { name: spa.name } });
}

export async function POST(request: NextRequest, route: { params: Promise<{ token: string }> }) {
  const { token } = await route.params; const { admin, publicClient } = clients();
  const { data: spa } = await admin.from("spas").select("id,name").eq("signup_token", token).eq("active", true).maybeSingle();
  if (!spa) return NextResponse.json({ error: "This signup link is invalid or inactive." }, { status: 404 });
  const body = await request.json(); const email = String(body.email ?? "").trim().toLowerCase(); const phone = String(body.phone ?? "").trim(); const password = String(body.password ?? ""); const firstName = String(body.firstName ?? "").trim(); const lastName = String(body.lastName ?? "").trim();
  const phoneDigits = phone.replace(/\D/g, "");
  if (!email || !firstName || !lastName || phoneDigits.length < 7 || phoneDigits.length > 15 || password.length < 8) return NextResponse.json({ error: "Complete all fields, enter a valid phone number, and use a password of at least 8 characters." }, { status: 400 });
  const { data, error } = await publicClient.auth.signUp({ email, password, options: { data: { spa_id: spa.id, first_name: firstName, last_name: lastName, phone } } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data.user) { await admin.from("profiles").update({ phone }).eq("id", data.user.id).eq("spa_id", spa.id); await syncCustomerToGhl(admin, spa.id, data.user.id).catch(() => undefined); }
  return NextResponse.json({ success: true, requiresEmailConfirmation: !data.session, spaName: spa.name });
}
