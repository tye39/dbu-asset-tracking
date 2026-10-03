"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ROLES } from "@/lib/rbac";
import {
  AssetStatus,
  TransferStatus,
  MaintenanceStatus,
  AssetRequestStatus,
  PropertyAppealStatus,
} from "@prisma/client";

export type PaoStatCardType =
  | "TOTAL_ASSETS"
  | "AVAILABLE_ASSETS"
  | "ASSIGNED_ASSETS"
  | "IN_MAINTENANCE"
  | "PENDING_TRANSFERS"
  | "DISPOSED_ASSETS"
  | "PENDING_MAINTENANCES"
  | "REQUESTS_TO_FULFILL"
  | "ACTIVE_APPEALS"
  | "ASSET_CATEGORIES";

export async function getPaoStatRecordsAction(cardType: PaoStatCardType) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in." };
  }

  const role = session.user.role;
  if (
    role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER &&
    role !== ROLES.SYSTEM_ADMINISTRATOR
  ) {
    return {
      error: "Forbidden. You do not have permission to access PAO statistics data.",
    };
  }

  try {
    switch (cardType) {
      case "TOTAL_ASSETS": {
        const assets = await prisma.asset.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            publicId: true,
            name: true,
            assetCode: true,
            serialNumber: true,
            status: true,
            condition: true,
            purchaseDate: true,
            purchaseCost: true,
            currency: true,
            building: true,
            roomNumber: true,
            category: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            qrCode: { select: { qrCodeString: true, barcodeString: true } },
            assignments: {
              where: {
                status: {
                  in: [
                    "ACTIVE",
                    "ACCEPTED",
                    "PENDING_ACCEPTANCE",
                    "RETURN_REQUESTED",
                  ],
                },
              },
              orderBy: { assignedAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                assignedAt: true,
                assignedTo: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true } },
              },
            },
          },
        });
        return { success: true, cardType, records: assets, total: assets.length };
      }

      case "AVAILABLE_ASSETS": {
        const assets = await prisma.asset.findMany({
          where: { status: AssetStatus.ACTIVE, deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            publicId: true,
            name: true,
            assetCode: true,
            serialNumber: true,
            status: true,
            condition: true,
            purchaseDate: true,
            purchaseCost: true,
            currency: true,
            building: true,
            roomNumber: true,
            category: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            qrCode: { select: { qrCodeString: true, barcodeString: true } },
          },
        });
        return { success: true, cardType, records: assets, total: assets.length };
      }

      case "ASSIGNED_ASSETS": {
        // Query assets where status is ASSIGNED (matching dashboard count),
        // including active assignment details
        const assets = await prisma.asset.findMany({
          where: { status: AssetStatus.ASSIGNED, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            publicId: true,
            name: true,
            assetCode: true,
            serialNumber: true,
            status: true,
            condition: true,
            purchaseDate: true,
            category: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            assignments: {
              where: {
                status: {
                  in: [
                    "ACTIVE",
                    "ACCEPTED",
                    "PENDING_ACCEPTANCE",
                    "RETURN_REQUESTED",
                  ],
                },
              },
              orderBy: { assignedAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                assignedAt: true,
                notes: true,
                assignedTo: {
                  select: { id: true, name: true, email: true, employeeId: true },
                },
                department: { select: { id: true, name: true, code: true } },
              },
            },
          },
        });
        return { success: true, cardType, records: assets, total: assets.length };
      }

      case "IN_MAINTENANCE": {
        const assets = await prisma.asset.findMany({
          where: { status: AssetStatus.UNDER_MAINTENANCE, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            publicId: true,
            name: true,
            assetCode: true,
            serialNumber: true,
            status: true,
            condition: true,
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            maintenances: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                description: true,
                status: true,
                priority: true,
                cost: true,
                maintenanceCost: true,
                createdAt: true,
                completedAt: true,
                assignedTo: { select: { id: true, name: true, email: true } },
                reportedBy: { select: { id: true, name: true } },
              },
            },
          },
        });
        return { success: true, cardType, records: assets, total: assets.length };
      }

      case "PENDING_TRANSFERS": {
        const transfers = await prisma.transfer.findMany({
          where: { status: TransferStatus.PENDING },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            asset: {
              select: {
                id: true,
                name: true,
                assetCode: true,
                condition: true,
                status: true,
                category: { select: { name: true } },
              },
            },
            fromDepartment: { select: { id: true, name: true, code: true } },
            toDepartment: { select: { id: true, name: true, code: true } },
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } },
            requestedBy: { select: { id: true, name: true, email: true } },
          },
        });
        return { success: true, cardType, records: transfers, total: transfers.length };
      }

      case "DISPOSED_ASSETS": {
        const assets = await prisma.asset.findMany({
          where: { status: AssetStatus.DISPOSED, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            assetCode: true,
            serialNumber: true,
            status: true,
            salvageValue: true,
            currentBookValue: true,
            purchaseCost: true,
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            disposals: {
              orderBy: { disposalDate: "desc" },
              take: 1,
              select: {
                id: true,
                reason: true,
                method: true,
                disposalDate: true,
                notes: true,
                disposedBy: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
        return { success: true, cardType, records: assets, total: assets.length };
      }

      case "PENDING_MAINTENANCES": {
        const maintenances = await prisma.maintenance.findMany({
          where: { status: MaintenanceStatus.PENDING },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            description: true,
            priority: true,
            status: true,
            cost: true,
            maintenanceCost: true,
            createdAt: true,
            asset: {
              select: {
                id: true,
                name: true,
                assetCode: true,
                condition: true,
                department: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
              },
            },
            reportedBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        });
        return {
          success: true,
          cardType,
          records: maintenances,
          total: maintenances.length,
        };
      }

      case "REQUESTS_TO_FULFILL": {
        const requests = await prisma.assetRequest.findMany({
          where: { status: AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            requestNumber: true,
            quantity: true,
            reason: true,
            priority: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true, employeeId: true } },
            department: { select: { id: true, name: true, code: true } },
            category: { select: { id: true, name: true, code: true } },
            assetType: { select: { id: true, name: true } },
          },
        });
        return {
          success: true,
          cardType,
          records: requests,
          total: requests.length,
        };
      }

      case "ACTIVE_APPEALS": {
        const appeals = await prisma.propertyAppeal.findMany({
          where: {
            status: {
              in: [
                PropertyAppealStatus.PENDING_PROPERTY_MANAGEMENT,
                PropertyAppealStatus.UNDER_REVIEW,
                PropertyAppealStatus.ADDITIONAL_INFORMATION_REQUIRED,
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            appealNumber: true,
            subject: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true,
            department: { select: { id: true, name: true, code: true } },
            departmentHead: { select: { id: true, name: true, email: true } },
            request: { select: { id: true, requestNumber: true } },
            asset: { select: { id: true, name: true, assetCode: true } },
            responder: { select: { id: true, name: true } },
          },
        });
        return {
          success: true,
          cardType,
          records: appeals,
          total: appeals.length,
        };
      }

      case "ASSET_CATEGORIES": {
        const categories = await prisma.assetCategory.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          include: {
            assets: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                assetCode: true,
                serialNumber: true,
                status: true,
                condition: true,
                purchaseCost: true,
                currency: true,
                department: { select: { id: true, name: true, code: true } },
              },
            },
          },
        });

        // Compute exact breakdown for each category
        const categorized = categories.map((cat) => {
          const total = cat.assets.length;
          const available = cat.assets.filter(
            (a) => a.status === AssetStatus.ACTIVE
          ).length;
          const assigned = cat.assets.filter(
            (a) => a.status === AssetStatus.ASSIGNED
          ).length;
          const maintenance = cat.assets.filter(
            (a) => a.status === AssetStatus.UNDER_MAINTENANCE
          ).length;
          const disposed = cat.assets.filter(
            (a) => a.status === AssetStatus.DISPOSED
          ).length;

          return {
            id: cat.id,
            name: cat.name,
            code: cat.code,
            description: cat.description,
            total,
            available,
            assigned,
            maintenance,
            disposed,
            assets: cat.assets,
          };
        });

        return {
          success: true,
          cardType,
          records: categorized,
          total: categorized.length,
        };
      }

      default:
        return { error: `Invalid statistic card type: ${cardType}` };
    }
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to fetch statistic records.";
    console.error(`Error in getPaoStatRecordsAction(${cardType}):`, error);
    return { error: msg };
  }
}
