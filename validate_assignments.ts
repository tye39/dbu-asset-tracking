import { prisma } from "./src/lib/db";
import { assignAsset, acceptAssignment, rejectAssignment } from "./src/services/assignment";
import { AssetStatus, AssignmentStatus, RoleName } from "@prisma/client";

async function run() {
  console.log("=== RUNNING SYSTEM VALIDATION FOR ACCEPTANCE WORKFLOW ===");

  // 1. Fetch PAO
  let paoUser = await prisma.user.findFirst({
    where: { role: { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER }, deletedAt: null }
  });
  if (!paoUser) throw new Error("Please seed at least one PAO user in the database.");

  // 2. Fetch Staff
  let staffUser = await prisma.user.findFirst({
    where: { role: { name: RoleName.STAFF_MEMBER }, deletedAt: null }
  });
  if (!staffUser) throw new Error("Please seed at least one Staff user in the database.");

  // 3. Create unique test asset
  const category = await prisma.assetCategory.findFirst();
  const assetType = await prisma.assetType.findFirst();
  const dept = await prisma.organizationalUnit.findFirst({ where: { deletedAt: null } });
  if (!category || !assetType || !dept) throw new Error("Category, assetType, or department not found in DB.");

  const randomCode = "TEST-LAP-" + Math.floor(100000 + Math.random() * 900000);
  const asset = await prisma.asset.create({
    data: {
      name: "Verification Dell Laptop",
      assetCode: randomCode,
      serialNumber: "SN-" + randomCode,
      categoryId: category.id,
      assetTypeId: assetType.id,
      departmentId: dept.id,
      status: AssetStatus.ACTIVE,
    }
  });

  console.log(`Created test asset: ${asset.name} (${asset.assetCode})`);
  console.log(`Assignee: ${staffUser.name} (${staffUser.id})`);

  // Step A: Assign Asset
  console.log("\n[Test A] PAO assigns asset...");
  const assignment = await assignAsset({
    assetId: asset.id,
    assignedToId: staffUser.id,
    notes: "PAO workflow test",
  }, paoUser.id);

  console.log(`Created Assignment ID: ${assignment.id}`);
  console.log(`Assignment status: ${assignment.status} (Expected: PENDING_ACCEPTANCE)`);

  const assetAfterAssign = await prisma.asset.findUnique({ where: { id: asset.id } });
  console.log(`Asset status: ${assetAfterAssign?.status} (Expected: PENDING_ASSIGNMENT)`);

  if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE || assetAfterAssign?.status !== AssetStatus.PENDING_ASSIGNMENT) {
    throw new Error("Validation Failed on Step A: Statuses are incorrect!");
  }

  // Step B: Accept Asset
  console.log("\n[Test B] Staff member accepts asset...");
  const accepted = await acceptAssignment(assignment.id, staffUser.id);
  console.log(`Assignment status: ${accepted.status} (Expected: ACCEPTED)`);

  const assetAfterAccept = await prisma.asset.findUnique({ where: { id: asset.id } });
  console.log(`Asset status: ${assetAfterAccept?.status} (Expected: ASSIGNED)`);

  if (accepted.status !== AssignmentStatus.ACCEPTED || assetAfterAccept?.status !== AssetStatus.ASSIGNED) {
    throw new Error("Validation Failed on Step B: Acceptance statuses incorrect!");
  }

  // Step C: Reject Asset
  console.log("\n[Test C] Creating another assignment to test Rejection...");
  // Set asset back to active manually
  await prisma.asset.update({
    where: { id: asset.id },
    data: { status: AssetStatus.ACTIVE }
  });
  // Delete the first assignment to avoid active collision
  await prisma.assignment.delete({ where: { id: assignment.id } });

  const assignment2 = await assignAsset({
    assetId: asset.id,
    assignedToId: staffUser.id,
    notes: "PAO rejection test",
  }, paoUser.id);

  console.log(`New Assignment ID: ${assignment2.id}`);
  console.log("Rejecting assignment with reason...");
  const reason = "The asset was assigned to me by mistake.";
  const rejected = await rejectAssignment(assignment2.id, staffUser.id, reason);

  console.log(`Assignment status: ${rejected.status} (Expected: REJECTED)`);
  console.log(`Rejection reason saved: "${rejected.rejectionReason}"`);
  console.log(`Rejection timestamp: ${rejected.rejectedAt}`);

  const assetAfterReject = await prisma.asset.findUnique({ where: { id: asset.id } });
  console.log(`Asset status: ${assetAfterReject?.status} (Expected: ACTIVE)`);

  if (rejected.status !== AssignmentStatus.REJECTED || assetAfterReject?.status !== AssetStatus.ACTIVE || rejected.rejectionReason !== reason) {
    throw new Error("Validation Failed on Step C: Rejection workflow incorrect!");
  }

  // Cleanup
  console.log("\n[Cleaning Up] Deleting validation test records...");
  await prisma.assignment.delete({ where: { id: assignment2.id } });
  await prisma.asset.delete({ where: { id: asset.id } });

  console.log("\n=== ALL TRANSACTION INTEGRITY CHECKS PASSED SUCCESSFULLY! ===");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Validation failed:", err);
    process.exit(1);
  });
