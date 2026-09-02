-- ==============================================================================
-- SISTEMA DE COMPRAS Y CONTROL PRESUPUESTARIO - FICA (UNSL)
-- Esquema de Base de Datos PostgreSQL para Supabase
-- ==============================================================================

-- 1. Tabla: Ejercicios Fiscales Anuales
CREATE TABLE IF NOT EXISTS fiscal_years (
  year INTEGER PRIMARY KEY,
  initial_budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla: Áreas del Departamento
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  color VARCHAR(50) DEFAULT '#10B981',
  display_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla: Asignaciones de Presupuesto por Área
CREATE TABLE IF NOT EXISTS area_budgets (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL REFERENCES fiscal_years(year) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, area_id)
);

-- 4. Tabla: Rubros de Compra
CREATE TABLE IF NOT EXISTS rubros (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT '#06B6D4',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla: Solicitudes / Pedidos de Compra (Ficha Oficial FICA)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL REFERENCES fiscal_years(year),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  rubro_id INTEGER NOT NULL REFERENCES rubros(id),
  modality VARCHAR(100) NOT NULL DEFAULT 'Compra directa',
  solicitante_nombre VARCHAR(255),
  solicitante_email VARCHAR(255),
  texto_mail_origen TEXT,
  justificacion TEXT,
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla: Renglones / Ítems del Pedido
CREATE TABLE IF NOT EXISTS request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  renglon_numero INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad_solicitada NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unidad_medida VARCHAR(50) DEFAULT 'Unidad',
  precio_estimado_unitario NUMERIC(15, 2) DEFAULT 0.00,
  precio_estimado_total NUMERIC(15, 2) DEFAULT 0.00,
  estado_item VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
  cantidad_comprada NUMERIC(10, 2) DEFAULT 0.00,
  precio_real_unitario NUMERIC(15, 2) DEFAULT 0.00,
  precio_real_total NUMERIC(15, 2) DEFAULT 0.00,
  fecha_compra DATE,
  numero_comprobante VARCHAR(100),
  proveedor_adjudicado VARCHAR(255),
  observaciones_compra TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla: Proveedores Sugeridos
CREATE TABLE IF NOT EXISTS suggested_vendors (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  cuit VARCHAR(50),
  direccion TEXT,
  telefono VARCHAR(100),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla: Usuarios Administradores Autorizados
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla: Sesiones Activas
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(255) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ==============================================================================
-- INSERCIÓN DE DATOS INICIALES POR DEFECTO
-- ==============================================================================

-- 1. Ejercicio 2026
INSERT INTO fiscal_years (year, initial_budget, description, is_active)
VALUES (2026, 0.00, 'Presupuesto Anual 2026 - Depto. Ciencias Agropecuarias', 1)
ON CONFLICT (year) DO NOTHING;

-- 2. Áreas del Departamento
INSERT INTO areas (id, name, code, color, display_order, is_active) VALUES
  (1, 'Área de Básicas Agronómicas', 'BA', '#10B981', 1, 1),
  (2, 'Área de Desarrollo Rural', 'DR', '#3B82F6', 2, 1),
  (3, 'Área de Producción Animal', 'PA', '#F59E0B', 3, 1),
  (4, 'Área de Producción y Sanidad Vegetal', 'PSV', '#8B5CF6', 4, 1),
  (5, 'Área de Recursos Naturales e Ingeniería Rural', 'RNIR', '#EC4899', 5, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Distribución Presupuestaria Inicial 2026 (20% cada área)
INSERT INTO area_budgets (year, area_id, percentage, allocated_amount) VALUES
  (2026, 1, 20.00, 0.00),
  (2026, 2, 20.00, 0.00),
  (2026, 3, 20.00, 0.00),
  (2026, 4, 20.00, 0.00),
  (2026, 5, 20.00, 0.00)
ON CONFLICT (year, area_id) DO NOTHING;

-- 4. Rubros de Compra
INSERT INTO rubros (id, name, description, color, is_active) VALUES
  (1, 'Vidrio y droga', 'Material de vidrio de laboratorio, reactivos químicos, drogas y soluciones', '#06B6D4', 1),
  (2, 'Informática', 'Equipos de computación, insumos, periféricos, toners y software', '#6366F1', 1),
  (3, 'Mobiliario', 'Muebles de oficina, escritorios, sillas, armarios y estanterías', '#84CC16', 1),
  (4, 'Librería y papelería', 'Papel, cuadernos, bolígrafos, carpetas y artículos de oficina', '#F97316', 1)
ON CONFLICT (id) DO NOTHING;

-- 5. Usuarios Administradores (director: Omar26+, vicedir: Marisa26+, dpto: Selva26+)
-- Hashes verificados generados con PBKDF2 SHA512 (10,000 iteraciones)
INSERT INTO admin_users (username, name, password_hash, salt, is_active) VALUES
  ('director', 'Director (Omar)', '38e01f08b06fb16e0e9d59ee876cbfcf7adc4aa248c9a98465ec85a14633e8351c7ec175e478da6b6386393985b82d81119e01e3cd5d70692d3f52ec059bbf33', '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', 1),
  ('vicedir', 'Vicedirectora (Marisa)', '3c39c9078f3f6693ff404eb6eb5c88a08e660e66f6243edb17f6d404e8b5b47597beace20b9a71f103c375f0acfdff53c98d11063aa567eb1875de58d7712831', '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a', 1),
  ('dpto', 'Departamento (Selva)', '4e8adb49e399e23db334e1665496ba79455e92bb3f463552ee7a6ae741b0afebe83ab9f8df61b19a36a40e9a4e89b77c65dc05474d8e4dfcc822c62facafe2a5', '3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b', 1)
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  salt = EXCLUDED.salt,
  is_active = 1;

-- Reiniciar secuencias de auto-incremento
SELECT setval(pg_get_serial_sequence('areas', 'id'), COALESCE(MAX(id), 1)) FROM areas;
SELECT setval(pg_get_serial_sequence('rubros', 'id'), COALESCE(MAX(id), 1)) FROM rubros;
SELECT setval(pg_get_serial_sequence('admin_users', 'id'), COALESCE(MAX(id), 1)) FROM admin_users;
