"use client";

import React, { useState, useTransition } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { assignAssetAction, requestTransferAction, acceptAssignmentAction, rejectAssignmentAction } from "@/app/actions/assignment";
import { returnAssetAction, disposeAssetAction } from "@/app/actions/asset";
import { createMaintenanceAction } from "@/app/actions/maintenance";
import {
  Package,
  QrCode,
  Barcode as BarcodeIcon,
  Download,
  Printer,
  ChevronLeft,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Info,
  Building,
  Edit3,
  Loader2
} from "lucide-react";
import { isBuildingAsset } from "@/lib/barcode";
import { BarcodeView } from "@/components/barcode-view";
import { printBarcodeSticker, printQrLabel, printFullAssetLabel } from "@/lib/print-label";
import { updateAssetAction } from "@/app/actions/asset";

interface AssignmentRecord {
  id: string;
  assignedAt: Date | string;
  status: string;
  assignedToUserId?: string | null;
  assignedTo?: { name: string } | null;
  department?: { name: string } | null;
  assignedBy?: { name: string } | null;
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
  publicId?: string | null;
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
  identificationMethod?: "QR" | "BARCODE" | "NONE" | null;
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

export { generateCode128Svg as generateBarcodeSvg } from "@/lib/barcode";

export interface AssetLiveFinancials {
  cost: number;
  salvageValue: number;
  depreciableBase: number;
  usefulLifeYears: number;
  usefulLifeMonths: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  elapsedMonths: number;
  clampedMonths: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationProgressPercent: number;
  depreciationStatus: string;
  statusLabel: string;
  totalMaintenanceCost: number;
  totalAssetInvestment: number;
  isFullyDepreciated: boolean;
  isFinanciallyValued: boolean;
}

interface AssetDetailsClientProps {
  asset: AssetDetails;
  session: { user?: { role?: string; id?: string } } | null;
  departments: DepartmentOption[];
  staffUsers: StaffUserOption[];
  enabledFields?: string[];
  liveFinancials?: AssetLiveFinancials;
}

export function AssetDetailsClient({ asset, session, departments, staffUsers, enabledFields, liveFinancials }: AssetDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"overview" | "assignments" | "maintenance" | "transfers">("overview");

  const isBuilding = isBuildingAsset(asset.category, asset.assetType);
  const [currentMethod, setCurrentMethod] = useState<"QR" | "BARCODE" | "NONE">(
    isBuilding ? "NONE" : (asset.identificationMethod || (asset.qrCode ? "QR" : "NONE"))
  );
  const [isEditingMethod, setIsEditingMethod] = useState(false);
  const [selectedMethodToSave, setSelectedMethodToSave] = useState<"QR" | "BARCODE" | "NONE">(
    isBuilding ? "NONE" : (asset.identificationMethod || (asset.qrCode ? "QR" : "NONE"))
  );
  const [methodSaveLoading, setMethodSaveLoading] = useState(false);


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

  // Live single-source-of-truth financials resolution
  const fin: AssetLiveFinancials = liveFinancials || (() => {
    const rawCost = asset.purchaseCost !== undefined && asset.purchaseCost !== null ? Number(asset.purchaseCost) : Number(asset.procurementCost || 0);
    const cost = isNaN(rawCost) ? 0 : Math.max(0, rawCost);
    const rawSalvage = Number(asset.salvageValue || 0);
    const salvageValue = Math.min(cost, isNaN(rawSalvage) ? 0 : Math.max(0, rawSalvage));
    const depreciableBase = Math.max(0, cost - salvageValue);
    const usefulLifeYears = Number(asset.usefulLife || asset.expectedLifecycleYears || 5);
    const usefulLifeMonths = Math.max(1, Math.round(usefulLifeYears * 12));
    const rawBook = asset.currentBookValue !== null && asset.currentBookValue !== undefined && !isNaN(Number(asset.currentBookValue))
      ? Number(asset.currentBookValue)
      : cost;
    const currentBookValue = Math.max(salvageValue, Math.min(cost, rawBook));
    const rawAccum = asset.accumulatedDepreciation !== null && asset.accumulatedDepreciation !== undefined && !isNaN(Number(asset.accumulatedDepreciation))
      ? Number(asset.accumulatedDepreciation)
      : Math.max(0, cost - currentBookValue);
    const accumulatedDepreciation = Math.min(depreciableBase, Math.max(0, rawAccum));
    const totalMaint = asset.maintenances ? asset.maintenances.reduce((acc, curr) => acc + (curr.cost ? Number(curr.cost) : 0), 0) : 0;
    return {
      cost,
      salvageValue,
      depreciableBase,
      usefulLifeYears,
      usefulLifeMonths,
      annualDepreciation: Number(asset.annualDepreciation || 0),
      monthlyDepreciation: Number(asset.monthlyDepreciation || 0),
      elapsedMonths: 0,
      clampedMonths: 0,
      accumulatedDepreciation,
      currentBookValue,
      depreciationProgressPercent: 0,
      depreciationStatus: "DEPRECIATING",
      statusLabel: "Depreciating",
      totalMaintenanceCost: totalMaint,
      totalAssetInvestment: cost + totalMaint,
      isFullyDepreciated: false,
      isFinanciallyValued: cost > 0,
    };
  })();
  // Replacement score logic using verified metrics
  const replacementScore = (() => {
    const cost = fin.cost;
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
    const lifecycle = fin.usefulLifeYears;

    let ageScore = 0;
    let deprScore = 0;
    let repairScore = 0;
    let conditionScore = 0;

    if (purchaseDate && !isNaN(purchaseDate.getTime())) {
      const yearsAge = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const ageRatio = lifecycle > 0 ? Math.min(1.5, Math.max(0, yearsAge) / lifecycle) : 0;
      ageScore = ageRatio * 30;
    }

    if (cost > 0) {
      deprScore = (fin.accumulatedDepreciation / cost) * 20;
    }

    const totalRepairCost = fin.totalMaintenanceCost;
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

  // Public QR Verification URL
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const verificationUrl = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (asset?.publicId) {
        return `${origin}/asset/verify/${asset.publicId}`;
      }
      if (asset?.qrCode?.qrCodeString?.includes("/asset/verify/")) {
        return asset.qrCode.qrCodeString;
      }
      return `${origin}/asset/verify/${asset?.assetCode || asset?.id}`;
    }
    return asset?.qrCode?.qrCodeString || "";
  }, [asset]);

