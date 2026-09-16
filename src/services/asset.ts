import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { Prisma, AssetStatus, FundingSource, AssignmentStatus } from "@prisma/client";
import { calculateAssetFinancials } from "./financials";

export async function registerAsset(data: {
  name: string;
  assetCode: string;
  serialNumber: string;
  description?: string;
  categoryId: string;
  departmentId: string;
  imageUrl?: string;
  imageUrls?: string[];
  purchaseDate?: Date;
  purchaseCost?: number;
  procurementCost?: number;
  expectedLifecycleYears?: number;
  usefulLife?: number;
  salvageValue?: number;
  warrantyExpiry?: Date;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  supplierId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceCoverage?: number;
  insurancePremium?: number;
  insuranceExpiry?: Date;
  dynamicValues?: Record<string, string>;

  // Common Registration Fields
  assetTypeId?: string;
  building?: string;
  roomNumber?: string;
  campus?: string;
  quantity?: number;
  condition?: string;
  attachmentUrl?: string;
  remarks?: string;
  assignedToId?: string;

  // Financial fields
  fundingSource?: FundingSource;
}, actorId: string) {
  // Check duplicate serial or code
  const existingCode = await prisma.asset.findUnique({
    where: { assetCode: data.assetCode },
  });
  if (existingCode) throw new Error("An asset with this asset code already exists.");

  const existingSerial = await prisma.asset.findUnique({
    where: { serialNumber: data.serialNumber },
  });
  if (existingSerial) throw new Error("An asset with this serial number already exists.");

  // Validate Custodian-Department Match (Security / Manual Bypass check)
  if (data.assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: data.assignedToId, deletedAt: null },
      select: { departmentId: true }
    });
    if (!user) {
      throw new Error("Selected custodian staff member not found.");
    }
    if (user.departmentId !== data.departmentId) {
      throw new Error("The selected custodian staff member does not belong to the selected department.");
    }
  }

  // Fetch Actor Role
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    include: { role: true }
  });
  if (!actor) throw new Error("Actor not found.");

  // 1. Fetch Form Config for dynamic validations
  if (!data.assetTypeId) {
    throw new Error("Asset Type is required.");
  }

  const activeConfigs = await prisma.assetTypeField.findMany({
    where: { assetTypeId: data.assetTypeId, isEnabled: true },
    include: { field: true }
  });

  const configFieldsMap = new Map(activeConfigs.map(c => [c.field.name, c]));

  interface FieldConfigType {
    labelOverride?: string | null;
    validationMin?: number | null;
    validationMax?: number | null;
    validationMinLength?: number | null;
    validationMaxLength?: number | null;
    field: {
      name: string;
      label: string;
      fieldType: string;
    };
  }

  // Helper to validate range and length constraints
  function validateFieldConstraints(cfg: FieldConfigType, value: string | null | undefined) {
    if (value === undefined || value === null || value.trim() === "") return;
    const label = cfg.labelOverride || cfg.field.label;

    const type = cfg.field.fieldType;
    // Range Checks for Numbers / Decimals
    if (type === "NUMBER" || type === "DECIMAL" || ["purchaseCost", "salvageValue", "usefulLife"].includes(cfg.field.name)) {
      const valNum = Number(value);
      if (!isNaN(valNum)) {
        if (cfg.validationMin !== null && cfg.validationMin !== undefined && valNum < cfg.validationMin) {
          throw new Error(`${label} must be at least ${cfg.validationMin}.`);
        }
        if (cfg.validationMax !== null && cfg.validationMax !== undefined && valNum > cfg.validationMax) {
          throw new Error(`${label} cannot exceed ${cfg.validationMax}.`);
        }
      }
    }

    // Length Checks for String Fields
    if (type === "TEXT" || type === "TEXTAREA" || ["name", "serialNumber"].includes(cfg.field.name)) {
      if (cfg.validationMinLength !== null && cfg.validationMinLength !== undefined && value.length < cfg.validationMinLength) {
        throw new Error(`${label} must be at least ${cfg.validationMinLength} characters long.`);
      }
      if (cfg.validationMaxLength !== null && cfg.validationMaxLength !== undefined && value.length > cfg.validationMaxLength) {
        throw new Error(`${label} cannot exceed ${cfg.validationMaxLength} characters long.`);
      }
    }
  }

  // Validate Core/Built-in Fields
  const nameCfg = configFieldsMap.get("name");
  if (nameCfg?.isRequired && (!data.name || data.name.trim() === "")) {
    throw new Error(`${nameCfg.labelOverride || nameCfg.field.label} is required.`);
  }
  if (nameCfg) validateFieldConstraints(nameCfg, data.name);

  const serialCfg = configFieldsMap.get("serialNumber");
  if (serialCfg?.isRequired && (!data.serialNumber || data.serialNumber.trim() === "")) {
    throw new Error(`${serialCfg.labelOverride || serialCfg.field.label} is required.`);
  }
  if (serialCfg) validateFieldConstraints(serialCfg, data.serialNumber);

  const costCfg = configFieldsMap.get("purchaseCost");
  if (costCfg?.isRequired && (data.purchaseCost === undefined || data.purchaseCost === null || data.purchaseCost.toString().trim() === "")) {
    throw new Error(`${costCfg.labelOverride || costCfg.field.label} is required.`);
  }
  if (costCfg) validateFieldConstraints(costCfg, data.purchaseCost?.toString());

  const dateCfg = configFieldsMap.get("purchaseDate");
  if (dateCfg?.isRequired && (data.purchaseDate === undefined || data.purchaseDate === null || data.purchaseDate.toString().trim() === "")) {
    throw new Error(`${dateCfg.labelOverride || dateCfg.field.label} is required.`);
  }

  const lifeCfg = configFieldsMap.get("usefulLife");
  if (lifeCfg?.isRequired && (data.usefulLife === undefined || data.usefulLife === null || data.usefulLife.toString().trim() === "")) {
    throw new Error(`${lifeCfg.labelOverride || lifeCfg.field.label} is required.`);
  }
  if (lifeCfg) validateFieldConstraints(lifeCfg, data.usefulLife?.toString());

  const salvageCfg = configFieldsMap.get("salvageValue");
  if (salvageCfg?.isRequired && (data.salvageValue === undefined || data.salvageValue === null || data.salvageValue.toString().trim() === "")) {
    throw new Error(`${salvageCfg.labelOverride || salvageCfg.field.label} is required.`);
  }
  if (salvageCfg) validateFieldConstraints(salvageCfg, data.salvageValue?.toString());

  const fundingCfg = configFieldsMap.get("fundingSource");
  if (fundingCfg?.isRequired && (!data.fundingSource || data.fundingSource.trim() === "")) {
    throw new Error(`${fundingCfg.labelOverride || fundingCfg.field.label} is required.`);
  }

  const wStartCfg = configFieldsMap.get("warrantyStartDate");
  if (wStartCfg?.isRequired && (!data.warrantyStartDate || data.warrantyStartDate.toString().trim() === "")) {
    throw new Error(`${wStartCfg.labelOverride || wStartCfg.field.label} is required.`);
  }

  const wEndCfg = configFieldsMap.get("warrantyEndDate");
  if (wEndCfg?.isRequired && (!data.warrantyEndDate || data.warrantyEndDate.toString().trim() === "")) {
    throw new Error(`${wEndCfg.labelOverride || wEndCfg.field.label} is required.`);
  }

  // Cost and number range checks
  if (data.purchaseCost !== undefined && data.purchaseCost !== null) {
    const costNum = Number(data.purchaseCost);
    if (isNaN(costNum) || costNum <= 0) {
      throw new Error("Purchase Cost must be a valid number greater than zero.");
    }
  }
  if (data.salvageValue !== undefined && data.salvageValue !== null) {
    const salvageNum = Number(data.salvageValue);
    const costNum = Number(data.purchaseCost || 0);
    if (isNaN(salvageNum) || salvageNum < 0) {
      throw new Error("Salvage Value must be a valid positive number.");
    }
    if (salvageNum > costNum) {
      throw new Error("Salvage Value cannot exceed Purchase Cost.");
    }
  }
  if (data.usefulLife !== undefined && data.usefulLife !== null) {
    const lifeNum = Number(data.usefulLife);
    if (isNaN(lifeNum) || lifeNum <= 0) {
      throw new Error("Useful Life must be a valid number greater than zero.");
    }
  }

  // 2. Validate Custom Dynamic Fields (Section 17)
  const submittedDynamicValues = data.dynamicValues || {};
  const activeCustomConfigs = activeConfigs.filter(
    (cfg) => !["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.field.name)
  );

  for (const cfg of activeCustomConfigs) {
    const value = submittedDynamicValues[cfg.field.id];
    if (cfg.isRequired && (value === undefined || value === null || value.trim() === "")) {
      throw new Error(`${cfg.labelOverride || cfg.field.label} is required.`);
    }

    if (value !== undefined && value !== null && value.trim() !== "") {
      const type = cfg.field.fieldType;
      if (type === "NUMBER") {
        const valNum = Number(value);
        if (isNaN(valNum) || !Number.isInteger(valNum)) {
          throw new Error(`${cfg.labelOverride || cfg.field.label} must be a valid integer.`);
        }
      } else if (type === "DECIMAL") {
        const valNum = Number(value);
        if (isNaN(valNum)) {
          throw new Error(`${cfg.labelOverride || cfg.field.label} must be a valid decimal number.`);
        }
      } else if (type === "DATE") {
        const valDate = new Date(value);
        if (isNaN(valDate.getTime())) {
          throw new Error(`${cfg.labelOverride || cfg.field.label} must be a valid date.`);
        }
      } else if (type === "DROPDOWN" || type === "RADIO") {
        const options = cfg.options || cfg.field.options;
        if (options) {
          const allowed = options.split(",").map(o => o.trim());
          if (!allowed.includes(value.trim())) {
            throw new Error(`${cfg.labelOverride || cfg.field.label} value "${value}" is not in configured options list.`);
          }
        }
      }

      // Enforce overrides range & length checks on custom fields
      validateFieldConstraints(cfg, value);
    }
  }

  // 3. Reject dynamic values not configured for the selected Asset Type (Section 17)
  const allowedCustomFieldIds = new Set(activeCustomConfigs.map(c => c.field.id));
  for (const submittedFieldId of Object.keys(submittedDynamicValues)) {
    if (!allowedCustomFieldIds.has(submittedFieldId)) {
      throw new Error(`Field ID "${submittedFieldId}" is not configured for this Asset Type.`);
    }
  }

  // 4. Validate Supplier Assignment (Section 17)
  if (data.supplierId) {
    const assignmentExists = await prisma.supplierAssignment.findFirst({
      where: {
        supplierId: data.supplierId,
        isActive: true,
        OR: [
          { assetTypeId: data.assetTypeId },
          { categoryId: data.categoryId }
        ]
      }
    });
    if (!assignmentExists) {
      throw new Error("The selected supplier is not authorized/assigned to this Category or Asset Type.");
    }
  }

  const cost = Number(data.purchaseCost || 0);

  // Transaction: Create Asset, images, QR Code, and Dynamic Custom Field Values
  const asset = await prisma.$transaction(async (tx) => {
    const newAsset = await tx.asset.create({
      data: {
        name: data.name,
        assetCode: data.assetCode,
        serialNumber: data.serialNumber,
        description: data.description || null,
        categoryId: data.categoryId,
        departmentId: data.departmentId,
        status: data.assignedToId ? AssetStatus.PENDING_ASSIGNMENT : AssetStatus.ACTIVE,
        purchaseDate: data.purchaseDate || null,
        purchaseCost: new Prisma.Decimal(cost),
        procurementCost: new Prisma.Decimal(cost), // sync for legacy
        expectedLifecycleYears: data.usefulLife || data.expectedLifecycleYears || 5,
        usefulLife: data.usefulLife || null,
        salvageValue: data.salvageValue ? new Prisma.Decimal(data.salvageValue) : null,
        warrantyStartDate: data.warrantyStartDate || null,
        warrantyEndDate: data.warrantyEndDate || null,
        warrantyExpiry: data.warrantyEndDate || data.warrantyExpiry || null,
        supplierId: data.supplierId || null,
        insuranceProvider: data.insuranceProvider || null,
        insurancePolicyNumber: data.insurancePolicyNumber || null,
        insuranceCoverage: data.insuranceCoverage || null,
        insurancePremium: data.insurancePremium || null,
        insuranceExpiry: data.insuranceExpiry || null,

        // Common Fields
        assetTypeId: data.assetTypeId || null,
        building: data.building || null,
        roomNumber: data.roomNumber || null,
        campus: data.campus || null,
        quantity: data.quantity || 1,
        condition: data.condition || null,
        attachmentUrl: data.attachmentUrl || null,
        remarks: data.remarks || null,

        // Financial fields
        fundingSource: data.fundingSource || null
      },
    });

    const urlsToCreate = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : (data.imageUrl ? [data.imageUrl] : []);

    for (const url of urlsToCreate) {
      await tx.assetImage.create({
        data: {
          assetId: newAsset.id,
          url,
        },
      });
    }

    const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await tx.qRCode.create({
      data: {
        assetId: newAsset.id,
        qrCodeString: `${host}/assets/${newAsset.id}`,
        barcodeString: newAsset.assetCode,
      },
    });

    // Save Dynamic Form Builder custom field values
    if (data.dynamicValues) {
      const valueCreates = Object.entries(data.dynamicValues)
        .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
        .map(([fieldId, val]) => ({
          assetId: newAsset.id,
          fieldId,
          value: String(val)
        }));
      if (valueCreates.length > 0) {
        await tx.assetFieldValue.createMany({
          data: valueCreates
        });
      }
    }

    // Auto-create Assignment if custodian selected
    if (data.assignedToId) {
      await tx.assignment.create({
        data: {
          assetId: newAsset.id,
          assignedToUserId: data.assignedToId,
          departmentId: data.departmentId || null,
          assignedByUserId: actorId,
          notes: "Assigned automatically during asset registration",
          status: AssignmentStatus.PENDING_ACCEPTANCE
        }
      });
    }



    return newAsset;
  });

  // Calculate asset financials (depreciation, book value, etc.)
  await prisma.$transaction(async (tx) => {
    await calculateAssetFinancials(tx, asset.id);
  });

  await createAuditLog(actorId, "CREATE", "Asset", asset.id, null, {
    name: asset.name,
    assetCode: asset.assetCode,
    serialNumber: asset.serialNumber,
    departmentId: asset.departmentId,
    purchaseCost: cost
  });

  return await getAssetById(asset.id);
}

