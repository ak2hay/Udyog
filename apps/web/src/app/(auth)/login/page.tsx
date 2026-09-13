"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brand } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    // App layout sends users without a membership to /onboarding
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 20%, #0F4C5C33, transparent 50%), radial-gradient(ellipse at 80% 80%, #E3641433, transparent 45%)",
        }}
      />
      <Card className="relative w-full max-w-md p-6">
        <p className="text-2xl font-semibold text-[var(--color-primary)]">{brand.name}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{brand.tagline}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Password</Label>
              <Link href="/forgot-password" className="text-xs text-[var(--color-accent)] underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[var(--color-accent)] underline">
            Create account
          </Link>
        </p>
      </Card>
    </div>
  );
}
