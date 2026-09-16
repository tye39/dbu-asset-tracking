"use client";

import React, { useState, useTransition } from "react";
import { createMaintenanceAction } from "@/app/actions/maintenance";
import { useRouter } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  Package,
  Wrench,
  X,
  Loader2,
  HelpCircle
} from "lucide-react";

interface AssetItem {
  id: string;
  assignmentId?: string;
  name: string;
  assetCode: string;
  serialNumber: string;
  status: string;
  category: { name: string };
}

interface MaintenanceRequestItem {
  id: string;
  description: string;
  status: string;
  createdAt: Date | string;
  asset: { name: string };
}

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

interface StaffDashboardClientProps {
  stats: {
    assignedAssets: number;
    pendingAssignments: number;
    openMaintenance: number;
  };
  myAssetsList: AssetItem[];
  pendingAssignments: PendingAssignmentItem[];
  recentRequests: MaintenanceRequestItem[];
}

export function StaffDashboardClient({
  stats,
  myAssetsList,
  pendingAssignments,
  recentRequests,
}: StaffDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Form State
  const [reportAssetId, setReportAssetId] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPriority, setReportPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [reportError, setReportError] = useState<string | null>(null);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);

    if (!reportAssetId) {
      setReportError("Please select an asset.");
      return;
    }
    if (!reportDescription.trim()) {
      setReportError("Please provide a description of the problem.");
      return;
    }

    startTransition(async () => {
      const res = await createMaintenanceAction(null, {
        assetId: reportAssetId,
        description: reportDescription,
        priority: reportPriority,
      });

      if (res.error) {
        setReportError(res.error);
      } else {
        setShowReportModal(false);
        setReportAssetId("");
        setReportDescription("");
        setReportPriority("MEDIUM");
        alert("Maintenance request submitted successfully. The asset is now flagged for repair.");
        router.refresh();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "PENDING_ACCEPTANCE":
        return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
      case "RETURN_REQUESTED":
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200";
      case "UNDER_MAINTENANCE":
        return "bg-orange-50 text-orange-700 border-orange-200 animate-pulse";
      case "DISPOSED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl text-xs text-green-700 font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[10px] text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-xs text-red-700 font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2">
            <span className="text-red-650">⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[10px] text-red-550 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* Header section matching mockup color */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-4 bg-purple-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-purple-900">STAFF MEMBER PORTAL</h2>
          <p className="text-[11px] sm:text-xs text-purple-600 font-semibold mt-0.5">My Assigned Assets & Requests</p>
        </div>
      </div>
      {pendingAssignments.length === -1 && <span />}

      {/* Grid of stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Assets Assigned to Me */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg"><Package size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">My Assigned Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.assignedAssets}</h3>
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Pending Confirmation</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.pendingAssignments}</h3>
          </div>
        </div>

        {/* Open Maintenance Requests */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-700 rounded-lg"><Wrench size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Active Repair Requests</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.openMaintenance}</h3>
          </div>
        </div>
      </div>

      {/* Mid section: My Assets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4">My Assigned Assets</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Asset Name</th>
                  <th className="py-2.5">Asset Code</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {myAssetsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">
                      No assets are currently assigned to you.
                    </td>
                  </tr>
                ) : (
                  myAssetsList.map((asset) => {
                    const isReturnRequested = asset.status === "RETURN_REQUESTED";
                    const displayStatusText = isReturnRequested ? "Return Requested" : "Active";

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-semibold text-slate-800">
                          <button
                            onClick={() => router.push(`/assets/${asset.id}`)}
                            className="hover:underline text-left"
                          >
                            {asset.name}
                          </button>
                        </td>
                        <td className="py-3 font-semibold text-sky-700">{asset.assetCode}</td>
                        <td className="py-3 text-slate-500">{asset.category.name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(asset.status)}`}>
                            {displayStatusText}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                            {isReturnRequested ? "Pending Return Approval" : "Accepted"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Recent Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <button
                onClick={() => setShowReportModal(true)}
                disabled={myAssetsList.length === 0}
                className="w-full flex items-center space-x-3 p-3 bg-purple-50 border border-purple-100 text-purple-800 rounded-xl text-xs font-semibold hover:bg-purple-100/80 transition-colors disabled:opacity-40"
              >
                <AlertTriangle size={16} className="text-purple-700" />
                <span>Report Damaged Asset</span>
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-semibold uppercase flex items-center space-x-1.5">
            <HelpCircle size={12} className="text-purple-500" />
            <span>Need Help? Contact PAO Office</span>
          </div>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4 flex items-center">
          <FileText size={14} className="mr-2 text-slate-400" />
          Recent Requests filed by me
        </h4>
        <div className="divide-y divide-slate-50">
          {recentRequests.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No maintenance reports filed by you yet.</p>
          ) : (
            recentRequests.map((req) => (
              <div key={req.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800">{req.asset.name}</span>
                  <span className="text-slate-400 mx-1.5">reported:</span>
                  <span className="text-slate-500 italic">&quot;{req.description.slice(0, 45)}...&quot;</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    req.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                    req.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: REPORT DAMAGE */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Report Damaged Asset</h3>

            {reportError && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {reportError}
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Damaged Asset</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={reportAssetId}
                  onChange={(e) => setReportAssetId(e.target.value)}
                >
                  <option value="">-- Choose Asset --</option>
                  {myAssetsList.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={reportPriority}
                  onChange={(e) => setReportPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                >
                  <option value="LOW">Low (Not blocking work)</option>
                  <option value="MEDIUM">Medium (Degraded performance)</option>
                  <option value="HIGH">High (Completely broken/unusable)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Problem Description</label>
                <textarea
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-24 resize-none"
                  placeholder="Please details the specific damage or issues you are experiencing with this asset..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
