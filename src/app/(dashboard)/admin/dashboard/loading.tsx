import React from "react";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header section skeleton */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 bg-sky-950/5 -mx-6 -mt-6 p-6">
        <div className="space-y-1.5">
          <div className="h-5 w-56 bg-slate-200 rounded-md"></div>
          <div className="h-3 w-80 bg-slate-200 rounded-md"></div>
        </div>
      </div>

      {/* Row 1: 4 Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`row1-skel-${i}`}
            className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 block"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-slate-200 rounded"></div>
              <div className="w-4 h-4 rounded bg-slate-200"></div>
            </div>
            <div className="space-y-1 mt-1">
              <div className="h-6 w-32 bg-slate-200 rounded"></div>
              <div className="h-2.5 w-40 bg-slate-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: 3 Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={`row2-skel-${i}`}
            className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 block"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-32 bg-slate-200 rounded"></div>
              <div className="w-4 h-4 rounded bg-slate-200"></div>
            </div>
            <div className="space-y-1 mt-1">
              <div className="h-6 w-28 bg-slate-200 rounded"></div>
              <div className="h-2.5 w-36 bg-slate-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2].map((i) => (
          <div
            key={`chart-skel-${i}`}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="h-3.5 w-48 bg-slate-200 rounded"></div>
              <div className="h-3 w-16 bg-slate-100 rounded"></div>
            </div>
            <div className="h-64 w-full bg-slate-50 rounded-xl flex items-end p-4 gap-3">
              {[35, 65, 25, 85, 50, 60, 75].map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-slate-200 rounded-t"
                  style={{ height: `${h}%` }}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
