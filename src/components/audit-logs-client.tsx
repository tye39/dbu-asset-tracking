"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Eye, Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";

interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    roleName: string;
  } | null;
}

interface AuditLogsClientProps {
  logs: AuditLogRecord[];
  users: { id: string; name: string; email: string }[];
  roles: { id: string; name: string }[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentFilters: {
    search: string;
    userId: string;
    roleId: string;
    action: string;
    entityType: string;
    startDate: string;
    endDate: string;
  };
}

export function AuditLogsClient({
  logs,
  users,
  roles,
  currentPage,
  totalPages,
  totalCount,
  currentFilters
}: AuditLogsClientProps) {
  const router = useRouter();

  // Search & Filter state variables
  const [search, setSearch] = useState(currentFilters.search);
  const [userId, setUserId] = useState(currentFilters.userId);
  const [roleId, setRoleId] = useState(currentFilters.roleId);
  const [action, setAction] = useState(currentFilters.action);
  const [module, setModule] = useState(currentFilters.entityType);
  const [startDate, setStartDate] = useState(currentFilters.startDate);
  const [endDate, setEndDate] = useState(currentFilters.endDate);

  // Inspector Modal states
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const applyFilters = (newPage = 1) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (userId) params.set("userId", userId);
    if (roleId) params.set("roleId", roleId);
    if (action) params.set("action", action);
    if (module) params.set("module", module);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(newPage));

    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch("");
    setUserId("");
    setRoleId("");
    setAction("");
    setModule("");
    setStartDate("");
    setEndDate("");
    router.push("/admin/audit-logs");
  };

  const getActionBadgeClass = (act: string) => {
    switch (act) {
      case "CREATE":
      case "LOGIN":
      case "SCAN_VERIFIED":
        return "bg-emerald-50 text-emerald-700 border-emerald-150";
      case "UPDATE":
      case "PASSWORD_CHANGE":
        return "bg-blue-50 text-blue-700 border-blue-150";
      case "DELETE":
      case "CANCEL":
        return "bg-red-50 text-red-700 border-red-150";
      case "LOGIN_FAILED":
      case "SCAN_DUPLICATE":
      case "SCAN_WRONG_DEPT":
      case "SCAN_INVALID":
        return "bg-amber-50 text-amber-700 border-amber-150";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getLogDescription = (log: AuditLogRecord) => {
    const { action, entityType, previousState, newState } = log;
    const prev = (previousState || {}) as Record<string, string>;
    const curr = (newState || {}) as Record<string, string>;

    switch (action) {
      case "LOGIN":
        return "User session login authenticated.";
      case "LOGIN_FAILED":
        return `Failed login attempt. Reason: ${curr.reason || "Incorrect password"}`;
      case "LOGOUT":
        return "User session logged out.";
      case "PASSWORD_CHANGE":
        return "Account password updated successfully.";
      case "CREATE":
        return `Created new ${entityType} "${curr.name || curr.title || log.entityId}".`;
      case "UPDATE":
        return `Updated ${entityType} "${curr.name || curr.title || log.entityId}".`;
      case "DELETE":
        return `Deleted ${entityType} "${prev.name || prev.title || log.entityId}".`;
      case "SCAN_VERIFIED":
        return `Verified asset "${curr.assetName || log.entityId}" during audit session.`;
      case "SCAN_DUPLICATE":
        return `Rejected duplicate scan: Asset "${curr.assetName || log.entityId}" was already counted.`;
      case "SCAN_WRONG_DEPT":
        return `Rejected scan: Asset "${curr.assetName || log.entityId}" is registered under "${curr.registeredDepartment}".`;
      case "SCAN_INVALID":
        return `Rejected scan: Unrecognized QR tag identifier "${curr.scannedTag}".`;
      case "COMPLETE":
        return `Completed inventory counting session "${curr.name || log.entityId}".`;
      case "CANCEL":
        return `Cancelled inventory counting session "${curr.name || log.entityId}".`;
      default:
        return `${action} action performed on ${entityType} module.`;
    }
  };

  const getRoleDisplayName = (rName: string) => {
    return rName.replace(/_/g, " ");
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-sky-100 pb-4">
        <h2 className="text-xl font-bold text-sky-950">System Audit Logs</h2>
        <p className="text-xs text-sky-600 font-semibold mt-1">
          Monitor, filter, and review active system logs and modifications (Read-Only)
        </p>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search action or target..."
              className="w-full p-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-sky-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* User selector */}
          <select
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>

          {/* Role selector */}
          <select
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {getRoleDisplayName(r.name)}
              </option>
            ))}
          </select>

          {/* Action selector */}
          <select
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_CHANGE">PASSWORD CHANGE</option>
            <option value="SCAN_VERIFIED">SCAN VERIFIED</option>
            <option value="SCAN_DUPLICATE">SCAN DUPLICATE</option>
            <option value="SCAN_WRONG_DEPT">SCAN WRONG DEPT</option>
            <option value="SCAN_INVALID">SCAN INVALID</option>
            <option value="COMPLETE">COMPLETE</option>
            <option value="CANCEL">CANCEL</option>
          </select>

          {/* Module Selector */}
          <select
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="">All Modules</option>
            <option value="Asset">Asset</option>
            <option value="User">User</option>
            <option value="Authentication">Authentication</option>
            <option value="AssetCategory">Asset Category</option>
            <option value="AssetType">Asset Type</option>
            <option value="Faculty">Faculty</option>
            <option value="OrganizationalUnit">Department Unit</option>
            <option value="InventorySession">Inventory Session</option>
          </select>

          {/* Date range picker */}
          <div className="flex items-center space-x-2 border border-slate-200 rounded-lg bg-slate-50 p-1">
            <Calendar size={12} className="text-slate-400 ml-1.5" />
            <input
              type="date"
              className="bg-transparent text-xs font-semibold text-slate-650 w-full focus:outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 border border-slate-200 rounded-lg bg-slate-50 p-1">
            <Calendar size={12} className="text-slate-400 ml-1.5" />
            <input
              type="date"
              className="bg-transparent text-xs font-semibold text-slate-650 w-full focus:outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Submit buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => applyFilters(1)}
              className="flex-1 p-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
            >
              <span>Search Logs</span>
            </button>
            <button
              onClick={handleReset}
              className="p-2 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
              title="Reset Filters"
            >
              <RefreshCw size={12} />
            </button>
          </div>

        </div>
      </div>

      {/* Audit Log Table display */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Database Log Registry ({totalCount} entries)
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            No system audit logs match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Responsible User</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">System Log Description</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/30 text-slate-650 transition-colors">
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {log.user ? (
                        <div>
                          <p className="font-bold text-slate-800 leading-none mb-0.5">{log.user.name}</p>
                          <p className="text-[10px] text-slate-450 leading-none">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">SYSTEM</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[9px] uppercase tracking-wider text-slate-450">
                      {log.user ? getRoleDisplayName(log.user.roleName) : "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{log.entityType}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600 leading-normal max-w-[280px] truncate">
                      {getLogDescription(log)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {log.ipAddress || "Localhost"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-slate-450 hover:text-[#0b4a6e] rounded hover:bg-slate-100 transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/20">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => applyFilters(currentPage - 1)}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => applyFilters(currentPage + 1)}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL INSPECT POPUP MODAL (Read-Only JSON preview) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <Info size={14} className="text-[#0b4a6e]" />
                  <span>Audit Entry Inspector (Read-Only)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Log ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {/* Read only state logs */}
            <div className="space-y-3">
              
              <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed border-b border-slate-50 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">User</span>
                  <span className="font-bold text-slate-700">{selectedLog.user?.name || "SYSTEM"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Action Type</span>
                  <span className="font-extrabold text-[#0b4a6e]">{selectedLog.action}</span>
                </div>
              </div>

              {/* State Diff Details */}
              <div className="space-y-2">
                
                {!!selectedLog.previousState && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Previous State</span>
                    <pre className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-[10px] font-mono leading-normal text-slate-600 max-h-40 overflow-y-auto w-full select-all">
                      {JSON.stringify(selectedLog.previousState, null, 2)}
                    </pre>
                  </div>
                )}

                {!!selectedLog.newState && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">New State</span>
                    <pre className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-[10px] font-mono leading-normal text-slate-600 max-h-40 overflow-y-auto w-full select-all">
                      {JSON.stringify(selectedLog.newState, null, 2)}
                    </pre>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
