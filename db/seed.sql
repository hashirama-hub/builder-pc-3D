-- db/seed.sql — 46 realistic parts for PC Builder 3D.
-- Prices are Vietnamese market VND, ~2026. Specs is a JSON string matching
-- apps/web `PartSpecs` (socket, ramType, tdp, wattage, lengthMm, heightMm,
-- formFactor, maxGpuLengthMm, maxCoolerHeightMm, ramSlots, sataPorts, m2Slots,
-- fanHeaders, resolution, refreshRate, panelType) so the compatibility engine
-- in apps/web/lib/compatEngine.ts can run on every row.
--
-- How to apply:
--   npm run seed          -> wrangler d1 execute PC_BUILDER_DB --local (schema + this file)
--   npm run seed:remote   -> same against the remote D1 (needs database id in workers/api/wrangler.toml)
--   node scripts/seed.ts  -> same as `npm run seed`, via wrangler
--   node scripts/seed.mjs -> offline: applies schema + seed with node:sqlite to the
--                            local D1 state file under .wrangler/state
--
-- imageUrl    = /img/<id>.jpg
-- model3dUrl  = /models/<id>.glb
-- tier        ∈ {budget, mid, high, enthusiast} (CHECK constraint in db/schema.sql)

-- ---------------------------------------------------------------------------
-- CPU (7): Intel LGA1700 DDR5, AMD AM5 DDR5, AMD AM4 DDR4
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('cpu-intel-i5-13600k',    'cpu', 'Intel', 'Core i5-13600K',       '{"socket":"LGA1700","ramType":"DDR5","tdp":125}', 7490000,  '2026-09-27T00:00:00.000Z', 24, '/img/cpu-intel-i5-13600k.jpg',    '/models/cpu-intel-i5-13600k.glb',    4.7, 'mid'),
('cpu-intel-i7-14700k',    'cpu', 'Intel', 'Core i7-14700K',       '{"socket":"LGA1700","ramType":"DDR5","tdp":125}', 10290000, '2026-09-27T00:00:00.000Z', 18, '/img/cpu-intel-i7-14700k.jpg',    '/models/cpu-intel-i7-14700k.glb',    4.7, 'high'),
('cpu-intel-i9-14900k',    'cpu', 'Intel', 'Core i9-14900K',       '{"socket":"LGA1700","ramType":"DDR5","tdp":125}', 13990000, '2026-09-27T00:00:00.000Z', 10, '/img/cpu-intel-i9-14900k.jpg',    '/models/cpu-intel-i9-14900k.glb',    4.6, 'enthusiast'),
('cpu-amd-r5-7600',        'cpu', 'AMD',   'Ryzen 5 7600',         '{"socket":"AM5","ramType":"DDR5","tdp":65}',      5490000,  '2026-09-27T00:00:00.000Z', 30, '/img/cpu-amd-r5-7600.jpg',        '/models/cpu-amd-r5-7600.glb',        4.8, 'mid'),
('cpu-amd-r7-7800x3d',     'cpu', 'AMD',   'Ryzen 7 7800X3D',      '{"socket":"AM5","ramType":"DDR5","tdp":120}',     10990000, '2026-09-27T00:00:00.000Z', 16, '/img/cpu-amd-r7-7800x3d.jpg',     '/models/cpu-amd-r7-7800x3d.glb',     4.9, 'high'),
('cpu-amd-r9-7950x',       'cpu', 'AMD',   'Ryzen 9 7950X',        '{"socket":"AM5","ramType":"DDR5","tdp":170}',     13490000, '2026-09-27T00:00:00.000Z', 8,  '/img/cpu-amd-r9-7950x.jpg',       '/models/cpu-amd-r9-7950x.glb',       4.7, 'enthusiast'),
('cpu-amd-r5-5600',        'cpu', 'AMD',   'Ryzen 5 5600',         '{"socket":"AM4","ramType":"DDR4","tdp":65}',      3190000,  '2026-09-27T00:00:00.000Z', 40, '/img/cpu-amd-r5-5600.jpg',        '/models/cpu-amd-r5-5600.glb',        4.6, 'budget');

