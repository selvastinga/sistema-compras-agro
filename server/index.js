const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { query, queryRow, execute, executeInsert, isPostgres } = require('./db');
const { createSession, authenticateUser, requireAdminAuth, hashPassword, generateSalt } = require('./auth');

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Helper Functions ---
async function getNextRequestCode(year) {
  const row = await queryRow(`
    SELECT code FROM purchase_requests 
    WHERE year = ? 
    ORDER BY id DESC LIMIT 1
  `, [year]);

  let nextNum = 1;
  if (row && row.code) {
    const match = row.code.match(/SOL-\d{4}-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `SOL-${year}-${String(nextNum).padStart(3, '0')}`;
}

async function updateRequestStatus(requestId) {
  const items = await query('SELECT estado_item FROM request_items WHERE request_id = ?', [requestId]);
  if (items.length === 0) return;

  const allPurchased = items.every(i => i.estado_item === 'Comprado');
  const somePurchased = items.some(i => i.estado_item === 'Comprado');

  let newStatus = 'Pendiente';
  if (allPurchased) {
    newStatus = 'Comprado';
  } else if (somePurchased) {
    newStatus = 'Parcialmente Comprado';
  }

  await execute('UPDATE purchase_requests SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, requestId]);
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), isPostgres });
});

// ==========================================
// 0. AUTHENTICATION & ADMIN USERS
// ==========================================

// POST /auth/login (Username + Password)
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Se requiere ingresar usuario y clave' });
    }

    const cleanUsername = username.trim();
    const user = await authenticateUser(cleanUsername, password);

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        message: 'Usuario o clave incorrecta. Verifique sus datos de acceso.'
      });
    }

    const session = await createSession(user);
    res.json(session);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/me (Check current session)
