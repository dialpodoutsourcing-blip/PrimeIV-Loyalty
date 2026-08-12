"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SpaSignupPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [spaName, setSpaName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });

  useEffect(() => {
    fetch(`/api/signup/${token}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setSpaName(result.spa.name);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function signup(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/signup/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Unable to create your account.");
      setSaving(false);
      return;
    }
    if (result.requiresEmailConfirmation) setSuccess(`Your ${result.spaName} account was created. Check your email to confirm it.`);
    else router.replace("/login");
    setSaving(false);
  }

  return (
    <main className="spa-signup-page">
      <section className="signup-brand">
        <Image src="/prime-iv-logo.png" alt="Prime IV" width={190} height={150} priority />
        <p>LOYALTY &amp; WELLNESS</p>
        <h1>More wellness.<br />Every visit.</h1>
        <span>Create your account to access your loyalty card, member QR, self-booking, and rewards.</span>
      </section>
      <section className="signup-form-wrap">
        {loading ? <p>Loading signup...</p> : error && !spaName ? (
          <div className="signup-invalid"><h2>Signup link unavailable</h2><p>{error}</p></div>
        ) : (
          <form onSubmit={signup}>
            <p className="kicker">Customer registration</p><h2>Join {spaName}</h2>
            <span className="login-subtitle">Your membership will be connected directly to this spa.</span>
            <div className="signup-name-grid">
              <label><span>First name</span><input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
              <label><span>Last name</span><input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
            </div>
            <label><span>Email address</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label><span>Phone number</span><input type="tel" required autoComplete="tel" placeholder="(555) 123-4567" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label><span>Password</span><input type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>At least 8 characters</small></label>
            {error && <p className="login-error">{error}</p>}{success && <p className="scanner-success">{success}</p>}
            {success ? (
              <button type="button" className="primary-button" onClick={() => router.push("/login")}>Continue to login</button>
            ) : (
              <button className="primary-button" disabled={saving}>{saving ? "Creating account..." : "Create my account"}</button>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
