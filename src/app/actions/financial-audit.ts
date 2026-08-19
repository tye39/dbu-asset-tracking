"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { calculateDepreciation } from "@/services/valuation";

export interface FinancialStats {
  totalAssetCost: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  totalProcurementCost: number;
  totalMaintenanceCost: number;
  totalDepreciation: number;
  currentBookValue: number;
  totalDisposalValue: number;
}

/**
 * Calculates DBU overall executive financial metrics
 */
export async function getFinancialAuditDashboard(): Promise<FinancialStats> {
  const [assets, maintenances, disposals] = await Promise.all([
    prisma.asset.findMany({ where: { deletedAt: null } }),
    prisma.maintenance.findMany({ where: { status: "COMPLETED" }, select: { cost: true, maintenanceCost: true } }),
    prisma.disposal.findMany({ select: { asset: { select: { procurementCost: true, purchaseDate: true, expectedLifecycleYears: true, salvageValue: true } } } }),
  ]);

  let totalAssetCost = 0;
  let totalDepreciation = 0;
  let currentBookValue = 0;
  let totalProcurementCost = 0;

  assets.forEach((a) => {
    const cost = a.procurementCost ? Number(a.procurementCost) : 0;
    totalAssetCost += cost;
    if (a.status !== "DISPOSED") {
      totalProcurementCost += cost;
    }

    if (cost > 0 && a.purchaseDate) {
      const depr = calculateDepreciation(cost, a.purchaseDate, a.expectedLifecycleYears || 5, a.salvageValue ? Number(a.salvageValue) : 0);
      totalDepreciation += depr.totalDepreciation;
      currentBookValue += depr.currentValue;
    } else {
      currentBookValue += cost;
    }
  });

  const totalMaintenanceCost = maintenances.reduce((acc, m) => {
    const c = m.maintenanceCost ? Number(m.maintenanceCost) : (m.cost ? Number(m.cost) : 0);
    return acc + c;
  }, 0);

  // Disposal value
  let totalDisposalValue = 0;
  disposals.forEach((d) => {
    const cost = d.asset?.procurementCost ? Number(d.asset.procurementCost) : 0;
    const salvage = d.asset?.salvageValue ? Number(d.asset.salvageValue) : 0;
    const purchaseDate = d.asset?.purchaseDate;
    if (cost > 0 && purchaseDate) {
      const depr = calculateDepreciation(cost, purchaseDate, d.asset.expectedLifecycleYears || 5, salvage);
      totalDisposalValue += depr.currentValue; // Book value at write-off
    }
  });

  return {
    totalAssetCost,
    allocatedBudget: 0,
    spentBudget: 0,
    remainingBudget: 0,
    budgetUtilizationPct: 0,
    totalProcurementCost,
    totalMaintenanceCost,
    totalDepreciation: Math.round(totalDepreciation),
    currentBookValue: Math.round(currentBookValue),
    totalDisposalValue,
  };
}

export interface DiscrepantAsset {
  id: string;
  name: string;
  assetCode: string;
  invoiceNumber?: string | null;
}

export interface BudgetOverrun {
  id: string;
  departmentName: string;
  fiscalYear: string;
  total: number;
  spent: number;
  overrun: number;
}

export interface DiscrepancyReport {
  missingCost: DiscrepantAsset[];
  missingSupplier: DiscrepantAsset[];
  missingInvoice: DiscrepantAsset[];
  invalidValues: DiscrepantAsset[];
  budgetOverruns: BudgetOverrun[];
  duplicateInvoices: DiscrepantAsset[];
  missingDeprData: DiscrepantAsset[];
  count: number;
}

/**
 * Audit scans the entire dataset to detect and report compliance issues
 */
