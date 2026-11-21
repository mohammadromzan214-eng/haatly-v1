"use client";

import { InventoryManager } from "@/components/admin/InventoryManager";
import { useAdminData } from "@/components/admin/AdminDataProvider";

export default function InventoryPage() {
  const { ready, products, categories, sellers, saveProduct } = useAdminData();
  if (!ready) return <div className="p-10">Loading inventory from the database…</div>;
  return (
    <InventoryManager
      products={products}
      sellers={sellers}
      categories={categories}
      onSave={(rows) => rows.forEach((row) => {
        const product = products.find((item) => item.id === row.id);
        if (product) saveProduct({ ...product, ...row });
      })}
    />
  );
}