  React.useEffect(() => {
    const stringToEncode = verificationUrl || asset?.qrCode?.qrCodeString || asset?.assetCode;
    if (stringToEncode) {
      QRCode.toDataURL(stringToEncode, { width: 250, margin: 1 })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(null));
    }
  }, [verificationUrl, asset]);

  const handleCopyUrl = async () => {
    if (!verificationUrl) return;
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
      setCopiedUrl(false);
    }
  };

  // Form errors / states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveIdentificationMethod = async () => {
    if (isBuilding && selectedMethodToSave !== "NONE") {
      setError("QR/barcode identification is not applicable to buildings. Building identification is managed using the building information.");
      return;
    }
    setMethodSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateAssetAction(null, asset.id, {
        identificationMethod: selectedMethodToSave,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setCurrentMethod(selectedMethodToSave);
        setIsEditingMethod(false);
        setSuccess("Identification method updated successfully.");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update identification method.";
      setError(msg);
    } finally {
      setMethodSaveLoading(false);
    }
  };

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
  // Acceptance & Rejection workflow states
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonVal, setRejectReasonVal] = useState("");
  const [targetAssignmentId, setTargetAssignmentId] = useState("");

  const handleAcceptAssignmentClick = (assignmentId: string) => {
    setTargetAssignmentId(assignmentId);
    setShowAcceptModal(true);
  };

  const handleAcceptAssignmentConfirm = () => {
    clearMessages();
    setShowAcceptModal(false);
    startTransition(async () => {
      const res = await acceptAssignmentAction(null, targetAssignmentId);
      if (res.error) setError(res.error);
      else {
        setSuccess("Asset assignment accepted successfully!");
        router.refresh();
      }
    });
  };

  const handleRejectAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!rejectReasonVal.trim()) {
      setError("Please specify a reason for rejecting or returning this asset.");
      return;
    }
    startTransition(async () => {
      const res = await rejectAssignmentAction(null, {
        assignmentId: targetAssignmentId,
        reason: rejectReasonVal
      });
      if (res.error) setError(res.error);
      else {
        setSuccess("Return / Reject request submitted successfully.");
        setShowRejectModal(false);
        setRejectReasonVal("");
        setTargetAssignmentId("");
        router.refresh();
      }
    });
  };

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
  const isAdmin = userRole === "SYSTEM_ADMINISTRATOR";
  const canEditIdentification = isPao || isAdmin;

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
              )}              {/* Accept & Reject Workflow Panel for Assignee */}
              {(() => {
                const userPendingAssignment = asset.assignments?.find(
                  (a) => a.assignedToUserId === session?.user?.id && a.status === "PENDING_ACCEPTANCE"
                );
                if (!userPendingAssignment) return null;
                return (
                  <div className="mt-5 border-t border-amber-200 pt-4 space-y-3 bg-amber-50/40 -mx-5 -mb-5 p-5 rounded-b-2xl">
                    <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">
                      ⚠️ Action Required: Pending Acceptance
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                      This asset has been assigned to you by <strong className="text-slate-700">{userPendingAssignment.assignedBy?.name || "the Property Officer"}</strong>. Please accept responsibility or return/reject it.
                    </p>
                    <div className="flex gap-2.5 w-full mt-3">
                      <button
                        type="button"
                        onClick={() => handleAcceptAssignmentClick(userPendingAssignment.id)}
                        disabled={isPending}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Accept Asset
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetAssignmentId(userPendingAssignment.id);
                          setRejectReasonVal("");
                          setShowRejectModal(true);
                        }}
                        disabled={isPending}
                        className="flex-1 py-2 bg-red-650 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Return / Reject Asset
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Asset Identification & Label Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            {/* Header with current identification method badge and edit toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {currentMethod === "QR" ? (
                  <QrCode size={18} className="text-sky-700" />
                ) : currentMethod === "BARCODE" ? (
                  <BarcodeIcon size={18} className="text-indigo-700" />
                ) : (
                  <Building size={18} className="text-amber-700" />
                )}
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 m-0">
                  Identification Method
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    currentMethod === "QR"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : currentMethod === "BARCODE"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {currentMethod === "QR"
                    ? "QR Code"
                    : currentMethod === "BARCODE"
                    ? "Barcode"
                    : "No Code"}
                </span>

                {canEditIdentification && !isBuilding && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethodToSave(currentMethod);
                      setIsEditingMethod(!isEditingMethod);
                    }}
                    className="text-[10px] font-bold text-sky-750 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200 flex items-center space-x-1 transition-colors"
                  >
                    <Edit3 size={11} />
                    <span>{isEditingMethod ? "Cancel" : "Change"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Method Switcher for Authorized PAO / System Admin */}
            {isEditingMethod && canEditIdentification && !isBuilding && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-[11px] font-bold text-slate-700">Change Identification Method</div>
                <div className="space-y-2">
                  <label
                    className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedMethodToSave === "QR" ? "bg-sky-50/80 border-sky-400 shadow-2xs" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editMethodRadio"
                      value="QR"
                      checked={selectedMethodToSave === "QR"}
                      onChange={() => setSelectedMethodToSave("QR")}
                      className="mt-0.5 text-sky-700"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 m-0">QR Code</p>
                      <p className="text-[10px] text-slate-500 m-0">Standard 2D QR Code tag with public verification and full specs.</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedMethodToSave === "BARCODE" ? "bg-sky-50/80 border-sky-400 shadow-2xs" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editMethodRadio"
                      value="BARCODE"
                      checked={selectedMethodToSave === "BARCODE"}
                      onChange={() => setSelectedMethodToSave("BARCODE")}
                      className="mt-0.5 text-sky-700"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 m-0">Barcode</p>
                      <p className="text-[10px] text-slate-500 m-0">Compact 1D barcode sticker for slim objects (keyboard, mouse, cables, tools).</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedMethodToSave === "NONE" ? "bg-sky-50/80 border-sky-400 shadow-2xs" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editMethodRadio"
                      value="NONE"
                      checked={selectedMethodToSave === "NONE"}
                      onChange={() => setSelectedMethodToSave("NONE")}
                      className="mt-0.5 text-sky-700"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 m-0">No Code</p>
                      <p className="text-[10px] text-slate-500 m-0">No physical barcode or QR label will be generated.</p>
                    </div>
                  </label>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveIdentificationMethod}
                    disabled={methodSaveLoading}
                    className="flex-1 py-1.5 bg-sky-700 hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1 shadow-2xs"
                  >
                    {methodSaveLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    <span>Save Method</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMethod(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Layout based on active identification method */}
            {currentMethod === "NONE" || isBuilding ? (
              <div className="w-full bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-center flex flex-col items-center space-y-2">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  {isBuilding ? <Building size={18} /> : <Info size={18} />}
                </div>
                <p className="text-xs font-bold text-amber-900 m-0">
                  {isBuilding ? "Building Asset — No Physical Label Required" : "No Code Identification Method"}
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed max-w-xs m-0">
                  {isBuilding
                    ? "QR/barcode identification is not applicable to buildings. Building identification is managed using the building information."
                    : "This asset is registered without a barcode or QR code. No physical label is generated."}
                </p>
              </div>
            ) : currentMethod === "BARCODE" ? (
              <div className="flex flex-col items-center space-y-3 w-full">
                <p className="text-[11px] font-semibold text-slate-500 m-0">Compact Barcode Sticker Preview</p>

                {/* Compact Barcode Sticker Layout */}
                <div className="w-full border-2 border-slate-800 rounded-lg p-3 bg-white flex flex-col items-center space-y-1 relative shadow-sm max-w-[220px]">
                  <div className="w-full flex justify-between items-center text-[9px] font-black tracking-wider text-[#0b4a6e] border-b border-slate-200 pb-1">
                    <span>DBU</span>
                    <span className="text-amber-700 text-[8px]">ASSET</span>
                  </div>
                  <div className="w-full my-1">
                    <BarcodeView value={asset.assetCode} height={36} width={1.8} />
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-800 tracking-wider">
                    {asset.assetCode}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center m-0">
                  Compact dimensions for keyboards, mice, cables, small tools, and slim surfaces.
                </p>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      printBarcodeSticker({
                        assetCode: asset.assetCode,
                        name: asset.name,
                        categoryName: asset.category.name,
                        typeName: asset.assetType?.name
                      })
                    }
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <BarcodeIcon size={13} className="text-sky-700" />
                    <span>Print Barcode Sticker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printFullAssetLabel(
                        {
                          assetCode: asset.assetCode,
                          name: asset.name,
                          categoryName: asset.category.name,
                          typeName: asset.assetType?.name,
                          imageUrl: asset.images?.[0]?.url
                        },
                        "BARCODE"
                      )
                    }
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Printer size={13} />
                    <span>Print Asset Label</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 w-full">
                <p className="text-[11px] font-semibold text-slate-500 m-0">QR Code Label Preview</p>

                {/* Dedicated QR Label Layout */}
                <div className="w-full border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center space-y-3 relative shadow-sm max-w-[240px]">
                  <div className="text-center">
                    <p className="text-[10px] font-extrabold text-sky-900 tracking-wider m-0">DEBRE BERHAN UNIVERSITY</p>
                    <p className="text-[7px] text-amber-700 font-bold uppercase tracking-widest mt-0.5 mb-0">DBU ASSET TAG</p>
                  </div>

                  <div className="w-24 h-24 border border-slate-100 bg-white rounded-lg flex items-center justify-center">
                    {qrCodeUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={qrCodeUrl} alt="Asset Tag QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode size={36} className="text-slate-300" />
                    )}
                  </div>

                  <div className="text-center w-full space-y-0.5 border-t border-slate-100 pt-2">
                    <p className="text-[10px] text-sky-750 font-mono font-bold leading-none m-0">Asset: {asset.assetCode}</p>
                    <p className="text-xs font-bold text-slate-800 truncate m-0">{asset.name}</p>
                    <span className="inline-block bg-slate-100 text-slate-650 text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase mt-0.5">
                      {asset.category.name} {asset.assetType ? `→ ${asset.assetType.name}` : ""}
                    </span>
                  </div>

                  <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full m-0">Property Administration</p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      printQrLabel(
                        {
                          assetCode: asset.assetCode,
                          name: asset.name,
                          categoryName: asset.category.name,
                          typeName: asset.assetType?.name
                        },
                        qrCodeUrl || ""
                      )
                    }
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <QrCode size={13} className="text-sky-700" />
                    <span>Print QR Label</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printFullAssetLabel(
                        {
                          assetCode: asset.assetCode,
                          name: asset.name,
                          categoryName: asset.category.name,
                          typeName: asset.assetType?.name,
                          imageUrl: asset.images?.[0]?.url
                        },
                        "QR",
                        qrCodeUrl
                      )
                    }
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Printer size={13} />
                    <span>Print Asset Label</span>
                  </button>
                  {qrCodeUrl && (
                    <a
                      href={qrCodeUrl}
                      download={`qr-${asset.assetCode}.png`}
                      className="flex items-center justify-center space-x-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs text-center"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Public QR Verification Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 m-0">
                  Public QR Verification
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                {currentMethod === "NONE" || isBuilding ? "Digital Record" : "Privacy Safe"}
              </span>
            </div>

            {currentMethod === "NONE" || isBuilding ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed m-0">
                  {isBuilding
                    ? "Buildings do not require a physical QR code tag. Verification is accessible via digital registry lookup."
                    : "This asset uses No Code identification. Digital verification is accessible via the direct verification link."}
                </p>
                {verificationUrl && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-slate-600 truncate bg-slate-50 p-2 rounded-md border border-slate-150 select-all m-0">
                      {verificationUrl}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        {copiedUrl ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copiedUrl ? "Copied!" : "Copy URL"}</span>
                      </button>
                      <a
                        href={verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                      >
                        <ExternalLink size={13} />
                        <span>Preview Page</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3.5">
                  <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center shrink-0 shadow-2xs">
                    {qrCodeUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={qrCodeUrl} alt="Public Verification QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode size={32} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[11px] font-bold text-slate-700 m-0">Public Verification URL</p>
                    <p className="text-[10px] font-mono text-slate-600 truncate bg-slate-50 p-1.5 rounded-md border border-slate-150 select-all m-0">
                      {verificationUrl || "Generating..."}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-tight m-0">
                      Allows anyone to scan and verify asset registration without logging in.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                  >
                    {copiedUrl ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedUrl ? "Copied!" : "Copy URL"}</span>
                  </button>

                  {qrCodeUrl && (
                    <a
                      href={qrCodeUrl}
                      download={`qr-verify-${asset.assetCode}.png`}
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors text-center shadow-2xs"
                    >
                      <Download size={13} />
                      <span>Download QR</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (currentMethod === "BARCODE") {
                        printBarcodeSticker({
                          assetCode: asset.assetCode,
                          name: asset.name,
                          categoryName: asset.category.name,
                          typeName: asset.assetType?.name
                        });
                      } else {
                        printQrLabel(
                          {
                            assetCode: asset.assetCode,
                            name: asset.name,
                            categoryName: asset.category.name,
                            typeName: asset.assetType?.name
                          },
                          qrCodeUrl || ""
                        );
                      }
                    }}
                    className="flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                  >
                    <Printer size={13} />
                    <span>Print Tag</span>
                  </button>

                  {verificationUrl && (
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-200 rounded-xl text-xs font-bold transition-colors text-center shadow-2xs"
                    >
                      <ExternalLink size={13} />
                      <span>Preview Page</span>
                    </a>
                  )}
                </div>
              </>
            )}
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
                  {session?.user?.role !== "STAFF_MEMBER" && fin.isFinanciallyValued && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h5 className="text-[10px] font-black text-sky-850 uppercase tracking-widest flex items-center">
                          <DollarSign size={12} className="mr-1 text-sky-700" /> Asset Financial Ledger Summary
                        </h5>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                          fin.isFullyDepreciated ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                          fin.depreciationStatus === "FUTURE_PURCHASE" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          fin.depreciationStatus === "NO_PURCHASE_DATE" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {fin.statusLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Purchase Cost</span>
                          <span className="text-slate-800 font-extrabold">{fin.cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5">Current Book Value</span>
                          <span className="text-emerald-700 font-black">{fin.currentBookValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Annual Depreciation</span>
                          <span className="text-slate-700 font-bold">{fin.annualDepreciation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Monthly Depreciation</span>
                          <span className="text-slate-700 font-bold">{fin.monthlyDepreciation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Accumulated Depreciation</span>
                          <span className="text-violet-700 font-bold">{fin.accumulatedDepreciation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Useful Life</span>
                          <span className="text-slate-700 font-bold">{fin.usefulLifeYears} Years ({fin.usefulLifeMonths} Months)</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Salvage Value (Floor)</span>
                          <span className="text-slate-700 font-bold">{fin.salvageValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Funding Source</span>
                          <span className="inline-block bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase mt-0.5">
                            {asset.fundingSource ? asset.fundingSource.replace("_", " ") : "UNSPECIFIED"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Total Maintenance Cost</span>
                          <span className="text-amber-700 font-bold">{fin.totalMaintenanceCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold mb-0.5 font-bold">Total Asset Investment</span>
                          <span className="text-slate-800 font-extrabold">{fin.totalAssetInvestment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
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
                  {fin.isFinanciallyValued && (
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

      {/* Return/Reject Reason Confirmation Dialog Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Reject / Return Assigned Asset</h3>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleRejectAssignmentSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <p className="text-slate-600 leading-normal">
                  Please provide a clear reason for returning or rejecting this asset assignment. This reason will be recorded and sent to the Property Administration Officer.
                </p>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Reason for Rejection / Return *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. This laptop was assigned to me by mistake. I am already using a Desktop PC and do not require another computer."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none resize-none"
                    value={rejectReasonVal}
                    onChange={(e) => setRejectReasonVal(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-red-650 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Accept Asset?</h3>
              <button type="button" onClick={() => setShowAcceptModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-normal">
                Are you sure you want to accept this asset assignment and take responsibility for it?
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptAssignmentConfirm}
                disabled={isPending}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
