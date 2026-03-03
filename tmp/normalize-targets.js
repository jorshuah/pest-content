const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'pest-content.db');
const db = new Database(dbPath);

console.log('Normalizing account targets...');
const result = db.prepare('UPDATE accounts SET monthly_post_target = 8').run();
console.log(`Updated ${result.changes} accounts.`);
