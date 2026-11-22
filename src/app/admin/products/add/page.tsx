import { ProductForm } from "@/components/admin/ProductForm";

export default function AddProductPage() {
  return <div><header className="border-b border-line px-5 py-8 md:px-10"><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue</p><h1 className="mt-2 font-display text-4xl font-extrabold">Add product</h1><p className="mt-2 text-sm text-muted">Product details are stored in the catalogue database.</p></header><ProductForm /></div>;
}
