import { brand } from "@rkyves/shared";
import type { ModuleKey } from "@rkyves/shared";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Factory,
  ClipboardCheck,
  Wallet,
  Settings,
  Truck,
  Boxes,
  FileText,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: ModuleKey;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/crm/customers", label: "Customers", icon: Users, module: "crm" },
  { href: "/crm/enquiries", label: "Enquiries", icon: FileText, module: "crm" },
  { href: "/sales/quotations", label: "Quotations", icon: FileText, module: "sales" },
  { href: "/sales/orders", label: "Sales Orders", icon: ShoppingCart, module: "sales" },
  { href: "/sales/dispatch", label: "Dispatch", icon: Truck, module: "sales" },
  { href: "/sales/invoices", label: "Invoices", icon: FileText, module: "sales" },
  { href: "/purchase/suppliers", label: "Suppliers", icon: Users, module: "purchase" },
  { href: "/purchase/requests", label: "Purchase Requests", icon: FileText, module: "purchase" },
  { href: "/purchase/orders", label: "Purchase Orders", icon: ShoppingCart, module: "purchase" },
  { href: "/purchase/grn", label: "GRN", icon: Package, module: "purchase" },
  { href: "/inventory/items", label: "Items", icon: Boxes, module: "inventory" },
  { href: "/inventory/stock", label: "Stock", icon: Package, module: "inventory" },
  { href: "/manufacturing/bom", label: "BOM", icon: Factory, module: "manufacturing" },
  { href: "/manufacturing/work-centers", label: "Work Centers", icon: Factory, module: "manufacturing" },
  { href: "/manufacturing/orders", label: "Production", icon: Factory, module: "manufacturing" },
  { href: "/manufacturing/job-cards", label: "Job Cards", icon: ClipboardCheck, module: "manufacturing" },
  { href: "/quality/inspections", label: "Quality", icon: ClipboardCheck, module: "quality" },
  { href: "/finance/receivables", label: "Receivables", icon: Wallet, module: "finance" },
  { href: "/finance/payables", label: "Payables", icon: Wallet, module: "finance" },
  { href: "/admin/company", label: "Company", icon: Settings, module: "admin" },
  { href: "/admin/users", label: "Users", icon: Users, module: "admin" },
];

export { brand };
