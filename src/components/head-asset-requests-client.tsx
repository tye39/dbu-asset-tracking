"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { headReviewAssetRequestAction } from "@/app/actions/asset-request";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  History as HistoryIcon,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";

interface RequestItem {
  id: string;
  requestNumber: string;
  quantity: number;
  reason: string;
  priority: string;
  status: string;
  createdAt: string;
  headReviewDate?: string | null;
  headResponseReason?: string | null;
  paoReviewDate?: string | null;
  paoResponseReason?: string | null;
  user: { id: string; name: string; email: string; employeeId?: string | null };
  category: { name: string; code: string };
  assetType?: { name: string } | null;
  department: { name: string; code: string };
  reviewedByHead?: { name: string } | null;
  reviewedByPao?: { name: string } | null;
  fulfilledAsset?: { id: string; name: string; assetCode: string; serialNumber: string; status: string } | null;
  assignment?: { id: string; status: string } | null;
  history: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    comment?: string | null;
    createdAt: string;
    actor?: { name: string; role: { name: string } } | null;
  }>;
}

interface HeadAssetRequestsClientProps {
  requests: RequestItem[];
  departmentName: string;
}

export function HeadAssetRequestsClient({ requests, departmentName }: HeadAssetRequestsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [searchTerm, setSearchTerm] = useState("");

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  // History Modal state
  const [historyRequest, setHistoryRequest] = useState<RequestItem | null>(null);

  const filteredRequests = requests.filter((r) => {
    // Tab filter
    if (activeTab === "PENDING" && r.status !== "PENDING_DEPARTMENT_HEAD") return false;
    if (
      activeTab === "APPROVED" &&
      !["APPROVED_BY_DEPARTMENT_HEAD", "APPROVED_BY_PROPERTY_MANAGEMENT", "FULFILLED"].includes(r.status)
    ) {
      return false;
    }
    if (
      activeTab === "REJECTED" &&
      !["REJECTED_BY_DEPARTMENT_HEAD", "REJECTED_BY_PROPERTY_MANAGEMENT"].includes(r.status)
    ) {
      return false;
    }

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.requestNumber.toLowerCase().includes(q) ||
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.category.name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_DEPARTMENT_HEAD":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "APPROVED_BY_DEPARTMENT_HEAD":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "APPROVED_BY_PROPERTY_MANAGEMENT":
      case "FULFILLED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED_BY_DEPARTMENT_HEAD":
      case "REJECTED_BY_PROPERTY_MANAGEMENT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "CANCELLED":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (reviewDecision === "REJECT" && !reviewReason.trim()) {
      setReviewError("A rejection reason is mandatory.");
      return;
    }

    setReviewError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("requestId", selectedRequest.id);
      formData.append("decision", reviewDecision);
      formData.append("reason", reviewReason);

      const res = await headReviewAssetRequestAction(null, formData);
      if (res && res.error) {
        setReviewError(res.error);
      } else {
        setSelectedRequest(null);
        setReviewReason("");
        router.refresh();
      }
    });
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING_DEPARTMENT_HEAD").length;
  const approvedCount = requests.filter((r) =>
    ["APPROVED_BY_DEPARTMENT_HEAD", "APPROVED_BY_PROPERTY_MANAGEMENT", "FULFILLED"].includes(r.status)
  ).length;
  const rejectedCount = requests.filter((r) =>
    ["REJECTED_BY_DEPARTMENT_HEAD", "REJECTED_BY_PROPERTY_MANAGEMENT"].includes(r.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-100 pb-4 bg-green-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-green-900">Staff Asset Requests Management</h2>
          <p className="text-[11px] sm:text-xs text-green-600 font-semibold mt-0.5">
            Review, authorize, or reject equipment and property requests from {departmentName} staff
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "PENDING"
                ? "bg-green-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock size={13} />
            <span>Pending Review ({pendingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "APPROVED"
                ? "bg-green-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Approved ({approvedCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "REJECTED"
                ? "bg-green-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <XCircle size={13} />
            <span>Rejected ({rejectedCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "ALL"
                ? "bg-green-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({requests.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search staff, code, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600 shadow-sm"
          />
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-xs">No asset requests found in this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {req.requestNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(req.status)}`}>
                      {req.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Requested on {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-800">{req.user.name}</span>
                    <span className="text-xs text-slate-400">({req.user.email})</span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      <strong className="text-slate-500">Category:</strong> {req.category.name}
                    </span>
                    {req.assetType && (
                      <span>
                        <strong className="text-slate-500">Type:</strong> {req.assetType.name}
                      </span>
                    )}
                    <span>
                      <strong className="text-slate-500">Qty:</strong> {req.quantity}
                    </span>
                    <span>
                      <strong className="text-slate-500">Priority:</strong>{" "}
                      <span className={`font-bold ${req.priority === "HIGH" ? "text-red-600" : "text-slate-600"}`}>
                        {req.priority}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="text-slate-500 block text-[10px] uppercase font-bold">Reason:</strong>
                    {req.reason}
                  </p>

                  {/* Decision responses */}
                  {req.headResponseReason && (
                    <div className="text-xs text-green-900 bg-green-50/70 p-2 rounded border border-green-100">
                      <strong className="font-bold block text-[10px] uppercase">Head Review Note:</strong>
                      {req.headResponseReason}
                    </div>
                  )}

                  {req.paoResponseReason && (
                    <div className="text-xs text-sky-900 bg-sky-50/70 p-2 rounded border border-sky-100">
                      <strong className="font-bold block text-[10px] uppercase">Property Admin Note:</strong>
                      {req.paoResponseReason}
                    </div>
                  )}

                  {req.fulfilledAsset && (
                    <div className="text-xs text-emerald-900 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center justify-between">
                      <div>
                        <strong className="font-bold">Fulfilled Asset:</strong> {req.fulfilledAsset.name} ({req.fulfilledAsset.assetCode})
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase text-emerald-700">
                        Status: {req.assignment?.status || "ASSIGNED"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => setHistoryRequest(req)}
                    className="p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all text-xs font-semibold flex items-center space-x-1"
                    title="View Request History"
                  >
                    <HistoryIcon size={14} />
                    <span>History</span>
                  </button>

                  {req.status === "PENDING_DEPARTMENT_HEAD" && (
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setReviewDecision("APPROVE");
                        setReviewReason("");
                        setReviewError(null);
                      }}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                    >
                      <Check size={14} />
                      <span>Review</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Review Asset Request: {selectedRequest.requestNumber}
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div><strong>Staff:</strong> {selectedRequest.user.name} ({selectedRequest.user.email})</div>
              <div><strong>Category:</strong> {selectedRequest.category.name}</div>
              <div><strong>Quantity:</strong> {selectedRequest.quantity}</div>
              <div><strong>Reason:</strong> {selectedRequest.reason}</div>
            </div>

            {reviewError && (
              <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-xs text-rose-700 font-semibold flex items-center space-x-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                      reviewDecision === "APPROVE"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve & Forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REJECT")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                      reviewDecision === "REJECT"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle size={16} />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {reviewDecision === "REJECT" ? "Rejection Reason (Required)" : "Approval Note / Comment (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewDecision === "REJECT"
                      ? "Explain why this request is being rejected..."
                      : "Add recommendations or specifications for Property Administration..."
                  }
                  required={reviewDecision === "REJECT"}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center space-x-1.5 ${
                    reviewDecision === "APPROVE" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"
                  }`}
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>{reviewDecision === "APPROVE" ? "Confirm Approval" : "Confirm Rejection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Request Audit Trail: {historyRequest.requestNumber}
              </h3>
              <button onClick={() => setHistoryRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {historyRequest.history.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No history records logged.</p>
              ) : (
                historyRequest.history.map((h, i) => (
                  <div key={h.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(h.toStatus)}`}>
                        {h.toStatus.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {h.actor && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        By: <strong className="text-slate-700">{h.actor.name}</strong> ({h.actor.role.name.replace(/_/g, " ")})
                      </div>
                    )}
                    {h.comment && (
                      <p className="text-slate-700 text-[11px] pt-1 border-t border-slate-200/50 mt-1">
                        {h.comment}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setHistoryRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
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
