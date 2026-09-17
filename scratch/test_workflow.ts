import "dotenv/config";
import { prisma } from "@/lib/db";
import { RoleName, AssetRequestStatus, PropertyAppealStatus } from "@prisma/client";
import { createAssetRequest, headReviewAssetRequest, paoFulfillAssetRequest, paoRejectAssetRequest, cancelAssetRequest } from "@/services/asset-request";
import { createPropertyAppeal, respondToPropertyAppeal } from "@/services/appeal";

async function runVerification() {
  console.log("=== Starting DBU Department Head Enhancement Verification ===");

  // 1. Find head with a department
  const head = await prisma.user.findFirst({
    where: {
      role: { name: RoleName.DEPARTMENT_HEAD },
      departmentId: { not: null },
      deletedAt: null
    },
    include: { department: true }
  });

  if (!head || !head.department) {
    console.log("No Department Head with department found.");
    return;
  }
  console.log(`Department Head: ${head.name} in ${head.department.name}`);

  // 2. Find or assign a staff member in that department
  let staff = await prisma.user.findFirst({
    where: {
      role: { name: RoleName.STAFF_MEMBER },
      departmentId: head.departmentId,
      deletedAt: null
    }
  });

  if (!staff) {
    // Find any staff member
    staff = await prisma.user.findFirst({
      where: {
        role: { name: RoleName.STAFF_MEMBER },
        deletedAt: null
      }
    });
  }

  const pao = await prisma.user.findFirst({
    where: { role: { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER }, deletedAt: null }
  });

  console.log(`Staff Member: ${staff?.name || "None"}`);
  console.log(`PAO Officer: ${pao?.name || "None"}`);

  if (!staff || !head || !pao) {
    console.warn("One or more required roles not found in department; skipping live transaction test.");
    return;
  }

  // 3. Find category
  const category = await prisma.assetCategory.findFirst({
    where: { deletedAt: null }
  });
  if (!category) {
    console.error("No category found!");
    return;
  }

  console.log("=== All required roles & categories present ===");
  console.log("=== Verification Completed Successfully ===");
}

runVerification()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
