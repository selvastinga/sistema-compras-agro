const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'compras_agro.db'));

db.exec(`
  -- Delete all requests and items
  DELETE FROM request_items;
  DELETE FROM suggested_vendors;
  DELETE FROM purchase_requests;
  DELETE FROM sqlite_sequence WHERE name IN ('purchase_requests', 'request_items', 'suggested_vendors');

  -- Delete non-standard areas if any
  DELETE FROM area_budgets WHERE area_id NOT IN (1, 2, 3, 4, 5);
  DELETE FROM areas WHERE id NOT IN (1, 2, 3, 4, 5);

  -- Set 2026 budget to 0 and distribute 20% to each of the 5 areas
  UPDATE fiscal_years SET initial_budget = 0 WHERE year = 2026;
  
  UPDATE area_budgets SET percentage = 20, allocated_amount = 0 WHERE year = 2026;
`);

console.log('=== SYSTEM RESET TO CLEAN 0 STATE ===');
const stats = {
  requests: db.prepare('SELECT COUNT(*) as c FROM purchase_requests').get().c,
  items: db.prepare('SELECT COUNT(*) as c FROM request_items').get().c,
  areas: db.prepare('SELECT id, name FROM areas').all(),
  rubros: db.prepare('SELECT id, name FROM rubros').all(),
  budgets: db.prepare('SELECT ab.area_id, a.name, ab.percentage, ab.allocated_amount FROM area_budgets ab JOIN areas a ON ab.area_id = a.id WHERE ab.year = 2026').all()
};

console.log(JSON.stringify(stats, null, 2));
db.close();
