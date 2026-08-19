"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DataItem {
  status: string;
  count: number;
}

export function AssetsByStatusChart({ data }: { data: DataItem[] }) {
  const COLORS: Record<string, string> = {
    ACTIVE: "#10b981",       // Emerald Green
    ASSIGNED: "#0284c7",     // Sky Blue
    UNDER_MAINTENANCE: "#f97316", // Safety Orange
    DISPOSED: "#ef4444",     // Danger Red
  };

  const chartData = data.map(item => ({
    name: item.status.replace(/_/g, " "),
    value: item.count,
    color: COLORS[item.status] || "#94a3b8"
  })).filter(item => item.value > 0);

  const finalData = chartData.length > 0 ? chartData : [
    { name: "Active", value: 1, color: "#10b981" },
    { name: "Assigned", value: 0, color: "#0284c7" },
    { name: "Under Maintenance", value: 0, color: "#f97316" },
    { name: "Disposed", value: 0, color: "#ef4444" },
  ];

  return (
    <div className="w-full h-64 flex flex-col justify-center">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={finalData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {finalData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 px-4">
        {finalData.map((entry, index) => (
          <div key={index} className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[10px] font-bold text-slate-500 capitalize">{entry.name.toLowerCase()} ({entry.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
