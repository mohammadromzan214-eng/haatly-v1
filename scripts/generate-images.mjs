// One-off asset generator for Haatly's storefront photography (Netlify AI Gateway → Gemini image model).
// Usage: node scripts/generate-images.mjs [name ...]   (regenerates only the named assets when given)
import { GoogleGenAI } from "@google/genai";
import { writeFile } from "node:fs/promises";

const ai = new GoogleGenAI({
  apiKey: process.env.NETLIFY_AI_GATEWAY_KEY,
  httpOptions: { baseUrl: process.env.NETLIFY_AI_GATEWAY_URL?.replace(/\/$/, "") },
});

const STYLE =
  "Professional e-commerce product photograph, single product centered, placed on a warm cream linen surface against a soft sand-coloured seamless backdrop, gentle natural window light from the left, soft realistic shadow, shallow depth of field, crisp detail, no text, no logos, no watermark, no people.";

const ASSETS = [
  ["hero", "16:9", "Editorial lifestyle flat-lay photograph viewed from above on a warm terracotta and cream textured surface: a folded handwoven cotton saree with a thin red border, matte black wireless earbuds in an open case, a small ceramic teacup with amber tea, a brown leather sandal, a tin of loose-leaf tea, a sprig of green leaves, scattered marigold petals. Rich warm afternoon light, long soft shadows, generous empty space on the left side, premium magazine look, no text, no logos, no people."],
  ["earbuds", "1:1", `Matte charcoal true-wireless earbuds with their open charging case. ${STYLE}`],
  ["smartwatch", "1:1", `A modern square-faced smartwatch with a deep green woven fabric strap, screen dark. ${STYLE}`],
  ["jamdani-saree", "1:1", `A neatly folded handwoven Jamdani muslin saree, off-white with intricate woven indigo and gold motifs, border visible. ${STYLE}`],
  ["leather-sandals", "1:1", `A pair of handcrafted tan leather sandals with braided straps. ${STYLE}`],
  ["tea-set", "1:1", `A handmade terracotta-glazed ceramic tea set: teapot and two small cups. ${STYLE}`],
  ["sylhet-tea", "1:1", `A matte dark green metal tea tin with lid off beside a small pile of loose black tea leaves and a wooden scoop. ${STYLE}`],
  ["panjabi", "1:1", `A men's cotton panjabi (long kurta) in muted sage green, neatly folded with a mandarin collar and wooden buttons visible. ${STYLE}`],
  ["rice-cooker", "1:1", `A compact modern electric rice cooker in cream white with a stainless steel lid. ${STYLE}`],
  ["serum", "1:1", `An amber glass dropper bottle of facial serum with a minimal blank label, a few drops on the surface. ${STYLE}`],
  ["backpack", "1:1", `A rugged olive canvas laptop backpack with tan leather trims, standing upright. ${STYLE}`],
  ["speaker", "1:1", `A cylindrical portable bluetooth speaker wrapped in rust-orange fabric. ${STYLE}`],
  ["kantha-cushion", "1:1", `A square cushion with a hand-stitched Nakshi Kantha embroidered cover in red, indigo and mustard running-stitch patterns. ${STYLE}`],
  ["power-bank", "1:1", `A slim graphite aluminium power bank with a braided USB-C cable coiled beside it. ${STYLE}`],
];

const only = new Set(process.argv.slice(2));
const queue = ASSETS.filter(([name]) => only.size === 0 || only.has(name));

async function generate([name, aspectRatio, prompt]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: prompt,
        config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error("no image in response");
      const ext = part.inlineData.mimeType?.includes("jpeg") ? "jpg" : "png";
      await writeFile(`public/img/${name}.${ext}`, Buffer.from(part.inlineData.data, "base64"));
      console.log(`ok ${name}.${ext}`);
      return;
    } catch (err) {
      console.log(`retry ${name} (${attempt}): ${err.message?.slice(0, 160)}`);
    }
  }
  console.log(`FAILED ${name}`);
}

const CONCURRENCY = 5;
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await generate(queue.shift());
});
await Promise.all(workers);
