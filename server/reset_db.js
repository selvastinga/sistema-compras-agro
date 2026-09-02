const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'compras_agro.db'));

db.exec(`
  DELETE FROM request_items;
  DELETE FROM suggested_vendors;
  DELETE FROM purchase_requests;
  DELETE FROM sqlite_sequence WHERE name IN ('purchase_requests', 'request_items', 'suggested_vendors');
  UPDATE fiscal_years SET initial_budget = 0;
  UPDATE area_budgets SET allocated_amount = 0;
`);

const reqCount = db.prepare('SELECT COUNT(*) as c FROM purchase_requests').get().c;
const years = db.prepare('SELECT year, initial_budget FROM fiscal_years').all();
const areas = db.prepare('SELECT id, name FROM areas').all();
const rubros = db.prepare('SELECT id, name FROM rubros').all();

console.log('=== DATABASE RESET TO 0 COMPLETED ===');
console.log('Purchase requests count:', reqCount);
console.log('Fiscal years:', years);
console.log('Active Areas count:', areas.length);
console.log('Active Rubros count:', rubros.length);

db.close();
