import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const makePassword = () => `Piv!${randomBytes(12).toString("base64url")}9a`;

async function findUser(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }
}

async function ensureUser({ email, firstName, lastName, spaId }) {
  const existing = await findUser(email);
  if (existing) return { user: existing, password: null, created: false };

  const password = makePassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { spa_id: spaId, first_name: firstName, last_name: lastName },
  });
  if (error) throw error;
  return { user: data.user, password, created: true };
}

const { data: spa, error: spaError } = await supabase
  .from("spas")
  .select("id,name,slug")
  .eq("slug", "spa-1")
  .single();
if (spaError) throw spaError;

const admin = await ensureUser({
  email: "admin1@gmail.com",
  firstName: "Admin",
  lastName: "One",
  spaId: spa.id,
});
const customer = await ensureUser({
  email: "userspa1@gmail.com",
  firstName: "User",
  lastName: "Spa One",
  spaId: spa.id,
});

const { error: adminError } = await supabase.from("staff_memberships").upsert(
  { spa_id: spa.id, user_id: admin.user.id, role: "admin", active: true },
  { onConflict: "spa_id,user_id" },
);
if (adminError) throw adminError;

// Staff keep a profile for identity/contact data, but are not customer loyalty members.
const { error: adminLoyaltyError } = await supabase
  .from("loyalty_accounts")
  .delete()
  .eq("spa_id", spa.id)
  .eq("user_id", admin.user.id);
if (adminLoyaltyError) throw adminLoyaltyError;

const { data: customerProfile, error: profileError } = await supabase
  .from("profiles")
  .update({ phone: "(555) 014-8274", gender: "Not specified", city: "Charlotte", state: "NC" })
  .eq("id", customer.user.id)
  .select("id,member_code,qr_token")
  .single();
if (profileError) throw profileError;

const { data: hydration, error: serviceError } = await supabase
  .from("services")
  .select("id,name")
  .eq("spa_id", spa.id)
  .eq("name", "Hydration IV")
  .single();
if (serviceError) throw serviceError;

const appointmentStart = new Date();
appointmentStart.setUTCDate(appointmentStart.getUTCDate() + 7);
appointmentStart.setUTCHours(14, 0, 0, 0);
const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000);

const { data: existingAppointments, error: appointmentLookupError } = await supabase
  .from("appointments")
  .select("id")
  .eq("spa_id", spa.id)
  .eq("user_id", customer.user.id)
  .in("status", ["requested", "confirmed"])
  .limit(1);
if (appointmentLookupError) throw appointmentLookupError;

if (!existingAppointments?.length) {
  const { error } = await supabase.from("appointments").insert({
    spa_id: spa.id,
    user_id: customer.user.id,
    service_id: hydration.id,
    service_name: hydration.name,
    scheduled_start: appointmentStart.toISOString(),
    scheduled_end: appointmentEnd.toISOString(),
    status: "confirmed",
    notes: "Seed appointment for the Spa 1 demo customer.",
  });
  if (error) throw error;
}

console.log(JSON.stringify({
  spa,
  admin: { email: "admin1@gmail.com", created: admin.created, temporaryPassword: admin.password },
  customer: {
    email: "userspa1@gmail.com",
    created: customer.created,
    temporaryPassword: customer.password,
    memberCode: customerProfile.member_code,
  },
}, null, 2));
