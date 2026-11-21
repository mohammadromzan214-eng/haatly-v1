"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAdminData } from "@/components/admin/AdminDataProvider";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, products } = useAdminData();
  const product = products.find((item) => item.id === id);
  if (!ready) return <div className="p-10">Loading product…</div>;
  if (!product) return <div className="p-10"><p>Product not found.</p><Link href="/admin/products" className="mt-4 inline-block text-clay underline">Back to products</Link></div>;
  return <div><header className="border-b border-line px-5 py-8 md:px-10"><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue · {product.sku}</p><h1 className="mt-2 font-display text-4xl font-extrabold">Edit product</h1></header><ProductForm key={product.id} initial={product} /></div>;
}
