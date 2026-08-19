"use client";

import React, { useState, useTransition } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { assignAssetAction, requestTransferAction } from "@/app/actions/assignment";
import { returnAssetAction, disposeAssetAction } from "@/app/actions/asset";
import { createMaintenanceAction } from "@/app/actions/maintenance";
import {
  Package,
  QrCode,
  Download,
  Printer,
  ChevronLeft,
  DollarSign
} from "lucide-react";

interface AssignmentRecord {
  id: string;
  assignedAt: Date | string;
  status: string;
  assignedTo?: { name: string } | null;
  department?: { name: string } | null;
}

interface MaintenanceRecord {
  id: string;
  description: string;
  notes?: string | null;
  status: string;
  createdAt: Date | string;
  cost?: unknown;
}

interface TransferRecord {
  id: string;
  status: string;
  notes?: string | null;
  requestedBy: { name: string };
  toDepartment?: { name: string } | null;
  toUser?: { name: string } | null;
}

interface AssetDetails {
  id: string;
  name: string;
  assetCode: string;
  serialNumber: string;
  description?: string | null;
  status: string;
  createdAt: Date | string;
  category: { name: string; code: string };
  department: { name: string; faculty?: { name: string } | null };
  images?: { url: string }[];
  qrCode?: { qrCodeString: string } | null;
  assignments?: AssignmentRecord[];
  maintenances?: MaintenanceRecord[];
  transfers?: TransferRecord[];
  fieldValues?: {
    id: string;
    fieldId: string;
    value: string;
    field: {
      name: string;
      label: string;
      fieldType: string;
    };
  }[];
  
  // New database fields
  purchaseDate?: Date | string | null;
  procurementCost?: unknown;
  expectedLifecycleYears?: number | null;
  salvageValue?: unknown;
  warrantyExpiry?: Date | string | null;
  supplier?: { name: string } | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverage?: unknown;
  insurancePremium?: unknown;
  insuranceExpiry?: Date | string | null;
  // Common details
  assetType?: { name: string } | null;
  building?: string | null;
  roomNumber?: string | null;
  campus?: string | null;
  quantity?: number | null;
  condition?: string | null;
  attachmentUrl?: string | null;
  remarks?: string | null;

  // New financial properties
  purchaseCost?: unknown;
  usefulLife?: number | null;
  annualDepreciation?: unknown;
  monthlyDepreciation?: unknown;
  accumulatedDepreciation?: unknown;
  currentBookValue?: unknown;
  totalMaintenanceCost?: unknown;
  totalAssetInvestment?: unknown;
  fundingSource?: string | null;
  warrantyStartDate?: Date | string | null;
  warrantyEndDate?: Date | string | null;
  currency?: string;
}

