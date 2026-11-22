import {
  Boxes, CreditCard, FolderTree, Image, LayoutDashboard, Package, PackagePlus, Settings, Shield, ShoppingCart, Store, TicketPercent, Users,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin-types";

type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  ready: boolean;
  roles: AdminRole[];
};

type AdminNavGroup = { group: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: true, roles: ["super_admin"] }] },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, ready: true, roles: ["super_admin"] },
      { href: "/admin/products/add", label: "Add product", icon: PackagePlus, ready: true, roles: ["super_admin"] },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, ready: true, roles: ["super_admin"] },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, ready: true, roles: ["super_admin"] },
      { href: "/admin/partner-shops", label: "Partner shops", icon: Store, ready: true, roles: ["super_admin"] },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, ready: true, roles: ["super_admin", "order_admin"] },
      { href: "/admin/customers", label: "Customers", icon: Users, ready: true, roles: ["super_admin"] },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, ready: true, roles: ["super_admin", "order_admin"] },
    ],
  },
  {
    group: "Marketing",
    items: [
      { href: "/admin/banners", label: "Banners & offers", icon: Image, ready: true, roles: ["super_admin"] },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, ready: true, roles: ["super_admin"] },
    ],
  },
  { group: "Content", items: [{ href: "/admin/content", label: "Content pages", icon: FolderTree, ready: true, roles: ["super_admin"] }] },
  {
    group: "System",
    items: [
      { href: "/admin/settings", label: "Business settings", icon: Settings, ready: true, roles: ["super_admin"] },
      { href: "/admin/admins", label: "Order admins", icon: Shield, ready: true, roles: ["super_admin"] },
    ],
  },
];
