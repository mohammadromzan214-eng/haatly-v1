import {
  Boxes, CreditCard, FolderTree, Image, LayoutDashboard, Package, PackagePlus, Settings, ShoppingCart, Store, TicketPercent, Users,
} from "lucide-react";

/** Admin navigation. `ready` marks implemented screens; partner shops stay admin-only. */
export const ADMIN_NAV = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: false }] },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, ready: true },
      { href: "/admin/products/add", label: "Add product", icon: PackagePlus, ready: true },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes, ready: true },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, ready: true },
      { href: "/admin/partner-shops", label: "Partner shops", icon: Store, ready: false },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, ready: false },
      { href: "/admin/customers", label: "Customers", icon: Users, ready: false },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, ready: true },
    ],
  },
  {
    group: "Marketing",
    items: [
      { href: "/admin/banners", label: "Banners & offers", icon: Image, ready: true },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, ready: true },
    ],
  },
  { group: "Content", items: [{ href: "/admin/content", label: "Content pages", icon: FolderTree, ready: true }] },
  { group: "System", items: [{ href: "/admin/settings", label: "Business settings", icon: Settings, ready: true }] },
];
