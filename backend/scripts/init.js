import db from "../lib/db.js"

db.exec(`
  CREATE TABLE IF NOT EXISTS cache(
  id TEXT PRIMARY KEY,
  value INTEGER,
  enabled INTEGER
) STRICT
`);

