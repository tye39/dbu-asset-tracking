"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAssetRequestAction,
  cancelAssetRequestAction,
} from "@/app/actions/asset-request";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  History,
  X,
  Loader2,
  ArrowRight,
  Send,
  Ban,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  code: string;
}

interface AssetTypeItem {
  id: string;
  name: string;
  categoryId: string;
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
  category: { name: string; code: string };
  assetType?: { name: string } | null;
  department: { name: string; code: string };
  fulfilledAsset?: { id: string; name: string; assetCode: string; serialNumber: string } | null;
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

interface StaffRequestsClientProps {
  requests: RequestItem[];
  categories: CategoryItem[];
  assetTypes: AssetTypeItem[];
  userName: string;
}

export function StaffRequestsClient({
  requests,
  categories,
  assetTypes,
  userName,
}: StaffRequestsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [reason, setReason] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // History Modal State
  const [historyRequest, setHistoryRequest] = useState<RequestItem | null>(null);

  // Cancellation State
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const availableTypes = assetTypes.filter(
    (t) => !selectedCategory || t.categoryId === selectedCategory
  );

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    if (!selectedCategory) {
      setCreateError("Please select an asset category.");
      return;
    }
    if (!reason.trim()) {
      setCreateError("Please provide a justification / reason for your request.");
      return;
    }

    const formData = new FormData();
    formData.append("categoryId", selectedCategory);
    if (selectedType) formData.append("assetTypeId", selectedType);
    formData.append("quantity", String(quantity));
    formData.append("priority", priority);
    formData.append("reason", reason.trim());

    startTransition(async () => {
      const res = await createAssetRequestAction(null, formData);
      if (res?.error) {
        setCreateError(res.error);
      } else {
        setShowCreateModal(false);
        setSelectedCategory("");
        setSelectedType("");
        setQuantity(1);
        setPriority("MEDIUM");
        setReason("");
        router.refresh();
      }
    });
  };

  const handleCancelRequest = (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this asset request? This action cannot be undone.")) {
      return;
    }