-- ---------------------------------------------------------------------------
-- GPU (6): RTX 4060 7.5tr → RTX 4090 65tr. lengthMm drives the case clearance check.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('gpu-asus-rtx4060',       'gpu', 'ASUS',     'Dual GeForce RTX 4060 OC 8GB',           '{"tdp":115,"lengthMm":200}',  7490000,  '2026-09-27T00:00:00.000Z', 25, '/img/gpu-asus-rtx4060.jpg',       '/models/gpu-asus-rtx4060.glb',       4.5, 'budget'),
('gpu-msi-rtx4060ti',      'gpu', 'MSI',      'GeForce RTX 4060 Ti Ventus 3X 16GB',     '{"tdp":165,"lengthMm":244}',  11490000, '2026-09-27T00:00:00.000Z', 20, '/img/gpu-msi-rtx4060ti.jpg',      '/models/gpu-msi-rtx4060ti.glb',      4.5, 'mid'),
('gpu-gigabyte-rtx4070s',  'gpu', 'Gigabyte', 'GeForce RTX 4070 SUPER Gaming OC 12GB', '{"tdp":220,"lengthMm":300}',  14990000, '2026-09-27T00:00:00.000Z', 15, '/img/gpu-gigabyte-rtx4070s.jpg',  '/models/gpu-gigabyte-rtx4070s.glb',  4.7, 'high'),
('gpu-asus-rtx4070tis',    'gpu', 'ASUS',     'TUF GeForce RTX 4070 Ti SUPER OC 16GB', '{"tdp":285,"lengthMm":305}',  21990000, '2026-09-27T00:00:00.000Z', 12, '/img/gpu-asus-rtx4070tis.jpg',    '/models/gpu-asus-rtx4070tis.glb',    4.7, 'high'),
('gpu-msi-rtx4080s',       'gpu', 'MSI',      'GeForce RTX 4080 SUPER Suprim X 16GB',   '{"tdp":320,"lengthMm":336}',  32990000, '2026-09-27T00:00:00.000Z', 7,  '/img/gpu-msi-rtx4080s.jpg',       '/models/gpu-msi-rtx4080s.glb',       4.8, 'enthusiast'),
('gpu-asus-rtx4090',       'gpu', 'ASUS',     'TUF GeForce RTX 4090 OC 24GB',          '{"tdp":450,"lengthMm":348}',  64990000, '2026-09-27T00:00:00.000Z', 5,  '/img/gpu-asus-rtx4090.jpg',       '/models/gpu-asus-rtx4090.glb',       4.9, 'enthusiast');

-- ---------------------------------------------------------------------------
-- Mainboard (5): socket/ramType/formFactor feed the socket + RAM + case checks.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('mb-asus-b760m-tuf',      'mainboard', 'ASUS',     'TUF Gaming B760M-PLUS WIFI',        '{"socket":"LGA1700","ramType":"DDR5","formFactor":"mATX","ramSlots":4,"sataPorts":4,"m2Slots":2,"fanHeaders":4,"tdp":20}', 4690000, '2026-09-27T00:00:00.000Z', 22, '/img/mb-asus-b760m-tuf.jpg',      '/models/mb-asus-b760m-tuf.glb',      4.6, 'mid'),
('mb-gigabyte-b760m-aorus','mainboard', 'Gigabyte', 'B760M AORUS Elite AX',              '{"socket":"LGA1700","ramType":"DDR5","formFactor":"mATX","ramSlots":4,"sataPorts":4,"m2Slots":2,"fanHeaders":4,"tdp":20}', 3990000, '2026-09-27T00:00:00.000Z', 26, '/img/mb-gigabyte-b760m-aorus.jpg','/models/mb-gigabyte-b760m-aorus.glb',4.5, 'mid'),
('mb-msi-b650-tomahawk',   'mainboard', 'MSI',      'MAG B650 TOMAHAWK WIFI',           '{"socket":"AM5","ramType":"DDR5","formFactor":"ATX","ramSlots":4,"sataPorts":6,"m2Slots":3,"fanHeaders":6,"tdp":20}',    5690000, '2026-09-27T00:00:00.000Z', 14, '/img/mb-msi-b650-tomahawk.jpg',   '/models/mb-msi-b650-tomahawk.glb',   4.7, 'high'),
('mb-asus-x670e-strix',    'mainboard', 'ASUS',     'ROG STRIX X670E-F GAMING WIFI',    '{"socket":"AM5","ramType":"DDR5","formFactor":"ATX","ramSlots":4,"sataPorts":6,"m2Slots":4,"fanHeaders":8,"tdp":20}',    8990000, '2026-09-27T00:00:00.000Z', 9,  '/img/mb-asus-x670e-strix.jpg',    '/models/mb-asus-x670e-strix.glb',    4.7, 'enthusiast'),
('mb-gigabyte-b550m-aorus','mainboard', 'Gigabyte', 'B550M AORUS ELITE',                '{"socket":"AM4","ramType":"DDR4","formFactor":"mATX","ramSlots":4,"sataPorts":4,"m2Slots":2,"fanHeaders":2,"tdp":15}',    2490000, '2026-09-27T00:00:00.000Z', 30, '/img/mb-gigabyte-b550m-aorus.jpg','/models/mb-gigabyte-b550m-aorus.glb',4.5, 'budget');

