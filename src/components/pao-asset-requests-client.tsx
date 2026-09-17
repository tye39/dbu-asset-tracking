"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  paoFulfillAssetRequestAction,
  paoRejectAssetRequestAction,
} from "@/app/actions/asset-request";
import {
  PackageCheck,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  User,
  History,
  X,
  Loader2,
  Check,
  Ban,
} from "lucide-react";

interface AssetItem {
  id: string;
  name: string;
  assetCode: string;
  serialNumber?: string | null;
  categoryId: string;
  category: { name: string; code: string };
  condition?: string | null;
  department?: { name: string } | null;
}

interface RequestItem {
  id: string;
  requestNumber: string;
  quantity: number;
  reason: string;
  priority: string;
  status: string;
  createdAt: Date | string;
  headReviewDate?: Date | string | null;
  headResponseReason?: string | null;
  paoReviewDate?: Date | string | null;
  paoResponseReason?: string | null;
  user: { id: string; name: string; email: string; employeeId?: string | null };
  category: { id: string; name: string; code: string };
  assetType?: { id: string; name: string } | null;
  department: { id: string; name: string; code: string };
  reviewedByHead?: { name: string } | null;
  reviewedByPao?: { name: string } | null;
  fulfilledAsset?: { id: string; name: string; assetCode: string; serialNumber?: string | null; status: string } | null;
  assignment?: { id: string; status: string } | null;
  history: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    comment?: string | null;
    createdAt: Date | string;
    actor?: { name: string; role: { name: string } } | null;
  }>;
}

interface PaoAssetRequestsClientProps {
  requests: RequestItem[];
  availableAssets: AssetItem[];
  departments: Array<{ id: string; name: string; code: string }>;
}

