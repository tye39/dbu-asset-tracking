import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function compareSchema() {
  // 1. Get all tables and columns from Neon
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name;
  `);

  const dbColumns: Record<string, Set<string>> = {};
  for (const row of res.rows) {
    if (!dbColumns[row.table_name]) {
      dbColumns[row.table_name] = new Set();
    }
    dbColumns[row.table_name].add(row.column_name);
  }

  // 2. Parse prisma/schema.prisma models and scalar fields
  const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
  let match;

  const missingColumns: Array<{ model: string; dbTable: string; field: string; mappedCol: string; type: string }> = [];
  const missingTables: string[] = [];

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const body = match[2];

    // Check @@map on model
    const tableMapMatch = body.match(/@@map\("([^"]+)"\)/);
    const tableName = tableMapMatch ? tableMapMatch[1] : modelName;

    if (!dbColumns[tableName]) {
      missingTables.push(tableName);
      continue;
    }

    const lines = body.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) continue;

      const fieldParts = trimmed.split(/\s+/);
      const fieldName = fieldParts[0];
      const fieldType = fieldParts[1]?.replace(/[?\[\]]/g, "");

      // Check if it's a relation (i.e. field type is another model or has @relation)
      const isRelation = trimmed.includes("@relation") || 
        ["User", "Asset", "AssetCategory", "AssetType", "Faculty", "OrganizationalUnit", 
         "Role", "QRCode", "Assignment", "Transfer", "Return", "Maintenance", "Disposal", 
         "Notification", "AuditLog", "Supplier", "AuditSession", "AuditSessionItem", 
         "FinancialAudit", "RegistrationField", "AssetTypeField", "AssetFieldValue", 
         "SupplierAssignment", "InventoryPerson", "InventorySession", "InventoryVerification", 
         "PasswordResetToken", "AssetRequest", "AssetRequestHistory", "PropertyAppeal", 
         "PropertyAppealHistory", "AssetImage"].includes(fieldType);

      if (isRelation && !trimmed.includes("@relation(fields:")) {
        // pure relation field, not a column
        continue;
      }

      // Check @map("...")
      const mapMatch = trimmed.match(/@map\("([^"]+)"\)/);
      const columnName = mapMatch ? mapMatch[1] : fieldName;

      // Check if column exists in DB
      if (!dbColumns[tableName].has(columnName)) {
        missingColumns.push({
          model: modelName,
          dbTable: tableName,
          field: fieldName,
          mappedCol: columnName,
          type: fieldType,
        });
      }
    }
  }

  console.log("=== MISSING TABLES IN NEON ===");
  console.log(missingTables);

  console.log("\n=== MISSING COLUMNS IN NEON (Prisma schema expects them, but DB lacks them) ===");
  console.log(missingColumns);

  // Check enums
  const enumRes = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);

  const dbEnums: Record<string, string[]> = {};
  for (const row of enumRes.rows) {
    if (!dbEnums[row.typname]) dbEnums[row.typname] = [];
    dbEnums[row.typname].push(row.enumlabel);
  }

  const enumRegex = /enum\s+(\w+)\s+{([^}]+)}/g;
  let enumMatch;
  const missingEnums: string[] = [];
  const missingEnumValues: Array<{ enum: string; value: string }> = [];

  while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    if (!dbEnums[enumName]) {
      missingEnums.push(enumName);
    } else {
      const values = enumBody.split("\n").map(v => v.trim()).filter(v => v && !v.startsWith("//"));
      for (const val of values) {
        if (!dbEnums[enumName].includes(val)) {
          missingEnumValues.push({ enum: enumName, value: val });
        }
      }
    }
  }

  console.log("\n=== MISSING ENUMS IN NEON ===");
  console.log(missingEnums);

  console.log("\n=== MISSING ENUM VALUES IN NEON ===");
  console.log(missingEnumValues);
}

compareSchema().finally(() => pool.end());
