"use client";

import React, { useState, useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  ReferenceDot, 
  ReferenceLine 
} from "recharts";
import { format } from "date-fns";
import { ZoomIn } from "lucide-react";

export default function HealthTimeline({ data, onNodeClick, activeCommitSha }: { 
  data: any[], 
  onNodeClick: (commit: any) => void,
  activeCommitSha: string | null 
}) {
  const [selectedMetric, setSelectedMetric] = useState<"composite_health" | "complexity_score" | "dependency_rot" | "test_coverage">("composite_health");
  const [customRange, setCustomRange] = useState<number>(100); // 10% to 100% of commits

  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 italic text-sm">No data available</div>;
  }

  const metrics = [
    { id: "composite_health", label: "Health Score", color: "#10b981", domain: [0, 100], refVal: 60, refLabel: "Alert (<60)" },
    { id: "complexity_score", label: "Complexity", color: "#f59e0b", domain: [0, "auto"], refVal: 15, refLabel: "High (>15)" },
    { id: "dependency_rot", label: "Coupling", color: "#8b5cf6", domain: [0, "auto"], refVal: 6, refLabel: "Risky (>6)" },
    { id: "test_coverage", label: "Coverage", color: "#3b82f6", domain: [0, 100], refVal: 80, refLabel: "Target (80%)" }
  ];

  const activeMetric = metrics.find(m => m.id === selectedMetric)!;

  // Chronologically sorted timeline data for perfect zoom ranges
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data]);

  // Apply changeable custom zoom scale
  const zoomedData = useMemo(() => {
    if (sortedData.length === 0) return [];
    
    // Calculate how many items representing customRange percentage
    const count = Math.max(4, Math.round((customRange / 100) * sortedData.length));
    return sortedData.slice(sortedData.length - count);
  }, [sortedData, customRange]);

  // Date label formatting matching the current scale dynamically
  const xAxisFormatter = (tick: any) => {
    try {
      const date = new Date(tick);
      // Zoomed in tightly: show Date AND Hour:Minute to separate multiple commits on the same day clearly
      if (zoomedData.length <= 15) {
        return format(date, "MMM d HH:mm");
      }
      return format(date, "MMM d");
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Selector Console: Metrics Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/40">
          {metrics.map((m) => {
            const isSelected = selectedMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        
        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-extrabold tracking-wide uppercase">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm border border-white" />
            <span>Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm border border-white" />
            <span>PR Merge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200 animate-pulse border border-white" />
            <span>Selection</span>
          </div>
        </div>
      </div>

      {/* STREAMLINED CUSTOM RANGE ZOOM CONTROL */}
      <div className="flex items-center justify-between gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-indigo-500 ml-1.5 animate-pulse" />
          <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider">
            Zoom scale:
          </span>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm flex-1 max-w-sm">
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={customRange}
            onChange={(e) => setCustomRange(Number(e.target.value))}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
          />
          <span className="text-[10px] font-mono font-black text-indigo-650 shrink-0 min-w-[155px] text-right">
            {customRange === 100 
              ? `Showing all ${sortedData.length} commits` 
              : `Showing last ${zoomedData.length} of ${sortedData.length} commits`
            }
          </span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={zoomedData} 
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                onNodeClick(e.activePayload[0].payload);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={xAxisFormatter}
              stroke="rgba(0,0,0,0.1)"
              tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={activeMetric.domain as any} 
              stroke="rgba(0,0,0,0.1)"
              tick={{ fill: "rgba(0,0,0,0.45)", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const commit = payload[0].payload;
                  const rawVal = commit[activeMetric.id];
                  const formattedVal = typeof rawVal === "number" ? rawVal.toFixed(1) : "0.0";
                  return (
                    <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] max-w-xs space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                          {format(new Date(commit.timestamp), "MMM d, yyyy HH:mm")}
                        </p>
                        <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded shadow-sm">
                          {commit.sha.substring(0, 7)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{activeMetric.label}:</span>
                        <span className="font-mono text-sm font-black" style={{ color: activeMetric.color }}>
                          {formattedVal}
                          {selectedMetric === "composite_health" || selectedMetric === "test_coverage" ? "%" : ""}
                        </span>
                      </div>
                      
                      {commit.is_pr && (
                        <span className="inline-block text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold shadow-sm">
                          PR MERGE
                        </span>
                      )}
                      
                      <p className="text-xs text-slate-600 font-semibold truncate leading-relaxed max-w-[200px]">
                        {commit.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">by {commit.author}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Horizontal Reference / Alert Line */}
            <ReferenceLine 
              y={activeMetric.refVal} 
              stroke="#fda4af" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
              label={{ 
                value: activeMetric.refLabel, 
                fill: "#f43f5e", 
                fontSize: 9, 
                fontWeight: 800, 
                position: "right",
                className: "font-sans uppercase tracking-wider" 
              }} 
            />

            <Line 
              type="monotone" 
              dataKey={activeMetric.id} 
              stroke={activeMetric.color} 
              strokeWidth={3}
              dot={(props: any) => {
                const { payload, cx, cy, index } = props;
                const isSelected = payload.sha === activeCommitSha;
                
                if (payload.is_pr) {
                  return (
                    <circle 
                      key={`dot-pr-${index}`}
                      cx={cx} 
                      cy={cy} 
                      r={isSelected ? 6.5 : 5.5} 
                      fill="#6366f1" 
                      stroke="#fff" 
                      strokeWidth={2} 
                      style={{ cursor: "pointer" }}
                    />
                  );
                }
                return (
                  <circle 
                    key={`dot-std-${index}`}
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 5.5 : 4} 
                    fill={activeMetric.color} 
                    stroke="#fff"
                    strokeWidth={isSelected ? 2 : 0} 
                    style={{ cursor: "pointer" }}
                  />
                );
              }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: "#4f46e5" }}
            />

            {/* Glowing Active Selection Pulse */}
            {activeCommitSha && zoomedData.map((d: any, i: number) => {
              if (d.sha === activeCommitSha) {
                const val = d[activeMetric.id] ?? 0;
                return (
                  <ReferenceDot 
                    key={`pulse-${i}`}
                    x={d.timestamp} 
                    y={val} 
                    r={9} 
                    fill="none" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    className="animate-pulse"
                  />
                );
              }
              return null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
