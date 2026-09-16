"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

interface DataItem {
  status: string;
  count: number;
}

export function MaintenanceRequestsChart({ data }: { data: DataItem[] }) {
  const COLORS: Record<string, string> = {
    PENDING: "#f59e0b",      // Amber
    IN_PROGRESS: "#3b82f6",  // Blue
    COMPLETED: "#10b981",    // Emerald Green
  };

  const chartData = data.map(item => ({
    name: item.status.replace(/_/g, " "),
    count: item.count,
    color: COLORS[item.status] || "#94a3b8"
  }));

  const finalData = chartData.length > 0 ? chartData : [
    { name: "Pending", count: 0, color: "#f59e0b" },
    { name: "In Progress", count: 0, color: "#3b82f6" },
    { name: "Completed", count: 0, color: "#10b981" },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={finalData} margin={{ top: 15, right: 10, left: -20, bottom: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
            cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={36}>
            {finalData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
