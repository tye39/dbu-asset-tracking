"use client";

import React, { useState, useTransition } from "react";
import { AssetsByCategoryChart } from "./charts/assets-by-category";
import { assignAssetAction, requestTransferAction } from "@/app/actions/assignment";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Send,
  UserCheck,
  Package,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Hourglass,
  Building,
  TrendingUp,
  Loader2,
  X,
  PackageCheck,
  Scale,
  ArrowRight
} from "lucide-react";

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  user?: { name: string } | null;
}

interface AssetOptionItem {
  id: string;
  name: string;
  assetCode: string;
}

interface StaffUserOptionItem {
  id: string;
  name: string;
  department?: { name: string } | null;
}

interface DepartmentOptionItem {
  id: string;
  name: string;
  code: string;
}

interface PaoDashboardClientProps {
  stats: {
    totalAssets: number;
    availableAssets: number;
    assignedAssets: number;
    underMaintenance: number;
    pendingTransfers: number;
    disposedAssets: number;
    pendingMaintenances: number;
    totalCategories: number;
    pendingAssetRequests?: number;
    pendingAppeals?: number;
  };
  chartData: { category: string; count: number }[];
  recentActivities: ActivityLogItem[];
  activeAssets: AssetOptionItem[];
  staffUsers: StaffUserOptionItem[];
  departments: DepartmentOptionItem[];
}

