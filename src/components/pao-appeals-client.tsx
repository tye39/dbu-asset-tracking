"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToPropertyAppealAction } from "@/app/actions/appeal";
import {
  Scale,
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
  FileQuestion,
  Package,
  MessageSquare,
  HelpCircle,
  Check,
  Ban,
} from "lucide-react";

interface AppealItem {
  id: string;
  appealNumber: string;
  subject: string;
  reason: string;
  description: string;
  supportingInfo?: string | null;
  status: string;
  createdAt: Date | string;
  responseDate?: Date | string | null;
  responseNotes?: string | null;
  department: { id?: string; name: string; code: string };
  departmentHead: { id: string; name: string; email: string };
  request?: { id: string; requestNumber: string; status: string; reason?: string } | null;
  asset?: { id: string; name: string; assetCode: string; status?: string } | null;
  responder?: { id: string; name: string } | null;
  history: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    comment?: string | null;
    createdAt: Date | string;
    actor?: { name: string; role: { name: string } } | null;
  }>;
}

interface PaoAppealsClientProps {
  appeals: AppealItem[];
  departments: Array<{ id: string; name: string; code: string }>;
}

export function PaoAppealsClient({ appeals, departments }: PaoAppealsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Response Modal State
  const [selectedAppeal, setSelectedAppeal] = useState<AppealItem | null>(null);
  const [responseAction, setResponseAction] = useState<
    "UNDER_REVIEW" | "REQUEST_INFO" | "RESOLVE" | "REJECT" | "CLOSE"
  >("UNDER_REVIEW");
  const [responseComment, setResponseComment] = useState("");
  const [responseError, setResponseError] = useState<string | null>(null);

  // History Modal State
  const [historyAppeal, setHistoryAppeal] = useState<AppealItem | null>(null);

  const filteredAppeals = appeals.filter((a) => {
    // Tab filter
    if (activeTab === "PENDING" && a.status !== "PENDING_PROPERTY_MANAGEMENT") return false;
    if (activeTab === "UNDER_REVIEW" && a.status !== "UNDER_REVIEW") return false;
    if (activeTab === "INFO_REQUIRED" && a.status !== "ADDITIONAL_INFORMATION_REQUIRED") return false;
    if (activeTab === "RESOLVED" && a.status !== "RESOLVED") return false;
    if (activeTab === "REJECTED" && a.status !== "REJECTED") return false;
    if (activeTab === "CLOSED" && a.status !== "CLOSED") return false;

    // Dept filter
    if (selectedDeptFilter && a.department.id && a.department.id !== selectedDeptFilter) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = a.appealNumber.toLowerCase().includes(term);
      const matchSub = a.subject.toLowerCase().includes(term);
      const matchHead = a.departmentHead.name.toLowerCase().includes(term);
      const matchDept = a.department.name.toLowerCase().includes(term);
      const matchReason = a.reason.toLowerCase().includes(term);
      if (!matchNum && !matchSub && !matchHead && !matchDept && !matchReason) {
        return false;
      }
    }
    return true;
  });

  const handleResponseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAppeal) return;
    setResponseError(null);

    if (!responseComment.trim()) {
      setResponseError("Please provide a response comment or resolution explanation.");
      return;
    }

    const formData = new FormData();
    formData.append("appealId", selectedAppeal.id);
    formData.append("action", responseAction);
    formData.append("comment", responseComment.trim());

    startTransition(async () => {
      const res = await respondToPropertyAppealAction(null, formData);
      if (res?.error) {
        setResponseError(res.error);
      } else {
        setSelectedAppeal(null);
        setResponseComment("");
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PROPERTY_MANAGEMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            Pending Action
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Search size={13} className="text-blue-600" />
            Under Review
          </span>
        );
      case "ADDITIONAL_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle size={13} className="text-purple-600" />
            More Info Needed
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Resolved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle size={13} className="text-red-600" />
            Appeal Rejected
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Ban size={13} className="text-slate-500" />
            Closed
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
            <Scale className="text-purple-600" size={22} />
            Department Head Appeals Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review formal appeals, allocation objections, and resource escalations submitted by Department Heads.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium self-start flex-wrap">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "PENDING" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending ({appeals.filter((a) => a.status === "PENDING_PROPERTY_MANAGEMENT").length})
          </button>
          <button
            onClick={() => setActiveTab("UNDER_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "UNDER_REVIEW" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Under Review ({appeals.filter((a) => a.status === "UNDER_REVIEW").length})
          </button>
          <button
            onClick={() => setActiveTab("INFO_REQUIRED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "INFO_REQUIRED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Info Needed ({appeals.filter((a) => a.status === "ADDITIONAL_INFORMATION_REQUIRED").length})
          </button>
          <button
            onClick={() => setActiveTab("RESOLVED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "RESOLVED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Resolved ({appeals.filter((a) => a.status === "RESOLVED").length})
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "REJECTED" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rejected ({appeals.filter((a) => a.status === "REJECTED").length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Appeals ({appeals.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              placeholder="Search appeal #, subject, dept..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Appeals List */}
      {filteredAppeals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Scale size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No Appeals Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedDeptFilter
              ? "No appeals match your search criteria."
              : activeTab === "PENDING"
              ? "There are currently no new appeals awaiting property administration review."
              : "No appeals recorded in this state."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppeals.map((appeal) => {
            const isClosed = appeal.status === "CLOSED";

            return (
              <div
                key={appeal.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition space-y-4"
              >
                {/* Card Top */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {appeal.appealNumber}
                    </span>
                    {getStatusBadge(appeal.status)}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                      {appeal.reason.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Lodged: {new Date(appeal.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Appeal Title & Meta */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {appeal.subject}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      {appeal.department.name} ({appeal.department.code})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      Head: {appeal.departmentHead.name}
                    </span>
                    {appeal.request && (
                      <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <FileQuestion size={13} />
                        Request Ref: {appeal.request.requestNumber}
                      </span>
                    )}
                    {appeal.asset && (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <Package size={13} />
                        Asset Ref: {appeal.asset.name} ({appeal.asset.assetCode})
                      </span>
                    )}
                  </div>
                </div>

                {/* Description & Supporting Info */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Appeal Argument & Ground
                    </span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {appeal.description}
                    </p>
                  </div>

                  {appeal.supportingInfo && (
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Supporting Evidence / Context
                      </span>
                      <p className="text-slate-600 leading-relaxed bg-purple-50/40 p-2.5 rounded-xl border border-purple-100">
                        {appeal.supportingInfo}
                      </p>
                    </div>
                  )}
                </div>

                {/* Latest Administrative Response */}
                {appeal.responseDate && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    appeal.status === "RESOLVED"
                      ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-900"
                      : appeal.status === "REJECTED"
                      ? "bg-red-50/70 border-red-200/70 text-red-900"
                      : "bg-blue-50/70 border-blue-200/70 text-blue-900"
                  }`}>
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <MessageSquare size={13} />
                      PAO Response ({appeal.status.replace(/_/g, " ")})
                    </div>
                    <p className="text-xs">{appeal.responseNotes}</p>
                    <div className="text-[10px] opacity-75 mt-1">
                      Updated on: {new Date(appeal.responseDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setHistoryAppeal(appeal)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
                  >
                    <History size={13} />
                    <span>Audit Trail ({appeal.history.length})</span>
                  </button>

                  {!isClosed && (
                    <button
                      onClick={() => {
                        setSelectedAppeal(appeal);
                        setResponseAction("UNDER_REVIEW");
                        setResponseComment("");
                        setResponseError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition shadow-sm self-end sm:self-auto"
                    >
                      <MessageSquare size={13} />
                      <span>Respond / Take Action</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response / Action Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedAppeal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Respond to Appeal: {selectedAppeal.appealNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAppeal.subject} • {selectedAppeal.department.name}
                </p>
              </div>
            </div>

            {responseError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                <span>{responseError}</span>
              </div>
            )}

            <form onSubmit={handleResponseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Action Decision <span className="text-red-500">*</span>
                </label>
                <select
                  value={responseAction}
                  onChange={(e) => setResponseAction(e.target.value as "UNDER_REVIEW" | "REQUEST_INFO" | "RESOLVE" | "REJECT" | "CLOSE")}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="UNDER_REVIEW">Mark Under Review (Investigation in progress)</option>
                  <option value="REQUEST_INFO">Request Additional Information from Dept Head</option>
                  <option value="RESOLVE">Resolve Appeal (Approve / Remedy provided)</option>
                  <option value="REJECT">Reject Appeal (Uphold original decision)</option>
                  <option value="CLOSE">Close Appeal (Formal conclusion)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Response & Resolution Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder="Detail the property administration's findings, decisions, next steps, or required information..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppeal(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Response</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {historyAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setHistoryAppeal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-slate-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Audit Trail: {historyAppeal.appealNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Status transitions and administrative logs
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {historyAppeal.history.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No history events recorded.
                </div>
              ) : (
                historyAppeal.history.map((event, idx) => (
                  <div key={event.id || idx} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0 last:pb-0">
                    <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-purple-500 border-2 border-white" />
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
                onClick={() => setHistoryAppeal(null)}
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