export async function updateAsset(id: string, data: {
  name?: string;
  description?: string;
  categoryId?: string;
  departmentId?: string;
  purchaseCost?: number;
  purchaseDate?: Date;
  fundingSource?: FundingSource;
  usefulLife?: number;
  salvageValue?: number;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
}, actorId: string) {
  const previous = await getAssetById(id);
  if (!previous) throw new Error("Asset not found");

  const cost = data.purchaseCost !== undefined ? Number(data.purchaseCost) : Number(previous.purchaseCost || 0);

  // Validations
  if (data.purchaseCost !== undefined && cost <= 0) {
    throw new Error("Purchase Cost must be greater than zero.");
  }
  if (data.salvageValue !== undefined && Number(data.salvageValue) > cost) {
    throw new Error("Salvage Value cannot exceed Purchase Cost.");
  }
  if (data.usefulLife !== undefined && Number(data.usefulLife) <= 0) {
    throw new Error("Useful Life must be greater than zero.");
  }

  const asset = await prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        departmentId: data.departmentId,
        purchaseCost: data.purchaseCost !== undefined ? new Prisma.Decimal(data.purchaseCost) : undefined,
        procurementCost: data.purchaseCost !== undefined ? new Prisma.Decimal(data.purchaseCost) : undefined, // legacy sync
        purchaseDate: data.purchaseDate,
        fundingSource: data.fundingSource,
        usefulLife: data.usefulLife,
        salvageValue: data.salvageValue !== undefined ? new Prisma.Decimal(data.salvageValue) : undefined,
        warrantyStartDate: data.warrantyStartDate,
        warrantyEndDate: data.warrantyEndDate,
        warrantyExpiry: data.warrantyEndDate // legacy sync
      },
    });



    return updated;
  });

  // Calculate asset financials
  await prisma.$transaction(async (tx) => {
    await calculateAssetFinancials(tx, asset.id);
  });

  await createAuditLog(actorId, "UPDATE", "Asset", id, previous, asset);
  return await getAssetById(id);
}

