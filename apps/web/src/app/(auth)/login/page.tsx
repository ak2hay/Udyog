"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brand } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Input, Label } from "@/components/ui";
import { isEmailOtpEnabled, sendLoginOtp, verifyLoginOtpAction } from "@/app/actions/otp";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isEmailOtpEnabled().then(setOtpEnabled).catch(() => setOtpEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (otpEnabled) {
        if (!otpSent) {
          const fd = new FormData();
          fd.set("email", email);
          await sendLoginOtp(fd);
          setOtpSent(true);
          setLoading(false);
          return;
        }
        const verified = await verifyLoginOtpAction(email, otp);
        if (!verified.ok) {
          setError(verified.error || "Invalid OTP");
          setLoading(false);
          return;
        }
      }

      const { error: err } = await authClient.signIn.email({ email, password });
      if (err) {
        setError(err.message || err.code || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
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
          {otpEnabled && otpSent ? (
            <div>
              <Label>Email OTP</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter code from email"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait…"
              : otpEnabled && !otpSent
                ? "Send OTP & continue"
                : "Sign in"}
          </Button>
          {otpEnabled ? (
            <p className="text-center text-xs text-[var(--color-muted)]">Email OTP is required</p>
          ) : null}
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
