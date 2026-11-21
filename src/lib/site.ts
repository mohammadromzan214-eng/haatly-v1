// Brand + locale settings in one place so a rename or currency change is a one-file edit.
export const site = {
  name: "Haatly",
  tagline: "The whole haat, one tap away.",
  description:
    "Haatly is a Bangladeshi online bazaar — own-stock essentials, curated partner shops and early pre-orders, delivered nationwide.",
  currencySymbol: "৳",
  supportPhone: "09612-428759",
  supportEmail: "care@haatly.com.bd",
  warehouse: "Haatly Fulfilment Centre, Tejgaon I/A, Dhaka",
  delivery: { insideDhaka: 70, outsideDhaka: 130, freeOver: 4999 },
};

export function formatPrice(amount: number) {
  // Lakh-style grouping (1,25,000) matches how prices are read in Bangladesh.
  return `${site.currencySymbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
