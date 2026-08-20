import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  previousState?: Record<string, unknown> | unknown,
  newState?: Record<string, unknown> | unknown,
  ipAddress?: string
) {
  let activeUserId: string | null = null;
  if (userId) {
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      if (userExists) {
        activeUserId = userId;
      }
    } catch {
      // Ignored: fallback to null activeUserId
    }
  }

  return await prisma.auditLog.create({
    data: {
      userId: activeUserId,
      action,
      entityType,
      entityId,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : undefined,
      newState: newState ? JSON.parse(JSON.stringify(newState)) : undefined,
      ipAddress,
    },
  });
}

export async function getAuditLogs(filters: {
  userId?: string;
  roleId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 15;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.roleId) {
    where.user = {
      roleId: filters.roleId
    };
  }
  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters.entityId) {
    where.entityId = filters.entityId;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: "insensitive" } },
      { entityType: { contains: filters.search, mode: "insensitive" } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}
