"use client";

import React, { useState, useTransition } from "react";
import { AssetsByStatusChart } from "./charts/assets-by-status";
import { requestTransferAction } from "@/app/actions/assignment";
import { useRouter } from "next/navigation";
import {
  Send,
  Package,
  Users,
  CheckCircle,
  History,
  X,
  Loader2,
  FileQuestion,
  FileCheck,
  FileX,
  Scale,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  user?: { name: string } | null;
  asset?: { name: string } | null;
}

interface DepartmentAssetItem {
  id: string;
  name: string;
  assetCode: string;
  status: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface StaffUserItem {
  id: string;
  name: string;
  department?: { name: string } | null;
}

interface HeadDashboardClientProps {
  stats: {
    departmentAssets: number;
    pendingTransfers: number;
    staffWithAssets: number;
    pendingRequests?: number;
    approvedRequests?: number;
    rejectedRequests?: number;
    openAppeals?: number;
    resolvedAppeals?: number;
  };
  chartData: { status: string; count: number }[];
  recentActivities: ActivityItem[];
  departmentAssetsList: DepartmentAssetItem[];
  departments: DepartmentItem[];
  staffUsers: StaffUserItem[];
}

export function HeadDashboardClient({
  stats,
  chartData,
  recentActivities,
  departmentAssetsList,
  departments,
  staffUsers,
}: HeadDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form State
  const [transferAssetId, setTransferAssetId] = useState("");
  const [transferType, setTransferType] = useState<"user" | "department">("user");
  const [transferToId, setTransferToId] = useState("");
  const [transferDeptId, setTransferDeptId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!transferAssetId) {
      setTransferError("Please select an asset.");
      return;
    }
    if (transferType === "user" && !transferToId) {
      setTransferError("Please select a staff member.");
      return;
    }
    if (transferType === "department" && !transferDeptId) {
      setTransferError("Please select a department.");
      return;
    }

    startTransition(async () => {
      const res = await requestTransferAction(null, {
        assetId: transferAssetId,
        toUserId: transferType === "user" ? transferToId : undefined,
        toDepartmentId: transferType === "department" ? transferDeptId : undefined,
        notes: transferNotes,
      });

      if (res.error) {
        setTransferError(res.error);
      } else {
        setShowTransferModal(false);
        setTransferAssetId("");
        setTransferToId("");
        setTransferDeptId("");
        setTransferNotes("");
        alert("Transfer request submitted successfully!");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section matching mockup color */}
      <div className="flex items-center justify-between border-b border-green-100 pb-4 bg-green-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-green-900">DEPARTMENT HEAD WORKSPACE</h2>
          <p className="text-xs text-green-600 font-semibold mt-1">Department Assets & Resource Allocation</p>
        </div>
      </div>

      {/* Grid of stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-green-50 text-green-700 rounded-lg"><Package size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Department Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.departmentAssets}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg"><Users size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Staff with Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.staffWithAssets}</h3>
          </div>
        </div>

        <div
          onClick={() => router.push("/head/asset-requests")}
          className="bg-white p-4 rounded-xl shadow-sm border border-amber-200/80 hover:border-amber-400 cursor-pointer transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform"><FileQuestion size={20} /></div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Pending Requests</p>
              {(stats.pendingRequests ?? 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <h3 className="text-lg font-bold text-amber-700 mt-0.5">{stats.pendingRequests ?? 0}</h3>
          </div>
        </div>

        <div
          onClick={() => router.push("/head/appeals")}
          className="bg-white p-4 rounded-xl shadow-sm border border-purple-200/80 hover:border-purple-400 cursor-pointer transition-all flex items-center space-x-3 group"
        >
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-105 transition-transform"><Scale size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Active Appeals</p>
            <h3 className="text-lg font-bold text-purple-700 mt-0.5">{stats.openAppeals ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><FileCheck size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Approved / Fulfilled</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.approvedRequests ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><FileX size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Rejected Requests</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.rejectedRequests ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><CheckCircle size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Resolved Appeals</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.resolvedAppeals ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-lg"><Send size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Pending Transfers</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.pendingTransfers}</h3>
          </div>
        </div>
      </div>

      {/* Mid section: Chart and actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase">Department Assets by Status</h4>
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold">Scoped to Dept</span>
          </div>
          <AssetsByStatusChart data={chartData} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-3">Management Consoles</h4>
            <div className="space-y-2">
              <button
                onClick={() => router.push("/head/asset-requests")}
                className="w-full flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200/60 text-amber-900 rounded-xl text-xs font-semibold hover:bg-amber-100/70 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileQuestion size={16} className="text-amber-700" />
                  <span>Review Staff Requests</span>
                </span>
                {(stats.pendingRequests ?? 0) > 0 && (
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {stats.pendingRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push("/head/staff")}
                className="w-full flex items-center justify-between p-2.5 bg-sky-50/70 border border-sky-200/60 text-sky-900 rounded-xl text-xs font-semibold hover:bg-sky-100/70 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-sky-700" />
                  <span>Staff Directory & Assets</span>
                </span>
                <ArrowRight size={14} className="text-sky-400" />
              </button>

              <button
                onClick={() => router.push("/head/audit-logs")}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-slate-600" />
                  <span>Staff Audit Logs</span>
                </span>
                <ArrowRight size={14} className="text-slate-400" />
              </button>

              <button
                onClick={() => router.push("/head/appeals")}
                className="w-full flex items-center justify-between p-2.5 bg-purple-50/70 border border-purple-200/60 text-purple-900 rounded-xl text-xs font-semibold hover:bg-purple-100/70 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Scale size={16} className="text-purple-700" />
                  <span>Appeals & Escalations</span>
                </span>
                <ArrowRight size={14} className="text-purple-400" />
              </button>

              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full flex items-center justify-between p-2.5 bg-green-50/70 border border-green-200/60 text-green-900 rounded-xl text-xs font-semibold hover:bg-green-100/70 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Send size={16} className="text-green-700" />
                  <span>Request Asset Transfer</span>
                </span>
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-semibold uppercase flex items-center space-x-1.5">
            <CheckCircle size={12} className="text-green-500" />
            <span>DBU Resource Management</span>
          </div>
        </div>
      </div>

      {/* Recent Activities list */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4 flex items-center">
          <History size={14} className="mr-2 text-slate-400" />
          Recent Department Activities
        </h4>
        <div className="divide-y divide-slate-50">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No activity logs recorded for this department.</p>
          ) : (
            recentActivities.map((log) => (
              <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 capitalize">{log.action.toLowerCase().replace(/_/g, " ")}</span>
                  <span className="text-slate-400 mx-1.5">on</span>
                  <span className="text-green-700 font-semibold">{log.asset?.name || log.entityType}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">By {log.user?.name || "System"}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: REQUEST TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Request Transfer</h3>

            {transferError && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Department Asset</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={transferAssetId}
                  onChange={(e) => setTransferAssetId(e.target.value)}
                >
                  <option value="">-- Choose Asset --</option>
                  {departmentAssetsList.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode}) - {asset.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer Destination</label>
                <div className="flex space-x-4 mb-2">
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-green-700"
                      name="transferType"
                      checked={transferType === "user"}
                      onChange={() => setTransferType("user")}
                    />
                    Staff Member
                  </label>
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-green-700"
                      name="transferType"
                      checked={transferType === "department"}
                      onChange={() => setTransferType("department")}
                    />
                    Department
                  </label>
                </div>

                {transferType === "user" ? (
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                  >
                    <option value="">-- Select Target User --</option>
                    {staffUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.department?.name || "No Dept"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={transferDeptId}
                    onChange={(e) => setTransferDeptId(e.target.value)}
                  >
                    <option value="">-- Select Target Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Justification</label>
                <textarea
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                  placeholder="Explain why this transfer is needed..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
