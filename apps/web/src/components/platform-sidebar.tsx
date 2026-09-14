"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@rkyves/shared";
import { platformNav } from "@/lib/platform-nav";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function PlatformSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/superadmin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Platform</p>
        <p className="mt-1 text-lg font-semibold">{brand.name}</p>
        <p className="truncate text-xs text-slate-400">{userName}</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {platformNav.map((item) => {
          const active =
            item.href === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-amber-500/15 text-amber-300" : "text-slate-300 hover:bg-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <Link href="/dashboard" className="mb-2 block text-xs text-slate-400 hover:text-slate-200">
          ← Tenant app
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
