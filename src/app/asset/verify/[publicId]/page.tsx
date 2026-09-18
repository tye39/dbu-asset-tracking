import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAssetVerification } from "@/services/public-asset";
import { DbuLogo } from "@/components/dbu-logo";
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  MapPin,
  UserCheck,
  Layers,
  Activity,
  Lock,
} from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: {
    publicId: string;
  };
}

export const metadata: Metadata = {
  title: "Asset Verification | DBU Asset Tracking System",
  description: "Debre Berhan University official asset verification portal.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function PublicAssetVerificationPage({ params }: PageProps) {
  const asset = await getPublicAssetVerification(params.publicId);

  if (!asset) {
    notFound();
  }

  // Status badge styling helper
  const getBadgeClasses = (badge: typeof asset.statusBadge) => {
    switch (badge) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10";
      case "assigned":
        return "bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/10";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10";
      case "maintenance":
        return "bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/10";
      case "disposed":
        return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/10";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Top Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <DbuLogo className="w-12 h-12" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-850">
                Debre Berhan University
              </p>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                Asset Verification Portal
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck size={15} />
            <span>Official Portal</span>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <CheckCircle2 size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold">
                Verification Result
              </p>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                ✓ Registered Asset
              </h2>
            </div>
          </div>
          <div className="text-right text-[11px] text-emerald-100 font-medium">
            <span className="opacity-80">Verified on</span>
            <p className="font-bold text-white">{asset.verifiedAt}</p>
          </div>
        </div>

        {/* Primary Asset Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {/* Asset Photo (if present) */}
          {asset.imageUrl && (
            <div className="w-full h-48 sm:h-56 bg-slate-50 relative overflow-hidden border-b border-slate-150 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.imageUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title & Core Code */}
          <div className="p-5 sm:p-6 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs sm:text-sm font-black bg-slate-100 text-sky-900 px-3 py-1 rounded-lg border border-slate-200 tracking-wider">
                {asset.assetCode}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ring-1 ring-inset ${getBadgeClasses(
                  asset.statusBadge
                )}`}
              >
                {asset.status}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug pt-1">
              {asset.name}
            </h3>
            <p className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
              <Layers size={14} className="text-slate-400" />
              <span>
                {asset.category} {asset.assetType ? `→ ${asset.assetType}` : ""}
              </span>
            </p>
          </div>

          {/* Details Grid */}
          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Condition */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <Activity size={13} className="text-slate-400" />
                <span>Condition</span>
              </div>
              <p className="text-slate-900 font-bold text-sm">
                {asset.condition || "Not Specified"}
              </p>
            </div>

            {/* Department */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <Building2 size={13} className="text-slate-400" />
                <span>Department</span>
              </div>
              <p className="text-slate-900 font-bold text-sm truncate">
                {asset.department || "Debre Berhan University"}
              </p>
            </div>

            {/* General Location */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <MapPin size={13} className="text-slate-400" />
                <span>Location</span>
              </div>
              <p className="text-slate-900 font-bold text-sm">
                {asset.location || "On Campus"}
              </p>
            </div>

            {/* Custody / Assignment */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <UserCheck size={13} className="text-slate-400" />
                <span>Assigned Custodian</span>
              </div>
              <p className="text-slate-900 font-bold text-sm">
                {asset.assignedTo || (asset.status === "Pending Assignment" ? "Pending Confirmation" : "Not Assigned")}
              </p>
            </div>
          </div>

          {/* Privacy Notice Disclaimer */}
          <div className="p-4 sm:p-5 bg-slate-50/75 flex items-start space-x-3 text-xs text-slate-500">
            <Lock size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-700">Privacy Notice:</strong> This page provides limited information for official asset identification and public verification. Sensitive personal, financial, procurement, and internal administrative information is not publicly displayed.
            </p>
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-[11px] font-semibold text-slate-400">
            Debre Berhan University &bull; Property Administration Directorate
          </p>
          <p className="text-[10px] text-slate-400">
            Asset Verification System &bull; Secure Digital Label
          </p>
        </div>
      </div>
    </div>
  );
}
