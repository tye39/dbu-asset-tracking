import { prisma } from "@/lib/db";
import { PublicAssetVerification } from "@/types/public-asset";
import { maskPersonName, formatSafeDate } from "@/lib/privacy";
import { AssetStatus } from "@prisma/client";

/**
 * Privacy-safe public asset verification query.
 * Debre Berhan University Asset Tracking System.
 *
 * CRITICAL PRIVACY GUARANTEES:
 * 1. Strictly selects ONLY non-sensitive, public fields on the database level.
 * 2. NEVER exposes financial data (costs, depreciation, book value, budget).
 * 3. NEVER exposes procurement data (suppliers, invoices, POs).
 * 4. NEVER exposes personal information (full names, emails, phones, IDs).
 * 5. NEVER exposes internal administrative data (audit logs, maintenance notes, transfers).
 * 6. Applies name masking on the server before returning the payload.
 * 7. Enforces deletedAt: null so deleted assets are never returned.
 */
export async function getPublicAssetVerification(identifier: string): Promise<PublicAssetVerification | null> {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const cleanId = identifier.trim();
  if (!cleanId || cleanId.length > 100) {
    return null;
  }

  // Check if cleanId matches standard UUID format for backward-compatible lookups
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);

  // Look up asset by publicId (primary), or fallback to assetCode or legacy UUID
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [
        { publicId: cleanId },
        { assetCode: cleanId },
        ...(isUuid ? [{ id: cleanId }] : []),
      ],
      deletedAt: null,
    },
    select: {
      publicId: true,
      assetCode: true,
      name: true,
      status: true,
      condition: true,
      building: true,
      roomNumber: true,
      campus: true,
      createdAt: true,
      category: {
        select: {
          name: true,
        },
      },
      assetType: {
        select: {
          name: true,
        },
      },
      department: {
        select: {
          name: true,
        },
      },
      images: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          url: true,
        },
      },
      assignments: {
        where: {
          status: { in: ["ACTIVE", "ACCEPTED"] },
        },
        take: 1,
        orderBy: { assignedAt: "desc" },
        select: {
          status: true,
          assignedTo: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!asset) {
    return null;
  }

  // Determine human-readable status & badge color
  let statusText = "Available";
  let statusBadge: PublicAssetVerification["statusBadge"] = "default";

  switch (asset.status) {
    case AssetStatus.ACTIVE:
      statusText = "Available";
      statusBadge = "active";
      break;
    case AssetStatus.ASSIGNED:
      statusText = "Assigned";
      statusBadge = "assigned";
      break;
    case AssetStatus.PENDING_ASSIGNMENT:
      statusText = "Pending Assignment";
      statusBadge = "pending";
      break;
    case AssetStatus.UNDER_MAINTENANCE:
      statusText = "Under Maintenance";
      statusBadge = "maintenance";
      break;
    case AssetStatus.DISPOSED:
      statusText = "Disposed";
      statusBadge = "disposed";
      break;
    default:
      statusText = String(asset.status).replace(/_/g, " ");
      statusBadge = "default";
  }

  // Handle privacy-safe assignment representation
  let maskedAssignee: string | null = null;

  if (asset.status === AssetStatus.ASSIGNED) {
    const currentAssignment = asset.assignments?.[0];
    if (currentAssignment) {
      if (currentAssignment.assignedTo?.name) {
        maskedAssignee = maskPersonName(currentAssignment.assignedTo.name);
      } else if (currentAssignment.department?.name) {
        maskedAssignee = `${currentAssignment.department.name} (Department Custody)`;
      } else {
        maskedAssignee = "Assigned User";
      }
    } else {
      maskedAssignee = "Assigned";
    }
  } else if (asset.status === AssetStatus.PENDING_ASSIGNMENT) {
    // Hide recipient identity while assignment confirmation is pending
    maskedAssignee = null;
  } else {
    maskedAssignee = null;
  }

  // Construct location string
  const locationParts = [
    asset.campus,
    asset.building,
    asset.roomNumber ? `Room ${asset.roomNumber}` : null,
  ].filter(Boolean);

  const locationStr = locationParts.length > 0 ? locationParts.join(" - ") : (asset.department?.name || null);

  const verificationDate = formatSafeDate(new Date()) || "Today";

  return {
    publicId: asset.publicId,
    assetCode: asset.assetCode,
    name: asset.name,
    category: asset.category?.name || "General Asset",
    assetType: asset.assetType?.name || null,
    status: statusText,
    statusBadge,
    condition: asset.condition || "Not Specified",
    department: asset.department?.name || "Debre Berhan University",
    campus: asset.campus || null,
    building: asset.building || null,
    roomNumber: asset.roomNumber || null,
    location: locationStr,
    assignedTo: maskedAssignee,
    imageUrl: asset.images?.[0]?.url || null,
    verifiedAt: verificationDate,
  };
}
