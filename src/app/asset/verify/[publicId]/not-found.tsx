import React from "react";
import Link from "next/link";
import { DbuLogo } from "@/components/dbu-logo";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AssetNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 sm:p-6 text-slate-800">
      {/* Header */}
      <header className="w-full max-w-lg flex items-center justify-center space-x-3 py-4 border-b border-slate-200">
        <DbuLogo className="w-10 h-10 sm:w-12 sm:h-12" />
        <div className="text-left">
          <h1 className="text-sm sm:text-base font-bold text-sky-900 tracking-tight leading-none">
            DEBRE BERHAN UNIVERSITY
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Asset Tracking &amp; Verification
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 my-auto text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <ShieldAlert size={36} />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
          Asset Not Found
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
          The asset could not be verified. The QR code may be invalid, expired, or the asset may no longer be registered in the DBU Asset Tracking System.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-xs text-slate-500 mb-6 text-left">
          <p className="font-bold text-slate-700 mb-1">What should I do?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure the QR code tag is not damaged or obstructed.</li>
            <li>Re-scan with your camera or QR code reader.</li>
            <li>If this asset belongs to DBU, please report it to the Property Administration Office (PAO).</li>
          </ul>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Go to Staff / Admin Login</span>
        </Link>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg text-center py-4 text-[11px] text-slate-400">
        Debre Berhan University &copy; {new Date().getFullYear()} &bull; Property Administration Directorate
      </footer>
    </div>
  );
}
