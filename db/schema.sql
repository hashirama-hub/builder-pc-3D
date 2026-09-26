-- db/schema.sql
-- D1 database schema for PC Builder 3D (Cloudflare Worker API)

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  specs BLOB NOT NULL,
  price_vnd INTEGER NOT NULL,
  price_updated_at TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  model_3d_url TEXT,
  rating REAL DEFAULT 0,
  tier TEXT CHECK(tier IN ('budget','mid','high','enthusiast'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parts BLOB NOT NULL,
  total_price_vnd INTEGER NOT NULL,
  compatible INTEGER NOT NULL,
  warnings BLOB,
  created_at TEXT NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  user_id TEXT
);
-- short_id is UNIQUE, so SQLite already maintains an index for lookups by short_id
