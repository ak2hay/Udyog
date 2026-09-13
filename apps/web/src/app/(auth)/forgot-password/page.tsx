"use client";

import { useState } from "react";
import Link from "next/link";
import { brand } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input, Label } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo,
    });
    setLoading(false);
    if (err) {
      setError(err.message || err.code || "Could not send reset link");
      return;
    }
    setDone(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4">
      <Card className="relative w-full max-w-md p-6">
        <p className="text-2xl font-semibold text-[var(--color-primary)]">{brand.name}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Reset your password</p>
        {done ? (
          <p className="mt-6 text-sm text-[var(--color-muted)]">
            If an account exists for that email, a reset link was issued. Check the server console
            in local dev (email provider not wired yet), then open the link to set a new password.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
          <Link href="/login" className="text-[var(--color-accent)] underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
