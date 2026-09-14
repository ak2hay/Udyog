"use client";

import { useState, useTransition } from "react";
import { startTenantCheckout } from "@/app/actions/platform";
import { Button } from "@/components/ui";

export function PlanCheckoutButton({ planId, label }: { planId: string; label: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onClick() {
    setError("");
    startTransition(async () => {
      try {
        const result = await startTenantCheckout(planId);
        if (result.free) {
          window.location.reload();
          return;
        }
        if (result.shortUrl) {
          window.location.href = result.shortUrl;
          return;
        }
        setError("Checkout created but no payment URL returned. Check Razorpay config.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout failed");
      }
    });
  }

  return (
    <div>
      <Button type="button" onClick={onClick} disabled={pending}>
        {pending ? "Starting…" : label}
      </Button>
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