interface StaffUserOption {
  id: string;
  name: string;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export function generateBarcodeSvg(value: string) {
  const chars: Record<string, string> = {
    '0': 'N N W W N N N W N',
    '1': 'W N N W N N N N W',
    '2': 'N N W W N N N N W',
    '3': 'W N W W N N N N N',
    '4': 'N N N W W N N N W',
    '5': 'W N N W W N N N N',
    '6': 'N N W W W N N N N',
    '7': 'N N N W N N W N W',
    '8': 'W N N W N N W N N',
    '9': 'N N W W N N W N N',
    'A': 'W N N N N W N N W',
    'B': 'N N W N N W N N W',
    'C': 'W N W N N W N N N',
    'D': 'N N N N W W N N W',
    'E': 'W N N N W W N N N',
    'F': 'N N W N W W N N N',
    'G': 'N N N N N W W N W',
    'H': 'W N N N N W W N N',
    'I': 'N N W N N W W N N',
    'J': 'N N N N W W W N N',
    'K': 'W N N N N N N W W',
    'L': 'N N W N N N N W W',
    'M': 'W N W N N N N W N',
    'N': 'N N N N W N N W W',
    'O': 'W N N N W N N W N',
    'P': 'N N W N W N N W N',
    'Q': 'N N N N N N W W W',
    'R': 'W N N N N N W W N',
    'S': 'N N W N N N W W N',
    'T': 'N N N N W N W W N',
    'U': 'W W N N N N N N W',
    'V': 'N W W N N N N N W',
    'W': 'W W W N N N N N N',
    'X': 'N W N N W N N N W',
    'Y': 'W W N N W N N N N',
    'Z': 'N W W N W N N N N',
    '-': 'N W N N N N W N W',
    '.': 'W W N N N N W N N',
    ' ': 'N W W N N N W N N',
    '*': 'N W N N W N W N N',
    '$': 'N W N W N W N N N',
    '/': 'N W N W N N N W N',
    '+': 'N W N N N W N W N',
    '%': 'N N N W N W N W N'
  };

  const raw = value ? value.toUpperCase() : "TEMP";
  let clean = "";
  for (let i = 0; i < raw.length; i++) {
    if (chars[raw[i]]) clean += raw[i];
  }
  const formatted = `*${clean}*`;

  let result = "";
  for (let i = 0; i < formatted.length; i++) {
    const pattern = chars[formatted[i]];
    if (!pattern) continue;
    const parts = pattern.split(" ");
    for (let j = 0; j < parts.length; j++) {
      const isBar = j % 2 === 0;
      const isWide = parts[j] === "W";
      const width = isWide ? 3 : 1;
      result += isBar ? `B${width}` : `W${width}`;
    }
    result += "W1";
  }

  let currentX = 0;
  const rects: string[] = [];
  const height = 40;

  for (let i = 0; i < result.length; i += 2) {
    const type = result[i];
    const width = parseInt(result[i + 1]);
    if (type === "B") {
      rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="black" />`);
    }
    currentX += width;
  }

  return `<svg width="100%" height="45" viewBox="0 0 ${currentX} ${height}" preserveAspectRatio="none">${rects.join("")}</svg>`;
}

interface AssetDetailsClientProps {
  asset: AssetDetails;
  session: { user?: { role?: string; id?: string } } | null;
  departments: DepartmentOption[];
  staffUsers: StaffUserOption[];
  enabledFields?: string[];
}

export function AssetDetailsClient({ asset, session, departments, staffUsers, enabledFields }: AssetDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "assignments" | "maintenance" | "transfers">("overview");

  const handlePrintLabel = () => {
    const printContent = document.getElementById("print-label-box")?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>DBU Asset Tag Label</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 105vh;
                background-color: #f8fafc;
                margin: 0;
                padding: 20px;
              }
              .label-card {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
                width: 280px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .header {
                font-size: 9px;
                font-weight: 800;
                color: #0b4a6e;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin: 0 0 2px 0;
              }
              .subheader {
                font-size: 7px;
                font-weight: 700;
                color: #b45309;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin: 0 0 12px 0;
              }
              .image-slot {
                width: 105%;
                height: 130px;
                object-fit: cover;
                border-radius: 10px;
                border: 1px solid #f1f5f9;
                margin-bottom: 12px;
                background-color: #f8fafc;
              }
              .asset-name {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 2px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
              }
              .asset-code {
                font-size: 12px;
                font-weight: 750;
                font-family: monospace;
                color: #0284c7;
                margin: 0 0 4px 0;
              }
              .asset-type {
                font-size: 8px;
                font-weight: 800;
                color: #475569;
                background-color: #f1f5f9;
                padding: 3px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                margin-bottom: 12px;
                display: inline-block;
              }
              .qr-image {
                width: 110px;
                height: 110px;
                object-fit: contain;
                margin-bottom: 12px;
              }
              .barcode-slot {
                width: 100%;
                border-top: 1px solid #f1f5f9;
                padding-top: 12px;
                margin-top: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .barcode-slot svg {
                width: 100%;
                height: 40px;
              }
              .barcode-text {
                font-size: 9px;
                font-family: monospace;
                font-weight: 700;
                color: #64748b;
                margin-top: 4px;
                margin-bottom: 0;
              }
              .footer {
                font-size: 7px;
                font-weight: 700;
                color: #94a3b8;
                letter-spacing: 1px;
                text-transform: uppercase;
                border-top: 1px dashed #e2e8f0;
                padding-top: 10px;
                margin-top: 12px;
                width: 100%;
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="label-card">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const parseDescription = () => {
    try {
      if (asset.description && asset.description.startsWith("{")) {
        const parsed = JSON.parse(asset.description);
        return {
          text: parsed.text || "",
          specs: (parsed.specs || {}) as Record<string, string>,
          isJson: true,
        };
      }
    } catch {
      // ignore
    }
    return {
      text: asset.description || "",
      specs: {} as Record<string, string>,
      isJson: false,
    };
  };

  const parsedDesc = parseDescription();

  // Client-side Straight-line Depreciation calculator
  const depr = (() => {
    const cost = asset.procurementCost ? Number(asset.procurementCost) : 0;
    const salvage = asset.salvageValue ? Number(asset.salvageValue) : 0;
    const lifecycle = asset.expectedLifecycleYears || 5;
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;

    if (cost === 0 || !purchaseDate) {
      return { currentValue: cost, totalDepreciation: 0, progressPercent: 0 };
    }

    const now = new Date();
    const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    const yearsAge = Math.max(0, monthsDiff / 12);
    const annualDepreciation = Math.max(0, (cost - salvage) / lifecycle);
    const totalDepr = Math.min(cost - salvage, annualDepreciation * yearsAge);
    const currentVal = Math.max(salvage, cost - totalDepr);
    const progressPercent = Math.min(100, Math.round((yearsAge / lifecycle) * 100));

    return {
      currentValue: Number(currentVal.toFixed(2)),
      totalDepreciation: Number(totalDepr.toFixed(2)),
      progressPercent
    };
  })();

  // Client-side replacement score logic
  const replacementScore = (() => {
    const cost = asset.procurementCost ? Number(asset.procurementCost) : 0;
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
    const lifecycle = asset.expectedLifecycleYears || 5;

    let ageScore = 0;
    let deprScore = 0;
    let repairScore = 0;
    let conditionScore = 0;

    if (purchaseDate) {
      const yearsAge = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const ageRatio = Math.min(1.5, yearsAge / lifecycle);
      ageScore = ageRatio * 30;
    }

    if (cost > 0 && purchaseDate) {
      deprScore = (depr.totalDepreciation / cost) * 20;
    }

    const totalRepairCost = asset.maintenances ? asset.maintenances.reduce((acc, curr) => acc + (curr.cost ? Number(curr.cost) : 0), 0) : 0;
    if (cost > 0 && totalRepairCost > 0) {
      repairScore = Math.min(1.0, totalRepairCost / cost) * 25;
    }

    if (asset.status === "UNDER_MAINTENANCE") {
      conditionScore = 20;
    } else if (asset.status === "DISPOSED") {
      conditionScore = 25;
    }

    const totalScore = Math.min(100, Math.round(ageScore + deprScore + repairScore + conditionScore));
    let recommendation = "KEEP";
    if (totalScore >= 75) recommendation = "REPLACE";
    else if (totalScore >= 45) recommendation = "MONITOR";

    return { score: totalScore, recommendation };
  })();

  // QR Code Image Download
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (asset?.qrCode?.qrCodeString) {
      QRCode.toDataURL(asset.qrCode.qrCodeString, { width: 200, margin: 1 })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(null));
    }
  }, [asset]);

  // Form errors / states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [assigneeId, setAssigneeId] = useState("");
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignType, setAssignType] = useState<"user" | "department">("user");
  const [assignNotes, setAssignNotes] = useState("");

  const [transferUserId, setTransferUserId] = useState("");
  const [transferDeptId, setTransferDeptId] = useState("");
  const [transferType, setTransferType] = useState<"user" | "department">("user");
  const [transferNotes, setTransferNotes] = useState("");

  const [returnCondition, setReturnCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [returnNotes, setReturnNotes] = useState("");

  const [maintDescription, setMaintDescription] = useState("");
  const [maintPriority, setMaintPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  const [disposeReason, setDisposeReason] = useState("");
  const [disposeMethod, setDisposeMethod] = useState("");
  const [disposeNotes, setDisposeNotes] = useState("");

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    startTransition(async () => {
      const res = await assignAssetAction(null, {
        assetId: asset.id,
        assignedToId: (assignType === "user" && assigneeId) ? assigneeId : undefined,
        departmentId: (assignType === "department" && assignDeptId) ? assignDeptId : undefined,
        notes: assignNotes,
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Asset assigned successfully!");
        setAssigneeId("");
        setAssignDeptId("");
        setAssignNotes("");
        router.refresh();
      }
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    startTransition(async () => {
      const res = await requestTransferAction(null, {
        assetId: asset.id,
        toUserId: transferType === "user" ? transferUserId : undefined,
        toDepartmentId: transferType === "department" ? transferDeptId : undefined,
        notes: transferNotes,
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Transfer request submitted!");
        setTransferUserId("");
        setTransferDeptId("");
        setTransferNotes("");
        router.refresh();
      }
    });
  };

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    startTransition(async () => {
      const res = await returnAssetAction(null, {
        assetId: asset.id,
        conditionAtReturn: returnCondition,
        notes: returnNotes,
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Asset return registered successfully!");
        setReturnNotes("");
        router.refresh();
      }
    });
  };

  const handleMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    startTransition(async () => {
      const res = await createMaintenanceAction(null, {
        assetId: asset.id,
        description: maintDescription,
        priority: maintPriority,
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Maintenance request filed!");
        setMaintDescription("");
        router.refresh();
      }
    });
  };

  const handleDispose = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!confirm("Are you sure you want to dispose of this asset? This action is permanent.")) return;
    startTransition(async () => {
      const res = await disposeAssetAction(null, {
        assetId: asset.id,
        reason: disposeReason,
        method: disposeMethod,
        notes: disposeNotes,
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Asset disposed!");
        setDisposeReason("");
        setDisposeMethod("");
        setDisposeNotes("");
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "ASSIGNED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_MAINTENANCE":
        return "bg-orange-50 text-orange-700 border-orange-200 animate-pulse";
      case "DISPOSED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const userRole = session?.user?.role;
  const isPao = userRole === "PROPERTY_ADMINISTRATION_OFFICER";
  const isHead = userRole === "DEPARTMENT_HEAD";
  const isStaff = userRole === "STAFF_MEMBER";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-[#0b4a6e] transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadge(asset.status)}`}>
          {asset.status.replace(/_/g, " ")}
        </span>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700">{success}</div>}

      {/* Main Grid: Left specifications, Right Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Specifications & ID Tag */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
            {/* Image display */}
            <div className="w-full h-40 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative mb-4">
              {asset.images && asset.images.length > 0 ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={asset.images[0].url} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Package size={48} />
                  <span className="text-[10px] font-semibold mt-1">No Image Available</span>
                </div>
              )}
            </div>

            <div className="text-center w-full">
              <h3 className="text-sm font-bold text-slate-800">{asset.name}</h3>
              <p className="text-xs text-sky-700 font-mono mt-1">{asset.assetCode}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">SN: {asset.serialNumber}</p>
            </div>

            {/* Specifications list */}
            <div className="w-full mt-5 border-t border-slate-100 pt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Category:</span>
                <span className="text-slate-700 font-semibold">{asset.category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Department:</span>
                <span className="text-slate-700 font-semibold">{asset.department.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Faculty/Scope:</span>
                <span className="text-slate-700 font-semibold">{asset.department.faculty?.name || "Administrative / General Pool"}</span>
              </div>
              {/* Dynamic Form Field values */}
              {asset.fieldValues && asset.fieldValues.length > 0 && asset.fieldValues
                .filter((fv) => !enabledFields || enabledFields.includes(fv.field.name))
                .map((fv) => (
                  <div key={fv.id} className="flex justify-between">
                    <span className="text-slate-400 font-medium">{fv.field.label}:</span>
                    <span className="text-slate-700 font-semibold">{fv.value}</span>
                  </div>
                ))}
              {asset.assetType && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Asset Type:</span>
                  <span className="text-slate-700 font-semibold">{asset.assetType.name}</span>
                </div>
              )}
              {asset.campus && (!enabledFields || enabledFields.includes("campus")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Campus:</span>
                  <span className="text-slate-700 font-semibold">{asset.campus}</span>
                </div>
              )}
              {asset.building && (!enabledFields || enabledFields.includes("building")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Building Name / Block:</span>
                  <span className="text-slate-700 font-semibold">{asset.building}</span>
                </div>
              )}
              {asset.roomNumber && (!enabledFields || enabledFields.includes("roomNumber")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Room / Office Number:</span>
                  <span className="text-slate-700 font-semibold">{asset.roomNumber}</span>
                </div>
              )}
              {asset.quantity && (!enabledFields || enabledFields.includes("quantity")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Quantity Count:</span>
                  <span className="text-slate-700 font-semibold">{asset.quantity}</span>
                </div>
              )}
              {asset.condition && (!enabledFields || enabledFields.includes("condition")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Condition Status:</span>
                  <span className="text-slate-700 font-semibold uppercase">{asset.condition}</span>
                </div>
              )}
              {asset.attachmentUrl && (!enabledFields || enabledFields.includes("attachmentUrl")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Doc Attachment:</span>
                  <a href={asset.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sky-750 font-bold hover:underline">View Document</a>
                </div>
              )}
              {asset.remarks && (!enabledFields || enabledFields.includes("remarks")) && (
                <div className="flex flex-col border-t border-slate-100/50 pt-2">
                  <span className="text-slate-400 font-medium">Remarks Notes:</span>
                  <p className="text-slate-600 italic mt-0.5">{asset.remarks}</p>
                </div>
              )}

              {asset.supplier && (!enabledFields || enabledFields.includes("supplier")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Supplier Vendor:</span>
                  <span className="text-slate-700 font-semibold">{asset.supplier.name}</span>
                </div>
              )}
              {asset.warrantyExpiry && (!enabledFields || enabledFields.includes("warrantyEndDate")) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Warranty Expiry:</span>
                  <span className="text-slate-700 font-semibold">{new Date(asset.warrantyExpiry).toLocaleDateString()}</span>
                </div>
              )}
              {asset.assignments && asset.assignments.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-medium">Assigned To:</span>
                  <div className="text-right">
                    <span className="text-slate-700 font-semibold block">
                      {asset.assignments[0].assignedTo?.name || "Department Allocation"}
                    </span>
                    {asset.assignments[0].department && (
                      <span className="text-[10px] text-slate-400 block">{asset.assignments[0].department.name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code + Barcode label print box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-4">Printable ID Label</h4>
            
            <div id="print-label-box" className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col items-center space-y-3 w-64 shadow-sm">
              <div className="text-center">
                <h5 className="text-[10px] font-extrabold text-[#0b4a6e] uppercase tracking-wider leading-none m-0">Debre Berhan University</h5>
                <p className="text-[6px] text-amber-700 font-bold uppercase tracking-widest mt-1 mb-0">DBU ASSET LABEL</p>
              </div>

              {/* Image display in Label */}
              <div className="w-full h-32 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center relative">
                {asset.images && asset.images.length > 0 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={asset.images[0].url} alt="Asset Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-350 flex flex-col items-center">
                    <Package size={32} />
                    <span className="text-[9px] mt-1 font-semibold">No Photo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Basic details */}
              <div className="text-center w-full space-y-0.5">
                <p className="text-xs font-bold text-slate-800 truncate m-0">{asset.name}</p>
                <p className="text-[10px] text-sky-750 font-mono font-bold leading-none my-1">{asset.assetCode}</p>
                <span className="inline-block bg-slate-100 text-slate-650 text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase mt-0.5">
                  {asset.category.name} {asset.assetType ? `→ ${asset.assetType.name}` : ""}
                </span>
              </div>

              {/* QR Code */}
              <div className="w-24 h-24 border border-slate-150 bg-white rounded-lg flex items-center justify-center">
                {qrCodeUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qrCodeUrl} alt="Asset Tag QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-350">
                    <QrCode size={36} />
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div className="w-full flex flex-col items-center space-y-1 pt-1 border-t border-slate-100">
                <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(asset.assetCode) }} />
                <p className="text-[8px] font-mono font-bold text-slate-500 m-0">{asset.assetCode}</p>
              </div>

              <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full m-0">Property Administration</p>
            </div>

            <div className="flex space-x-2 w-full mt-4">
              <button
                onClick={handlePrintLabel}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-605 bg-white hover:bg-slate-50 transition-colors"
              >
                <Printer size={12} />
                <span>Print Label</span>
              </button>
              {qrCodeUrl && (
                <a
                  href={qrCodeUrl}
                  download={`label-${asset.assetCode}.png`}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-605 hover:bg-slate-100 transition-colors"
                >
                  <Download size={12} />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Tab Panels & Scoped Role Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Navigation header */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 text-xs font-bold text-slate-400">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-3 hover:text-sky-700 transition-colors border-b-2 ${
                  activeTab === "overview" ? "border-sky-700 text-sky-900" : "border-transparent"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("assignments")}
                className={`flex-1 py-3 hover:text-sky-700 transition-colors border-b-2 ${
                  activeTab === "assignments" ? "border-sky-700 text-sky-900" : "border-transparent"
                }`}
              >
                Assignments
              </button>
              <button
                onClick={() => setActiveTab("maintenance")}
                className={`flex-1 py-3 hover:text-sky-700 transition-colors border-b-2 ${
                  activeTab === "maintenance" ? "border-sky-700 text-sky-900" : "border-transparent"
                }`}
              >
                Maintenance
              </button>
              <button
                onClick={() => setActiveTab("transfers")}
                className={`flex-1 py-3 hover:text-sky-700 transition-colors border-b-2 ${
                  activeTab === "transfers" ? "border-sky-700 text-sky-900" : "border-transparent"
                }`}
              >
                Transfers
              </button>
            </div>

            {/* Tab content */}
            <div className="p-5 min-h-[220px]">
              
              {/* Tab: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase">Asset Specifications</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                    {parsedDesc.text || "No specifications description provided for this asset."}
                  </p>

                  {parsedDesc.isJson && Object.keys(parsedDesc.specs).length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Category Specifications</h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {Object.entries(parsedDesc.specs).map(([key, val]) => (
                          val && (
                            <div key={key} className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                              <span className="text-slate-400 block font-bold text-[9px] uppercase">{key}</span>
                              <span className="text-slate-800 font-semibold">{val}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial & Depreciation Panel */}
                  {session?.user?.role !== "STAFF_MEMBER" && (!!asset.purchaseCost || !!asset.procurementCost) && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                      <h5 className="text-[10px] font-black text-sky-850 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center">
                        <DollarSign size={12} className="mr-1 text-sky-700" /> Asset Financial Ledger Summary
                      </h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Purchase Cost</span>
                          <span className="text-slate-800 font-extrabold">{Number(asset.purchaseCost || asset.procurementCost || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Current Book Value</span>
                          <span className="text-emerald-700 font-black">{Number(asset.currentBookValue || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Annual Depreciation</span>
                          <span className="text-slate-700 font-bold">{Number(asset.annualDepreciation || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Monthly Depreciation</span>
                          <span className="text-slate-700 font-bold">{Number(asset.monthlyDepreciation || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Accumulated Depreciation</span>
                          <span className="text-violet-700 font-bold">{Number(asset.accumulatedDepreciation || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Useful Life (Years)</span>
                          <span className="text-slate-700 font-bold">{asset.usefulLife || asset.expectedLifecycleYears || 5} Years</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Salvage Value</span>
                          <span className="text-slate-700 font-bold">{Number(asset.salvageValue || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Funding Source</span>
                          <span className="inline-block bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-0.5">
                            {asset.fundingSource ? asset.fundingSource.replace("_", " ") : "UNSPECIFIED"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Total Maintenance Cost</span>
                          <span className="text-amber-700 font-bold">{Number(asset.totalMaintenanceCost || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Total Asset Investment</span>
                          <span className="text-slate-800 font-extrabold">{Number(asset.totalAssetInvestment || 0).toLocaleString()} {asset.currency || "ETB"}</span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-200/50">
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Warranty Status</span>
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span>Start: {asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toLocaleDateString() : "-"}</span>
                            <span>End: {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : "-"}</span>
                            <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] tracking-wider ${
                              asset.warrantyEndDate && new Date(asset.warrantyEndDate) > new Date()
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {asset.warrantyEndDate && new Date(asset.warrantyEndDate) > new Date() ? "Active" : "Expired"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replacement score Planning Panel */}
                  {!!asset.procurementCost && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lifecycle Replacement Planning</h5>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-slate-500 font-semibold block">Replacement Priority Score</span>
                          <span className="text-[10px] text-slate-400">Calculated based on age, condition, and maintenance costs</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded text-xs font-black border ${
                            replacementScore.recommendation === "REPLACE" ? "bg-red-50 text-red-700 border-red-200" :
                            replacementScore.recommendation === "MONITOR" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-green-50 text-green-700 border-green-200"
                          }`}>
                            {replacementScore.score}/100 ({replacementScore.recommendation})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insurance Policy Panel */}
                  {!!asset.insuranceProvider && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Insurance Policy Details</h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Insurance Provider</span>
                          <span className="text-slate-700 font-bold">{asset.insuranceProvider}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Policy Number</span>
                          <span className="text-slate-700 font-mono font-bold">{asset.insurancePolicyNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Coverage Amount</span>
                          <span className="text-slate-700 font-bold">${Number(asset.insuranceCoverage)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Premium</span>
                          <span className="text-slate-700 font-bold">${Number(asset.insurancePremium)}</span>
                        </div>
                        {asset.insuranceExpiry && (
                          <div className="col-span-2">
                            <span className="text-slate-400 block font-semibold mb-0.5">Policy Expiration Date</span>
                            <span className={`font-bold ${new Date(asset.insuranceExpiry) < new Date() ? "text-red-600" : "text-slate-700"}`}>
                              {new Date(asset.insuranceExpiry).toLocaleDateString()}
                              {new Date(asset.insuranceExpiry) < new Date() && " (Expired)"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block font-semibold mb-0.5">Asset Registration Date</span>
                      <span className="text-slate-700 font-bold">{new Date(asset.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block font-semibold mb-0.5">Category Code</span>
                      <span className="text-slate-700 font-bold">{asset.category.code}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: ASSIGNMENTS */}
              {activeTab === "assignments" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-2">Assignment logs</h4>
                  {asset.assignments && asset.assignments.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold py-4">No assignments recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {asset.assignments?.map((assignment) => (
                        <div key={assignment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800">
                              {assignment.assignedTo?.name || "Department Allocation"}
                            </span>
                            {assignment.department && <span className="text-[10px] text-slate-400 block">{assignment.department.name}</span>}
                            <span className="text-[9px] text-slate-400 block mt-1">Assigned on: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            assignment.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {assignment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: MAINTENANCE */}
              {activeTab === "maintenance" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-2">Maintenance History</h4>
                  {asset.maintenances && asset.maintenances.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold py-4">No maintenance tasks logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {asset.maintenances?.map((maint) => (
                        <div key={maint.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              maint.status === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                            }`}>
                              {maint.status}
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(maint.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 italic">&quot;{maint.description}&quot;</p>
                          {maint.notes && <p className="text-[10px] text-slate-500 font-semibold">Diagnosis: {maint.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: TRANSFERS */}
              {activeTab === "transfers" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-2">Transfer requests</h4>
                  {asset.transfers && asset.transfers.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold py-4">No transfers logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {asset.transfers?.map((t) => (
                        <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-slate-500">Destination: </span>
                            <span className="font-bold text-slate-800">{t.toDepartment?.name || t.toUser?.name}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Requested by {t.requestedBy.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            t.status === "APPROVED" ? "bg-green-50 text-green-700" :
                            t.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Action Cards depending on Logged-in User Roles */}
          {session?.user && asset.status !== "DISPOSED" && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Management Operations</h4>
              
              {/* PROPERTY ADMIN OFFICER Forms */}
              {isPao && (
                <div className="space-y-5">
                  {/* Assign form */}
                  {asset.status === "ACTIVE" && (
                    <form onSubmit={handleAssign} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h5 className="text-[11px] font-extrabold text-[#0b4a6e] uppercase">Assign Asset</h5>
                      
                      <div className="flex space-x-4 mb-2">
                        <label className="flex items-center text-xs font-semibold text-slate-600">
                          <input type="radio" className="mr-1 text-[#0b4a6e]" checked={assignType === "user"} onChange={() => setAssignType("user")} />
                          Staff User
                        </label>
                        <label className="flex items-center text-xs font-semibold text-slate-600">
                          <input type="radio" className="mr-1 text-[#0b4a6e]" checked={assignType === "department"} onChange={() => setAssignType("department")} />
                          Department
                        </label>
                      </div>

                      {assignType === "user" ? (
                        <select required className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                          <option value="">-- Select User --</option>
                          {staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <select required className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)}>
                          <option value="">-- Select Department --</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      )}
                      
                      <textarea placeholder="Notes..." className="w-full p-2 border border-slate-200 rounded text-xs h-12" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
                      <button type="submit" disabled={isPending} className="w-full py-1.5 bg-[#0b4a6e] text-white rounded font-bold text-xs">Assign</button>
                    </form>
                  )}

                  {/* Return form */}
                  {asset.status === "ASSIGNED" && (
                    <form onSubmit={handleReturn} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h5 className="text-[11px] font-extrabold text-[#0b4a6e] uppercase">Register Return</h5>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value as "GOOD" | "DAMAGED")}>
                        <option value="GOOD">Returned in Good Condition</option>
                        <option value="DAMAGED">Returned in Damaged Condition (Flag repair)</option>
                      </select>
                      <textarea placeholder="Return notes..." className="w-full p-2 border border-slate-200 rounded text-xs h-12" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
                      <button type="submit" disabled={isPending} className="w-full py-1.5 bg-blue-600 text-white rounded font-bold text-xs">Complete Return</button>
                    </form>
                  )}

                  {/* Disposal form */}
                  <form onSubmit={handleDispose} className="space-y-3 p-4 bg-red-50/30 rounded-xl border border-red-100">
                    <h5 className="text-[11px] font-extrabold text-red-800 uppercase">Dispose Asset</h5>
                    <input type="text" required placeholder="Reason for disposal..." className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={disposeReason} onChange={(e) => setDisposeReason(e.target.value)} />
                    <input type="text" required placeholder="Disposal Method (e.g. scrap, sell)..." className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={disposeMethod} onChange={(e) => setDisposeMethod(e.target.value)} />
                    <button type="submit" disabled={isPending} className="w-full py-1.5 bg-red-600 text-white rounded font-bold text-xs">Dispose Asset</button>
                  </form>
                </div>
              )}

              {/* DEPARTMENT HEAD Form */}
              {isHead && (
                <form onSubmit={handleTransfer} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h5 className="text-[11px] font-extrabold text-green-800 uppercase">Request Asset Transfer</h5>
                  
                  <div className="flex space-x-4 mb-2">
                    <label className="flex items-center text-xs font-semibold text-slate-600">
                      <input type="radio" className="mr-1 text-green-700" checked={transferType === "user"} onChange={() => setTransferType("user")} />
                      Staff User
                    </label>
                    <label className="flex items-center text-xs font-semibold text-slate-600">
                      <input type="radio" className="mr-1 text-green-700" checked={transferType === "department"} onChange={() => setTransferType("department")} />
                      Department
                    </label>
                  </div>

                  {transferType === "user" ? (
                    <select required className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={transferUserId} onChange={(e) => setTransferUserId(e.target.value)}>
                      <option value="">-- Select Recipient User --</option>
                      {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select required className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={transferDeptId} onChange={(e) => setTransferDeptId(e.target.value)}>
                      <option value="">-- Select Recipient Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}

                  <textarea required placeholder="Transfer justification..." className="w-full p-2 border border-slate-200 rounded text-xs h-12" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} />
                  <button type="submit" disabled={isPending} className="w-full py-1.5 bg-green-700 text-white rounded font-bold text-xs">Request Transfer</button>
                </form>
              )}

              {/* STAFF MEMBER Form */}
              {isStaff && (
                <form onSubmit={handleMaintenance} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h5 className="text-[11px] font-extrabold text-purple-800 uppercase">Report Damage / Request Maintenance</h5>
                  <textarea required placeholder="Describe what is broken or malfunctioning..." className="w-full p-2 border border-slate-200 rounded text-xs h-16" value={maintDescription} onChange={(e) => setMaintDescription(e.target.value)} />
                  
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs" value={maintPriority} onChange={(e) => setMaintPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}>
                    <option value="LOW">Low priority</option>
                    <option value="MEDIUM">Medium priority</option>
                    <option value="HIGH">High priority</option>
                  </select>
                  
                  <button type="submit" disabled={isPending} className="w-full py-1.5 bg-purple-700 text-white rounded font-bold text-xs">Submit Maintenance Request</button>
                </form>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Print Overrides CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-label-box, #print-label-box * {
            visibility: visible;
          }
          #print-label-box {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.5);
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