-- ---------------------------------------------------------------------------
-- RAM (4): DDR5 kits 1.7–3.7tr, DDR4 kit 0.99tr.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('ram-corsair-veng-32-ddr5',    'ram', 'Corsair',   'Vengeance DDR5 32GB (2x16GB) 6000MHz CL30', '{"ramType":"DDR5","tdp":10}', 3290000, '2026-09-27T00:00:00.000Z', 28, '/img/ram-corsair-veng-32-ddr5.jpg',    '/models/ram-corsair-veng-32-ddr5.glb',    4.8, 'high'),
('ram-kingston-fury-16-ddr5',   'ram', 'Kingston',  'FURY Beast DDR5 16GB (2x8GB) 5600MHz',      '{"ramType":"DDR5","tdp":8}',  1690000, '2026-09-27T00:00:00.000Z', 35, '/img/ram-kingston-fury-16-ddr5.jpg',   '/models/ram-kingston-fury-16-ddr5.glb',   4.6, 'mid'),
('ram-kingston-fury-16-ddr4',   'ram', 'Kingston',  'FURY Beast DDR4 16GB (2x8GB) 3200MHz',      '{"ramType":"DDR4","tdp":7}',  990000,  '2026-09-27T00:00:00.000Z', 45, '/img/ram-kingston-fury-16-ddr4.jpg',   '/models/ram-kingston-fury-16-ddr4.glb',   4.5, 'budget'),
('ram-corsair-rgb-32-ddr5',     'ram', 'Corsair',   'Vengeance RGB DDR5 32GB (2x16GB) 6000MHz',  '{"ramType":"DDR5","tdp":12}', 3690000, '2026-09-27T00:00:00.000Z', 18, '/img/ram-corsair-rgb-32-ddr5.jpg',     '/models/ram-corsair-rgb-32-ddr5.glb',     4.6, 'mid');

-- ---------------------------------------------------------------------------
-- SSD (4): "M.2" in the model name counts against mainboard m2Slots in the engine.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('ssd-samsung-990pro-1tb',        'ssd', 'Samsung',   '990 PRO 1TB M.2 PCIe NVMe',    '{"tdp":8}', 2890000, '2026-09-27T00:00:00.000Z', 30, '/img/ssd-samsung-990pro-1tb.jpg',        '/models/ssd-samsung-990pro-1tb.glb',        4.8, 'high'),
('ssd-kingston-nv2-1tb',          'ssd', 'Kingston',  'NV2 1TB M.2 PCIe NVMe',        '{"tdp":8}', 1490000, '2026-09-27T00:00:00.000Z', 45, '/img/ssd-kingston-nv2-1tb.jpg',          '/models/ssd-kingston-nv2-1tb.glb',          4.5, 'budget'),
('ssd-samsung-870-evo-1tb',       'ssd', 'Samsung',   '870 EVO 1TB SATA III',         '{"tdp":6}', 2490000, '2026-09-27T00:00:00.000Z', 25, '/img/ssd-samsung-870-evo-1tb.jpg',       '/models/ssd-samsung-870-evo-1tb.glb',       4.7, 'mid'),
('ssd-kingston-fury-renegade-2tb','ssd', 'Kingston',  'FURY Renegade 2TB M.2 PCIe NVMe', '{"tdp":9}', 3490000, '2026-09-27T00:00:00.000Z', 18, '/img/ssd-kingston-fury-renegade-2tb.jpg','/models/ssd-kingston-fury-renegade-2tb.glb', 4.7, 'high');

