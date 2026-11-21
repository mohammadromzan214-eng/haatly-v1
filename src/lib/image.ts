// All storefront imagery is served through Netlify Image CDN so pages never ship full-size originals.
export function cdn(src: string, width: number, height?: number) {
  const params = new URLSearchParams({ url: src, w: String(width), fm: "webp", q: "78" });
  if (height) {
    params.set("h", String(height));
    params.set("fit", "cover");
  }
  return `/.netlify/images?${params.toString()}`;
}
