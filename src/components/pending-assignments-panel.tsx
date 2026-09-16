"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptAssignmentAction, rejectAssignmentAction } from "@/app/actions/assignment";
import {
  CheckCircle,
  XCircle
} from "lucide-react";

interface PendingAssignmentItem {
  id: string;
  assignedAt: Date | string;
  assignedBy: string;
  asset: {
    id: string;
    name: string;
    assetCode: string;
    serialNumber: string;
    condition: string;
    category: string;
    assetTypeName: string;
    department: string;
  };
}

interface PendingAssignmentsPanelProps {
  pendingAssignments: PendingAssignmentItem[];
}

export function PendingAssignmentsPanel({ pendingAssignments }: PendingAssignmentsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetAssignmentId, setTargetAssignmentId] = useState("");
  const [rejectReasonVal, setRejectReasonVal] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (pendingAssignments.length === 0) return null;

  const handleAcceptClick = (assignmentId: string) => {
    setTargetAssignmentId(assignmentId);
    setShowAcceptModal(true);
  };

  const handleAcceptConfirm = () => {
    setShowAcceptModal(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await acceptAssignmentAction(null, targetAssignmentId);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Asset assignment accepted successfully!");
        router.refresh();
      }
    });
  };

  const handleRejectClick = (assignmentId: string) => {
    setTargetAssignmentId(assignmentId);
    setRejectReasonVal("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReasonVal.trim()) {
      alert("A reason is required to reject/return the assignment.");
      return;
    }
    setShowRejectModal(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await rejectAssignmentAction(null, {
        assignmentId: targetAssignmentId,
        reason: rejectReasonVal.trim()
      });
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Return / Reject request submitted successfully.");
        setRejectReasonVal("");
        router.refresh();
      }
    });
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Alert Banners */}
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-xs text-green-700 font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle size={14} className="text-green-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[10px] text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2">
            <XCircle size={14} className="text-red-650" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[10px] text-red-500 hover:text-red-755 font-bold">✕</button>
        </div>
      )}

      {/* Pending Asset Assignments Section */}
      <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
          <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Pending Asset Assignments ({pendingAssignments.length})</h4>
        </div>
        <p className="text-[11px] text-amber-600 font-semibold mt-[-6px]">
          Please review the details of these assets and confirm acceptance or request return/reject if assigned incorrectly.
        </p>

        <div className="overflow-x-auto bg-white rounded-xl border border-amber-100/60 p-2">
          <table className="w-full min-w-[750px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5 px-3">Asset Name</th>
                <th className="py-2.5">Type</th>
                <th className="py-2.5">Tag/ID</th>
                <th className="py-2.5">Serial Number</th>
                <th className="py-2.5">Assigned Date</th>
                <th className="py-2.5">Assigned By</th>
                <th className="py-2.5">Location</th>
                <th className="py-2.5">Condition</th>
                <th className="py-2.5 text-right px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingAssignments.map((pa) => (
                <tr key={pa.id} className="hover:bg-amber-50/10 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">{pa.asset.name}</td>
                  <td className="py-3 text-slate-500">{pa.asset.assetTypeName}</td>
                  <td className="py-3 font-mono font-bold text-sky-700">{pa.asset.assetCode}</td>
                  <td className="py-3 text-slate-500 font-mono text-[11px]">{pa.asset.serialNumber}</td>
                  <td className="py-3 text-slate-500">{new Date(pa.assignedAt).toLocaleDateString()}</td>
                  <td className="py-3 text-slate-500">{pa.assignedBy}</td>
                  <td className="py-3 text-slate-500">{pa.asset.department}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200 uppercase">
                      {pa.asset.condition.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 text-right px-3">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleAcceptClick(pa.id)}
                        disabled={isPending}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all shadow-sm shrink-0"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectClick(pa.id)}
                        disabled={isPending}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-all shadow-sm shrink-0"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accept Confirmation Dialog Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Accept Asset?</h3>
              <button type="button" onClick={() => setShowAcceptModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-normal font-semibold">
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
                onClick={handleAcceptConfirm}
                disabled={isPending}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return/Reject Reason Confirmation Dialog Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Reject / Return Assigned Asset</h3>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
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
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
