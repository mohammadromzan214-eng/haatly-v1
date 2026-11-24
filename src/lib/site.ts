// Brand + locale settings in one place so a rename or currency change is a one-file edit.
export const site = {
  name: "TOQAEE",
  tagline: "Everything you need, one tap away.",
  description:
    "TOQAEE is a modern Bangladeshi e-commerce platform offering quality products, trusted sellers, and nationwide delivery.",
  currencySymbol: "৳",
  supportPhone: "01623315532",
  supportEmail: "care@toqaee.com.bd",
  warehouse: "TOQAEE Fulfilment Centre, Shariatpur, Dhaka, Bangladesh",
  delivery: { insideDhaka: 70, outsideDhaka: 150, freeOver: 4999 },
};

export function formatPrice(amount: number) {
  return `${site.currencySymbol}${Math.round(amount).toLocaleString("en-IN")}`;
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}