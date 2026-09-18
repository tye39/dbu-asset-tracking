import "dotenv/config";
import { prisma } from "./src/lib/db";
import { registerAsset } from "./src/services/asset";
import { assignAsset, acceptAssignment } from "./src/services/assignment";
import { returnAsset } from "./src/services/return";
import { getPublicAssetVerification } from "./src/services/public-asset";
import { maskPersonName, formatSafeDate, checkVerificationRateLimit, getAppBaseUrl } from "./src/lib/privacy";
import { AssetStatus, RoleName } from "@prisma/client";

async function runTests() {
  console.log("=================================================");
  console.log("DBU ASSET TRACKING - PUBLIC QR VERIFICATION TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // --- UNIT TEST A: MASK PERSON NAME HELPER ---
  console.log("--- TEST SUITE 1: Name Masking Privacy Helper ---");
  assert(maskPersonName("John Doe") === "John D.", "Mask two words ('John Doe' -> 'John D.')");
  assert(maskPersonName("Abebe Kebede") === "Abebe K.", "Mask Ethiopian name ('Abebe Kebede' -> 'Abebe K.')");
  assert(maskPersonName("John Michael Doe") === "John D.", "Mask three words ('John Michael Doe' -> 'John D.')");
  assert(maskPersonName("A") === "A", "Mask single character ('A' -> 'A')");
  assert(maskPersonName("Almaz") === "Almaz", "Mask single name ('Almaz' -> 'Almaz')");
  assert(maskPersonName(null) === null, "Handle null name safely");
  assert(maskPersonName("") === null, "Handle empty string safely");
  assert(maskPersonName("   ") === null, "Handle whitespace-only string safely");

  // --- UNIT TEST B: DATE SAFETY HELPER ---
  console.log("\n--- TEST SUITE 2: Safe Date Parsing & Formatting ---");
  const validDate = new Date("2026-09-18T10:00:00Z");
  assert(formatSafeDate(validDate) !== null, "Valid Date returns formatted string");
  assert(formatSafeDate(new Date("invalid date string")) === null, "Invalid Date returns null without crashing");
  assert(formatSafeDate(null) === null, "Null date returns null safely");
  assert(formatSafeDate(undefined) === null, "Undefined date returns null safely");

  // --- UNIT TEST C: RATE LIMITER ---
  console.log("\n--- TEST SUITE 3: Abuse Protection Rate Limiter ---");
  const testIp = "192.168.1.100";
  const rl1 = checkVerificationRateLimit(testIp);
  assert(rl1.allowed === true && rl1.remaining > 0, "Rate limiter allows initial request");

  // --- INTEGRATION TEST 1: DATABASE BACKFILL INTEGRITY ---
  console.log("\n--- TEST SUITE 4: Database Schema & PublicId Integrity ---");
  const allExistingAssets = await prisma.asset.findMany({
    select: { id: true, publicId: true }
  });
  const allHaveValidPublicId = allExistingAssets.length > 0 && allExistingAssets.every(a => typeof a.publicId === "string" && a.publicId.length > 0);
  assert(allHaveValidPublicId, "All existing assets in database have valid non-empty publicId");

  const totalAssets = await prisma.asset.count();
  console.log(`Verified ${totalAssets} total asset records in database.`);

  // --- INTEGRATION TEST 2: NEW ASSET REGISTRATION & QR CREATION ---
  console.log("\n--- TEST SUITE 5: Asset Registration with PublicId & Safe QR ---");
  const paoUser = await prisma.user.findFirst({
    where: { role: { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER }, deletedAt: null }
  });
  const staffUser = await prisma.user.findFirst({
    where: { role: { name: RoleName.STAFF_MEMBER }, deletedAt: null }
  });
  const category = await prisma.assetCategory.findFirst();
  const assetType = await prisma.assetType.findFirst();
  const department = await prisma.organizationalUnit.findFirst({ where: { deletedAt: null } });

  if (!paoUser || !staffUser || !category || !assetType || !department) {
    throw new Error("Missing required seed data (PAO, Staff, Category, AssetType, Department)");
  }

  const activeCustomConfigs = await prisma.assetTypeField.findMany({
    where: { assetTypeId: assetType.id, isEnabled: true },
    include: { field: true }
  });
  const coreNames = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"];
  const customOnlyConfigs = activeCustomConfigs.filter(c => !coreNames.includes(c.field.name));
  const dynamicValues: Record<string, string> = {};
  for (const cfg of customOnlyConfigs) {
    const opts = cfg.options || cfg.field.options;
    if (opts) {
      dynamicValues[cfg.field.id] = opts.split(",")[0].trim();
    } else if (cfg.field.fieldType === "NUMBER" || cfg.field.fieldType === "DECIMAL") {
      dynamicValues[cfg.field.id] = "1";
    } else if (cfg.field.fieldType === "DATE") {
      dynamicValues[cfg.field.id] = "2025-01-15";
    } else {
      dynamicValues[cfg.field.id] = "Dell";
    }
  }

  const testCode = "TEST-QR-" + Math.floor(100000 + Math.random() * 900000);
  const registeredAsset = await registerAsset({
    name: "Dell Precision Mobile Workstation",
    assetCode: testCode,
    serialNumber: "SN-" + testCode,
    categoryId: category.id,
    assetTypeId: assetType.id,
    departmentId: department.id,
    building: "ICT Complex",
    roomNumber: "305",
    campus: "Main Campus",
    condition: "Excellent",
    purchaseDate: new Date("2025-01-15"),
    purchaseCost: 85000,
    salvageValue: 5000,
    usefulLife: 5,
    fundingSource: "GOVERNMENT_BUDGET",
    warrantyStartDate: new Date("2025-01-15"),
    warrantyEndDate: new Date("2027-01-15"),
    dynamicValues,
  }, paoUser.id);

  if (!registeredAsset) {
    throw new Error("Asset registration returned null");
  }

  assert(!!registeredAsset.publicId, "Newly registered asset has publicId");
  assert(
    registeredAsset.publicId !== registeredAsset.id,
    "publicId is distinct and does not expose database primary key ID"
  );
  assert(
    registeredAsset.qrCode !== null && !!registeredAsset.qrCode?.qrCodeString,
    "QRCode record created for asset"
  );
  assert(
    registeredAsset.qrCode!.qrCodeString.includes(`/asset/verify/${registeredAsset.publicId}`),
    `QRCode encodes public verification URL: ${registeredAsset.qrCode!.qrCodeString}`
  );
  assert(
    !registeredAsset.qrCode!.qrCodeString.includes("85000") && !registeredAsset.qrCode!.qrCodeString.includes("purchaseCost"),
    "QRCode does NOT contain financial or sensitive details"
  );

  // --- INTEGRATION TEST 3: PRIVACY & DATA LEAKAGE PREVENTION ---
  console.log("\n--- TEST SUITE 6: Public Verification Payload & Privacy Security ---");
  const publicPayload = await getPublicAssetVerification(registeredAsset.publicId);
  assert(publicPayload !== null, "getPublicAssetVerification returns asset data");

  if (publicPayload) {
    assert(publicPayload.assetCode === testCode, "Public asset code matches");
    assert(publicPayload.name === "Dell Precision Mobile Workstation", "Public asset name matches");
    assert(publicPayload.status === "Available", "Status is human-readable 'Available'");
    assert(publicPayload.condition === "Excellent", "Condition is visible");
    assert(publicPayload.location?.includes("ICT Complex") === true, "Location string includes building");

    // Critical privacy checks: Verify sensitive fields are strictly excluded
    const rawPayload = publicPayload as unknown as Record<string, unknown>;
    assert(rawPayload.purchaseCost === undefined, "CRITICAL: purchaseCost is NOT exposed");
    assert(rawPayload.procurementCost === undefined, "CRITICAL: procurementCost is NOT exposed");
    assert(rawPayload.salvageValue === undefined, "CRITICAL: salvageValue is NOT exposed");
    assert(rawPayload.annualDepreciation === undefined, "CRITICAL: annualDepreciation is NOT exposed");
    assert(rawPayload.currentBookValue === undefined, "CRITICAL: currentBookValue is NOT exposed");
    assert(rawPayload.serialNumber === undefined, "CRITICAL: serialNumber is NOT exposed");
    assert(rawPayload.supplierId === undefined, "CRITICAL: supplierId is NOT exposed");
    assert(rawPayload.supplier === undefined, "CRITICAL: supplier is NOT exposed");
    assert(rawPayload.auditLogs === undefined, "CRITICAL: auditLogs are NOT exposed");
    assert(rawPayload.maintenances === undefined, "CRITICAL: maintenances are NOT exposed");
    assert(rawPayload.passwordHash === undefined, "CRITICAL: passwordHash is NOT exposed");
    assert(rawPayload.id === undefined, "CRITICAL: Database primary key UUID is NOT exposed");

    const jsonString = JSON.stringify(publicPayload);
    assert(!jsonString.includes("85000"), "Serialized JSON does NOT leak purchaseCost (85000)");
    assert(!jsonString.includes("SN-" + testCode), "Serialized JSON does NOT leak serialNumber");
    assert(!jsonString.includes(registeredAsset.id), "Serialized JSON does NOT leak internal DB primary key");
  }

  // --- INTEGRATION TEST 4: ASSIGNMENT PRIVACY (MASKED NAME) ---
  console.log("\n--- TEST SUITE 7: Assignment Privacy & Masking Workflow ---");
  // 1. Assign to staff user
  const assignment = await assignAsset({
    assetId: registeredAsset.id,
    assignedToId: staffUser.id,
    notes: "Assigned for verification test",
  }, paoUser.id);

  // Check pending assignment privacy
  const pendingPayload = await getPublicAssetVerification(registeredAsset.publicId);
  assert(pendingPayload?.status === "Pending Assignment", "Status displays 'Pending Assignment'");
  assert(pendingPayload?.assignedTo === null, "Assignee identity is HIDDEN while pending confirmation");

  // 2. Accept assignment
  await acceptAssignment(assignment.id, staffUser.id);

  // Check active assignment privacy
  const activePayload = await getPublicAssetVerification(registeredAsset.publicId);
  assert(activePayload?.status === "Assigned", "Status displays 'Assigned'");
  const expectedMasked = maskPersonName(staffUser.name);
  assert(
    activePayload?.assignedTo === expectedMasked,
    `Assignee is properly masked: '${activePayload?.assignedTo}' (Expected: '${expectedMasked}')`
  );
  assert(
    !JSON.stringify(activePayload).includes(staffUser.email),
    "Public payload does NOT leak assignee's email address"
  );
  assert(
    !JSON.stringify(activePayload).includes(staffUser.id),
    "Public payload does NOT leak assignee's user UUID"
  );

  // --- INTEGRATION TEST 5: UNASSIGNMENT / RETURN ---
  console.log("\n--- TEST SUITE 8: Unassignment / Return Workflow ---");
  // Return asset
  await returnAsset({ assetId: registeredAsset.id, conditionAtReturn: "GOOD" }, paoUser.id);
  const returnedPayload = await getPublicAssetVerification(registeredAsset.publicId);
  assert(returnedPayload?.status === "Available", "Asset status returns to 'Available'");
  assert(returnedPayload?.assignedTo === null, "Assigned person is null after return (no stale assignee)");

  // --- INTEGRATION TEST 6: INVALID / UNKNOWN QR ---
  console.log("\n--- TEST SUITE 9: Invalid & Nonexistent QR Code Handling ---");
  const invalidResult = await getPublicAssetVerification("non-existent-random-id-9999");
  assert(invalidResult === null, "Non-existent publicId returns null cleanly without database error");

  const emptyResult = await getPublicAssetVerification("");
  assert(emptyResult === null, "Empty string returns null cleanly");

  // Clean up test asset
  console.log("\n--- CLEANING UP TEST ARTIFACTS ---");
  await prisma.qRCode.deleteMany({ where: { assetId: registeredAsset.id } });
  await prisma.auditLog.deleteMany({ where: { assetId: registeredAsset.id } });
  await prisma.return.deleteMany({ where: { assetId: registeredAsset.id } });
  await prisma.assignment.deleteMany({ where: { assetId: registeredAsset.id } });
  await prisma.asset.delete({ where: { id: registeredAsset.id } });
  console.log("Test asset cleaned up.");

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
