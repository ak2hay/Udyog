"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { brand } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input, Label } from "@/components/ui";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "forbidden" ? "Not a platform admin" : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message || err.code || "Login failed");
      return;
    }
    const next = searchParams.get("next") || "/superadmin";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 15% 20%, #f59e0b33, transparent 50%), radial-gradient(ellipse at 85% 80%, #0f172a, transparent 45%)",
        }}
      />
      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900 p-6 text-slate-100">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400">Super Admin</p>
        <p className="mt-2 text-2xl font-semibold">{brand.name} Platform</p>
        <p className="mt-1 text-sm text-slate-400">Sign in with a platform admin account</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400" disabled={loading}>
            {loading ? "Signing in…" : "Enter platform"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="text-amber-400 underline">
            Tenant login
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
