CREATE TABLE IF NOT EXISTS bikes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Honda',
  category TEXT NOT NULL DEFAULT 'new' CHECK (category IN ('new', 'used')),
  price INTEGER NOT NULL DEFAULT 0,
  msrp INTEGER,
  year INTEGER,
  mileage INTEGER,
  engine TEXT,
  color TEXT,
  documents TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'incoming', 'reserved')),
  description TEXT,
  images TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bikes_status ON bikes(status);
CREATE INDEX IF NOT EXISTS idx_bikes_featured ON bikes(featured, sort_order);

INSERT OR IGNORE INTO bikes (
  slug, name, brand, category, price, msrp, year, mileage, engine, color, documents, status, description, images, featured, sort_order
) VALUES
  ('honda-vision-2026', 'Honda Vision 2026', 'Honda', 'new', 35900000, 38900000, 2026, 0, '110cc', 'Đỏ đô', 'Hồ sơ đầy đủ', 'in_stock', 'Xe mới 100%, hỗ trợ trả góp nhanh. Tặng phụ kiện chính hãng theo chương trình tại cửa hàng.', '["/assets/vision-red-bike.jpg"]', 1, 1),
  ('honda-air-blade-160', 'Honda Air Blade 160', 'Honda', 'new', 56500000, 59500000, 2026, 0, '160cc', 'Đen nhám', 'Hồ sơ đầy đủ', 'incoming', 'Phiên bản thể thao, máy khỏe, thiết kế hiện đại. Đặt trước để ưu tiên nhận xe khi về.', '["/assets/vision-promo.jpg"]', 1, 2),
  ('honda-sh-mode-2023', 'Honda SH Mode 2023', 'Honda', 'used', 53500000, NULL, 2023, 8200, '125cc', 'Trắng ngọc trai', 'Giấy tờ hợp lệ', 'in_stock', 'Xe cũ tuyển chọn, máy móc nguyên bản, ngoại hình đẹp. Có hỗ trợ đổi xe và trả góp.', '["/assets/vision-red-bike.jpg"]', 0, 3);