export async function getFinancialDiscrepancies(): Promise<DiscrepancyReport> {
  const assets = await prisma.asset.findMany({
    where: { deletedAt: null },
    include: { category: true, department: true, supplier: true },
  });

  const report: DiscrepancyReport = {
    missingCost: [],
    missingSupplier: [],
    missingInvoice: [],
    invalidValues: [],
    budgetOverruns: [],
    duplicateInvoices: [],
    missingDeprData: [],
    count: 0,
  };

  // Find invoice numbers mapping to count occurrences
  const invoiceCounts: Record<string, number> = {};
  assets.forEach((a) => {
    if (a.invoiceNumber) {
      invoiceCounts[a.invoiceNumber] = (invoiceCounts[a.invoiceNumber] || 0) + 1;
    }
  });

  assets.forEach((a) => {
    const cost = a.procurementCost ? Number(a.procurementCost) : 0;
    const salvage = a.salvageValue ? Number(a.salvageValue) : 0;

    let hasIssue = false;

    // 1. Missing Purchase Price
    if (!a.procurementCost) {
      report.missingCost.push(a);
      hasIssue = true;
    }

    // 2. Missing Supplier
    if (!a.supplierId) {
      report.missingSupplier.push(a);
      hasIssue = true;
    }

    // 3. Missing Invoice
    if (!a.invoiceNumber) {
      report.missingInvoice.push(a);
      hasIssue = true;
    }

    // 4. Invalid values (negative cost/salvage, salvage > cost)
    if (cost < 0 || salvage < 0 || (cost > 0 && salvage > cost)) {
      report.invalidValues.push(a);
      hasIssue = true;
    }

    // 5. Duplicate Invoices
    if (a.invoiceNumber && invoiceCounts[a.invoiceNumber] > 1) {
      report.duplicateInvoices.push(a);
      hasIssue = true;
    }

    // 6. Missing Depreciation params
    if (!a.purchaseDate || !a.expectedLifecycleYears) {
      report.missingDeprData.push(a);
      hasIssue = true;
    }

    if (hasIssue) report.count++;
  });

  return report;
}

export interface MaintenanceAuditItem {
  id: string;
  name: string;
  assetCode: string;
  departmentName: string;
  procurementCost: number;
  maintenanceCost: number;
  costRatioPct: number;
  recommendReplacement: boolean;
}

/**
 * Analyzes maintenance spends per asset and recommends replacements
 */
export async function getMaintenanceCostAudit(): Promise<MaintenanceAuditItem[]> {
  const assets = await prisma.asset.findMany({
    where: { deletedAt: null },
    include: {
      department: true,
      maintenances: {
        where: { status: "COMPLETED" },
        select: { cost: true, maintenanceCost: true },
      },
    },
  });

  return assets.map((a) => {
    const cost = a.procurementCost ? Number(a.procurementCost) : 0;
    const maintCost = a.maintenances.reduce((acc, m) => {
      const c = m.maintenanceCost ? Number(m.maintenanceCost) : (m.cost ? Number(m.cost) : 0);
      return acc + c;
    }, 0);
    const pct = cost > 0 ? (maintCost / cost) * 100 : 0;

    return {
      id: a.id,
      name: a.name,
      assetCode: a.assetCode,
      departmentName: a.department.name,
      procurementCost: cost,
      maintenanceCost: maintCost,
      costRatioPct: Math.round(pct),
      recommendReplacement: pct > 50 && cost > 0, // Repair costs exceed 50% threshold
    };
  });
}

/**
 * Saves a persistent Financial Audit snapshot in database
 */
export async function saveFinancialAuditAction(
  prevState: unknown,
  data: {
    fiscalYear: string;
    departmentId?: string;
    findings: string;
    recommendations: string;
    status: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const stats = await getFinancialAuditDashboard();

    const audit = await prisma.financialAudit.create({
      data: {
        fiscalYear: data.fiscalYear,
        departmentId: data.departmentId || null,
        findings: data.findings,
        recommendations: data.recommendations,
        financialStatus: data.status,
        auditorId: session.user.id,
        totalAssetValue: stats.totalAssetCost,
        budgetAudited: 0,
      },
    });

    // Write system log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FINANCIAL_AUDIT_LOG",
        entityType: "FinancialAudit",
        entityId: audit.id,
        newState: { status: data.status, year: data.fiscalYear },
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record audit findings.";
    return { error: msg };
  }
}

/**
 * Fetches all saved audits log history
 */
export async function getFinancialAuditHistory() {
  return prisma.financialAudit.findMany({
    orderBy: { auditDate: "desc" },
    include: {
      auditor: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
}
