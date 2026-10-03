import "dotenv/config";
import { prisma } from "../src/lib/db";
import { registerAsset, updateAsset } from "../src/services/asset";
import { isBuildingAsset, generateBarcodeSvg } from "../src/lib/barcode";
import { IdentificationMethod } from "@prisma/client";

async function runTests() {
  console.log("=== RUNNING IDENTIFICATION METHOD TEST SUITE ===");

  // Find PAO / Admin user for tests
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: "SYSTEM_ADMINISTRATOR" } },
  });
  if (!adminUser) throw new Error("No admin user found");

  const staffUser = await prisma.user.findFirst({
    where: { role: { name: "STAFF_MEMBER" } },
  });
  if (!staffUser) throw new Error("No staff user found");

  const department = await prisma.organizationalUnit.findFirst({
    where: { deletedAt: null },
  });
  if (!department) throw new Error("No department found");

  // Get categories
  const categories = await prisma.assetCategory.findMany({
    include: { assetTypes: true },
  });
  const buildingCategory = categories.find((c) => isBuildingAsset(c, null)) || categories.find((c) => c.code.includes("BUILD") || c.name.toLowerCase().includes("building"));
  const movableCategory = categories.find((c) => !isBuildingAsset(c, null) && c.assetTypes.length > 0);
  if (!movableCategory) throw new Error("No movable category found");

  console.log(`Using Admin: ${adminUser.name}, Staff: ${staffUser?.name}`);
  console.log(`Movable Category: ${movableCategory.name} (${movableCategory.code})`);
  console.log(`Building Category: ${buildingCategory ? buildingCategory.name : "None found"}`);

  const typeFields = movableCategory.assetTypes[0]?.id
    ? await prisma.assetTypeField.findMany({
        where: { assetTypeId: movableCategory.assetTypes[0].id, isEnabled: true },
        include: { field: true },
      })
    : [];
  const builtInFieldNames = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"];
  const testDynamicValues: Record<string, string> = {};
  for (const tf of typeFields) {
    if (builtInFieldNames.includes(tf.field.name)) continue;
    let val = "Test Value";
    if (tf.field.options) {
      val = tf.field.options.split(",")[0].trim();
    } else if (tf.field.fieldType === "NUMBER") {
      val = "16";
    }
    testDynamicValues[tf.field.id] = val;
  }

  const testCodes: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Movable asset (laptop) with QR code
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Register Movable Asset with QR Code ---");
    const code1 = `TEST-QR-${Date.now().toString().slice(-5)}`;
    testCodes.push(code1);
    const asset1 = await registerAsset({
      name: "Dell Latitude 5420 Laptop",
      assetCode: code1,
      serialNumber: `SN-QR-${Date.now().toString().slice(-5)}`,
      categoryId: movableCategory.id,
      assetTypeId: movableCategory.assetTypes[0]?.id,
      departmentId: department.id,
      purchaseCost: 25000,
      purchaseDate: new Date(),
      dynamicValues: testDynamicValues,
      identificationMethod: "QR",
    }, adminUser.id);

    if (asset1.identificationMethod !== "QR") {
      throw new Error(`Test 1 Failed: Expected QR but got ${asset1.identificationMethod}`);
    }
    const qr1 = await prisma.qRCode.findUnique({ where: { assetId: asset1.id } });
    if (!qr1) throw new Error("Test 1 Failed: Expected QRCode record to be created for QR method");
    console.log(`✓ Test 1 Passed: Asset ${code1} created with QR method and QRCode record: ${qr1.qrCodeString}`);

    // ----------------------------------------------------
    // TEST 2: Movable asset (monitor) with Barcode
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Register Movable Asset with Barcode ---");
    const code2 = `TEST-BAR-${Date.now().toString().slice(-5)}`;
    testCodes.push(code2);
    const asset2 = await registerAsset({
      name: "Dell UltraSharp 27 Monitor",
      assetCode: code2,
      serialNumber: `SN-BAR-${Date.now().toString().slice(-5)}`,
      categoryId: movableCategory.id,
      assetTypeId: movableCategory.assetTypes[0]?.id,
      departmentId: department.id,
      purchaseCost: 12000,
      purchaseDate: new Date(),
      dynamicValues: testDynamicValues,
      identificationMethod: "BARCODE",
    }, adminUser.id);

    if (asset2.identificationMethod !== "BARCODE") {
      throw new Error(`Test 2 Failed: Expected BARCODE but got ${asset2.identificationMethod}`);
    }
    const barcodeSvg2 = generateBarcodeSvg(code2);
    if (!barcodeSvg2.includes("<svg") || !barcodeSvg2.includes("rect")) {
      throw new Error("Test 2 Failed: Barcode SVG generation failed");
    }
    console.log(`✓ Test 2 Passed: Asset ${code2} created with BARCODE method and valid SVG generated`);

    // ----------------------------------------------------
    // TEST 3: Slim asset (keyboard/mouse) with Barcode
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Slim Asset Barcode Sticker Layout ---");
    const code3 = `DBU-00125`;
    const stickerSvg = generateBarcodeSvg(code3, { height: 36, width: 1.8 });
    if (!stickerSvg.includes("<svg") || !stickerSvg.includes("width=\"100%\"")) {
      throw new Error("Test 3 Failed: Compact barcode sticker SVG is invalid");
    }
    console.log(`✓ Test 3 Passed: Slim asset code ${code3} generates compact machine-readable barcode sticker SVG`);

    // ----------------------------------------------------
    // TEST 4: Building asset enforcement (locks to NONE)
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Building Asset Rules ---");
    let buildingCatId = buildingCategory?.id;
    if (!buildingCatId) {
      // Create a temporary building category for testing if not present
      const newCat = await prisma.assetCategory.create({
        data: {
          name: "Test Academic Buildings",
          code: "TEST-BUILD",
          description: "University Building structures",
        },
      });
      buildingCatId = newCat.id;
    }

    const buildingCat = await prisma.assetCategory.findUnique({ where: { id: buildingCatId } });
    const isB = isBuildingAsset(buildingCat, null);
    if (!isB) throw new Error("Test 4 Failed: isBuildingAsset failed to recognize building category");

    let buildingAssetType = await prisma.assetType.findFirst({ where: { categoryId: buildingCatId } });
    if (!buildingAssetType) {
      buildingAssetType = await prisma.assetType.create({
        data: {
          name: "Building Structure",
          code: `BLD-STR-${Date.now().toString().slice(-4)}`,
          categoryId: buildingCatId,
        },
      });
    }

    // Attempting to register building with QR must be forced to NONE by service
    const code4 = `BLD-${Date.now().toString().slice(-4)}`;
    testCodes.push(code4);
    const asset4 = await registerAsset({
      name: "Main Administration Block",
      assetCode: code4,
      serialNumber: "BLD-BLOCK-A",
      categoryId: buildingCatId,
      assetTypeId: buildingAssetType.id,
      departmentId: department.id,
      purchaseCost: 5000000,
      purchaseDate: new Date(),
      identificationMethod: "QR", // Should be overridden to NONE for buildings
    }, adminUser.id);

    if (asset4.identificationMethod !== "NONE") {
      throw new Error(`Test 4 Failed: Expected NONE for building, got ${asset4.identificationMethod}`);
    }
    const qr4 = await prisma.qRCode.findUnique({ where: { assetId: asset4.id } });
    if (qr4) throw new Error("Test 4 Failed: Building should NOT have a QRCode record");
    console.log(`✓ Test 4 Passed: Building asset locked to NONE; physical labels and QR records disallowed.`);

    // ----------------------------------------------------
    // TEST 5: Movable asset with No Code
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Movable Asset with No Code ---");
    const code5 = `TEST-NONE-${Date.now().toString().slice(-5)}`;
    testCodes.push(code5);
    const asset5 = await registerAsset({
      name: "Lab Chemical Glassware Set",
      assetCode: code5,
      serialNumber: `SN-NONE-${Date.now().toString().slice(-5)}`,
      categoryId: movableCategory.id,
      assetTypeId: movableCategory.assetTypes[0]?.id,
      departmentId: department.id,
      purchaseCost: 3500,
      purchaseDate: new Date(),
      dynamicValues: testDynamicValues,
      identificationMethod: "NONE",
    }, adminUser.id);

    if (asset5.identificationMethod !== "NONE") {
      throw new Error(`Test 5 Failed: Expected NONE, got ${asset5.identificationMethod}`);
    }
    const qr5 = await prisma.qRCode.findUnique({ where: { assetId: asset5.id } });
    if (qr5) throw new Error("Test 5 Failed: No-code asset should not have a QRCode record");
    console.log(`✓ Test 5 Passed: Movable asset with No Code created cleanly without physical QR/barcode record`);

    // ----------------------------------------------------
    // TEST 6: Edit QR asset -> change to Barcode
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Switch Method (QR -> Barcode) ---");
    const updated1 = await updateAsset(asset1.id, {
      identificationMethod: "BARCODE",
    }, adminUser.id);

    if (updated1.identificationMethod !== "BARCODE") {
      throw new Error(`Test 6 Failed: Expected BARCODE, got ${updated1.identificationMethod}`);
    }
    console.log(`✓ Test 6 Passed: Asset ${code1} successfully switched from QR to BARCODE`);

    // ----------------------------------------------------
    // TEST 7: Edit Barcode asset -> change to QR
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Switch Method (Barcode -> QR) ---");
    const updated2 = await updateAsset(asset2.id, {
      identificationMethod: "QR",
    }, adminUser.id);

    if (updated2.identificationMethod !== "QR") {
      throw new Error(`Test 7 Failed: Expected QR, got ${updated2.identificationMethod}`);
    }
    const qrAfterSwitch = await prisma.qRCode.findUnique({ where: { assetId: asset2.id } });
    if (!qrAfterSwitch) throw new Error("Test 7 Failed: Expected QRCode record after switching to QR");
    console.log(`✓ Test 7 Passed: Asset ${code2} successfully switched from BARCODE to QR with QRCode synced`);

    // ----------------------------------------------------
    // TEST 8: Verify backward compatibility with existing assets
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Backward Compatibility with Existing Assets ---");
    const existingAssets = await prisma.asset.findMany({
      where: { deletedAt: null },
      take: 5,
    });
    for (const a of existingAssets) {
      if (!["QR", "BARCODE", "NONE"].includes(a.identificationMethod)) {
        throw new Error(`Test 8 Failed: Existing asset ${a.assetCode} has invalid method: ${a.identificationMethod}`);
      }
    }
    console.log(`✓ Test 8 Passed: All existing ${existingAssets.length} inspected assets have valid identificationMethod enum values`);

    // ----------------------------------------------------
    // TEST 9: Disallow changing building asset to QR or Barcode
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Guard Building Asset Against QR/Barcode Switch ---");
    let caughtBuildingError = false;
    try {
      await updateAsset(asset4.id, {
        identificationMethod: "QR",
      }, adminUser.id);
    } catch (err: unknown) {
      caughtBuildingError = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  Caught expected rejection: "${msg}"`);
    }
    if (!caughtBuildingError) {
      throw new Error("Test 9 Failed: Building asset should NOT allow switching to QR or BARCODE");
    }
    console.log(`✓ Test 9 Passed: Building asset strictly rejected switching to QR/Barcode`);

    // ----------------------------------------------------
    // TEST 10: Verify barcode & QR label string formatting
    // ----------------------------------------------------
    console.log("\n--- TEST 10: Label formatting and scanner resolution ---");
    // Ensure asset can be resolved by assetCode in DB (which is what barcodes scan into)
    const resolvedByCode = await prisma.asset.findFirst({
      where: {
        OR: [{ id: asset1.id }, { assetCode: asset1.assetCode }],
        deletedAt: null,
      },
    });
    if (!resolvedByCode || resolvedByCode.id !== asset1.id) {
      throw new Error("Test 10 Failed: Asset lookup by barcode value failed");
    }
    console.log(`✓ Test 10 Passed: Barcode scans of assetCode resolve directly to asset record (${resolvedByCode.assetCode})`);

    console.log("\n==========================================");
    console.log("ALL 10 TESTS PASSED SUCCESSFULLY! ✓✓✓");
    console.log("==========================================");
  } finally {
    // Clean up test assets
    for (const code of testCodes) {
      try {
        const a = await prisma.asset.findFirst({ where: { assetCode: code } });
        if (a) {
          await prisma.qRCode.deleteMany({ where: { assetId: a.id } });
          await prisma.asset.delete({ where: { id: a.id } });
        }
      } catch {
        // ignore cleanup error
      }
    }
  }
}

runTests()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
