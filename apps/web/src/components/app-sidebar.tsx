"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand, navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { canAccessModule, type RoleKey } from "@rkyves/shared";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function AppSidebar({
  role,
  tenantName,
  userName,
}: {
  role: RoleKey;
  tenantName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems.filter((item) => canAccessModule(role, item.module));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xl font-semibold tracking-tight">{brand.name}</p>
        <p className="mt-1 truncate text-xs text-white/70">{tenantName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                    active ? "bg-white/15 font-medium" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-xs capitalize text-white/60">{role}</p>
        <button
          className="mt-3 text-xs text-white/70 underline hover:text-white"
          onClick={async () => {
            await authClient.signOut();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
