
import Database from 'better-sqlite3';

export class MetricsCollector {
  private db: Database.Database;
  private startTime: number;
  private runId: number = 0;

  constructor() {
    this.db = new Database('metrics.db');
    this.startTime = Date.now();
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        total_time_ms INTEGER,
        total_tokens INTEGER,
        total_cost_usd REAL
      );
      CREATE TABLE IF NOT EXISTS levels (
        run_id INTEGER,
        level_index INTEGER,
        duration_ms INTEGER,
        status TEXT,
        actions_count INTEGER,
        FOREIGN KEY(run_id) REFERENCES runs(id)
      );
    `);
  }

  startRun() {
    const info = this.db.prepare('INSERT INTO runs (timestamp) VALUES (?)').run(new Date().toISOString());
    this.runId = info.lastInsertRowid as number;
    return this.runId;
  }

  logLevel(level: number, duration: number, status: string, actions: number) {
    this.db.prepare(`
      INSERT INTO levels (run_id, level_index, duration_ms, status, actions_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(this.runId, level, duration, status, actions);
  }

  endRun(tokens: number, cost: number) {
    const duration = Date.now() - this.startTime;
    this.db.prepare(`
      UPDATE runs SET total_time_ms = ?, total_tokens = ?, total_cost_usd = ? WHERE id = ?
    `).run(duration, tokens, cost, this.runId);
    console.log(`Run ${this.runId} completed in ${duration}ms. Cost: $${cost.toFixed(4)}`);
  }
}
