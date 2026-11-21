import { StoreFooter } from "@/components/StoreFooter";
import { StoreHeader } from "@/components/StoreHeader";
import { getBusinessSettings, listCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([listCategories(), getBusinessSettings()]);
  return (
    <>
      <StoreHeader categories={categories} settings={settings} />
      <div className="min-h-[60vh]">{children}</div>
      <StoreFooter categories={categories} settings={settings} />
    </>
  );
}
