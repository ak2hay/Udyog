"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { brand } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input, Label } from "@/components/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Open the link from your email / server log.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (err) {
      setError(err.message || err.code || "Reset failed");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="relative w-full max-w-md p-6">
      <p className="text-2xl font-semibold text-[var(--color-primary)]">{brand.name}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Choose a new password</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>New password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
        <Link href="/login" className="text-[var(--color-accent)] underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4">
      <Suspense fallback={<Card className="w-full max-w-md p-6">Loading…</Card>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
