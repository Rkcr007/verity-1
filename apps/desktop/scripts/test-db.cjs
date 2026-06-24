/**
 * Quick diagnostic: open SQLite via better-sqlite3 under Electron's runtime.
 * Run: pnpm --filter @verity/desktop test:electron-db
 */
const { app } = require('electron');
const { join } = require('node:path');

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = join(app.getPath('userData'), 'verity.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE IF NOT EXISTS _health (id INTEGER PRIMARY KEY)');
    db.close();
    console.log('OK: database opened at', dbPath);
    app.exit(0);
  } catch (error) {
    console.error('FAIL:', error instanceof Error ? error.message : error);
    app.exit(1);
  }
});
