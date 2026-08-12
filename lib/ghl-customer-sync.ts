import { createDecipheriv, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function decrypt(value: string) {
  const secret = process.env.GHL_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) throw new Error("GHL_ENCRYPTION_KEY must be configured on the server.");
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("The saved GHL key is invalid. Save the connection again.");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

const normalize = (value?: string | null) => (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function syncCustomerToGhl(admin: SupabaseClient, spaId: string, userId: string, options: { skipLinked?: boolean } = {}) {
  const { data: profile, error: profileError } = await admin.from("profiles").select("id,first_name,last_name,phone,gender,address_line_1,city,state,postal_code,ghl_contact_id").eq("spa_id", spaId).eq("id", userId).single();
  if (profileError) throw new Error(profileError.message);
  const { data: auth } = await admin.auth.admin.getUserById(userId); const email = auth.user?.email ?? "";
  const { data: connection } = await admin.from("ghl_connections").select("location_id,pit_key_encrypted,spa_visits_field_id,last_spa_visits_field_id,enabled").eq("spa_id", spaId).maybeSingle();
  if (!connection?.enabled) throw new Error("GHL sync is not connected or enabled for this spa.");
  if (!connection.spa_visits_field_id || !connection.last_spa_visits_field_id) throw new Error("The GHL visit fields have not been mapped.");
  const token = decrypt(connection.pit_key_encrypted);
  const { data: account } = await admin.from("loyalty_accounts").select("id").eq("spa_id", spaId).eq("user_id", userId).eq("active", true).maybeSingle();
  const { data: visits } = account ? await admin.from("visit_events").select("occurred_at").eq("spa_id", spaId).eq("account_id", account.id).is("reversed_at", null).order("occurred_at", { ascending: false }) : { data: [] };
  const history = visits ?? [];
  const headers = { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, Version: "2021-07-28" };
  let contactId: string | null = profile.ghl_contact_id;

  // Validate a previously saved link. Contacts created by the old upsert fallback
  // are deliberately unlinked; this integration is match-only and must never
  // manufacture a CRM contact.
  if (contactId) {
    const linkedResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, { headers, cache: "no-store" });
    const linkedResult = await linkedResponse.json().catch(() => ({}));
    const linked = linkedResult.contact ?? linkedResult;
    if (!linkedResponse.ok || String(linked.source ?? "").toLowerCase() === "prime iv loyalty portal") {
      contactId = null;
      await admin.from("profiles").update({ ghl_contact_id: null, ghl_sync_status: "pending", ghl_synced_at: null }).eq("id", userId).eq("spa_id", spaId);
    }
  }
  if (options.skipLinked && contactId) return { skipped: true, contactId };

  if (!contactId) {
    const terms = [...new Set([email, profile.phone, [profile.first_name, profile.last_name].filter(Boolean).join(" ")].filter(Boolean))];
    const candidates = new Map<string, { id: string; email?: string; phone?: string; firstName?: string; lastName?: string; name?: string; source?: string }>();
    for (const term of terms) {
      const response = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(connection.location_id)}&query=${encodeURIComponent(term)}&limit=20`, { headers, cache: "no-store" });
      if (!response.ok) continue;
      const result = await response.json(); (result.contacts ?? []).forEach((item: { id: string }) => candidates.set(item.id, item));
    }
    const expectedName = normalize(`${profile.first_name ?? ""}${profile.last_name ?? ""}`);
    const match = [...candidates.values()].filter(item => String(item.source ?? "").toLowerCase() !== "prime iv loyalty portal").map(item => ({ item, score: (email && normalize(item.email) === normalize(email) ? 100 : 0) + (profile.phone && normalize(item.phone) === normalize(profile.phone) ? 80 : 0) + (expectedName && normalize(item.name ?? `${item.firstName ?? ""}${item.lastName ?? ""}`) === expectedName ? 40 : 0) })).sort((a, b) => b.score - a.score)[0];
    if (match?.score >= 40) contactId = match.item.id;
  }

  if (!contactId) {
    await admin.from("profiles").update({ ghl_contact_id: null, ghl_sync_status: "not_in_ghl", ghl_synced_at: null, ghl_sync_error: null }).eq("id", userId).eq("spa_id", spaId);
    return { skipped: false, notFound: true, contactId: null };
  }

  const customFields: { id: string; fieldValue: number | string }[] = [
    { id: connection.spa_visits_field_id, fieldValue: history.length },
  ];
  const lastVisit = history[0]?.occurred_at;
  if (lastVisit) customFields.push({ id: connection.last_spa_visits_field_id, fieldValue: new Date(lastVisit).toISOString().slice(0, 10) });
  const updateResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ customFields }),
  });
  const updateResult = await updateResponse.json().catch(() => ({}));
  if (!updateResponse.ok) {
    const message = Array.isArray(updateResult.message) ? updateResult.message.join(", ") : updateResult.message ?? `GHL returned ${updateResponse.status}`;
    await admin.from("profiles").update({ ghl_sync_status: "failed", ghl_sync_error: message }).eq("id", userId).eq("spa_id", spaId);
    throw new Error(message);
  }

  const syncedAt = new Date().toISOString();
  const { error: saveError } = await admin.from("profiles").update({ ghl_contact_id: contactId, ghl_sync_status: "synced", ghl_synced_at: syncedAt, ghl_sync_error: null }).eq("id", userId).eq("spa_id", spaId);
  if (saveError) throw new Error(saveError.message);
  return { skipped: false, contactId, syncedAt };
}
