import { requirePlatformAdmin } from "@/lib/session";
import { PlatformSidebar } from "@/components/platform-sidebar";

export const preferredRegion = "sin1";

export default async function PlatformConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <PlatformSidebar userName={session.user.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
