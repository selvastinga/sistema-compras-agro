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
-- Hashes generados con PBKDF2 SHA512 (10,000 iteraciones)
INSERT INTO admin_users (id, username, name, password_hash, salt, is_active) VALUES
  (1, 'director', 'Director (Omar)', 'd130a08e0018a1a3e6c0c2a52dfdb0bb2a79237eeae7fc995963f68ea4c7590886c990b79ec5c8db6705ce82d921379f82956f1ff8109bfbc9ef7f985b14be26', 'c4974868f7734bbd85da1952e420658a', 1),
  (2, 'vicedir', 'Vicedirectora (Marisa)', 'd1999dae274a274df22be72a0c644d564bbddb742a03cf65bc3e284a148a04b8686f37ee9bf9fb45778844ba54c153835697669d0d3c0ec405c93aa7fb2cfa1c', '82046fa4841ec2ff715a31e847385966', 1),
  (3, 'dpto', 'Departamento (Selva)', '4fe8bf45d29d380e2d312bc85ec77651a2d488102a43b1c6d3bc89a74aa914f6b6eb74a69ec4c5fe4a39031a0179a405615707742d45c50c005b630e2cb0ff45', '77e8a939462b489aeb51365445ea4c82', 1)
ON CONFLICT (id) DO NOTHING;

-- Reiniciar secuencias de auto-incremento
SELECT setval(pg_get_serial_sequence('areas', 'id'), COALESCE(MAX(id), 1)) FROM areas;
SELECT setval(pg_get_serial_sequence('rubros', 'id'), COALESCE(MAX(id), 1)) FROM rubros;
SELECT setval(pg_get_serial_sequence('admin_users', 'id'), COALESCE(MAX(id), 1)) FROM admin_users;
