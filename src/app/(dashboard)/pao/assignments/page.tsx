import React from "react";
import { prisma } from "@/lib/db";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AssignmentStatus, Prisma } from "@prisma/client";
import { AssignmentActions } from "@/components/assignment-actions";

export const revalidate = 0;

interface AssignmentsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
    tab?: string;
  };
}

export default async function PaoAssignmentsPage({ searchParams }: AssignmentsPageProps) {
  const activeTab = searchParams.tab || "PENDING";
  const page = Number(searchParams.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const searchQuery = searchParams.search || "";
  const filterStatus = (searchParams.status as AssignmentStatus) || undefined;

  // 1. Build where clause
  const where: Prisma.AssignmentWhereInput = {};
  if (activeTab === "PENDING") {
    where.status = "PENDING_ACCEPTANCE";
  } else if (activeTab === "ACCEPTED") {
    where.status = { in: ["ACCEPTED", "ACTIVE"] };
  } else if (activeTab === "RETURNS") {
    where.status = { in: ["RETURN_REQUESTED", "REJECTED"] };
  } else if (activeTab === "ALL") {
    if (filterStatus) {
      where.status = filterStatus;
    }
  }

  if (searchQuery) {
    where.OR = [
      { notes: { contains: searchQuery, mode: "insensitive" } },
      { asset: { name: { contains: searchQuery, mode: "insensitive" } } },
      { asset: { assetCode: { contains: searchQuery, mode: "insensitive" } } },
      { assignedTo: { name: { contains: searchQuery, mode: "insensitive" } } },
      { department: { name: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  // 2. Fetch assignments
  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      skip,
      take: limit,
      include: {
        asset: true,
        assignedTo: { select: { name: true, email: true } },
        department: { select: { name: true, code: true } },
        assignedBy: { select: { name: true } },
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 bg-sky-900/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-sky-900">Asset Assignments Registry</h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">Track allocations of university properties to staff members and departments</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by asset, user, department or notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-600"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={filterStatus || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Statuses --</option>
            <option value="ACTIVE">Active (Currently Assigned)</option>
            <option value="RETURNED">Returned</option>
          </select>

          <button
            type="submit"
            className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-all"
          >
            Apply Filters
          </button>

          {(searchQuery || filterStatus) && (
            <Link
              href="/pao/assignments"
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <Link
          href={`/pao/assignments?tab=PENDING&search=${searchQuery}`}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === "PENDING"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending Acceptance
        </Link>
        <Link
          href={`/pao/assignments?tab=ACCEPTED&search=${searchQuery}`}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === "ACCEPTED"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Accepted / Active
        </Link>
        <Link
          href={`/pao/assignments?tab=RETURNS&search=${searchQuery}`}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === "RETURNS"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Return/Reject Requests
        </Link>
        <Link
          href={`/pao/assignments?tab=ALL&search=${searchQuery}`}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === "ALL"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All Registry
        </Link>
      </div>

      {/* Table Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          {activeTab === "RETURNS" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Asset</th>
                  <th className="py-2.5">Staff Member</th>
                  <th className="py-2.5">Assigned Date</th>
                  <th className="py-2.5">Reason</th>
                  <th className="py-2.5">Request Date</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-semibold">
                      No return or reject requests found.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block">{assignment.asset.name}</span>
                        <span className="font-mono font-bold text-sky-700 text-[10px]">{assignment.asset.assetCode}</span>
                      </td>
                      <td className="py-3">
                        {assignment.assignedTo ? (
                          <>
                            <span className="font-semibold text-slate-800 block">{assignment.assignedTo.name}</span>
                            <span className="text-slate-400 text-[10px]">{assignment.assignedTo.email}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-semibold">-</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-slate-600 max-w-xs truncate" title={assignment.rejectionReason || undefined}>
                        {assignment.rejectionReason || <span className="text-slate-350 italic">No reason specified</span>}
                      </td>
                      <td className="py-3 text-slate-500">
                        {assignment.rejectedAt ? new Date(assignment.rejectedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          assignment.status === "RETURN_REQUESTED"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {assignment.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <AssignmentActions assignmentId={assignment.id} assetId={assignment.asset.id} status={assignment.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Asset</th>
                  <th className="py-2.5">Assigned To</th>
                  <th className="py-2.5">Assigned Date</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Authorized By</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                      No assignment records found.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block">{assignment.asset.name}</span>
                        <span className="font-mono font-bold text-sky-700 text-[10px]">{assignment.asset.assetCode}</span>
                      </td>
                      <td className="py-3">
                        {assignment.assignedTo ? (
                          <>
                            <span className="font-semibold text-slate-800 block">{assignment.assignedTo.name}</span>
                            <span className="text-slate-400 text-[10px]">{assignment.assignedTo.email}</span>
                          </>
                        ) : assignment.department ? (
                          <>
                            <span className="font-semibold text-slate-800 block">{assignment.department.name}</span>
                            <span className="text-slate-400 text-[10px]">Dept Code: {assignment.department.code}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-semibold">-</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          assignment.status === "ACCEPTED" || assignment.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : assignment.status === "PENDING_ACCEPTANCE"
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {assignment.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{assignment.assignedBy.name}</td>
                      <td className="py-3 text-right">
                        <AssignmentActions assignmentId={assignment.id} assetId={assignment.asset.id} status={assignment.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-700">{page}</span> of{" "}
              <span className="font-bold text-slate-700">{totalPages}</span> ({total} records)
            </span>
            <div className="flex space-x-1">
              <Link
                href={page > 1 ? `/pao/assignments?page=${page - 1}&search=${searchQuery}&tab=${activeTab}&status=${filterStatus || ""}` : "#"}
                className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page <= 1 ? "opacity-35..." : ""}`}
              >
                <ChevronLeft size={14} />
              </Link>
              <Link
                href={page < totalPages ? `/pao/assignments?page=${page + 1}&search=${searchQuery}&tab=${activeTab}&status=${filterStatus || ""}` : "#"}
                className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page >= totalPages ? "opacity-35..." : ""}`}
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
