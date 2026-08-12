import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function adminContext() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: membership } = await supabase.from("staff_memberships").select("spa_id,role").eq("user_id", user.id).eq("active", true).in("role", ["manager", "admin"]).maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: "Manager access required." }, { status: 403 }) };
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, membership, admin };
}

function encrypt(value: string) {
  const secret = process.env.GHL_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) throw new Error("GHL_ENCRYPTION_KEY must be configured on the server.");
  const key = createHash("sha256").update(secret).digest(); const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const secret = process.env.GHL_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) throw new Error("GHL_ENCRYPTION_KEY must be configured on the server.");
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("The saved GHL key is invalid. Enter the PIT key again.");
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

type GhlCustomField = { id?: string; name?: string; fieldKey?: string; field_key?: string; key?: string };
function fieldMatches(field: GhlCustomField, expected: string) {
  const normalize = (value = "") => value.toLowerCase().replace(/^contact\./, "").replace(/[^a-z0-9]/g, "");
  const target = normalize(expected);
  return [field.name, field.fieldKey, field.field_key, field.key]
    .some((value) => normalize(value) === target);
}

function collectCustomFields(value: unknown, fields: GhlCustomField[] = []): GhlCustomField[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCustomFields(item, fields));
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && [record.name, record.fieldKey, record.field_key, record.key].some((item) => typeof item === "string")) {
    fields.push(record as GhlCustomField);
  }
  Object.values(record).forEach((item) => {
    if (item && typeof item === "object") collectCustomFields(item, fields);
  });
  return fields;
}

export async function GET() {
  const ctx = await adminContext(); if (ctx.error) return ctx.error;
  const { data, error } = await ctx.admin!.from("ghl_connections").select("location_id,enabled,spa_visits_field_id,last_spa_visits_field_id,last_synced_at,last_sync_status,last_sync_error,updated_at").eq("spa_id", ctx.membership!.spa_id).maybeSingle();
  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ connection: data ? { ...data, hasPitKey: true } : null });
}

export async function PUT(request: NextRequest) {
  const ctx = await adminContext(); if (ctx.error) return ctx.error;
  const body = await request.json(); const locationId = String(body.locationId ?? "").trim(); const pitKey = String(body.pitKey ?? "").trim();
  if (!locationId) return NextResponse.json({ error: "GHL Location ID is required." }, { status: 400 });
  const { data: existing } = await ctx.admin!.from("ghl_connections").select("pit_key_encrypted").eq("spa_id", ctx.membership!.spa_id).maybeSingle();
  if (!pitKey && !existing) return NextResponse.json({ error: "Location PIT key is required for the first connection." }, { status: 400 });
  let encrypted = existing?.pit_key_encrypted; try { if (pitKey) encrypted = encrypt(pitKey); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Encryption configuration error." }, { status: 500 }); }
  const { error } = await ctx.admin!.from("ghl_connections").upsert({ spa_id: ctx.membership!.spa_id, location_id: locationId, pit_key_encrypted: encrypted, enabled: body.enabled !== false, created_by: ctx.user!.id, updated_by: ctx.user!.id }, { onConflict: "spa_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let token: string;
  try { token = pitKey || decrypt(encrypted!); }
  catch (syncError) { return NextResponse.json({ error: syncError instanceof Error ? syncError.message : "Unable to read the GHL key." }, { status: 500 }); }

  try {
    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/locations/${encodeURIComponent(locationId)}/customFields?model=all`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, Version: "v3" }, cache: "no-store",
    });
    const ghlResult = await ghlResponse.json().catch(() => ({}));
    if (!ghlResponse.ok) throw new Error(ghlResult.message ?? `GHL returned ${ghlResponse.status}.`);
    const fields = collectCustomFields(ghlResult.customFields ?? ghlResult);
    const spaVisits = fields.find((field) => fieldMatches(field, "Spa_Visits"));
    const lastSpaVisits = fields.find((field) => fieldMatches(field, "Last_Spa_Visits"));
    if (!spaVisits?.id || !lastSpaVisits?.id) {
      const missing = [!spaVisits?.id && "Spa_Visits", !lastSpaVisits?.id && "Last_Spa_Visits"].filter(Boolean).join(" and ");
      const returnedNames = [...new Set(fields.map((field) => field.name ?? field.fieldKey ?? field.field_key ?? field.key).filter(Boolean))].slice(0, 30).join(", ");
      throw new Error(`${missing} custom field${missing.includes(" and ") ? "s were" : " was"} not found in this GHL sub-account.${returnedNames ? ` GHL returned: ${returnedNames}` : " GHL returned no custom fields."}`);
    }
    if (spaVisits.id === lastSpaVisits.id) {
      throw new Error("GHL returned the same ID for Spa_Visits and Last_Spa_Visits. The field mappings were not saved.");
    }
    const syncedAt = new Date().toISOString();
    const { error: updateError } = await ctx.admin!.from("ghl_connections").update({ spa_visits_field_id: spaVisits.id, last_spa_visits_field_id: lastSpaVisits.id, last_synced_at: syncedAt, last_sync_status: "success", last_sync_error: null, updated_by: ctx.user!.id }).eq("spa_id", ctx.membership!.spa_id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ success: true, fieldIds: { spaVisits: spaVisits.id, lastSpaVisits: lastSpaVisits.id }, syncedAt });
  } catch (syncError) {
    const syncMessage = syncError instanceof Error ? syncError.message : "Unable to sync GHL custom fields.";
    await ctx.admin!.from("ghl_connections").update({ last_sync_status: "failed", last_sync_error: syncMessage, updated_by: ctx.user!.id }).eq("spa_id", ctx.membership!.spa_id);
    return NextResponse.json({ error: syncMessage }, { status: 400 });
  }
}
