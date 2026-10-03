import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const res: any = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'AssetType'"
  );
  console.log("Columns on AssetType table:", res.map((r: any) => `${r.column_name}: ${r.udt_name}`));
  const cats = await prisma.assetCategory.findMany({
    include: {
      assetTypes: {
        include: {
          formFields: {
            include: { field: true }
          }
        }
      }
    }
  });
  const targetTypes = ["Laptop", "Printer", "Generator", "Television", "Projector", "Chair", "Microscope", "Door", "Water Tank"];
  for (const tName of targetTypes) {
    const at = await prisma.assetType.findFirst({
      where: { name: tName },
      include: {
        category: true,
        formFields: {
          include: { field: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    if (at) {
      console.log(`\n=== [${at.category.name}] ${at.name} (enabled: ${at.formFields.filter(f => f.isEnabled).length}) ===`);
      for (const ff of at.formFields) {
        console.log(`  [${ff.isEnabled ? 'ON' : 'OFF'}] ${ff.field.name} (${ff.isRequired ? 'req' : 'opt'}) - label: "${ff.labelOverride || ff.field.label}"`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