    setCancellingId(requestId);
    startTransition(async () => {
      const res = await cancelAssetRequestAction(requestId);
      setCancellingId(null);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const filteredRequests = requests.filter((r) => {
    // Tab filter
    if (activeTab === "PENDING" && r.status !== "PENDING_DEPARTMENT_HEAD") return false;
    if (activeTab === "APPROVED" && r.status !== "APPROVED_BY_HEAD") return false;
    if (activeTab === "FULFILLED" && r.status !== "FULFILLED") return false;
    if (
      activeTab === "REJECTED" &&
      !["REJECTED_BY_HEAD", "REJECTED_BY_PROPERTY", "CANCELLED"].includes(r.status)
    ) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNumber = r.requestNumber.toLowerCase().includes(term);
      const matchCategory = r.category.name.toLowerCase().includes(term);
      const matchType = r.assetType?.name.toLowerCase().includes(term);
      const matchReason = r.reason.toLowerCase().includes(term);
      if (!matchNumber && !matchCategory && !matchType && !matchReason) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_DEPARTMENT_HEAD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            Pending Head Review
          </span>
        );
      case "APPROVED_BY_HEAD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 size={13} className="text-blue-600" />
            Approved by Head (Pending PAO)
          </span>
        );
      case "FULFILLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Fulfilled & Assigned
          </span>
        );
      case "REJECTED_BY_HEAD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} className="text-red-600" />
            Rejected by Head
          </span>
        );
      case "REJECTED_BY_PROPERTY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} className="text-red-600" />
            Rejected by PAO
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Ban size={13} className="text-slate-500" />
            Cancelled
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">URGENT</span>;
      case "HIGH":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">HIGH</span>;
      case "MEDIUM":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">MEDIUM</span>;
      case "LOW":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">LOW</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 bg-white -mx-6 -mt-6 p-6 rounded-t-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-blue-600" size={22} />
            My Asset Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome, {userName}. Request new equipment, hardware, or office assets and track administrative approval.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={16} />
          <span>New Asset Request</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium self-start">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "PENDING" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Review ({requests.filter((r) => r.status === "PENDING_DEPARTMENT_HEAD").length})
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "APPROVED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            In Fulfillment ({requests.filter((r) => r.status === "APPROVED_BY_HEAD").length})
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
            Rejected ({requests.filter((r) => ["REJECTED_BY_HEAD", "REJECTED_BY_PROPERTY", "CANCELLED"].includes(r.status)).length})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by request #, category..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No Asset Requests Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? "No requests match your search criteria." : "You have not submitted any asset requests yet. Click 'New Asset Request' to create one."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              <span>Submit Your First Request</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPendingHead = req.status === "PENDING_DEPARTMENT_HEAD";
            const isFulfilled = req.status === "FULFILLED";

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition space-y-4"
              >
                {/* Request Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {req.requestNumber}
                    </span>
                    {getStatusBadge(req.status)}
                    {getPriorityBadge(req.priority)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Request Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Requested Asset
                    </span>
                    <div className="font-semibold text-slate-800 text-sm">
                      {req.category.name}
                    </div>
                    {req.assetType && (
                      <div className="text-slate-500 text-xs mt-0.5">
                        Type: <span className="text-slate-700 font-medium">{req.assetType.name}</span>
                      </div>
                    )}
                    <div className="text-slate-500 text-xs mt-0.5">
                      Quantity: <span className="font-semibold text-slate-800">{req.quantity}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Justification & Purpose
                    </span>
                    <p className="text-slate-700 text-xs leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      {req.reason}
                    </p>
                  </div>
                </div>

                {/* Department Head Feedback (if reviewed) */}
                {req.headReviewDate && (
                  <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={14} className="text-amber-700" />
                      Department Head Endorsement: {req.status === "REJECTED_BY_HEAD" ? "Rejected" : "Approved"}
                    </div>
                    <p className="text-amber-800">
                      {req.headResponseReason || "No additional notes recorded."}
                    </p>
                    <div className="text-[10px] text-amber-600/80 mt-1">
                      Reviewed on: {new Date(req.headReviewDate).toLocaleDateString()} {new Date(req.headReviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}

                {/* PAO Fulfillment or Rejection (if reviewed) */}
                {req.paoReviewDate && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    req.status === "FULFILLED"
                      ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-900"
                      : "bg-red-50/60 border-red-200/60 text-red-900"
                  }`}>
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      {req.status === "FULFILLED" ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-700" />
                          <span>Property Administration: Asset Allocated</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-red-700" />
                          <span>Property Administration: Request Rejected</span>
                        </>
                      )}
                    </div>

                    {req.fulfilledAsset && (
                      <div className="mb-1 text-xs">
                        Allocated Asset: <span className="font-bold">{req.fulfilledAsset.name}</span> ({req.fulfilledAsset.assetCode})
                        {req.fulfilledAsset.serialNumber && ` • S/N: ${req.fulfilledAsset.serialNumber}`}
                      </div>
                    )}

                    <p className="text-xs">
                      {req.paoResponseReason || "No notes recorded."}
                    </p>
                    <div className="text-[10px] opacity-75 mt-1">
                      Processed on: {new Date(req.paoReviewDate).toLocaleDateString()} {new Date(req.paoReviewDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}

                {/* Fulfilled Alert & Call to Action */}
                {isFulfilled && req.assignment?.status === "PENDING_ACCEPTANCE" && (
                  <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-sky-900">
                      <AlertCircle size={16} className="text-sky-600 flex-shrink-0" />
                      <span>
                        Your assigned asset is waiting for your confirmation! Please review condition and accept custody.
                      </span>
                    </div>
                    <Link
                      href="/staff/dashboard"
                      className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition flex items-center gap-1 flex-shrink-0"
                    >
                      <span>Accept Asset</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setHistoryRequest(req)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
                  >
                    <History size={13} />
                    <span>View Audit Trail ({req.history.length})</span>
                  </button>

                  {isPendingHead && (
                    <button
                      disabled={cancellingId === req.id || isPending}
                      onClick={() => handleCancelRequest(req.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {cancellingId === req.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Ban size={13} />
                      )}
                      <span>Cancel Request</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Asset Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Asset Request</h3>
                <p className="text-xs text-slate-500">
                  This request will be routed to your Department Head for endorsement.
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Asset Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedType("");
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              {availableTypes.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Asset Type / Specification (Optional)
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Any type in this category</option>
                    {availableTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Justification & Academic/Operational Need <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this asset is needed for your academic, research, or administrative duties..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Submit Request</span>
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
                  Status transitions and approval milestones
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
                    <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
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
