import { CalendarClock, Handshake, PackageCheck } from "lucide-react";
import { STOCK_BADGE_LABEL } from "@/lib/catalog-utils";
import type { StockBadge as Badge } from "@/lib/types";

const STYLES: Record<Badge, string> = {
  in_stock: "bg-forest text-paper",
  partner_shop: "bg-marigold text-ink",
  pre_order: "bg-indigo text-paper",
};

const ICONS = { in_stock: PackageCheck, partner_shop: Handshake, pre_order: CalendarClock } as const;

export function StockBadge({ badge, eta, size = "sm" }: { badge: Badge; eta?: string; size?: "sm" | "md" }) {
  const Icon = ICONS[badge];
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${pad} ${STYLES[badge]}`}>
      <Icon className={size === "md" ? "size-3.5" : "size-3"} strokeWidth={2.4} />
      {STOCK_BADGE_LABEL[badge]}
      {badge === "pre_order" && eta ? <span className="font-normal normal-case opacity-80">· {eta}</span> : null}
    </span>
  );
}
