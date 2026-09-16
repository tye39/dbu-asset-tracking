"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAuditSessionAction,
  scanPhysicalAssetAction,
  updateAuditItemStatusAction,
  completeAuditSessionAction
} from "@/app/actions/audit-session";
import {
  Play,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  Search,
  XCircle,
  Plus,
  Loader2,
  FileText,
  Printer
} from "lucide-react";
import { AuditSessionStatus, AuditItemStatus, ReturnCondition } from "@prisma/client";

interface AuditSessionItemDetails {
  id: string;
  status: AuditItemStatus;
  physicalCondition: ReturnCondition;
  scannedAt: Date | null;
  notes: string | null;
  asset: {
    name: string;
    assetCode: string;
    serialNumber: string;
    status: string;
  };
}

interface AuditSessionDetails {
  id: string;
  title: string;
  status: AuditSessionStatus;
  startDate: Date;
  endDate: Date | null;
  auditor: { name: string };
  items: AuditSessionItemDetails[];
}

interface AuditManagementClientProps {
  sessions: AuditSessionDetails[];
}

export function AuditManagementClient({ sessions }: AuditManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected session details
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || "");
  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  // Form states for creating new session
  const [newTitle, setNewTitle] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form states for scanning
  const [scanCode, setScanCode] = useState("");
  const [scanCondition, setScanCondition] = useState<ReturnCondition>(ReturnCondition.GOOD);
  const [scanNotes, setScanNotes] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // Search filter for audit items list
  const [itemSearch, setItemSearch] = useState("");

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newTitle.trim()) return;

    startTransition(async () => {
      const res = await createAuditSessionAction(null, newTitle.trim());
      if (res.error) {
        setCreateError(res.error);
      } else {
        setNewTitle("");
        setShowCreateModal(false);
        if (res.auditSessionId) setSelectedSessionId(res.auditSessionId);
        alert("Physical audit session started successfully!");
        router.refresh();
      }
    });
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    setScanSuccess(null);
    if (!scanCode.trim() || !selectedSessionId) return;

    startTransition(async () => {
      const res = await scanPhysicalAssetAction(null, {
        auditSessionId: selectedSessionId,
        assetCode: scanCode.trim(),
        physicalCondition: scanCondition,
        notes: scanNotes.trim() || undefined,
      });

      if (res.error) {
        setScanError(res.error);
      } else {
        setScanSuccess(`Scanned successfully: "${res.assetName}" marked as ${res.status?.toLowerCase()}!`);
        setScanCode("");
        setScanNotes("");
        router.refresh();
      }
    });
  };

  const handleUpdateStatus = (itemId: string, status: AuditItemStatus) => {
    const notes = prompt(`Enter optional remarks for marking this item as ${status.toLowerCase()}:`);
    if (notes === null) return; // cancelled

    startTransition(async () => {
      const res = await updateAuditItemStatusAction(null, {
        itemId,
        status,
        notes: notes || undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        alert(`Status updated for "${res.assetName}"!`);
        router.refresh();
      }
    });
  };

  const handleCompleteSession = () => {
    if (!confirm("Are you sure you want to complete this audit? All remaining unscanned assets will be automatically marked as MISSING.")) return;

    startTransition(async () => {
      const res = await completeAuditSessionAction(null, selectedSessionId);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Audit session completed successfully!");
        router.refresh();
      }
    });
  };

  // Filter items
  const filteredItems = activeSession?.items.filter((item) => {
    const q = itemSearch.toLowerCase();
    return (
      item.asset.name.toLowerCase().includes(q) ||
      item.asset.assetCode.toLowerCase().includes(q) ||
      item.asset.serialNumber.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  }) || [];

  // Stats calculation
  const totalItems = activeSession?.items.length || 0;
  const matchedItems = activeSession?.items.filter(i => i.status === AuditItemStatus.MATCHED).length || 0;
  const missingItems = activeSession?.items.filter(i => i.status === AuditItemStatus.MISSING).length || 0;
  const discrepancyItems = activeSession?.items.filter(i => i.status === AuditItemStatus.DISCREPANCY).length || 0;
  const pendingItems = activeSession?.items.filter(i => i.status === AuditItemStatus.PENDING).length || 0;

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Select Audit Session:</label>
          <select
            className="p-1.5 bg-white border border-slate-200 rounded text-xs focus:outline-none"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            <option value="">-- Choose Session --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status.toLowerCase()})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold transition-all shadow-sm"
        >
          <Plus size={14} />
          <span>New Audit Session</span>
        </button>
      </div>

      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Session details & Scanner */}
          <div className="space-y-6 lg:col-span-1">
            {/* Session Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                  activeSession.status === AuditSessionStatus.IN_PROGRESS
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}>
                  {activeSession.status.toLowerCase().replace(/_/g, " ")}
                </span>
                <h3 className="text-sm font-bold text-slate-800 uppercase mt-2">{activeSession.title}</h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Audited by {activeSession.auditor.name} | Started: {new Date(activeSession.startDate).toLocaleDateString()}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>Inspection Completion</span>
                  <span>{totalItems > 0 ? Math.round(((totalItems - pendingItems) / totalItems) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 transition-all duration-300"
                    style={{ width: `${totalItems > 0 ? ((totalItems - pendingItems) / totalItems) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 font-bold text-[9px] block">MATCHED</span>
                  <span className="text-teal-700 font-bold text-sm">{matchedItems}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 font-bold text-[9px] block">MISSING</span>
                  <span className="text-red-700 font-bold text-sm">{missingItems}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 font-bold text-[9px] block">DISCREPANCIES</span>
                  <span className="text-amber-700 font-bold text-sm">{discrepancyItems}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400 font-bold text-[9px] block">PENDING</span>
                  <span className="text-slate-600 font-bold text-sm">{pendingItems}</span>
                </div>
              </div>

              {activeSession.status === AuditSessionStatus.IN_PROGRESS && (
                <button
                  onClick={handleCompleteSession}
                  disabled={isPending}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-all shadow-sm"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />}
                  Complete Audit Session
                </button>
              )}
            </div>

            {/* Verification scanner tool */}
            {activeSession.status === AuditSessionStatus.IN_PROGRESS && (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase flex items-center pb-2 border-b border-slate-50">
                  <ClipboardList size={14} className="mr-1.5 text-teal-600" />
                  Physical Asset Scanner
                </h4>

                {scanError && <div className="p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">{scanError}</div>}
                {scanSuccess && <div className="p-2.5 bg-green-50 border-l-4 border-green-500 rounded text-xs text-green-700 font-semibold">{scanSuccess}</div>}

                <form onSubmit={handleScanSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Scan / Enter Asset Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DBU-LAP-001"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold focus:outline-none"
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Physical Condition</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                      value={scanCondition}
                      onChange={(e) => setScanCondition(e.target.value as ReturnCondition)}
                    >
                      <option value="GOOD">Good / Functional</option>
                      <option value="DAMAGED">Damaged / Needs repair</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Notes / Remarks (Optional)</label>
                    <textarea
                      placeholder="e.g. Verified in Room 102."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs h-16 resize-none focus:outline-none"
                      value={scanNotes}
                      onChange={(e) => setScanNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-all shadow-sm"
                  >
                    {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                    Verify & Scanned Item
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right panel: expected assets list & discrepancy reports */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase flex items-center">
                  <FileText size={14} className="mr-1.5 text-teal-600" />
                  Audit Scope Assets Registry
                </h4>
                <div className="flex items-center space-x-2">
                  {/* Discrepancy report print button */}
                  <Link
                    href={`/reports/print?type=audits`}
                    target="_blank"
                    className="flex items-center space-x-1.5 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-extrabold text-slate-600 transition-all"
                  >
                    <Printer size={10} />
                    <span>Print Discrepancy Report</span>
                  </Link>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter assets by name, code, serial number..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Table */}
              <div className="overflow-y-auto max-h-[400px] border border-slate-50 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                      <th className="py-2 px-3">Asset</th>
                      <th className="py-2 px-3">System Status</th>
                      <th className="py-2 px-3">Audit Status</th>
                      <th className="py-2 px-3">Condition</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          No items match filter.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{item.asset.name}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-400 block">{item.asset.assetCode} | SN: {item.asset.serialNumber}</span>
                          </td>
                          <td className="py-3 px-3 uppercase text-[9px] font-bold text-slate-500">
                            {item.asset.status.replace(/_/g, " ")}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                              item.status === AuditItemStatus.MATCHED ? "bg-green-50 text-green-700 border-green-200" :
                              item.status === AuditItemStatus.MISSING ? "bg-red-50 text-red-700 border-red-200" :
                              item.status === AuditItemStatus.DISCREPANCY ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-400 border-slate-200"
                            }`}>
                              {item.status.toLowerCase()}
                            </span>
                            {item.notes && <span className="block text-[8px] text-slate-400 italic mt-0.5">{item.notes}</span>}
                          </td>
                          <td className="py-3 px-3 uppercase text-[9px] font-bold text-slate-500">
                            {item.scannedAt ? item.physicalCondition : "-"}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            {activeSession.status === AuditSessionStatus.IN_PROGRESS && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, AuditItemStatus.MISSING)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Mark as Missing"
                                >
                                  <XCircle size={14} />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, AuditItemStatus.DISCREPANCY)}
                                  className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                  title="Mark as Discrepancy"
                                >
                                  <AlertTriangle size={14} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm text-center">
          <HelpCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700 uppercase">No active audit sessions</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click the &quot;New Audit Session&quot; button above to start verifying physical campus properties against the registry.
          </p>
        </div>
      )}

      {/* Modal: Create Audit Session */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Start Physical Inventory Audit</h3>

            {createError && <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">{createError}</div>}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Audit Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 2026 Technology Faculty Verification"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Play size={12} className="mr-1.5" />}
                  Launch Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
