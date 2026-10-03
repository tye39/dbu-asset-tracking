"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  ArrowUpDown,
  Filter,
  ExternalLink,
  Loader2,
  Package,
  CheckCircle,
  UserCheck,
  AlertTriangle,
  Send,
  Trash2,
  Hourglass,
  PackageCheck,
  Scale,
  Building,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  CornerDownRight,
  RefreshCw,
  Download
} from "lucide-react";
import { getPaoStatRecordsAction, PaoStatCardType } from "@/app/actions/pao-stats";

interface PaoStatDetailsModalProps {
  cardType: PaoStatCardType | null;
  onClose: () => void;
  initialCount?: number;
}

export function PaoStatDetailsModal({
  cardType,
  onClose,
  initialCount = 0,
}: PaoStatDetailsModalProps) {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "date" | "code" | "cost">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Category drill-down state (for Card 10)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (cardType) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [cardType]);

  // Fetch data on cardType change
  useEffect(() => {
    if (!cardType) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setSearchQuery("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setConditionFilter("ALL");
    setPriorityFilter("ALL");
    setSelectedCategoryName(null);
    setCurrentPage(1);

    getPaoStatRecordsAction(cardType)
      .then((res) => {
        if (!isMounted) return;
        if (res.error) {
          setError(res.error);
        } else if (res.records) {
          setRecords(res.records);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load records.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cardType]);

  // Card Meta Configurations (Icon, Title, Theme, Empty Text, Target Link)
  const meta = useMemo(() => {
    switch (cardType) {
      case "TOTAL_ASSETS":
        return {
          title: "Total Assets",
          subtitle: "Complete catalog of every registered institutional asset",
          icon: Package,
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          accentColor: "sky",
          emptyText: "No registered assets found in the system.",
          fullPageLink: "/pao/assets",
          fullPageLabel: "Open Assets Catalog",
        };
      case "AVAILABLE_ASSETS":
        return {
          title: "Available Assets",
          subtitle: "Unassigned equipment ready for immediate department allocation",
          icon: CheckCircle,
          bg: "bg-green-50 text-green-700 border-green-200",
          accentColor: "green",
          emptyText: "No available assets found. All assets are currently assigned or in maintenance.",
          fullPageLink: "/pao/assets?status=ACTIVE",
          fullPageLabel: "Open Available Assets",
        };
      case "ASSIGNED_ASSETS":
        return {
          title: "Assigned Assets",
          subtitle: "Equipment currently in active custodian custody across university units",
          icon: UserCheck,
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          accentColor: "blue",
          emptyText: "No assigned assets found.",
          fullPageLink: "/pao/assignments",
          fullPageLabel: "Open Assignments Page",
        };
      case "IN_MAINTENANCE":
        return {
          title: "In Maintenance",
          subtitle: "Assets undergoing technical inspection, diagnosis, or active repair",
          icon: AlertTriangle,
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          accentColor: "orange",
          emptyText: "No assets currently under maintenance.",
          fullPageLink: "/pao/assets?status=UNDER_MAINTENANCE",
          fullPageLabel: "Filter Assets in Maintenance",
        };
      case "PENDING_TRANSFERS":
        return {
          title: "Pending Transfers",
          subtitle: "Inter-departmental and custodian transfer requests awaiting review",
          icon: Send,
          bg: "bg-yellow-50 text-yellow-700 border-yellow-200",
          accentColor: "yellow",
          emptyText: "No pending asset transfer requests found.",
          fullPageLink: null,
          fullPageLabel: null,
        };
      case "DISPOSED_ASSETS":
        return {
          title: "Disposed Assets",
          subtitle: "Decommissioned, sold, recycled, or written-off university property",
          icon: Trash2,
          bg: "bg-red-50 text-red-700 border-red-200",
          accentColor: "red",
          emptyText: "No disposed assets found in the archive.",
          fullPageLink: "/pao/assets?status=DISPOSED",
          fullPageLabel: "View Disposed Archive",
        };
      case "PENDING_MAINTENANCES":
        return {
          title: "Pending Maintenances",
          subtitle: "Service tickets submitted by departments awaiting technician triage",
          icon: Hourglass,
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          accentColor: "indigo",
          emptyText: "No pending maintenance service tickets found.",
          fullPageLink: null,
          fullPageLabel: null,
        };
      case "REQUESTS_TO_FULFILL":
        return {
          title: "Requests to Fulfill",
          subtitle: "Requisitions endorsed by Department Heads awaiting property allocation",
          icon: PackageCheck,
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          accentColor: "amber",
          emptyText: "No asset requisitions awaiting property fulfillment.",
          fullPageLink: "/pao/asset-requests",
          fullPageLabel: "Open Requisitions Portal",
        };
      case "ACTIVE_APPEALS":
        return {
          title: "Active Appeals",
          subtitle: "Department escalations requiring formal property management review",
          icon: Scale,
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          accentColor: "purple",
          emptyText: "No active property appeals awaiting review.",
          fullPageLink: "/pao/appeals",
          fullPageLabel: "Open Appeals Management",
        };
      case "ASSET_CATEGORIES":
        return {
          title: "Asset Categories",
          subtitle: "Classification taxonomy and distribution of equipment by category",
          icon: Building,
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          accentColor: "teal",
          emptyText: "No asset categories defined.",
          fullPageLink: "/pao/assets",
          fullPageLabel: "Catalog Overview",
        };
      default:
        return null;
    }
  }, [cardType]);

  // Filtered & Sorted Records
  const processedRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    let result = [...records];

    // Filter by category drilldown if in ASSET_CATEGORIES
    if (cardType === "ASSET_CATEGORIES" && selectedCategoryName) {
      const selectedCat = records.find((c) => c.name === selectedCategoryName);
      result = selectedCat ? selectedCat.assets : [];
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item: any) => {
        // Universal search fields
        const name = item.name?.toLowerCase() || "";
        const code = item.assetCode?.toLowerCase() || item.code?.toLowerCase() || item.requestNumber?.toLowerCase() || item.appealNumber?.toLowerCase() || "";
        const serial = item.serialNumber?.toLowerCase() || "";
        const dept = item.department?.name?.toLowerCase() || item.fromDepartment?.name?.toLowerCase() || item.toDepartment?.name?.toLowerCase() || "";
        const person = item.assignedTo?.name?.toLowerCase() || item.user?.name?.toLowerCase() || item.departmentHead?.name?.toLowerCase() || item.reportedBy?.name?.toLowerCase() || item.requestedBy?.name?.toLowerCase() || "";
        const reason = item.reason?.toLowerCase() || item.notes?.toLowerCase() || item.description?.toLowerCase() || item.subject?.toLowerCase() || "";
        const category = item.category?.name?.toLowerCase() || "";

        return (
          name.includes(q) ||
          code.includes(q) ||
          serial.includes(q) ||
          dept.includes(q) ||
          person.includes(q) ||
          reason.includes(q) ||
          category.includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((item: any) => {
        const s = item.status || item.asset?.status;
        return s === statusFilter;
      });
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      result = result.filter((item: any) => {
        const cat = item.category?.name || item.asset?.category?.name;
        return cat === categoryFilter;
      });
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      result = result.filter((item: any) => {
        const p = item.priority;
        return p === priorityFilter;
      });
    }

    // Condition filter
    if (conditionFilter !== "ALL") {
      result = result.filter((item: any) => {
        const c = item.condition || item.asset?.condition;
        return c === conditionFilter;
      });
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";

      if (sortBy === "name") {
        valA = (a.name || a.asset?.name || a.subject || "").toLowerCase();
        valB = (b.name || b.asset?.name || b.subject || "").toLowerCase();
      } else if (sortBy === "date") {
        valA = new Date(a.createdAt || a.purchaseDate || a.disposalDate || a.assignedAt || 0).getTime();
        valB = new Date(b.createdAt || b.purchaseDate || b.disposalDate || b.assignedAt || 0).getTime();
      } else if (sortBy === "code") {
        valA = (a.assetCode || a.code || a.requestNumber || a.appealNumber || "").toLowerCase();
        valB = (b.assetCode || b.code || b.requestNumber || b.appealNumber || "").toLowerCase();
      } else if (sortBy === "cost") {
        valA = Number(a.purchaseCost || a.cost || a.maintenanceCost || a.salvageValue || 0);
        valB = Number(b.purchaseCost || b.cost || b.maintenanceCost || b.salvageValue || 0);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    records,
    cardType,
    selectedCategoryName,
    searchQuery,
    statusFilter,
    categoryFilter,
    priorityFilter,
    conditionFilter,
    sortBy,
    sortOrder,
  ]);

  // Extract unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    if (!records) return [];
    const set = new Set<string>();
    records.forEach((r) => {
      const name = r.category?.name || r.asset?.category?.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [records]);

  // Pagination calculation
  const totalPages = Math.ceil(processedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRecords.slice(start, start + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "ACCEPTED":
      case "APPROVED":
      case "COMPLETED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">{status}</span>;
      case "ASSIGNED":
      case "IN_PROGRESS":
      case "UNDER_REVIEW":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{status}</span>;
      case "PENDING":
      case "PENDING_ACCEPTANCE":
      case "APPROVED_BY_DEPARTMENT_HEAD":
      case "PENDING_PROPERTY_MANAGEMENT":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{status.replace(/_/g, " ")}</span>;
      case "UNDER_MAINTENANCE":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">UNDER MAINTENANCE</span>;
      case "DISPOSED":
      case "REJECTED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">{status}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  // CSV Export Helper
  const exportCsv = () => {
    if (!processedRecords.length) return;
    const replacer = (key: string, value: any) => (value === null ? "" : value);
    const header = Object.keys(processedRecords[0]);
    const csv = [
      header.join(","),
      ...processedRecords.map((row) =>
        header
          .map((fieldName) => {
            const val = row[fieldName];
            const str = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
            return JSON.stringify(str, replacer);
          })
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${cardType?.toLowerCase()}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!cardType || !meta) return null;
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-xl border ${meta.bg}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {meta.title}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : null}
                  {cardType === "ASSET_CATEGORIES" && selectedCategoryName
                    ? `${processedRecords.length} Assets`
                    : `${records.length} Records`}
                </span>
                {cardType === "ASSET_CATEGORIES" && selectedCategoryName && (
                  <button
                    onClick={() => setSelectedCategoryName(null)}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 ml-2"
                  >
                    &larr; Back to all categories
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {cardType === "ASSET_CATEGORIES" && selectedCategoryName
                  ? `Showing equipment categorized under "${selectedCategoryName}"`
                  : meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {meta.fullPageLink && (
              <button
                onClick={() => {
                  onClose();
                  router.push(meta.fullPageLink!);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
                title={meta.fullPageLabel || "Open full page"}
              >
                <span>{meta.fullPageLabel || "View Full Page"}</span>
                <ExternalLink size={13} />
              </button>
            )}

            <button
              onClick={exportCsv}
              disabled={isLoading || processedRecords.length === 0}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              title="Export filtered records to CSV"
            >
              <Download size={18} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search in ${meta.title.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dynamic Category Filter */}
          {uniqueCategories.length > 0 && cardType !== "ASSET_CATEGORIES" && (
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Condition Filter */}
          {(cardType === "TOTAL_ASSETS" || cardType === "AVAILABLE_ASSETS" || cardType === "ASSIGNED_ASSETS") && (
            <div>
              <select
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
              >
                <option value="ALL">All Conditions</option>
                <option value="NEW">NEW</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
                <option value="POOR">POOR</option>
                <option value="DAMAGED">DAMAGED</option>
              </select>
            </div>
          )}

          {/* Sort Selector */}
          <div>
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-700"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="code">Sort by Code</option>
                <option value="cost">Sort by Cost / Value</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              >
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: Table or List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="animate-spin text-sky-600" />
              <p className="text-xs text-slate-500 font-medium">
                Fetching real-time records from database...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl my-6">
              <AlertCircle size={28} className="mx-auto text-red-500 mb-2" />
              <p className="text-xs text-red-700 font-semibold">{error}</p>
            </div>
          ) : processedRecords.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                <Icon size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                {searchQuery || categoryFilter !== "ALL" || conditionFilter !== "ALL"
                  ? "No matching records found."
                  : meta.emptyText}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {searchQuery
                  ? "Try broadening your search term or clearing the active filters."
                  : "Database records and card counts are fully synchronized."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("ALL");
                    setConditionFilter("ALL");
                  }}
                  className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              {/* CARD 1 & CARD 2: TOTAL & AVAILABLE ASSETS */}
              {(cardType === "TOTAL_ASSETS" || cardType === "AVAILABLE_ASSETS") && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Asset Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Serial No</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Location / Dept</th>
                      <th className="py-2.5 px-3">Assigned Person</th>
                      <th className="py-2.5 px-3">Purchase Date</th>
                      <th className="py-2.5 px-3">Cost (ETB)</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3 text-center">QR</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((asset: any) => {
                      const activeAssignment = asset.assignments?.[0];
                      const assignedPerson = activeAssignment?.assignedTo?.name || "Unassigned";
                      return (
                        <tr
                          key={asset.id}
                          className="hover:bg-sky-50/50 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/assets/${asset.id}`)}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                            {asset.assetCode}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {asset.name}
                          </td>
                          <td className="py-2.5 px-3">{asset.category?.name || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {asset.serialNumber || "—"}
                          </td>
                          <td className="py-2.5 px-3">{renderStatusBadge(asset.status)}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-800">
                              {asset.department?.name || "General"}
                            </span>
                            {asset.roomNumber && (
                              <span className="text-[10px] text-slate-400 block">
                                Rm: {asset.roomNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={
                                assignedPerson !== "Unassigned"
                                  ? "text-blue-700 font-semibold"
                                  : "text-slate-400"
                              }
                            >
                              {assignedPerson}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {asset.purchaseDate
                              ? new Date(asset.purchaseDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {asset.purchaseCost
                              ? `${Number(asset.purchaseCost).toLocaleString()} ETB`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {asset.condition || "GOOD"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {asset.qrCode ? (
                              <QrCode size={15} className="text-emerald-600 inline" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/assets/${asset.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center text-sky-600 hover:text-sky-800 font-bold group-hover:underline text-[11px]"
                            >
                              View &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* CARD 3: ASSIGNED ASSETS */}
              {cardType === "ASSIGNED_ASSETS" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Asset Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Assigned Custodian</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Assignment Date</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Custody Status</th>
                      <th className="py-2.5 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((asset: any) => {
                      const assignment = asset.assignments?.[0];
                      return (
                        <tr
                          key={asset.id}
                          className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/assets/${asset.id}`)}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                            {asset.assetCode}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {asset.name}
                          </td>
                          <td className="py-2.5 px-3">{asset.category?.name || "—"}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">
                              {assignment?.assignedTo?.name || "Department Held"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {assignment?.assignedTo?.email || ""}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {assignment?.department?.name || asset.department?.name || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {assignment?.assignedAt
                              ? new Date(assignment.assignedAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {asset.condition || "GOOD"}
                          </td>
                          <td className="py-2.5 px-3">
                            {renderStatusBadge(assignment?.status || asset.status)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/assets/${asset.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-800 font-bold group-hover:underline text-[11px]"
                            >
                              Inspect &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* CARD 4: IN MAINTENANCE */}
              {cardType === "IN_MAINTENANCE" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Asset Name</th>
                      <th className="py-2.5 px-3">Priority / Type</th>
                      <th className="py-2.5 px-3">Problem / Description</th>
                      <th className="py-2.5 px-3">Submitted Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Assigned Technician</th>
                      <th className="py-2.5 px-3">Cost (ETB)</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((asset: any) => {
                      const maint = asset.maintenances?.[0];
                      return (
                        <tr
                          key={asset.id}
                          className="hover:bg-orange-50/50 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/assets/${asset.id}`)}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-orange-700">
                            {asset.assetCode}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {asset.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-orange-800">
                              {maint?.priority || "NORMAL"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate" title={maint?.description}>
                            {maint?.description || "Undergoing scheduled maintenance"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {maint?.createdAt
                              ? new Date(maint.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {renderStatusBadge(maint?.status || "IN_PROGRESS")}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {maint?.assignedTo?.name || (
                              <span className="text-slate-400">Unassigned Tech</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {maint?.maintenanceCost || maint?.cost
                              ? `${Number(maint?.maintenanceCost || maint?.cost).toLocaleString()} ETB`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/assets/${asset.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-orange-600 hover:text-orange-800 font-bold group-hover:underline text-[11px]"
                            >
                              View Ticket &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* CARD 5: PENDING TRANSFERS */}
              {cardType === "PENDING_TRANSFERS" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">From Department</th>
                      <th className="py-2.5 px-3">To Department / Custodian</th>
                      <th className="py-2.5 px-3">Requested By</th>
                      <th className="py-2.5 px-3">Request Date</th>
                      <th className="py-2.5 px-3">Reason / Notes</th>
                      <th className="py-2.5 px-3">Approval Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((t: any) => (
                      <tr
                        key={t.id}
                        className="hover:bg-yellow-50/50 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/assets/${t.asset?.id}`)}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {t.asset?.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-yellow-800">
                          {t.asset?.assetCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {t.fromDepartment?.name || t.fromUser?.name || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {t.toDepartment?.name || t.toUser?.name || "—"}
                        </td>
                        <td className="py-2.5 px-3">{t.requestedBy?.name || "Staff"}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={t.notes}>
                          {t.notes || "Inter-department transfer"}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(t.status)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/assets/${t.asset?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-yellow-700 hover:text-yellow-900 font-bold group-hover:underline text-[11px]"
                          >
                            Review &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* CARD 6: DISPOSED ASSETS */}
              {cardType === "DISPOSED_ASSETS" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Disposal Date</th>
                      <th className="py-2.5 px-3">Disposal Reason</th>
                      <th className="py-2.5 px-3">Disposal Method</th>
                      <th className="py-2.5 px-3">Approved By</th>
                      <th className="py-2.5 px-3">Disposal Value (ETB)</th>
                      <th className="py-2.5 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((asset: any) => {
                      const disp = asset.disposals?.[0];
                      return (
                        <tr
                          key={asset.id}
                          className="hover:bg-red-50/50 transition-colors group cursor-pointer"
                          onClick={() => router.push(`/assets/${asset.id}`)}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {asset.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-red-700">
                            {asset.assetCode}
                          </td>
                          <td className="py-2.5 px-3">{asset.category?.name || "—"}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {disp?.disposalDate
                              ? new Date(disp.disposalDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {disp?.reason || "End of useful life"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold">{disp?.method || "Scrap"}</span>
                          </td>
                          <td className="py-2.5 px-3">{disp?.disposedBy?.name || "Admin"}</td>
                          <td className="py-2.5 px-3 font-medium">
                            {asset.salvageValue || asset.currentBookValue
                              ? `${Number(asset.salvageValue || asset.currentBookValue).toLocaleString()} ETB`
                              : "0.00 ETB"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/assets/${asset.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-red-600 hover:text-red-800 font-bold group-hover:underline text-[11px]"
                            >
                              Archive &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* CARD 7: PENDING MAINTENANCES */}
              {cardType === "PENDING_MAINTENANCES" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Asset Code</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Requested By</th>
                      <th className="py-2.5 px-3">Problem / Fault</th>
                      <th className="py-2.5 px-3">Request Date</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Assigned Tech</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((m: any) => (
                      <tr
                        key={m.id}
                        className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/assets/${m.asset?.id}`)}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {m.asset?.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {m.asset?.assetCode}
                        </td>
                        <td className="py-2.5 px-3">{m.asset?.department?.name || "—"}</td>
                        <td className="py-2.5 px-3">{m.reportedBy?.name || "Staff"}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={m.description}>
                          {m.description}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-800">
                          {m.priority}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(m.status)}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {m.assignedTo?.name || (
                            <span className="text-slate-400">Needs Assignment</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/assets/${m.asset?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-800 font-bold group-hover:underline text-[11px]"
                          >
                            Assign Tech &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* CARD 8: REQUESTS TO FULFILL */}
              {cardType === "REQUESTS_TO_FULFILL" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Requesting Staff</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Requested Asset / Category</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Request Date</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Purpose / Reason</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((req: any) => (
                      <tr
                        key={req.id}
                        className="hover:bg-amber-50/50 transition-colors group cursor-pointer"
                        onClick={() => router.push("/pao/asset-requests")}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                          {req.requestNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{req.user?.name}</div>
                          <div className="text-[10px] text-slate-400">{req.user?.email}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{req.department?.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">
                            {req.category?.name || "General Asset"}
                          </span>
                          {req.assetType?.name && (
                            <span className="text-[10px] text-slate-500 block">
                              {req.assetType.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {req.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-amber-800">
                          {req.priority}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(req.status)}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              router.push("/pao/asset-requests");
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                          >
                            Fulfill Request &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* CARD 9: ACTIVE APPEALS */}
              {cardType === "ACTIVE_APPEALS" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Appeal ID</th>
                      <th className="py-2.5 px-3">Submitted By</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Related Asset / Requisition</th>
                      <th className="py-2.5 px-3">Appeal Reason</th>
                      <th className="py-2.5 px-3">Submitted Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Assigned Reviewer</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {paginatedRecords.map((ap: any) => (
                      <tr
                        key={ap.id}
                        className="hover:bg-purple-50/50 transition-colors group cursor-pointer"
                        onClick={() => router.push("/pao/appeals")}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-800">
                          {ap.appealNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            {ap.departmentHead?.name || "Department Head"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{ap.department?.name}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {ap.subject}
                        </td>
                        <td className="py-2.5 px-3">
                          {ap.asset ? (
                            <span className="text-sky-700 font-mono font-semibold">
                              Asset: {ap.asset.assetCode}
                            </span>
                          ) : ap.request ? (
                            <span className="text-amber-700 font-mono font-semibold">
                              Req: {ap.request.requestNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">Direct Appeal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={ap.reason}>
                          {ap.reason}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(ap.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">{renderStatusBadge(ap.status)}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {ap.responder?.name || (
                            <span className="text-slate-400">PAO Review Required</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              router.push("/pao/appeals");
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                          >
                            Review Appeal &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* CARD 10: ASSET CATEGORIES (OVERVIEW & DRILL-DOWN) */}
              {cardType === "ASSET_CATEGORIES" && (
                <>
                  {!selectedCategoryName ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Category Name</th>
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3 text-center">Total Assets</th>
                          <th className="py-2.5 px-3 text-center">Available</th>
                          <th className="py-2.5 px-3 text-center">Assigned</th>
                          <th className="py-2.5 px-3 text-center">Maintenance</th>
                          <th className="py-2.5 px-3 text-center">Disposed</th>
                          <th className="py-2.5 px-3 text-right">Drill Down</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                        {paginatedRecords.map((cat: any) => (
                          <tr
                            key={cat.id}
                            className="hover:bg-teal-50/50 transition-colors group cursor-pointer"
                            onClick={() => setSelectedCategoryName(cat.name)}
                          >
                            <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                              <Building size={16} className="text-teal-600" />
                              <span>{cat.name}</span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-teal-800">
                              {cat.code}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900 bg-slate-50/60">
                              {cat.total}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-green-700">
                              {cat.available}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-blue-700">
                              {cat.assigned}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-orange-700">
                              {cat.maintenance}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-red-700">
                              {cat.disposed}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategoryName(cat.name);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
                              >
                                View {cat.total} Assets &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Drill-down view into selected category's assets */
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Asset Code</th>
                          <th className="py-2.5 px-3">Asset Name</th>
                          <th className="py-2.5 px-3">Serial No</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Condition</th>
                          <th className="py-2.5 px-3">Purchase Cost</th>
                          <th className="py-2.5 px-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                        {paginatedRecords.map((asset: any) => (
                          <tr
                            key={asset.id}
                            className="hover:bg-teal-50/50 transition-colors group cursor-pointer"
                            onClick={() => router.push(`/assets/${asset.id}`)}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-teal-700">
                              {asset.assetCode}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {asset.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {asset.serialNumber || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {asset.department?.name || "General"}
                            </td>
                            <td className="py-2.5 px-3">{renderStatusBadge(asset.status)}</td>
                            <td className="py-2.5 px-3 font-medium">
                              {asset.condition || "GOOD"}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {asset.purchaseCost
                                ? `${Number(asset.purchaseCost).toLocaleString()} ETB`
                                : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Link
                                href={`/assets/${asset.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-teal-600 hover:text-teal-800 font-bold group-hover:underline text-[11px]"
                              >
                                View &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer with pagination and count summary */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {processedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, processedRecords.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {processedRecords.length}
            </span>{" "}
            records
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