export async function softDeleteAsset(id: string, actorId: string) {
  const previous = await getAssetById(id);
  if (!previous) throw new Error("Asset not found");

  const result = await prisma.$transaction(async (tx) => {
    // 1. Soft delete the asset
    const updated = await tx.asset.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    // 2. Terminate any active/pending assignments
    await tx.assignment.updateMany({
      where: {
        assetId: id,
        status: { in: ["ACTIVE", "ACCEPTED", "PENDING_ACCEPTANCE", "RETURN_REQUESTED"] }
      },
      data: {
        status: "RETURNED"
      }
    });

    // 3. Cancel any pending transfers
    await tx.transfer.updateMany({
      where: {
        assetId: id,
        status: "PENDING"
      },
      data: {
        status: "REJECTED"
      }
    });

    return updated;
  });

  await createAuditLog(actorId, "ASSET_DELETED", "Asset", id, { id: previous.id, name: previous.name, assetCode: previous.assetCode }, { deletedAt: new Date() });
  return result;
}

export async function getAssetById(id: string) {
  return await prisma.asset.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      assetType: true,
      department: { include: { faculty: true } },
      images: true,
      qrCode: true,
      assignments: {
        where: { status: "ACTIVE" },
        include: { assignedTo: true, department: true },
      },
      maintenances: {
        orderBy: { createdAt: "desc" },
        include: { reportedBy: true, assignedTo: true },
      },
      transfers: {
        orderBy: { createdAt: "desc" },
        include: { requestedBy: true, approvedBy: true, fromDepartment: true, toDepartment: true },
      },
      fieldValues: {
        include: {
          field: true
        }
      }
    },
  });
}

export async function getAssetByCode(assetCode: string) {
  return await prisma.asset.findFirst({
    where: { assetCode, deletedAt: null },
    include: {
      category: true,
      assetType: true,
      department: true,
      qrCode: true,
      fieldValues: {
        include: {
          field: true
        }
      }
    },
  });
}

export async function getAssets(filters: {
  search?: string;
  status?: AssetStatus;
  categoryId?: string;
  departmentId?: string;
  unitType?: string;
  officeLocation?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.AssetWhereInput = { deletedAt: null };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }
  if (filters.unitType || filters.officeLocation) {
    const deptWhere: Prisma.OrganizationalUnitWhereInput = {};
    if (filters.unitType) {
      deptWhere.type = filters.unitType;
    }
    if (filters.officeLocation) {
      deptWhere.officeLocation = { contains: filters.officeLocation, mode: "insensitive" };
    }
    where.department = deptWhere;
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { assetCode: { contains: filters.search, mode: "insensitive" } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        category: true,
        department: true,
        qrCode: true,
        assetType: true
      },
    }),
    prisma.asset.count({ where }),
  ]);

  return { assets, total, page, limit, totalPages: Math.ceil(total / limit) };
}
