"use client";

import React, { useState, useTransition } from "react";
import { Trash2, Eye, Loader2, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { deleteAssetAction } from "@/app/actions/asset";
import { useRouter } from "next/navigation";

interface PaoAssetActionsProps {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetTypeName: string;
  status: string;
  userRole: string;
}

export function PaoAssetActions({
  assetId,
  assetName,
  assetCode,
  assetTypeName,
  status,
  userRole,
}: PaoAssetActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isAuthorized = userRole === "PROPERTY_ADMINISTRATION_OFFICER" || userRole === "SYSTEM_ADMINISTRATOR";

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteAssetAction(null, assetId);
      if (res?.error) {
        alert(res.error);
      } else {
        alert("Asset deleted successfully.");
        setShowModal(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2.5">
        <Link
          href={`/assets/${assetId}`}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-650 rounded font-bold transition-all text-[11px]"
        >
          <Eye size={12} />
          <span>Details</span>
        </Link>

        {isAuthorized && (
          <button
            onClick={() => setShowModal(true)}
            title="Delete Asset"
            className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50/50">
              <div className="flex items-center space-x-2 text-red-750">
                <AlertTriangle size={18} />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Delete Asset?</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you sure you want to delete this asset? This action cannot be undone.
              </p>

              {/* Asset Info Card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs space-y-1.5 font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Asset Name:</span>
                  <span className="text-slate-800">{assetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Asset Type:</span>
                  <span className="text-slate-800">{assetTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Asset Tag/ID:</span>
                  <span className="text-sky-750 font-mono font-bold">{assetCode}</span>
                </div>
              </div>

              {/* Assigned Warning */}
              {status === "ASSIGNED" && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <span>Warning: This asset is currently assigned. Deleting it will terminate its active assignment.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-650 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={12} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Asset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
