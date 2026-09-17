"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPropertyAppealAction } from "@/app/actions/appeal";
import {
  Plus,
  Scale,
  Clock,
  CheckCircle2,
  History as HistoryIcon,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AppealItem {
  id: string;
  appealNumber: string;
  subject: string;
  reason: string;
  description: string;
  supportingInfo?: string | null;
  status: string;
  responseDate?: string | null;
  responseComment?: string | null;
  createdAt: string;
  department: { name: string; code: string };
  departmentHead: { id: string; name: string; email: string };
  request?: { id: string; requestNumber: string; status: string } | null;
  asset?: { id: string; name: string; assetCode: string } | null;
  responder?: { id: string; name: string } | null;
  history: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    comment?: string | null;
    createdAt: string;
    actor?: { name: string; role: { name: string } } | null;
  }>;
}

interface OptionItem {
  id: string;
  label: string;
}

interface HeadAppealsClientProps {
  appeals: AppealItem[];
  departmentName: string;
  departmentRequests: OptionItem[];
  departmentAssets: OptionItem[];
}

export function HeadAppealsClient({
  appeals,
  departmentName,
  departmentRequests,
  departmentAssets,
}: HeadAppealsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form states
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("Asset Request Rejected");
  const [description, setDescription] = useState("");
  const [supportingInfo, setSupportingInfo] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");

  // History modal state
  const [historyAppeal, setHistoryAppeal] = useState<AppealItem | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PROPERTY_MANAGEMENT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "UNDER_REVIEW":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "ADDITIONAL_INFORMATION_REQUIRED":
        return "bg-purple-50 text-purple-700 border-purple-200 animate-pulse";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("reason", reason);
      formData.append("description", description);
      if (supportingInfo) formData.append("supportingInfo", supportingInfo);
      if (selectedRequestId) formData.append("requestId", selectedRequestId);
      if (selectedAssetId) formData.append("assetId", selectedAssetId);

      const res = await createPropertyAppealAction(null, formData);
      if (res && res.error) {
        setSubmitError(res.error);
      } else {
        setShowSubmitModal(false);
        setSubject("");
        setDescription("");
        setSupportingInfo("");
        setSelectedRequestId("");
        setSelectedAssetId("");
        router.refresh();
      }
    });
  };

  const pendingCount = appeals.filter(
    (a) => a.status === "PENDING_PROPERTY_MANAGEMENT" || a.status === "UNDER_REVIEW"
  ).length;
  const resolvedCount = appeals.filter((a) => a.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-100 pb-4 bg-green-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-green-900">Property Management Appeals</h2>
          <p className="text-[11px] sm:text-xs text-green-600 font-semibold mt-0.5">
            Submit formal appeals or allocation dispute notices to the Property Administration Office for {departmentName}
          </p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
        >
          <Plus size={14} />
          <span>Submit New Appeal</span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pending / In Review</p>
            <h3 className="text-lg font-bold text-slate-800">{pendingCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Resolved Appeals</p>
            <h3 className="text-lg font-bold text-slate-800">{resolvedCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg">
            <Scale size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Department Appeals</p>
            <h3 className="text-lg font-bold text-slate-800">{appeals.length}</h3>
          </div>
        </div>
      </div>

      {/* Appeals List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
          Department Appeals Registry
        </h3>

        {appeals.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Scale size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-xs">No appeals filed yet by your department.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;Submit New Appeal&quot; above if you need to appeal a rejected request or property decision.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appeals.map((app) => (
              <div key={app.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                      {app.appealNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(app.status)}`}>
                      {app.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Submitted on {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => setHistoryAppeal(app)}
                    className="p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all text-xs font-semibold flex items-center space-x-1 self-start sm:self-auto"
                  >
                    <HistoryIcon size={13} />
                    <span>Audit History</span>
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">{app.subject}</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Category: <span className="text-slate-700">{app.reason}</span>
                    {app.request && (
                      <span className="ml-3 text-sky-700">
                        Related Request: <strong>{app.request.requestNumber}</strong>
                      </span>
                    )}
                    {app.asset && (
                      <span className="ml-3 text-purple-700">
                        Related Asset: <strong>{app.asset.name} ({app.asset.assetCode})</strong>
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <strong className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Description:</strong>
                  {app.description}
                </div>

                {app.supportingInfo && (
                  <div className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Supporting Information:</strong>
                    {app.supportingInfo}
                  </div>
                )}

                {app.responseComment && (
                  <div className="text-xs text-sky-900 bg-sky-50 p-3 rounded-xl border border-sky-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-sky-700">
                      <span>Property Administration Response</span>
                      {app.responseDate && <span>{new Date(app.responseDate).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-sky-950 font-medium">{app.responseComment}</p>
                    {app.responder && (
                      <p className="text-[10px] text-sky-700 italic">Handled by: {app.responder.name}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Appeal Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Submit Appeal to Property Administration
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {submitError && (
              <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 rounded text-xs text-rose-700 font-semibold flex items-center space-x-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAppeal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Appeal Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appeal: Rejection of Lab Equipment Request REQ-10492"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason Category *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                >
                  <option value="Asset Request Rejected">Asset Request Rejected</option>
                  <option value="Requested Asset Unavailable">Requested Asset Unavailable / Out of Stock</option>
                  <option value="Wrong Asset Specification Provided">Wrong Asset Specification Provided</option>
                  <option value="Department Property Allocation Dispute">Department Property Allocation Dispute</option>
                  <option value="Urgent Instructional Need">Urgent Instructional / Academic Need</option>
                  <option value="Other">Other Property Administration Issue</option>
                </select>
              </div>

              {departmentRequests.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Asset Request (Optional)</label>
                  <select
                    value={selectedRequestId}
                    onChange={(e) => setSelectedRequestId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="">-- None / General Appeal --</option>
                    {departmentRequests.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {departmentAssets.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Department Asset (Optional)</label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="">-- None --</option>
                    {departmentAssets.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Explanation & Grounds for Appeal *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail why this decision should be reviewed or overturned..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Information (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lab room numbers, enrolled student counts, course syllabus codes..."
                  value={supportingInfo}
                  onChange={(e) => setSupportingInfo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>Submit Appeal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Appeal Audit History: {historyAppeal.appealNumber}
              </h3>
              <button onClick={() => setHistoryAppeal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {historyAppeal.history.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No history records logged.</p>
              ) : (
                historyAppeal.history.map((h, i) => (
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
                onClick={() => setHistoryAppeal(null)}
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
