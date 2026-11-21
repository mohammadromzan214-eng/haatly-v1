import { discountPercent, formatPrice } from "@/lib/site";

export function Price({ price, compareAt, size = "md" }: { price: number; compareAt?: number; size?: "md" | "lg" }) {
  const off = discountPercent(price, compareAt);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-display font-bold tracking-tight ${size === "lg" ? "text-4xl" : "text-xl"}`}>{formatPrice(price)}</span>
      {off > 0 && (
        <>
          <span className={`text-muted line-through ${size === "lg" ? "text-lg" : "text-sm"}`}>{formatPrice(compareAt!)}</span>
          <span className={`rounded bg-clay/10 px-1.5 font-semibold text-clay ${size === "lg" ? "text-sm" : "text-xs"}`}>−{off}%</span>
        </>
      )}
    </div>
  );
}
