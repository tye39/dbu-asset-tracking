import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { RoleName, AssignmentStatus } from "@prisma/client";
import { Users, Mail, Phone, Package, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function HeadStaffPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const deptId = session.user.departmentId;
  if (!deptId) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
        You are not assigned to any faculty department. Contact System Administrator.
      </div>
    );
  }

  const [department, staffMembers] = await Promise.all([
    prisma.organizationalUnit.findUnique({
      where: { id: deptId },
      select: { name: true, code: true }
    }),
    prisma.user.findMany({
      where: {
        departmentId: deptId,
        role: { name: RoleName.STAFF_MEMBER },
        deletedAt: null,
      },
      include: {
        assignmentsTo: {
          where: { status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED] } },
          select: { id: true },
        },
        assetRequestsRequested: {
          select: { id: true, status: true },
        },
      },
      orderBy: { name: "asc" }
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-100 pb-4 bg-green-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-green-900">Department Staff Directory</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 flex items-center">
              <ShieldCheck size={12} className="mr-1" />
              {department?.name || "My Department"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-green-600 font-semibold mt-0.5">
            Faculty staff members under your departmental supervision, their assigned properties, and active requests
          </p>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffMembers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-xs">No staff members registered in this department yet.</p>
          </div>
        ) : (
          staffMembers.map((staff) => {
            const activeAssetCount = staff.assignmentsTo.length;
            const pendingReqCount = staff.assetRequestsRequested.filter(
              (r) => r.status === "PENDING_DEPARTMENT_HEAD"
            ).length;

            return (
              <div
                key={staff.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-green-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{staff.name}</h3>
                    <p className="text-[10px] font-mono font-semibold text-slate-400">
                      ID: {staff.employeeId || "N/A"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                    Staff
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center space-x-2">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  {staff.phoneNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{staff.phoneNumber}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Assigned Assets</span>
                    <span className="text-sm font-bold text-emerald-700 flex items-center justify-center mt-0.5">
                      <Package size={12} className="mr-1" />
                      {activeAssetCount}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Pending Requests</span>
                    <span className="text-sm font-bold text-amber-700 flex items-center justify-center mt-0.5">
                      <FileText size={12} className="mr-1" />
                      {pendingReqCount}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Link
                    href={`/head/audit-logs?staffId=${staff.id}`}
                    className="text-[11px] font-bold text-green-700 hover:text-green-800 hover:underline"
                  >
                    View Staff Activity Logs &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
