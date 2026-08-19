import React from "react";
import { prisma } from "@/lib/db";
import { Eye } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AssignmentStatus } from "@prisma/client";

export const revalidate = 0;

export default async function StaffAssetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch assigned assets
  const activeAssignments = await prisma.assignment.findMany({
    where: {
      assignedToId: userId,
      status: AssignmentStatus.ACTIVE,
    },
    include: {
      asset: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "ASSIGNED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_MAINTENANCE":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-100 pb-4 bg-purple-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-purple-900">My Assigned Assets</h2>
          <p className="text-xs text-purple-600 font-semibold mt-1">Full list of university properties currently registered under your name</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5">Asset Code</th>
                <th className="py-2.5">Asset Name</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Assigned Date</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {activeAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                    You do not have any assigned assets.
                  </td>
                </tr>
              ) : (
                activeAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-sky-700">{a.asset.assetCode}</td>
                    <td className="py-3 font-semibold text-slate-800">
                      {a.asset.name}
                      <span className="block text-[10px] text-slate-400 font-normal">SN: {a.asset.serialNumber}</span>
                    </td>
                    <td className="py-3 text-slate-500">{a.asset.category.name}</td>
                    <td className="py-3 text-slate-400">{new Date(a.assignedAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(a.asset.status)}`}>
                        {a.asset.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/assets/${a.asset.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded font-bold transition-all text-[11px]"
                      >
                        <Eye size={12} />
                        <span>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
