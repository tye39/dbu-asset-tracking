import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkColumns() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name;
  `);

  const colsByTable: Record<string, string[]> = {};
  for (const row of res.rows) {
    if (!colsByTable[row.table_name]) colsByTable[row.table_name] = [];
    colsByTable[row.table_name].push(row.column_name);
  }

  console.log("=== ASSET COLUMNS IN NEON ===");
  console.log(colsByTable["Asset"]);

  console.log("\n=== ASSET TYPE COLUMNS IN NEON ===");
  console.log(colsByTable["AssetType"]);

  console.log("\n=== USER COLUMNS IN NEON ===");
  console.log(colsByTable["User"]);

  console.log("\n=== NOTIFICATION COLUMNS IN NEON ===");
  console.log(colsByTable["Notification"]);

  console.log("\n=== ASSIGNMENT COLUMNS IN NEON ===");
  console.log(colsByTable["Assignment"]);
}

checkColumns().finally(() => pool.end());
