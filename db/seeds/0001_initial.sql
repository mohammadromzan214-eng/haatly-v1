INSERT INTO sellers (id, slug, name, kind, area, city, commission_rate, rating, handover_days) VALUES
  ('sel_haatly', 'haatly-retail', 'TOQAEE Retail', 'platform', 'Shariatpur', 'Dhaka', 0, 4.8, 0),
  ('sel_gadgetghor', 'gadget-ghor', 'Gadget Ghor', 'partner', 'Elephant Road', 'Dhaka', 8, 4.6, 1),
  ('sel_rupganj', 'rupganj-weavers', 'Rupganj Weavers’ Co-op', 'partner', 'Rupganj', 'Narayanganj', 12, 4.9, 2),
  ('sel_kantha', 'jashore-kantha-collective', 'Jashore Kantha Collective', 'partner', 'Jhikargachha', 'Jashore', 12, 4.7, 3),
  ('sel_kitchenbazar', 'kitchen-bazar-ctg', 'Kitchen Bazar', 'partner', 'Agrabad', 'Chattogram', 7, 4.4, 2)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  area = EXCLUDED.area,
  city = EXCLUDED.city;

INSERT INTO categories (slug, name, blurb, image) VALUES
  ('electronics', 'Electronics', 'Earbuds, wearables, power & sound', '/img/earbuds.png'),
  ('fashion', 'Fashion', 'Jamdani, panjabi & handmade leather', '/img/jamdani-saree.png'),
  ('home-living', 'Home & Living', 'Kantha, ceramics & kitchen', '/img/kantha-cushion.png'),
  ('grocery', 'Grocery', 'Estate tea & pantry staples', '/img/sylhet-tea.png'),
  ('beauty', 'Beauty', 'Skincare that suits humid weather', '/img/serum.png'),
  ('bags-travel', 'Bags & Travel', 'Commute-ready carry', '/img/backpack.png')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, name, email, phone, password_hash, role) VALUES
  ('cus_sample', 'TOQAEE Customer', 'customer@toqaee.com', '01700000000', 'scrypt$haatly-mock-customer-v1$a2b10b73d6dfe997cad20343f833795f4925ceb3b9fa1f8ed89dc13175247997bed4d3d2548b8e98f99cef52502b3862c9cf837899dad580487de4fe1bb85088', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products
  (id, slug, sku, title, short_description, description, category_slug, seller_id, source_type, status, price, compare_at_price, stock, low_stock_threshold, images, payment_methods, rating, review_count, sold_count, highlights, specs, tags, created_at)
VALUES
  ('prd_1001', 'sur-pods-anc-wireless-earbuds', 'TQL-EL-1001', 'Sur Pods ANC Wireless Earbuds', 'Active noise cancelling, 32-hour battery with case, low-latency game mode.', 'Built for loud CNG rides and quiet late-night calls.', 'electronics', 'sel_haatly', 'own_stock', 'active', 3290, 4150, 64, 10, '["/img/earbuds.png"]', '["cod","bkash","nagad"]', 4.6, 412, 1873, '["Hybrid ANC up to -38 dB","32 h total battery"]', '{"Driver":"11 mm dynamic","Warranty":"1 year TOQAEE warranty"}', '["bestseller"]', '2026-09-14'),
  ('prd_1002', 'tara-fit-smartwatch-s2', 'PS-GG-2207', 'Tara Fit Smartwatch S2', '1.9 inch AMOLED, SpO2 and heart-rate tracking, Bangla notifications.', 'Supplied and checked by our partner shop on Elephant Road.', 'electronics', 'sel_gadgetghor', 'partner_shop', 'active', 5840, 6490, 18, 5, '["/img/smartwatch.png"]', '["cod","bkash","nagad"]', 4.4, 156, 604, '["1.9 inch AMOLED","Bangla script support"]', '{"Display":"1.9 inch AMOLED","Warranty":"6 months seller warranty"}', '["new"]', '2026-10-30'),
  ('prd_1003', 'dhakai-jamdani-saree-indigo-motif', 'PS-RW-0318', 'Dhakai Jamdani Saree — Indigo Butidar', 'Handwoven 84-count muslin with indigo and zari motifs.', 'Woven on a pit loom by the Rupganj Weavers’ Co-op.', 'fashion', 'sel_rupganj', 'partner_shop', 'active', 12600, NULL, 7, 3, '["/img/jamdani-saree.png"]', '["cod","bkash","nagad"]', 4.9, 88, 241, '["Handwoven in Rupganj","Includes blouse piece"]', '{"Length":"6 yards","Origin":"Rupganj, Narayanganj"}', '["handmade"]', '2026-08-02')
ON CONFLICT (id) DO NOTHING;

INSERT INTO coupons (id, code, label, percent_off, max_discount, expires_at, active) VALUES
  ('coupon_1', 'TOQAEE10', '10% off your first order', 10, 500, '2026-12-31', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO banners (id, title, placement, image, active, sort_order) VALUES
  ('banner_hero', 'Homepage Hero', 'Hero', '/img/hero.png', true, 0),
  ('banner_featured', 'Bestseller feature', 'Featured section', '/img/earbuds.png', true, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_pages (slug, title, body, published) VALUES
  ('about', 'About Us', 'TOQAEE is a Bangladeshi online bazaar bringing together own-stock essentials and curated partner sellers.', false),
  ('contact', 'Contact Us', 'Contact TOQAEE support by phone or email.', false),
  ('faq', 'FAQ', 'Frequently asked questions will be published here.', false),
  ('privacy', 'Privacy Policy', 'Privacy policy content.', false),
  ('returns', 'Return Policy', 'Return policy content.', false),
  ('terms', 'Terms & Conditions', 'Terms and conditions content.', false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_settings (key, value) VALUES
  ('store', '{"storeName":"TOQAEE","phone":"09612-428759","whatsapp":"","email":"care@toqaee.com.bd","facebook":"","instagram":"","youtube":"","address":"TOQAEEZ Fulfilment Centre, Tejgaon I/A, Dhaka"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
