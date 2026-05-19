"use client";

import React, { useState, useMemo } from "react";
import { Search, Flame, LayoutGrid, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export default function HotspotMap({ elements }: { elements: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<"all" | "high" | "moderate" | "low">("all");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);

  // Extract nodes and calculate unified risk metric
  const nodes = useMemo(() => {
    if (!elements) return [];
    
    let elementsArr: any[] = [];
    if (Array.isArray(elements)) {
      elementsArr = elements;
    } else if (elements.nodes) {
      elementsArr = elements.nodes;
    }
    
    return elementsArr
      .filter((e) => e.data && (e.data.type === "file" || e.data.type === "module"))
      .map((e) => {
        const node = e.data;
        const fnCount = node.functions?.length ?? 1;
        const sizeVal = node.size ?? 500;
        
        // Compute static deterministic risk score for visualization
        const complexity = fnCount * 4;
        const coupling = (node.imports?.length ?? 0) * 8;
        const sizeFactor = Math.min(40, sizeVal / 120);
        const riskScore = Math.min(100, Math.round(complexity + coupling + sizeFactor));
        
        let riskLabel: "high" | "moderate" | "low" = "low";
        if (riskScore >= 70) {
          riskLabel = "high";
        } else if (riskScore >= 35) {
          riskLabel = "moderate";
        }

        return {
          ...node,
          riskScore,
          riskLabel,
          complexity,
          coupling,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [elements]);

  // Apply filters
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch = (n.label || n.id || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = filterRisk === "all" || n.riskLabel === filterRisk;
      return matchesSearch && matchesRisk;
    });
  }, [nodes, searchTerm, filterRisk]);

  if (!nodes.length) {
    return <div className="h-64 flex items-center justify-center text-slate-400 italic text-sm">No hotspot data available</div>;
  }

  return (
    <div className="w-full space-y-6">
      
      {/* Control Header: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        
        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search code modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white placeholder-slate-400"
          />
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-150 p-1 rounded-xl border border-slate-200/50">
          {(["all", "high", "moderate", "low"] as const).map((r) => {
            const isSelected = filterRisk === r;
            return (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                  isSelected 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r === "all" ? "All Files" : `${r} risk`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="relative">
        <div className="min-h-[140px] max-h-[300px] w-full bg-slate-50/50 rounded-2xl p-5 flex flex-wrap gap-2.5 overflow-y-auto border border-slate-200/60 shadow-inner">
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            
            // Map risk rating to premium gradients
            let gradient = "from-emerald-450 to-teal-500 shadow-emerald-100";
            if (node.riskLabel === "high") {
              gradient = "from-rose-500 to-red-650 shadow-rose-100";
            } else if (node.riskLabel === "moderate") {
              gradient = "from-amber-400 to-orange-550 shadow-amber-100";
            }

            // Map file size to dynamic grids
            let sizeClass = "w-7 h-7 rounded-lg";
            if (node.size > 8000) {
              sizeClass = "w-11 h-11 rounded-xl";
            } else if (node.size > 2500) {
              sizeClass = "w-9 h-9 rounded-lg";
            }

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(node)}
                className={`bg-gradient-to-tr ${gradient} ${sizeClass} cursor-pointer transition-all duration-300 hover:scale-115 hover:rotate-2 shadow-md hover:shadow-lg flex items-center justify-center border-2 ${
                  isSelected 
                    ? "border-slate-800 ring-4 ring-slate-100" 
                    : "border-white/80"
                }`}
              >
                {/* Mini icon inside large boxes */}
                {node.size > 8000 && (
                  <Flame className="w-4 h-4 text-white animate-pulse" />
                )}
              </div>
            );
          })}
          
          {filteredNodes.length === 0 && (
            <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold italic">
              No matching modules found
            </div>
          )}
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute top-0 right-0 transform translate-y-[-105%] z-50 bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] max-w-xs space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-4">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase truncate max-w-[120px]">
                {hoveredNode.label || hoveredNode.id}
              </span>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                hoveredNode.riskLabel === "high"
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : hoveredNode.riskLabel === "moderate"
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600"
              }`}>
                {hoveredNode.riskLabel} Risk
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>Risk Score:</span>
              <span className="font-mono font-black text-slate-800">{hoveredNode.riskScore}/100</span>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>Lines of Code:</span>
              <span>{Math.round(hoveredNode.size / 45)} lines</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap items-center gap-6 justify-center text-[10px] text-slate-400 font-extrabold tracking-wide uppercase mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500 shadow-sm" />
          <span>High Risk / Hotspot (LOC or Complexity high)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400 shadow-sm" />
          <span>Moderate Risk / Refactor candidates</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-400 shadow-sm" />
          <span>Low Risk / Stable modules</span>
        </div>
      </div>

      {/* Refactoring Advice Panel */}
      {selectedNode && (
        <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600">
                <Flame className="w-3 h-3 text-rose-500" />
                Refactoring Advisory
              </span>
              <h4 className="text-sm font-extrabold text-slate-800 truncate max-w-lg mt-1">
                {selectedNode.id}
              </h4>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded transition-colors cursor-pointer border border-slate-200/60 bg-slate-50 hover:bg-slate-100 shadow-sm"
            >
              ✕ Clear
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Approx. LOC</div>
              <div className="text-xs font-mono font-black text-slate-700">{Math.round(selectedNode.size / 45)} lines</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">AST Complexity</div>
              <div className="text-xs font-mono font-black text-slate-700">{selectedNode.complexity} index</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Modules Coupling</div>
              <div className="text-xs font-mono font-black text-slate-700">{selectedNode.coupling} couplings</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Advice Severity</div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                {selectedNode.riskLabel === "high" ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-rose-600 font-black">CRITICAL</span>
                  </>
                ) : selectedNode.riskLabel === "moderate" ? (
                  <>
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 font-black">ADVISORY</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-black">STABLE</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            💡 <span className="font-extrabold text-slate-700">Architect Recommendation:</span>{" "}
            {selectedNode.riskLabel === "high" ? (
              <span>This file contains high functional complexity coupled with substantial size. We recommend breaking down functional operations into isolated utility modules and adding target unit tests.</span>
            ) : selectedNode.riskLabel === "moderate" ? (
              <span>This file shows moderate structural weight. Keep an eye on incoming complexity drift and avoid wrapping too many import relations.</span>
            ) : (
              <span>This file is highly stable and cleanly decoupled. No immediate refactoring is required. Excellent execution structure!</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
