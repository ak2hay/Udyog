import { endImpersonation } from "@/app/actions/platform";
import { Button } from "@/components/ui";

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950">
      <p>
        Impersonating tenant <strong>{tenantName}</strong>
      </p>
      <form action={endImpersonation}>
        <Button type="submit" variant="secondary">
          End impersonation
        </Button>
      </form>
    </div>
  );
}