export function PaoAssetRequestsClient({
  requests,
  availableAssets,
  departments,
}: PaoAssetRequestsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"PENDING" | "FULFILLED" | "REJECTED" | "ALL">("PENDING");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fulfill Modal State
  const [fulfillModalRequest, setFulfillModalRequest] = useState<RequestItem | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [fulfillError, setFulfillError] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalRequest, setRejectModalRequest] = useState<RequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  // History Modal State
  const [historyRequest, setHistoryRequest] = useState<RequestItem | null>(null);

  const filteredRequests = requests.filter((r) => {
    // Tab filter
    const isApprovedByHead = r.status === "APPROVED_BY_DEPARTMENT_HEAD" || r.status === "APPROVED_BY_HEAD";
    if (activeTab === "PENDING" && !isApprovedByHead) return false;
    if (activeTab === "FULFILLED" && r.status !== "FULFILLED") return false;
    if (activeTab === "REJECTED" && r.status !== "REJECTED_BY_PROPERTY") return false;

    // Department filter
    if (selectedDeptFilter && r.department.id !== selectedDeptFilter) return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = r.requestNumber.toLowerCase().includes(term);
      const matchStaff = r.user.name.toLowerCase().includes(term);
      const matchDept = r.department.name.toLowerCase().includes(term);
      const matchCat = r.category.name.toLowerCase().includes(term);
      const matchReason = r.reason.toLowerCase().includes(term);
      if (!matchNum && !matchStaff && !matchDept && !matchCat && !matchReason) {
        return false;
      }
    }
    return true;
  });

  const handleFulfillSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fulfillModalRequest) return;
    setFulfillError(null);

    if (!selectedAssetId) {
      setFulfillError("Please select an available inventory asset to allocate.");
      return;
    }

    const formData = new FormData();
    formData.append("requestId", fulfillModalRequest.id);
    formData.append("assetId", selectedAssetId);
    if (fulfillNotes.trim()) formData.append("notes", fulfillNotes.trim());

    startTransition(async () => {
      const res = await paoFulfillAssetRequestAction(null, formData);
      if (res?.error) {
        setFulfillError(res.error);
      } else {
        setFulfillModalRequest(null);
        setSelectedAssetId("");
        setFulfillNotes("");
        router.refresh();
      }
    });
  };

  const handleRejectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rejectModalRequest) return;
    setRejectError(null);

    if (!rejectionReason.trim()) {
      setRejectError("A rejection reason is mandatory.");
      return;
    }

    const formData = new FormData();
    formData.append("requestId", rejectModalRequest.id);
    formData.append("reason", rejectionReason.trim());

    startTransition(async () => {
      const res = await paoRejectAssetRequestAction(null, formData);
      if (res?.error) {
        setRejectError(res.error);
      } else {
        setRejectModalRequest(null);
        setRejectionReason("");
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED_BY_DEPARTMENT_HEAD":
      case "APPROVED_BY_HEAD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            Pending Fulfillment
          </span>
        );
      case "FULFILLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Fulfilled & Assigned
          </span>
        );
      case "REJECTED_BY_PROPERTY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} className="text-red-600" />
            Rejected by PAO
          </span>
        );
      case "PENDING_DEPARTMENT_HEAD":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
            Pending Head Endorsement
          </span>
        );
      case "REJECTED_BY_DEPARTMENT_HEAD":
      case "REJECTED_BY_HEAD":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">
            Rejected by Head
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 bg-white -mx-6 -mt-6 p-6 rounded-t-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="text-teal-600" size={22} />
            Asset Request Fulfillment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review departmental requests endorsed by Department Heads and allocate inventory assets.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium self-start">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "PENDING" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Fulfillment ({requests.filter((r) => r.status === "APPROVED_BY_DEPARTMENT_HEAD" || r.status === "APPROVED_BY_HEAD").length})
          </button>
          <button
            onClick={() => setActiveTab("FULFILLED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "FULFILLED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fulfilled ({requests.filter((r) => r.status === "FULFILLED").length})
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "REJECTED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rejected ({requests.filter((r) => r.status === "REJECTED_BY_PROPERTY").length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Requests ({requests.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search request #, staff, dept..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <PackageCheck size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No Asset Requests Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedDeptFilter
              ? "No requests match your search and filter criteria."
              : activeTab === "PENDING"
              ? "There are currently no departmental requests awaiting PAO fulfillment."
              : "No requests recorded under this tab."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isAwaitingPao = req.status === "APPROVED_BY_DEPARTMENT_HEAD" || req.status === "APPROVED_BY_HEAD";
            const isFulfilled = req.status === "FULFILLED";

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {req.requestNumber}
                    </span>
                    {getStatusBadge(req.status)}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {req.priority}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Requester & Faculty
                    </span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>{req.user.name}</span>
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      <span>{req.department.name} ({req.department.code})</span>
                    </div>
                    {req.user.email && (
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {req.user.email}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Requested Specifications
                    </span>
                    <div className="font-semibold text-slate-800">
                      Category: {req.category.name}
                    </div>
                    {req.assetType && (
                      <div className="text-slate-500 text-xs mt-0.5">
                        Type: {req.assetType.name}
                      </div>
                    )}
                    <div className="text-slate-500 text-xs mt-0.5">
                      Quantity: <span className="font-semibold text-slate-800">{req.quantity}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Staff Justification
                    </span>
                    <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {req.reason}
                    </p>
                  </div>
                </div>

                {/* Department Head Endorsement */}
                {req.headReviewDate && (
                  <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-xs">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={14} className="text-amber-700" />
                      Department Head Endorsement
                    </div>
                    <p className="text-amber-800 text-xs">
                      {req.headResponseReason || "Endorsed without additional comments."}
                    </p>
                    <div className="text-[10px] text-amber-600/80 mt-1">
                      Approved on: {new Date(req.headReviewDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Fulfilled Details */}
                {isFulfilled && req.fulfilledAsset && (
                  <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 text-xs text-emerald-900">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={14} className="text-emerald-700" />
                      Allocated Asset
                    </div>
                    <div className="font-bold text-emerald-950">
                      {req.fulfilledAsset.name} ({req.fulfilledAsset.assetCode})
                      {req.fulfilledAsset.serialNumber && ` • S/N: ${req.fulfilledAsset.serialNumber}`}
                    </div>
                    {req.paoResponseReason && (
                      <p className="text-emerald-800 text-xs mt-1">
                        PAO Notes: {req.paoResponseReason}
                      </p>
                    )}
                    {req.assignment && (
                      <div className="text-[10px] text-emerald-700 mt-1">
                        Assignment Custody Status: <span className="font-semibold">{req.assignment.status}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Details */}
                {req.status === "REJECTED_BY_PROPERTY" && (
                  <div className="bg-red-50/70 border border-red-200/70 rounded-xl p-3 text-xs text-red-900">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <XCircle size={14} className="text-red-700" />
                      PAO Rejection Reason
                    </div>
                    <p className="text-red-800 text-xs">
                      {req.paoResponseReason || "No explanation recorded."}
                    </p>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setHistoryRequest(req)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
                  >
                    <History size={13} />
                    <span>Audit Trail ({req.history.length})</span>
                  </button>

                  {isAwaitingPao && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setRejectModalRequest(req);
                          setRejectionReason("");
                          setRejectError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition"
                      >
                        <Ban size={13} />
                        <span>Reject Request</span>
                      </button>

                      <button
                        onClick={() => {
                          setFulfillModalRequest(req);
                          setSelectedAssetId("");
                          setFulfillNotes("");
                          setFulfillError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition shadow-sm"
                      >
                        <Check size={14} />
                        <span>Fulfill & Allocate Asset</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fulfill Asset Modal */}
      {fulfillModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setFulfillModalRequest(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <PackageCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fulfill Request: {fulfillModalRequest.requestNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign an available active asset to {fulfillModalRequest.user.name} ({fulfillModalRequest.department.name}).
                </p>
              </div>
            </div>

            {fulfillError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                <span>{fulfillError}</span>
              </div>
            )}

            <form onSubmit={handleFulfillSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">Request Summary</div>
                <div>Category: <span className="font-medium text-slate-900">{fulfillModalRequest.category.name}</span></div>
                {fulfillModalRequest.assetType && (
                  <div>Asset Type: <span className="font-medium text-slate-900">{fulfillModalRequest.assetType.name}</span></div>
                )}
                <div>Staff: <span className="font-medium text-slate-900">{fulfillModalRequest.user.name}</span></div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select Available Inventory Asset <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Choose an available active asset...</option>
                  <optgroup label={`Matching Category: ${fulfillModalRequest.category.name}`}>
                    {availableAssets
                      .filter((a) => a.categoryId === fulfillModalRequest.category.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.assetCode}) - {a.condition || "Good"} {a.department ? `[Current: ${a.department.name}]` : ""}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Other Available Active Inventory">
                    {availableAssets
                      .filter((a) => a.categoryId !== fulfillModalRequest.category.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.assetCode}) [{a.category.name}] - {a.condition || "Good"}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Allocating this asset will execute the assignment workflow and notify {fulfillModalRequest.user.name} to accept custody.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Fulfillment Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="Additional delivery instructions, warranty information, or serial numbers..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFulfillModalRequest(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirm Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setRejectModalRequest(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reject Request: {rejectModalRequest.requestNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Provide a mandatory administrative reason for rejecting this request.
                </p>
              </div>
            </div>

            {rejectError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                <span>{rejectError}</span>
              </div>
            )}

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request cannot be fulfilled (e.g. inventory shortage, budget constraints, duplicate request)..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalRequest(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                  <span>Reject Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {historyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setHistoryRequest(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-slate-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit Trail: {historyRequest.requestNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Lifecycle milestones & transitions
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {historyRequest.history.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No history events recorded.
                </div>
              ) : (
                historyRequest.history.map((event, idx) => (
                  <div key={event.id || idx} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0 last:pb-0">
                    <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {event.toStatus.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {event.actor && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        By: <span className="font-medium text-slate-700">{event.actor.name}</span> ({event.actor.role?.name?.replace(/_/g, " ")})
                      </div>
                    )}
                    {event.comment && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1.5 border border-slate-100">
                        {event.comment}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryRequest(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
