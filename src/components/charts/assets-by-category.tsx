"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DataItem {
  category: string;
  count: number;
}

export function AssetsByCategoryChart({ data }: { data: DataItem[] }) {
  const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#e0f2fe"];

  const chartData = data.length > 0 ? data : [
    { category: "Laptops", count: 0 },
    { category: "Desktops", count: 0 },
    { category: "Projectors", count: 0 },
    { category: "Furniture", count: 0 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
          <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} 
            cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
          />
          <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={28}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
