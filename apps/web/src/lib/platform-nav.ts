import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  Shield,
  Settings,
  ScrollText,
  Layers,
} from "lucide-react";

export const platformNav = [
  { href: "/superadmin", label: "Overview", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { href: "/superadmin/plans", label: "Plans", icon: Layers },
  { href: "/superadmin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/superadmin/billing", label: "Billing", icon: Receipt },
  { href: "/superadmin/admins", label: "Admins", icon: Shield },
  { href: "/superadmin/settings", label: "Settings", icon: Settings },
  { href: "/superadmin/audit", label: "Audit", icon: ScrollText },
] as const;