router.get('/auth/me', requireAdminAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/logout
router.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    await execute('DELETE FROM sessions WHERE token = ?', [token]);
  }
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// GET /auth/admins (List the 3 authorized admin accounts - public/admin)
router.get('/auth/admins', async (req, res) => {
  try {
    const admins = await query('SELECT id, username, name, is_active FROM admin_users ORDER BY id ASC');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /auth/admins (Update passwords/names for the 3 accounts - requires Admin)
router.put('/auth/admins', requireAdminAuth, async (req, res) => {
  try {
    const { admins } = req.body;
    if (!Array.isArray(admins) || admins.length === 0) {
      return res.status(400).json({ error: 'Lista de administradores inválida' });
    }

    for (const adm of admins) {
      if (adm.id) {
        if (adm.password && adm.password.trim()) {
          const salt = generateSalt();
          const hash = hashPassword(adm.password.trim(), salt);
          await execute(`
            UPDATE admin_users 
            SET name = COALESCE(?, name), password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [adm.name || null, hash, salt, adm.id]);
        } else {
          await execute(`
            UPDATE admin_users 
            SET name = COALESCE(?, name), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [adm.name || null, adm.id]);
        }
      }
    }

    const updated = await query('SELECT id, username, name, is_active FROM admin_users ORDER BY id ASC');
    res.json({ message: 'Usuarios administradores actualizados exitosamente', admins: updated });
  } catch (error) {
    console.error('Error updating admins:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 1. FISCAL YEARS & BUDGETS
// ==========================================

// GET /years (PUBLIC)
router.get('/years', async (req, res) => {
  try {
    const years = await query(`
      SELECT 
        y.year,
        CAST(y.initial_budget AS FLOAT) as initial_budget,
        y.description,
        y.is_active,
        COALESCE(CAST((
          SELECT SUM(ri.precio_real_total)
          FROM request_items ri
          JOIN purchase_requests pr ON ri.request_id = pr.id
          WHERE pr.year = y.year AND ri.estado_item = 'Comprado'
        ) AS FLOAT), 0) as total_spent,
        COALESCE(CAST((
          SELECT SUM(ri.precio_estimado_total)
          FROM request_items ri
          JOIN purchase_requests pr ON ri.request_id = pr.id
          WHERE pr.year = y.year AND ri.estado_item = 'Pendiente'
        ) AS FLOAT), 0) as total_pending_estimated,
        COALESCE((
          SELECT COUNT(*)
          FROM purchase_requests pr
          WHERE pr.year = y.year
        ), 0) as total_requests
      FROM fiscal_years y
      ORDER BY y.year DESC
    `);

    const result = (years || []).map(y => {
      const initBudget = parseFloat(y.initial_budget) || 0;
      const spent = parseFloat(y.total_spent) || 0;
      return {
        ...y,
        initial_budget: initBudget,
        total_spent: spent,
        remaining_budget: initBudget - spent,
        spent_percentage: initBudget > 0 ? (spent / initBudget) * 100 : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /years (ADMIN ONLY)
router.post('/years', requireAdminAuth, async (req, res) => {
  try {
    const { year, initial_budget, description } = req.body;
    if (!year || isNaN(year)) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    const existing = await queryRow('SELECT year FROM fiscal_years WHERE year = ?', [year]);
    if (existing) {
      return res.status(400).json({ error: `El ejercicio fiscal ${year} ya existe` });
    }

    const budget = parseFloat(initial_budget) || 0;
    await execute(`
      INSERT INTO fiscal_years (year, initial_budget, description, is_active)
      VALUES (?, ?, ?, 1)
    `, [year, budget, description || `Presupuesto Anual ${year}`]);

    // Create default area allocations
    const activeAreas = await query('SELECT id FROM areas WHERE is_active = 1');
    const count = (activeAreas && activeAreas.length) || 1;
    const defaultPct = Math.round((100 / count) * 100) / 100;

    for (const area of (activeAreas || [])) {
      const allocated = (budget * defaultPct) / 100;
      await execute(`
        INSERT INTO area_budgets (year, area_id, percentage, allocated_amount)
        VALUES (?, ?, ?, ?)
      `, [year, area.id, defaultPct, allocated]);
    }

    res.json({ message: 'Ejercicio creado exitosamente', year });
  } catch (error) {
    console.error('Error creating year:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /years/:year (ADMIN ONLY)
router.put('/years/:year', requireAdminAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const { initial_budget, description, is_active } = req.body;

    if (initial_budget !== undefined) {
      const budget = parseFloat(initial_budget) || 0;
      await execute('UPDATE fiscal_years SET initial_budget = ?, description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE year = ?', [budget, description, year]);
      
      const allocations = await query('SELECT area_id, percentage FROM area_budgets WHERE year = ?', [year]);
      for (const a of (allocations || [])) {
        const amt = (budget * (parseFloat(a.percentage) || 0)) / 100;
        await execute('UPDATE area_budgets SET allocated_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE year = ? AND area_id = ?', [amt, year, a.area_id]);
      }
    }
    if (is_active !== undefined) {
      await execute('UPDATE fiscal_years SET is_active = ? WHERE year = ?', [is_active ? 1 : 0, year]);
    }

    res.json({ message: 'Ejercicio actualizado correctamente' });
  } catch (error) {
    console.error('Error updating year:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /budgets (PUBLIC)
router.get('/budgets', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    let yearInfo = await queryRow('SELECT * FROM fiscal_years WHERE year = ?', [year]);
    if (!yearInfo) {
      // Create year automatically if missing
      await execute('INSERT INTO fiscal_years (year, initial_budget, description, is_active) VALUES (?, 0, ?, 1) ON CONFLICT (year) DO NOTHING', [year, `Presupuesto Anual ${year}`]);
      yearInfo = { year, initial_budget: 0, description: `Presupuesto Anual ${year}`, is_active: 1 };
    }

    // Ensure all active areas have a record in area_budgets
    const activeAreas = await query('SELECT id FROM areas WHERE is_active = 1');
    for (const a of (activeAreas || [])) {
      const exists = await queryRow('SELECT id FROM area_budgets WHERE year = ? AND area_id = ?', [year, a.id]);
      if (!exists) {
        await execute('INSERT INTO area_budgets (year, area_id, percentage, allocated_amount) VALUES (?, ?, 0, 0) ON CONFLICT (year, area_id) DO NOTHING', [year, a.id]);
      }
    }

    const allocations = await query(`
      SELECT 
        ab.id,
        ab.year,
        ab.area_id,
        a.name as area_name,
        a.code as area_code,
        a.color as area_color,
        CAST(ab.percentage AS FLOAT) as percentage,
        CAST(ab.allocated_amount AS FLOAT) as allocated_amount,
        COALESCE(CAST((
          SELECT SUM(ri.precio_real_total)
          FROM request_items ri
          JOIN purchase_requests pr ON ri.request_id = pr.id
          WHERE pr.year = ab.year AND pr.area_id = ab.area_id AND ri.estado_item = 'Comprado'
        ) AS FLOAT), 0) as total_spent,
        COALESCE(CAST((
          SELECT SUM(ri.precio_estimado_total)
          FROM request_items ri
          JOIN purchase_requests pr ON ri.request_id = pr.id
          WHERE pr.year = ab.year AND pr.area_id = ab.area_id AND ri.estado_item = 'Pendiente'
        ) AS FLOAT), 0) as total_pending_estimated,
        COALESCE((
          SELECT COUNT(DISTINCT pr.id)
          FROM purchase_requests pr
          WHERE pr.year = ab.year AND pr.area_id = ab.area_id
        ), 0) as total_requests
      FROM area_budgets ab
      JOIN areas a ON ab.area_id = a.id
      WHERE ab.year = ? AND a.is_active = 1
      ORDER BY a.display_order ASC, a.name ASC
    `, [year]);

    const enriched = (allocations || []).map(a => {
      const allocated = parseFloat(a.allocated_amount) || 0;
      const spent = parseFloat(a.total_spent) || 0;
      const remaining = allocated - spent;
      const spent_pct = allocated > 0 ? (spent / allocated) * 100 : 0;
      const remaining_pct = allocated > 0 ? (remaining / allocated) * 100 : 0;
      return {
        ...a,
        allocated_amount: allocated,
        total_spent: spent,
        remaining_balance: remaining,
        spent_percentage: spent_pct,
        remaining_percentage: remaining_pct
      };
    });

    const initBudget = parseFloat(yearInfo.initial_budget) || 0;
    const totalAllocated = enriched.reduce((sum, a) => sum + a.allocated_amount, 0);
    const totalPercentage = enriched.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
    const totalSpent = enriched.reduce((sum, a) => sum + a.total_spent, 0);
    const totalPending = enriched.reduce((sum, a) => sum + (parseFloat(a.total_pending_estimated) || 0), 0);

    res.json({
      year: { ...yearInfo, initial_budget: initBudget },
      allocations: enriched,
      totals: {
        department_budget: initBudget,
        total_allocated: totalAllocated,
        total_percentage: totalPercentage,
        total_spent: totalSpent,
        total_pending_estimated: totalPending,
        department_remaining: initBudget - totalSpent,
        department_spent_percentage: initBudget > 0 ? (totalSpent / initBudget) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /budgets/:year (ADMIN ONLY)
router.put('/budgets/:year', requireAdminAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const { initial_budget, allocations } = req.body;

    const yearInfo = await queryRow('SELECT initial_budget FROM fiscal_years WHERE year = ?', [year]);
    if (!yearInfo) {
      return res.status(404).json({ error: 'Ejercicio fiscal no encontrado' });
    }

    const currentTotalBudget = initial_budget !== undefined ? parseFloat(initial_budget) : parseFloat(yearInfo.initial_budget);

    if (initial_budget !== undefined) {
      await execute('UPDATE fiscal_years SET initial_budget = ? WHERE year = ?', [currentTotalBudget, year]);
    }

    if (Array.isArray(allocations)) {
      for (const item of allocations) {
        const pct = parseFloat(item.percentage) || 0;
        const amt = item.allocated_amount !== undefined 
          ? parseFloat(item.allocated_amount) 
          : (currentTotalBudget * pct) / 100;

        const exists = await queryRow('SELECT id FROM area_budgets WHERE year = ? AND area_id = ?', [year, item.area_id]);
        if (exists) {
          await execute(`
            UPDATE area_budgets 
            SET percentage = ?, allocated_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE year = ? AND area_id = ?
          `, [pct, amt, year, item.area_id]);
        } else {
          await execute(`
            INSERT INTO area_budgets (year, area_id, percentage, allocated_amount)
            VALUES (?, ?, ?, ?)
          `, [year, item.area_id, pct, amt]);
        }
      }
    }

    res.json({ message: 'Presupuestos de áreas actualizados exitosamente' });
  } catch (error) {
    console.error('Error updating area budgets:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. AREAS MANAGEMENT
// ==========================================

// GET /areas (PUBLIC)
router.get('/areas', async (req, res) => {
  try {
    const areas = await query('SELECT * FROM areas ORDER BY display_order ASC, name ASC');
    res.json(areas || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /areas (ADMIN ONLY)
router.post('/areas', requireAdminAuth, async (req, res) => {
  try {
    const { name, code, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del área es requerido' });
    }

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#D97706'];
    const assignedColor = color || colors[Math.floor(Math.random() * colors.length)];

    const maxRow = await queryRow('SELECT MAX(display_order) as m FROM areas');
    const maxOrder = (maxRow && maxRow.m) ? maxRow.m : 0;

    const info = await executeInsert(`
      INSERT INTO areas (name, code, color, display_order, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [name.trim(), code ? code.trim() : null, assignedColor, maxOrder + 1]);

    const newAreaId = info.lastInsertRowid;

    const years = await query('SELECT year FROM fiscal_years');
    for (const y of (years || [])) {
      await execute(`
        INSERT INTO area_budgets (year, area_id, percentage, allocated_amount)
        VALUES (?, ?, 0, 0)
        ON CONFLICT (year, area_id) DO NOTHING
      `, [y.year, newAreaId]);
    }

    const created = await queryRow('SELECT * FROM areas WHERE id = ?', [newAreaId]);
    res.json(created);
  } catch (error) {
    console.error('Error creating area:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /areas/:id (ADMIN ONLY)
router.put('/areas/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code, color, is_active, display_order } = req.body;

    const existing = await queryRow('SELECT * FROM areas WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }

    await execute(`
      UPDATE areas 
      SET 
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        color = COALESCE(?, color),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name ? name.trim() : null,
      code ? code.trim() : null,
      color || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      display_order !== undefined ? display_order : null,
      id
    ]);

    const updated = await queryRow('SELECT * FROM areas WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /areas/:id (ADMIN ONLY)
router.delete('/areas/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reqCount = await queryRow('SELECT COUNT(*) as c FROM purchase_requests WHERE area_id = ?', [id]);
    
    if (reqCount && parseInt(reqCount.c, 10) > 0) {
      await execute('UPDATE areas SET is_active = 0 WHERE id = ?', [id]);
      return res.json({ message: 'El área tiene pedidos asociados, por lo que fue desactivada para preservar el historial.' });
    }

    await execute('DELETE FROM area_budgets WHERE area_id = ?', [id]);
    await execute('DELETE FROM areas WHERE id = ?', [id]);
    res.json({ message: 'Área eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. RUBROS MANAGEMENT
// ==========================================

// GET /rubros (PUBLIC)
router.get('/rubros', async (req, res) => {
  try {
    const rubros = await query('SELECT * FROM rubros ORDER BY name ASC');
    res.json(rubros || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /rubros (ADMIN ONLY)
router.post('/rubros', requireAdminAuth, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del rubro es requerido' });
    }

    const colors = ['#06B6D4', '#6366F1', '#84CC16', '#F97316', '#EC4899', '#14B8A6', '#A855F7', '#EAB308'];
    const assignedColor = color || colors[Math.floor(Math.random() * colors.length)];

    const info = await executeInsert(`
      INSERT INTO rubros (name, description, color, is_active)
      VALUES (?, ?, ?, 1)
    `, [name.trim(), description ? description.trim() : null, assignedColor]);

    const created = await queryRow('SELECT * FROM rubros WHERE id = ?', [info.lastInsertRowid]);
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /rubros/:id (ADMIN ONLY)
router.put('/rubros/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, color, is_active } = req.body;

    await execute(`
      UPDATE rubros 
      SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        color = COALESCE(?, color),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name ? name.trim() : null,
      description !== undefined ? description.trim() : null,
      color || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    ]);

    const updated = await queryRow('SELECT * FROM rubros WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /rubros/:id (ADMIN ONLY)
router.delete('/rubros/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reqCount = await queryRow('SELECT COUNT(*) as c FROM purchase_requests WHERE rubro_id = ?', [id]);
    
    if (reqCount && parseInt(reqCount.c, 10) > 0) {
      await execute('UPDATE rubros SET is_active = 0 WHERE id = ?', [id]);
      return res.json({ message: 'El rubro tiene pedidos asociados, por lo que fue desactivado para preservar el historial.' });
    }

    await execute('DELETE FROM rubros WHERE id = ?', [id]);
    res.json({ message: 'Rubro eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. PURCHASE REQUESTS & ITEMS
// ==========================================

// GET /requests (PUBLIC)
router.get('/requests', async (req, res) => {
  try {
    const { year, area_id, rubro_id, modality, status, search } = req.query;

    let queryStr = `
      SELECT 
        pr.*,
        a.name as area_name,
        a.code as area_code,
        a.color as area_color,
        r.name as rubro_name,
        r.color as rubro_color,
        COALESCE(CAST((
          SELECT SUM(ri.precio_estimado_total) 
          FROM request_items ri 
          WHERE ri.request_id = pr.id
        ) AS FLOAT), 0) as total_estimado,
        COALESCE(CAST((
          SELECT SUM(ri.precio_real_total) 
          FROM request_items ri 
          WHERE ri.request_id = pr.id AND ri.estado_item = 'Comprado'
        ) AS FLOAT), 0) as total_comprado,
        COALESCE((
          SELECT COUNT(*) 
          FROM request_items ri 
          WHERE ri.request_id = pr.id
        ), 0) as total_items,
        COALESCE((
          SELECT COUNT(*) 
          FROM request_items ri 
          WHERE ri.request_id = pr.id AND ri.estado_item = 'Comprado'
        ), 0) as items_comprados
      FROM purchase_requests pr
      JOIN areas a ON pr.area_id = a.id
      JOIN rubros r ON pr.rubro_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (year) {
      queryStr += ' AND pr.year = ?';
      params.push(parseInt(year, 10));
    }
    if (area_id) {
      queryStr += ' AND pr.area_id = ?';
      params.push(parseInt(area_id, 10));
    }
    if (rubro_id) {
      queryStr += ' AND pr.rubro_id = ?';
      params.push(parseInt(rubro_id, 10));
    }
    if (modality) {
      queryStr += ' AND pr.modality = ?';
      params.push(modality);
    }
    if (status) {
      queryStr += ' AND pr.estado = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      queryStr += ` AND (
        pr.code LIKE ? OR 
        pr.solicitante_nombre LIKE ? OR 
        pr.justificacion LIKE ? OR 
        pr.texto_mail_origen LIKE ? OR
        EXISTS (
          SELECT 1 FROM request_items ri 
          WHERE ri.request_id = pr.id AND ri.descripcion LIKE ?
        )
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    queryStr += ' ORDER BY pr.fecha_solicitud DESC, pr.id DESC';

    const requests = await query(queryStr, params);
    res.json(requests || []);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /requests/:id (PUBLIC)
router.get('/requests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const request = await queryRow(`
      SELECT 
        pr.*,
        a.name as area_name,
        a.code as area_code,
        a.color as area_color,
        r.name as rubro_name,
        r.color as rubro_color
      FROM purchase_requests pr
      JOIN areas a ON pr.area_id = a.id
      JOIN rubros r ON pr.rubro_id = r.id
      WHERE pr.id = ?
    `, [id]);

    if (!request) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const items = await query('SELECT * FROM request_items WHERE request_id = ? ORDER BY renglon_numero ASC', [id]);
    const vendors = await query('SELECT * FROM suggested_vendors WHERE request_id = ? ORDER BY id ASC', [id]);

    const totalEstimado = (items || []).reduce((sum, item) => sum + (parseFloat(item.precio_estimado_total) || 0), 0);
    const totalComprado = (items || []).reduce((sum, item) => sum + (item.estado_item === 'Comprado' ? (parseFloat(item.precio_real_total) || 0) : 0), 0);

    res.json({
      ...request,
      items: items || [],
      vendors: vendors || [],
      total_estimado: totalEstimado,
      total_comprado: totalComprado
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /requests (ADMIN ONLY)
router.post('/requests', requireAdminAuth, async (req, res) => {
  try {
    const {
      year,
      area_id,
      rubro_id,
      modality,
      solicitante_nombre,
      solicitante_email,
      texto_mail_origen,
      justificacion,
      fecha_solicitud,
      observaciones,
      items,
      vendors
    } = req.body;

    const requestYear = parseInt(year, 10) || new Date().getFullYear();
    const code = await getNextRequestCode(requestYear);

    const result = await executeInsert(`
      INSERT INTO purchase_requests (
        code, year, area_id, rubro_id, modality,
        solicitante_nombre, solicitante_email, texto_mail_origen,
        justificacion, fecha_solicitud, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code,
      requestYear,
      parseInt(area_id, 10),
      parseInt(rubro_id, 10),
      modality || 'Compra directa',
      solicitante_nombre || '',
      solicitante_email || '',
      texto_mail_origen || '',
      justificacion || '',
      fecha_solicitud || new Date().toISOString().split('T')[0],
      'Pendiente',
      observaciones || ''
    ]);

    const requestId = result.lastInsertRowid;

    if (Array.isArray(items) && items.length > 0) {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const qty = parseFloat(item.cantidad_solicitada) || 1;
        const unitPrice = parseFloat(item.precio_estimado_unitario) || 0;
        const totalPrice = item.precio_estimado_total !== undefined ? parseFloat(item.precio_estimado_total) : (qty * unitPrice);

        await execute(`
          INSERT INTO request_items (
            request_id, renglon_numero, descripcion, cantidad_solicitada,
            unidad_medida, precio_estimado_unitario, precio_estimado_total,
            estado_item
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')
        `, [
          requestId,
          item.renglon_numero || (index + 1),
          item.descripcion || 'Sin descripción',
          qty,
          item.unidad_medida || 'Unidad',
          unitPrice,
          totalPrice
        ]);
      }
    }

    if (Array.isArray(vendors) && vendors.length > 0) {
      for (const v of vendors) {
        if (v.nombre && v.nombre.trim()) {
          await execute(`
            INSERT INTO suggested_vendors (
              request_id, nombre, cuit, direccion, telefono, email
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            requestId,
            v.nombre.trim(),
            v.cuit || '',
            v.direccion || '',
            v.telefono || '',
            v.email || ''
          ]);
        }
      }
    }

    const created = await queryRow('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    res.json({ message: 'Pedido creado exitosamente', request: created });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /requests/:id (ADMIN ONLY)
router.put('/requests/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      year,
      area_id,
      rubro_id,
      modality,
      solicitante_nombre,
      solicitante_email,
      texto_mail_origen,
      justificacion,
      fecha_solicitud,
      estado,
      observaciones,
      items,
      vendors
    } = req.body;

    const existing = await queryRow('SELECT * FROM purchase_requests WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    await execute(`
      UPDATE purchase_requests SET
        year = COALESCE(?, year),
        area_id = COALESCE(?, area_id),
        rubro_id = COALESCE(?, rubro_id),
        modality = COALESCE(?, modality),
        solicitante_nombre = COALESCE(?, solicitante_nombre),
        solicitante_email = COALESCE(?, solicitante_email),
        texto_mail_origen = COALESCE(?, texto_mail_origen),
        justificacion = COALESCE(?, justificacion),
        fecha_solicitud = COALESCE(?, fecha_solicitud),
        estado = COALESCE(?, estado),
        observaciones = COALESCE(?, observaciones),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      year ? parseInt(year, 10) : null,
      area_id ? parseInt(area_id, 10) : null,
      rubro_id ? parseInt(rubro_id, 10) : null,
      modality || null,
      solicitante_nombre !== undefined ? solicitante_nombre : null,
      solicitante_email !== undefined ? solicitante_email : null,
      texto_mail_origen !== undefined ? texto_mail_origen : null,
      justificacion !== undefined ? justificacion : null,
      fecha_solicitud || null,
      estado || null,
      observaciones !== undefined ? observaciones : null,
      id
    ]);

    if (Array.isArray(items)) {
      const existingItems = await query('SELECT * FROM request_items WHERE request_id = ?', [id]);
      const existingMap = new Map((existingItems || []).map(i => [i.id, i]));

      await execute('DELETE FROM request_items WHERE request_id = ?', [id]);

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const qty = parseFloat(item.cantidad_solicitada) || 1;
        const unitPrice = parseFloat(item.precio_estimado_unitario) || 0;
        const totalPrice = item.precio_estimado_total !== undefined ? parseFloat(item.precio_estimado_total) : (qty * unitPrice);
        const old = item.id ? existingMap.get(item.id) : null;

        await execute(`
          INSERT INTO request_items (
            request_id, renglon_numero, descripcion, cantidad_solicitada,
            unidad_medida, precio_estimado_unitario, precio_estimado_total,
            estado_item, cantidad_comprada, precio_real_unitario, precio_real_total,
            fecha_compra, numero_comprobante, proveedor_adjudicado, observaciones_compra
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          item.renglon_numero || (index + 1),
          item.descripcion || 'Sin descripción',
          qty,
          item.unidad_medida || 'Unidad',
          unitPrice,
          totalPrice,
          item.estado_item || (old ? old.estado_item : 'Pendiente'),
          item.cantidad_comprada !== undefined ? parseFloat(item.cantidad_comprada) : (old ? old.cantidad_comprada : 0),
          item.precio_real_unitario !== undefined ? parseFloat(item.precio_real_unitario) : (old ? old.precio_real_unitario : 0),
          item.precio_real_total !== undefined ? parseFloat(item.precio_real_total) : (old ? old.precio_real_total : 0),
          item.fecha_compra || (old ? old.fecha_compra : null),
          item.numero_comprobante || (old ? old.numero_comprobante : null),
          item.proveedor_adjudicado || (old ? old.proveedor_adjudicado : null),
          item.observaciones_compra || (old ? old.observaciones_compra : null)
        ]);
      }
    }

    if (Array.isArray(vendors)) {
      await execute('DELETE FROM suggested_vendors WHERE request_id = ?', [id]);
      for (const v of vendors) {
        if (v.nombre && v.nombre.trim()) {
          await execute(`
            INSERT INTO suggested_vendors (
              request_id, nombre, cuit, direccion, telefono, email
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            id,
            v.nombre.trim(),
            v.cuit || '',
            v.direccion || '',
            v.telefono || '',
            v.email || ''
          ]);
        }
      }
    }

    await updateRequestStatus(id);
    res.json({ message: 'Pedido actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /requests/:id (ADMIN ONLY)
router.delete('/requests/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await execute('DELETE FROM request_items WHERE request_id = ?', [id]);
    await execute('DELETE FROM suggested_vendors WHERE request_id = ?', [id]);
    await execute('DELETE FROM purchase_requests WHERE id = ?', [id]);
    res.json({ message: 'Pedido eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. PURCHASING / SPENDING EXECUTION (ADMIN ONLY)
// ==========================================

// POST /requests/:id/items/:itemId/purchase (ADMIN ONLY)
router.post('/requests/:id/items/:itemId/purchase', requireAdminAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const {
      cantidad_comprada,
      precio_real_unitario,
      precio_real_total,
      fecha_compra,
      numero_comprobante,
      proveedor_adjudicado,
      observaciones_compra,
      estado_item
    } = req.body;

    const item = await queryRow('SELECT * FROM request_items WHERE id = ? AND request_id = ?', [itemId, requestId]);
    if (!item) {
      return res.status(404).json({ error: 'Renglón no encontrado' });
    }

    const qtyPurchased = cantidad_comprada !== undefined ? parseFloat(cantidad_comprada) : item.cantidad_solicitada;
    const unitPriceReal = parseFloat(precio_real_unitario) || 0;
    const totalPriceReal = precio_real_total !== undefined ? parseFloat(precio_real_total) : (qtyPurchased * unitPriceReal);
    const itemStatus = estado_item || 'Comprado';

    await execute(`
      UPDATE request_items SET
        estado_item = ?,
        cantidad_comprada = ?,
        precio_real_unitario = ?,
        precio_real_total = ?,
        fecha_compra = ?,
        numero_comprobante = ?,
        proveedor_adjudicado = ?,
        observaciones_compra = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      itemStatus,
      qtyPurchased,
      unitPriceReal,
      totalPriceReal,
      fecha_compra || new Date().toISOString().split('T')[0],
      numero_comprobante || '',
      proveedor_adjudicado || '',
      observaciones_compra || '',
      itemId
    ]);

    await updateRequestStatus(requestId);

    res.json({ message: 'Compra registrada exitosamente', itemId, precio_real_total: totalPriceReal });
  } catch (error) {
    console.error('Error registering purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /requests/:id/purchase-all (ADMIN ONLY)
router.post('/requests/:id/purchase-all', requireAdminAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const {
      fecha_compra,
      numero_comprobante,
      proveedor_adjudicado,
      items_data
    } = req.body;

    const items = await query('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No hay renglones en este pedido' });
    }

    for (const item of items) {
      let qty = item.cantidad_solicitada;
      let unitPrice = item.precio_estimado_unitario;
      let total = item.precio_estimado_total;

      if (Array.isArray(items_data)) {
        const match = items_data.find(d => d.id === item.id);
        if (match) {
          qty = match.cantidad_comprada !== undefined ? parseFloat(match.cantidad_comprada) : qty;
          unitPrice = match.precio_real_unitario !== undefined ? parseFloat(match.precio_real_unitario) : unitPrice;
          total = match.precio_real_total !== undefined ? parseFloat(match.precio_real_total) : (qty * unitPrice);
        }
      }

      await execute(`
        UPDATE request_items SET
          estado_item = 'Comprado',
          cantidad_comprada = ?,
          precio_real_unitario = ?,
          precio_real_total = ?,
          fecha_compra = ?,
          numero_comprobante = ?,
          proveedor_adjudicado = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        qty,
        unitPrice,
        total,
        fecha_compra || new Date().toISOString().split('T')[0],
        numero_comprobante || '',
        proveedor_adjudicado || '',
        item.id
      ]);
    }

    await execute("UPDATE purchase_requests SET estado = 'Comprado', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [requestId]);

    res.json({ message: 'Todos los ítems fueron marcados como comprados exitosamente' });
  } catch (error) {
    console.error('Error in purchase-all:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. STATS & ANALYTICS DASHBOARD (PUBLIC)
// ==========================================

router.get('/stats', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    let yearData = await queryRow('SELECT * FROM fiscal_years WHERE year = ?', [year]);
    if (!yearData) {
      yearData = { year, initial_budget: 0, description: `Presupuesto Anual ${year}`, is_active: 1 };
    }

    // 1. By Rubro stats
    const rubroStats = await query(`
      SELECT 
        r.id as rubro_id,
        r.name as rubro_name,
        r.color as rubro_color,
        COALESCE(CAST(SUM(ri.precio_real_total) AS FLOAT), 0) as total_gastado,
        COALESCE(CAST(SUM(ri.precio_estimado_total) AS FLOAT), 0) as total_estimado,
        COUNT(DISTINCT pr.id) as total_pedidos,
        COUNT(ri.id) as total_items
      FROM rubros r
      LEFT JOIN purchase_requests pr ON pr.rubro_id = r.id AND pr.year = ?
      LEFT JOIN request_items ri ON ri.request_id = pr.id
      WHERE r.is_active = 1
      GROUP BY r.id, r.name, r.color
      ORDER BY total_gastado DESC, total_estimado DESC
    `, [year]);

    // 2. By Area stats
    const areaStats = await query(`
      SELECT 
        a.id as area_id,
        a.name as area_name,
        a.code as area_code,
        a.color as area_color,
        COALESCE(CAST(ab.percentage AS FLOAT), 0) as percentage,
        COALESCE(CAST(ab.allocated_amount AS FLOAT), 0) as allocated_amount,
        COALESCE(CAST(SUM(CASE WHEN ri.estado_item = 'Comprado' THEN ri.precio_real_total ELSE 0 END) AS FLOAT), 0) as total_gastado,
        COALESCE(CAST(SUM(CASE WHEN ri.estado_item = 'Pendiente' THEN ri.precio_estimado_total ELSE 0 END) AS FLOAT), 0) as total_pendiente,
        COUNT(DISTINCT pr.id) as total_pedidos
      FROM areas a
      LEFT JOIN area_budgets ab ON ab.area_id = a.id AND ab.year = ?
      LEFT JOIN purchase_requests pr ON pr.area_id = a.id AND pr.year = ?
      LEFT JOIN request_items ri ON ri.request_id = pr.id
      WHERE a.is_active = 1
      GROUP BY a.id, a.name, a.code, a.color, ab.percentage, ab.allocated_amount, a.display_order
      ORDER BY a.display_order ASC, a.name ASC
    `, [year, year]);

    const enrichedAreas = (areaStats || []).map(a => {
      const allocated = parseFloat(a.allocated_amount) || 0;
      const spent = parseFloat(a.total_gastado) || 0;
      const pending = parseFloat(a.total_pendiente) || 0;
      return {
        ...a,
        allocated_amount: allocated,
        total_gastado: spent,
        total_pendiente: pending,
        remaining_balance: allocated - spent,
        execution_rate: allocated > 0 ? (spent / allocated) * 100 : 0
      };
    });

    // 3. By Modality (Licitacion vs Compra directa)
    const modalityStats = await query(`
      SELECT 
        pr.modality,
        COUNT(DISTINCT pr.id) as count,
        COALESCE(CAST(SUM(ri.precio_real_total) AS FLOAT), 0) as total_gastado,
        COALESCE(CAST(SUM(ri.precio_estimado_total) AS FLOAT), 0) as total_estimado
      FROM purchase_requests pr
      LEFT JOIN request_items ri ON ri.request_id = pr.id
      WHERE pr.year = ?
      GROUP BY pr.modality
    `, [year]);

    // 4. By Status
    const statusStats = await query(`
      SELECT 
        pr.estado,
        COUNT(*) as count
      FROM purchase_requests pr
      WHERE pr.year = ?
      GROUP BY pr.estado
    `, [year]);

    // 5. General Totals
    const initialBudget = parseFloat(yearData.initial_budget) || 0;
    const totalSpent = enrichedAreas.reduce((sum, a) => sum + a.total_gastado, 0);
    const totalPending = enrichedAreas.reduce((sum, a) => sum + a.total_pendiente, 0);
    const remainingDept = initialBudget - totalSpent;

    res.json({
      year: { ...yearData, initial_budget: initialBudget },
      summary: {
        initial_budget: initialBudget,
        total_spent: totalSpent,
        remaining_budget: remainingDept,
        total_pending_estimated: totalPending,
        execution_rate: initialBudget > 0 ? (totalSpent / initialBudget) * 100 : 0
      },
      by_area: enrichedAreas,
      by_rubro: rubroStats || [],
      by_modality: modalityStats || [],
      by_status: statusStats || []
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. EXPORT DATA (PUBLIC)
// ==========================================

router.get('/export', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const format = req.query.format || 'json';

    const items = await query(`
      SELECT 
        pr.code as pedido_codigo,
        pr.year as ejercicio_ano,
        a.name as area_solicitante,
        r.name as rubro,
        pr.modality as modalidad_compra,
        pr.solicitante_nombre,
        pr.solicitante_email,
        pr.fecha_solicitud,
        pr.estado as estado_pedido,
        pr.justificacion,
        ri.renglon_numero,
        ri.descripcion as item_descripcion,
        ri.cantidad_solicitada,
        ri.unidad_medida,
        ri.precio_estimado_unitario,
        ri.precio_estimado_total,
        ri.estado_item,
        ri.cantidad_comprada,
        ri.precio_real_unitario,
        ri.precio_real_total,
        ri.fecha_compra,
        ri.numero_comprobante,
        ri.proveedor_adjudicado
      FROM purchase_requests pr
      JOIN areas a ON pr.area_id = a.id
      JOIN rubros r ON pr.rubro_id = r.id
      LEFT JOIN request_items ri ON ri.request_id = pr.id
      WHERE pr.year = ?
      ORDER BY pr.id ASC, ri.renglon_numero ASC
    `, [year]);

    if (format === 'csv') {
      const headers = [
        'Código Pedido', 'Año', 'Área Solicitante', 'Rubro', 'Modalidad',
        'Solicitante', 'Email', 'Fecha Solicitud', 'Estado Pedido', 'Justificación',
        'Renglón', 'Descripción Ítem', 'Cantidad Solicitada', 'Unidad',
        'Precio Estimado Unitario', 'Precio Estimado Total', 'Estado Ítem',
        'Cantidad Comprada', 'Precio Real Unitario', 'Precio Real Total',
        'Fecha Compra', 'Nº Comprobante', 'Proveedor'
      ];

      const csvRows = [headers.join(',')];
      for (const row of (items || [])) {
        const values = [
          row.pedido_codigo || '',
          row.ejercicio_ano || '',
          `"${(row.area_solicitante || '').replace(/"/g, '""')}"`,
          `"${(row.rubro || '').replace(/"/g, '""')}"`,
          row.modalidad_compra || '',
          `"${(row.solicitante_nombre || '').replace(/"/g, '""')}"`,
          row.solicitante_email || '',
          row.fecha_solicitud || '',
          row.estado_pedido || '',
          `"${(row.justificacion || '').replace(/"/g, '""')}"`,
          row.renglon_numero || '',
          `"${(row.item_descripcion || '').replace(/"/g, '""')}"`,
          row.cantidad_solicitada || 0,
          row.unidad_medida || '',
          row.precio_estimado_unitario || 0,
          row.precio_estimado_total || 0,
          row.estado_item || '',
          row.cantidad_comprada || 0,
          row.precio_real_unitario || 0,
          row.precio_real_total || 0,
          row.fecha_compra || '',
          `"${(row.numero_comprobante || '').replace(/"/g, '""')}"`,
          `"${(row.proveedor_adjudicado || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=compras_agro_${year}.csv`);
      return res.send('\uFEFF' + csvRows.join('\r\n'));
    }

    res.json(items || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount router on BOTH /api and / so any rewrite works
app.use('/api', router);
app.use('/', router);

// Serve static frontend files if built
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Only listen if not imported as serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