export function PaoDashboardClient({
  stats,
  chartData,
  recentActivities,
  activeAssets,
  staffUsers,
  departments,
}: PaoDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states
  const [assignAssetId, setAssignAssetId] = useState("");
  const [assignType, setAssignType] = useState<"user" | "department">("user");
  const [assignToId, setAssignToId] = useState("");
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const [transferAssetId, setTransferAssetId] = useState("");
  const [transferType, setTransferType] = useState<"user" | "department">("user");
  const [transferToId, setTransferToId] = useState("");
  const [transferDeptId, setTransferDeptId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (!assignAssetId) {
      setAssignError("Please select an asset.");
      return;
    }
    if (assignType === "user" && !assignToId) {
      setAssignError("Please select a staff member.");
      return;
    }
    if (assignType === "department" && !assignDeptId) {
      setAssignError("Please select a department.");
      return;
    }

    startTransition(async () => {
      const res = await assignAssetAction(null, {
        assetId: assignAssetId,
        assignedToId: (assignType === "user" && assignToId) ? assignToId : undefined,
        departmentId: (assignType === "department" && assignDeptId) ? assignDeptId : undefined,
        notes: assignNotes,
      });

      if (res.error) {
        setAssignError(res.error);
      } else {
        setShowAssignModal(false);
        setAssignAssetId("");
        setAssignToId("");
        setAssignDeptId("");
        setAssignNotes("");
        alert("Asset assigned successfully!");
        router.refresh();
      }
    });
  };

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
        alert("Transfer request created successfully!");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section matching mockup color */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-sky-100 pb-4 bg-sky-900/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-sky-900">PROPERTY ADMINISTRATION OFFICER</h2>
          <p className="text-[11px] sm:text-xs text-sky-600 font-semibold mt-0.5">Management Hub & Asset Lifecycle Controller</p>
        </div>
      </div>

      {/* Grid of 8 stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg"><Package size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.totalAssets}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Available Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.availableAssets}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><UserCheck size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Assigned Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.assignedAssets}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">In Maintenance</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.underMaintenance}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Send size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Pending Transfers</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.pendingTransfers}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><Trash2 size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Disposed Assets</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.disposedAssets}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Hourglass size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Pending Maintenances</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.pendingMaintenances}</h3>
          </div>
        </div>

        <div
          onClick={() => router.push("/pao/asset-requests")}
          className="bg-white p-4 rounded-xl shadow-sm border border-amber-200/80 hover:border-amber-400 cursor-pointer transition-all flex items-center space-x-4 group"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform"><PackageCheck size={20} /></div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Requests to Fulfill</p>
              {(stats.pendingAssetRequests ?? 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <h3 className="text-lg font-bold text-amber-700 mt-0.5">{stats.pendingAssetRequests ?? 0}</h3>
          </div>
        </div>

        <div
          onClick={() => router.push("/pao/appeals")}
          className="bg-white p-4 rounded-xl shadow-sm border border-purple-200/80 hover:border-purple-400 cursor-pointer transition-all flex items-center space-x-4 group"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-105 transition-transform"><Scale size={20} /></div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Active Appeals</p>
              {(stats.pendingAppeals ?? 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              )}
            </div>
            <h3 className="text-lg font-bold text-purple-700 mt-0.5">{stats.pendingAppeals ?? 0}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg"><Building size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Asset Categories</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.totalCategories}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart, Quick Actions & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase">Asset Categorical Distribution</h4>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold">Real-time counts</span>
          </div>
          <AssetsByCategoryChart data={chartData} />
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4">Quick Actions</h4>
            <div className="space-y-2.5">
              <button
                onClick={() => router.push("/pao/asset-requests")}
                className="w-full flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <PackageCheck size={16} className="text-amber-700" />
                  <span>Fulfill Asset Requests</span>
                </span>
                {(stats.pendingAssetRequests ?? 0) > 0 ? (
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {stats.pendingAssetRequests}
                  </span>
                ) : (
                  <ArrowRight size={13} className="text-amber-500" />
                )}
              </button>

              <button
                onClick={() => router.push("/pao/appeals")}
                className="w-full flex items-center justify-between p-2.5 bg-purple-50/80 border border-purple-200 text-purple-900 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Scale size={16} className="text-purple-700" />
                  <span>Review Department Appeals</span>
                </span>
                {(stats.pendingAppeals ?? 0) > 0 ? (
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {stats.pendingAppeals}
                  </span>
                ) : (
                  <ArrowRight size={13} className="text-purple-500" />
                )}
              </button>

              <button
                onClick={() => router.push("/pao/assets/new")}
                className="w-full flex items-center space-x-3 p-2.5 bg-sky-50 border border-sky-100 text-sky-800 rounded-xl text-xs font-semibold hover:bg-sky-100 transition-colors"
              >
                <Plus size={16} className="text-sky-600" />
                <span>Register New Asset</span>
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full flex items-center space-x-3 p-2.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <UserCheck size={16} className="text-blue-600" />
                <span>Assign Asset to User/Dept</span>
              </button>

              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full flex items-center space-x-3 p-2.5 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-xs font-semibold hover:bg-yellow-100 transition-colors"
              >
                <Send size={16} className="text-yellow-600" />
                <span>Initiate Asset Transfer</span>
              </button>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="flex items-center text-[10px] text-slate-400 font-semibold uppercase space-x-1.5">
              <TrendingUp size={12} className="text-green-500" />
              <span>Asset Health: Good</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4 flex items-center">
          <FileText size={14} className="mr-2 text-slate-400" />
          Recent Transaction logs
        </h4>
        <div className="divide-y divide-slate-50">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No transactions logged yet.</p>
          ) : (
            recentActivities.map((log) => (
              <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 capitalize">{log.action.toLowerCase().replace(/_/g, " ")}</span>
                  <span className="text-slate-400 mx-1.5">on</span>
                  <span className="text-[#0b4a6e] font-semibold">{log.entityType}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">By {log.user?.name || "System"}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.createdAt).toLocaleDateString()} at{" "}
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: ASSIGN ASSET */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Assign Asset</h3>

            {assignError && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Asset</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={assignAssetId}
                  onChange={(e) => setAssignAssetId(e.target.value)}
                >
                  <option value="">-- Choose Asset --</option>
                  {activeAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Target</label>
                <div className="flex space-x-4 mb-2">
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-sky-600"
                      name="assignType"
                      checked={assignType === "user"}
                      onChange={() => setAssignType("user")}
                    />
                    Staff Member
                  </label>
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-sky-600"
                      name="assignType"
                      checked={assignType === "department"}
                      onChange={() => setAssignType("department")}
                    />
                    Department
                  </label>
                </div>

                {assignType === "user" ? (
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={assignToId}
                    onChange={(e) => setAssignToId(e.target.value)}
                  >
                    <option value="">-- Select Staff Member --</option>
                    {staffUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.department?.name || "No Dept"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes / Description</label>
                <textarea
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                  placeholder="Optional assignment remarks..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: TRANSFER ASSET */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Request Asset Transfer</h3>

            {transferError && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Asset</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={transferAssetId}
                  onChange={(e) => setTransferAssetId(e.target.value)}
                >
                  <option value="">-- Choose Asset --</option>
                  {activeAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transfer Recipient</label>
                <div className="flex space-x-4 mb-2">
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-sky-600"
                      name="transferType"
                      checked={transferType === "user"}
                      onChange={() => setTransferType("user")}
                    />
                    Staff Member
                  </label>
                  <label className="flex items-center text-xs font-semibold text-slate-600">
                    <input
                      type="radio"
                      className="mr-1.5 text-sky-600"
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
                    <option value="">-- Select Recipient User --</option>
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
                    <option value="">-- Select Recipient Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Justification / Reason</label>
                <textarea
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                  placeholder="Explain why this asset transfer is requested..."
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
                  className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center"
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
