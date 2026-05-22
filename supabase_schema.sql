-- =============================================
-- QuickServerHub — Supabase Schema
-- Run this in your Supabase project SQL editor
-- =============================================

-- CAFES
CREATE TABLE IF NOT EXISTS cafes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLES (physical tables in the cafe)
CREATE TABLE IF NOT EXISTS cafe_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cafe_id, table_number)
);

-- MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  table_id UUID REFERENCES cafe_tables(id) ON DELETE SET NULL,
  table_number INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'served', 'paid')),
  total NUMERIC(10,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL
);

-- =============================================
-- ENABLE REALTIME (run in Supabase dashboard)
-- =============================================
-- Go to: Database > Replication > Source
-- Enable replication for: orders, order_items

-- =============================================
-- SEED DATA — Demo Cafe
-- =============================================

INSERT INTO cafes (id, name, slug, description, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Café Atlas', 'cafe-atlas', 'A warm Tunisian café with the finest coffees and pastries', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Le Bistro Moderne', 'le-bistro', 'Modern French bistro in the heart of the city', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO cafe_tables (cafe_id, table_number, label)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 'Table 1'),
  ('11111111-1111-1111-1111-111111111111', 2, 'Table 2'),
  ('11111111-1111-1111-1111-111111111111', 3, 'Table 3'),
  ('11111111-1111-1111-1111-111111111111', 4, 'Table 4'),
  ('11111111-1111-1111-1111-111111111111', 5, 'Table 5'),
  ('22222222-2222-2222-2222-222222222222', 1, 'Table 1'),
  ('22222222-2222-2222-2222-222222222222', 2, 'Table 2')
ON CONFLICT DO NOTHING;

INSERT INTO menu_categories (id, cafe_id, name, display_order)
VALUES
  ('aaaa0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Hot Drinks', 1),
  ('aaaa0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Cold Drinks', 2),
  ('aaaa0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Pastries', 3),
  ('aaaa0004-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Main Dishes', 4)
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (cafe_id, category_id, name, description, price, available)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000000', 'Espresso', 'Rich, bold single shot', 2.50, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000000', 'Cappuccino', 'Creamy milk foam with espresso', 3.50, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000000', 'Mint Tea', 'Traditional Tunisian mint tea', 2.00, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000000', 'Iced Latte', 'Cold brewed espresso over ice', 4.00, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000000', 'Fresh Juice', 'Seasonal fruits, freshly squeezed', 3.50, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0003-0000-0000-0000-000000000000', 'Croissant', 'Buttery, flaky French croissant', 2.50, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0003-0000-0000-0000-000000000000', 'Msemen', 'Traditional Tunisian flatbread with honey', 1.50, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0004-0000-0000-0000-000000000000', 'Shakshuka', 'Eggs poached in spiced tomato sauce', 8.00, TRUE),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0004-0000-0000-0000-000000000000', 'Club Sandwich', 'Triple-decker with chicken and veggies', 7.50, TRUE)
ON CONFLICT DO NOTHING;
