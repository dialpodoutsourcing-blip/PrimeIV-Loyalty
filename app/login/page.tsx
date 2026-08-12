"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) { setError(authError?.message ?? "Unable to sign in."); setLoading(false); return; }
    const { data: staff } = await supabase.from("staff_memberships").select("role").eq("user_id", data.user.id).eq("active", true).maybeSingle();
    router.replace(staff ? "/admin" : "/");
    router.refresh();
  }

  return <main className="login-page"><section className="login-brand-panel"><Image src="/prime-iv-logo.png" alt="Prime IV Hydration & Wellness" width={206} height={165} priority /><div><p>LOYALTY &amp; WELLNESS</p><h1>Every visit brings something good.</h1><span>Access rewards, schedule your next visit, and stay connected to your spa.</span></div><small>Powered by PatientConvert</small></section><section className="login-form-panel"><form onSubmit={signIn}><p className="kicker">Welcome back</p><h2>Sign in to your portal</h2><span className="login-subtitle">Enter the email and password provided by your spa.</span><label><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button><p className="login-help">Need access? Ask your spa administrator to register your account.</p></form></section></main>;
}
