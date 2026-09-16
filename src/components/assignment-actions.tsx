"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReturnRequestAction, cancelAssignmentAction } from "@/app/actions/assignment";
import { Check, X, RefreshCw, Eye } from "lucide-react";
import Link from "next/link";

interface AssignmentActionsProps {
  assignmentId: string;
  assetId: string;
  status: string;
}

export function AssignmentActions({ assignmentId, assetId, status }: AssignmentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    if (!confirm("Are you sure you want to approve this return request? The asset status will be reset to ACTIVE/available.")) return;
    startTransition(async () => {
      const res = await approveReturnRequestAction(null, assignmentId);
      if (res?.error) alert(res.error);
      else {
        alert("Return request approved and asset released!");
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this assignment? The asset status will be reset to ACTIVE/available.")) return;
    startTransition(async () => {
      const res = await cancelAssignmentAction(null, assignmentId);
      if (res?.error) alert(res.error);
      else {
        alert("Assignment cancelled successfully.");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "RETURN_REQUESTED" && (
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-bold transition-all text-[11px]"
        >
          <Check size={12} />
          <span>Approve Return</span>
        </button>
      )}

      {(status === "PENDING_ACCEPTANCE" || status === "ACCEPTED" || status === "ACTIVE") && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold transition-all text-[11px]"
        >
          <X size={12} />
          <span>Cancel Assignment</span>
        </button>
      )}

      {(status === "RETURN_REQUESTED" || status === "REJECTED") && (
        <Link
          href={`/assets/${assetId}`}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded font-bold transition-all text-[11px]"
        >
          <RefreshCw size={12} />
          <span>Reassign</span>
        </Link>
      )}

      <Link
        href={`/assets/${assetId}`}
        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-all text-[11px]"
      >
        <Eye size={12} />
        <span>View Asset</span>
      </Link>
    </div>
  );
}
