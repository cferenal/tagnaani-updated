import { chmodSync } from "node:fs";
import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";

export function openStore() {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.RENDER === "true") {
    throw new Error("Set DATABASE_URL before starting on Render.");
  }

  const initial = JSON.stringify({ users: {}, sessions: {}, subscriptions: {}, messages: {} });
  if (url) {
    const pool = new Pool({ connectionString: url });
    const ready = (async () => {
      await pool.query("CREATE TABLE IF NOT EXISTS tagna_state (id integer PRIMARY KEY, data jsonb NOT NULL)");
      await pool.query("INSERT INTO tagna_state VALUES (1, $1) ON CONFLICT DO NOTHING", [initial]);
    })();
    return async (change) => {
      await ready;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query("SELECT data FROM tagna_state WHERE id = 1 FOR UPDATE");
        const result = change(rows[0].data);
        await client.query("UPDATE tagna_state SET data = $1 WHERE id = 1", [rows[0].data]);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };
  }

  const file = process.env.TAGNA_LOCAL_DB || ".tagna.sqlite";
  const db = new DatabaseSync(file);
  if (file !== ":memory:") chmodSync(file, 0o600);
  db.exec("CREATE TABLE IF NOT EXISTS tagna_state (id integer PRIMARY KEY, data TEXT NOT NULL)");
  db.prepare("INSERT OR IGNORE INTO tagna_state VALUES (1, ?)").run(initial);
  return (change) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const state = JSON.parse(db.prepare("SELECT data FROM tagna_state WHERE id = 1").get().data);
      const result = change(state);
      db.prepare("UPDATE tagna_state SET data = ? WHERE id = 1").run(JSON.stringify(state));
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
}
