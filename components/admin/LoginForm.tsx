"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Login failed.");
  }
  return (
    <form onSubmit={submit} className="box grid max-w-sm gap-3" autoComplete="off">
      <h1 className="text-xl font-semibold">Instructor sign-in</h1>
      <label className="grid gap-1">Username<input name="username" required className="btn text-start" autoComplete="username" /></label>
      <label className="grid gap-1">Password<input name="password" type="password" required className="btn text-start" autoComplete="current-password" /></label>
      {error && <p role="alert" className="text-error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
    </form>
  );
}