-- ---------------------------------------------------------------------------
-- PSU (4): wattage checked against sum(tdp) * 1.3 by the engine.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('psu-corsair-cv650',   'psu', 'Corsair', 'CV650 650W 80+ Bronze',        '{"wattage":650}',  1290000, '2026-09-27T00:00:00.000Z', 40, '/img/psu-corsair-cv650.jpg',   '/models/psu-corsair-cv650.glb',   4.5, 'budget'),
('psu-msi-a850gl',      'psu', 'MSI',     'MAG A850GL PCIE5 850W 80+ Gold','{"wattage":850}',  2490000, '2026-09-27T00:00:00.000Z', 20, '/img/psu-msi-a850gl.jpg',      '/models/psu-msi-a850gl.glb',      4.6, 'mid'),
('psu-corsair-rm750e',  'psu', 'Corsair', 'RM750e 750W 80+ Gold',         '{"wattage":750}',  2690000, '2026-09-27T00:00:00.000Z', 22, '/img/psu-corsair-rm750e.jpg',  '/models/psu-corsair-rm750e.glb',  4.7, 'mid'),
('psu-corsair-hx1000',  'psu', 'Corsair', 'HX1000 1000W 80+ Platinum',    '{"wattage":1000}', 5490000, '2026-09-27T00:00:00.000Z', 8,  '/img/psu-corsair-hx1000.jpg',  '/models/psu-corsair-hx1000.glb',  4.8, 'enthusiast');

-- ---------------------------------------------------------------------------
-- Case (5): formFactor = largest board it holds, maxGpuLengthMm / maxCoolerHeightMm
-- drive the GPU-length and cooler-height checks.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('case-deepcool-ch510',      'case', 'DeepCool', 'CH510',                  '{"formFactor":"ATX","maxGpuLengthMm":380,"maxCoolerHeightMm":175,"fanHeaders":3}', 1190000, '2026-09-27T00:00:00.000Z', 32, '/img/case-deepcool-ch510.jpg',      '/models/case-deepcool-ch510.glb',      4.6, 'budget'),
('case-corsair-4000d',       'case', 'Corsair',  '4000D Airflow',          '{"formFactor":"ATX","maxGpuLengthMm":360,"maxCoolerHeightMm":170,"fanHeaders":3}', 2290000, '2026-09-27T00:00:00.000Z', 24, '/img/case-corsair-4000d.jpg',       '/models/case-corsair-4000d.glb',       4.8, 'mid'),
('case-asus-ap201',          'case', 'ASUS',     'Prime AP201 MicroATX',   '{"formFactor":"mATX","maxGpuLengthMm":338,"maxCoolerHeightMm":165,"fanHeaders":2}', 1690000, '2026-09-27T00:00:00.000Z', 20, '/img/case-asus-ap201.jpg',          '/models/case-asus-ap201.glb',          4.5, 'budget'),
('case-deepcool-ch160',      'case', 'DeepCool', 'CH160 Mini-ITX',        '{"formFactor":"ITX","maxGpuLengthMm":305,"maxCoolerHeightMm":172,"fanHeaders":2}',  1990000, '2026-09-27T00:00:00.000Z', 15, '/img/case-deepcool-ch160.jpg',      '/models/case-deepcool-ch160.glb',      4.5, 'mid'),
('case-asus-gt501',          'case', 'ASUS',     'TUF Gaming GT501',       '{"formFactor":"ATX","maxGpuLengthMm":420,"maxCoolerHeightMm":180,"fanHeaders":4}', 4990000, '2026-09-27T00:00:00.000Z', 10, '/img/case-asus-gt501.jpg',          '/models/case-asus-gt501.glb',          4.7, 'high');

-- ---------------------------------------------------------------------------
-- Cooler (4): heightMm (air tower clearance) checked against case maxCoolerHeightMm.
-- The AIO lists the pump-head height (55mm) — radiator fit is a case spec, not a tower height.
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('cooler-deepcool-ak400',       'cooler', 'DeepCool',     'AK400',                        '{"heightMm":155,"tdp":10}', 590000,  '2026-09-27T00:00:00.000Z', 50, '/img/cooler-deepcool-ak400.jpg',       '/models/cooler-deepcool-ak400.glb',       4.7, 'budget'),
('cooler-thermalright-pa120',   'cooler', 'Thermalright', 'Peerless Assassin 120 SE',     '{"heightMm":155,"tdp":12}', 890000,  '2026-09-27T00:00:00.000Z', 40, '/img/cooler-thermalright-pa120.jpg',   '/models/cooler-thermalright-pa120.glb',   4.8, 'budget'),
('cooler-deepcool-ak620',       'cooler', 'DeepCool',     'AK620',                        '{"heightMm":160,"tdp":14}', 1390000, '2026-09-27T00:00:00.000Z', 28, '/img/cooler-deepcool-ak620.jpg',       '/models/cooler-deepcool-ak620.glb',       4.7, 'mid'),
('cooler-corsair-h150i',        'cooler', 'Corsair',      'iCUE H150i ELITE 360mm AIO',   '{"heightMm":55,"tdp":18}',  4990000, '2026-09-27T00:00:00.000Z', 12, '/img/cooler-corsair-h150i.jpg',        '/models/cooler-corsair-h150i.glb',        4.5, 'high');

-- ---------------------------------------------------------------------------
-- Monitor (4): resolution / refreshRate / panelType (display-only, no engine check).
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('monitor-asus-vg249q1a', 'monitor', 'ASUS', 'TUF Gaming VG249Q1A 24inch 165Hz',        '{"resolution":"1920x1080","refreshRate":165,"panelType":"IPS"}', 3190000,  '2026-09-27T00:00:00.000Z', 30, '/img/monitor-asus-vg249q1a.jpg', '/models/monitor-asus-vg249q1a.glb', 4.6, 'mid'),
('monitor-msi-g274f',      'monitor', 'MSI',  'G274F 27inch 180Hz',                      '{"resolution":"1920x1080","refreshRate":180,"panelType":"IPS"}', 3490000,  '2026-09-27T00:00:00.000Z', 26, '/img/monitor-msi-g274f.jpg',          '/models/monitor-msi-g274f.glb',      4.6, 'mid'),
('monitor-msi-g274qpf',    'monitor', 'MSI',  'G274QPF E2 27inch 170Hz',                '{"resolution":"2560x1440","refreshRate":170,"panelType":"IPS"}', 5490000,  '2026-09-27T00:00:00.000Z', 18, '/img/monitor-msi-g274qpf.jpg',        '/models/monitor-msi-g274qpf.glb',    4.7, 'high'),
('monitor-asus-pg329q',    'monitor', 'ASUS', 'ROG Swift PG329Q 32inch 175Hz 2560x1440',  '{"resolution":"2560x1440","refreshRate":175,"panelType":"IPS"}', 14990000, '2026-09-27T00:00:00.000Z', 6,  '/img/monitor-asus-pg329q.jpg',        '/models/monitor-asus-pg329q.glb',    4.7, 'enthusiast');

-- ---------------------------------------------------------------------------
-- Accessory (3)
-- ---------------------------------------------------------------------------
INSERT OR REPLACE INTO products (id, category, brand, model, specs, price_vnd, price_updated_at, stock, image_url, model_3d_url, rating, tier) VALUES
('accessory-logi-g102',   'accessory', 'Logitech', 'G102 Lightsync Gaming Mouse', '{}',                299000,  '2026-09-27T00:00:00.000Z', 60, '/img/accessory-logi-g102.jpg',   '/models/accessory-logi-g102.glb',   4.6, 'budget'),
('accessory-corsair-k65', 'accessory', 'Corsair',  'K65 PLUS Wireless Keyboard',  '{}',                2990000, '2026-09-27T00:00:00.000Z', 20, '/img/accessory-corsair-k65.jpg', '/models/accessory-corsair-k65.glb', 4.7, 'mid'),
('accessory-logi-c920',   'accessory', 'Logitech', 'C920 HD Pro Webcam',          '{"resolution":"1920x1080"}', 1690000, '2026-09-27T00:00:00.000Z', 25, '/img/accessory-logi-c920.jpg',   '/models/accessory-logi-c920.glb',   4.5, 'mid');
