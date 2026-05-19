"use client";

import React, { useState, useMemo } from "react";
import { 
  Layers, 
  Layout, 
  Blocks, 
  Cpu, 
  Wrench, 
  ArrowRight, 
  TrendingUp, 
  HelpCircle,
  FolderOpen
} from "lucide-react";

export default function KnowledgeGraph({ elements }: { elements: any }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const graphData = useMemo(() => {
    let nodesArr: any[] = [];
    let edgesArr: any[] = [];
    
    if (Array.isArray(elements)) {
      nodesArr = elements.filter(e => e.data && e.data.id && !e.data.source);
      edgesArr = elements.filter(e => e.data && e.data.source && e.data.target);
    } else if (elements) {
      nodesArr = elements.nodes || [];
      edgesArr = elements.edges || [];
    }

    const fileNodes = nodesArr.map(n => {
      const data = n.data || n;
      const path = data.id || "";
      const lowerPath = path.toLowerCase();
      
      // Categorize into 4 clean layers
      let layer: "pages" | "components" | "services" | "utils" = "utils";
      if (lowerPath.includes("/app/") || lowerPath.includes("/pages/") || lowerPath.startsWith("page.") || lowerPath.startsWith("layout.") || lowerPath.startsWith("src/app")) {
        layer = "pages";
      } else if (lowerPath.includes("/components/") || lowerPath.includes("/ui/") || lowerPath.includes("/widgets/")) {
        layer = "components";
      } else if (lowerPath.includes("/hooks/") || lowerPath.includes("/lib/") || lowerPath.includes("/context/") || lowerPath.includes("/services/") || lowerPath.includes("/api/")) {
        layer = "services";
      }

      return {
        id: data.id,
        label: data.label || data.id.split("/").pop(),
        layer,
        size: data.size || 500,
        functions: data.functions || [],
        imports: data.imports || [],
        changeStatus: data.changeStatus || "unchanged"
      };
    });

    // Map relationships
    const dependencyMap = new Map<string, { imports: string[], importedBy: string[] }>();
    fileNodes.forEach(node => {
      dependencyMap.set(node.id, { imports: [], importedBy: [] });
    });

    edgesArr.forEach(edge => {
      const eData = edge.data || edge;
      const source = eData.source;
      const target = eData.target;
      
      if (dependencyMap.has(source)) {
        dependencyMap.get(source)!.imports.push(target);
      }
      if (dependencyMap.has(target)) {
        dependencyMap.get(target)!.importedBy.push(source);
      }
    });

    return {
      nodes: fileNodes,
      dependencies: dependencyMap
    };
  }, [elements]);

  const selectedNode = useMemo(() => {
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

  // Determine active highlight focus
  const activeFocusId = hoveredNodeId || selectedNodeId;
  const activeRelations = useMemo(() => {
    if (!activeFocusId) return null;
    const relations = graphData.dependencies.get(activeFocusId);
    return {
      imports: relations?.imports || [],
      importedBy: relations?.importedBy || []
    };
  }, [graphData.dependencies, activeFocusId]);

  // Filter into layers
  const pagesNodes = graphData.nodes.filter(n => n.layer === "pages");
  const componentsNodes = graphData.nodes.filter(n => n.layer === "components");
  const servicesNodes = graphData.nodes.filter(n => n.layer === "services");
  const utilsNodes = graphData.nodes.filter(n => n.layer === "utils");

  const outgoing = activeRelations?.imports || [];
  const incoming = activeRelations?.importedBy || [];

  return (
    <div className="w-full space-y-6">
      
      {/* Dynamic Graphic Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">
            Layered System flow
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-extrabold tracking-wide uppercase">
          <div className="flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 text-teal-500" />
            <span>Outgoing Imports</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 text-amber-500 rotate-180" />
            <span>Incoming Consumers</span>
          </div>
        </div>
      </div>

      {/* 4-Column Pipeline Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Column 1: Entrypoints & Pages */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs border-b border-slate-200/60 pb-2 px-1">
            <Layout className="w-4 h-4 text-blue-500" />
            <span>Entrypoints / Pages</span>
            <span className="ml-auto font-mono text-[10px] bg-slate-200/60 text-slate-650 px-1.5 py-0.5 rounded font-black">
              {pagesNodes.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {pagesNodes.map(n => renderCard(n))}
            {pagesNodes.length === 0 && renderEmptyState()}
          </div>
        </div>

        {/* Column 2: Components */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs border-b border-slate-200/60 pb-2 px-1">
            <Blocks className="w-4 h-4 text-emerald-500" />
            <span>UI Components</span>
            <span className="ml-auto font-mono text-[10px] bg-slate-200/60 text-slate-650 px-1.5 py-0.5 rounded font-black">
              {componentsNodes.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {componentsNodes.map(n => renderCard(n))}
            {componentsNodes.length === 0 && renderEmptyState()}
          </div>
        </div>

        {/* Column 3: Controllers & Services */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs border-b border-slate-200/60 pb-2 px-1">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>Services & Hooks</span>
            <span className="ml-auto font-mono text-[10px] bg-slate-200/60 text-slate-650 px-1.5 py-0.5 rounded font-black">
              {servicesNodes.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {servicesNodes.map(n => renderCard(n))}
            {servicesNodes.length === 0 && renderEmptyState()}
          </div>
        </div>

        {/* Column 4: Utility Helpers */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs border-b border-slate-200/60 pb-2 px-1">
            <Wrench className="w-4 h-4 text-purple-500" />
            <span>Core Utilities</span>
            <span className="ml-auto font-mono text-[10px] bg-slate-200/60 text-slate-650 px-1.5 py-0.5 rounded font-black">
              {utilsNodes.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {utilsNodes.map(n => renderCard(n))}
            {utilsNodes.length === 0 && renderEmptyState()}
          </div>
        </div>
      </div>

      {/* Interactive Selected Inspector */}
      {selectedNode && (
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600">
                <FolderOpen className="w-3 h-3 text-indigo-500" />
                Layered Architecture Inspector
              </span>
              <h4 className="text-sm font-extrabold text-slate-800 mt-1 truncate max-w-lg">
                {selectedNode.id}
              </h4>
            </div>
            <button 
              onClick={() => setSelectedNodeId(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded transition-colors cursor-pointer border border-slate-200/60 bg-slate-50 hover:bg-slate-100 shadow-sm"
            >
              ✕ Clear Selection
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outgoing: Imports / Uses */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500 shadow-sm" />
                Outgoing Dependencies (Imports {outgoing.length})
              </h5>
              <div className="bg-slate-55 p-3 rounded-xl border border-slate-200/40 min-h-[80px] max-h-[160px] overflow-y-auto space-y-1">
                {outgoing.map((id) => (
                  <div 
                    key={id} 
                    onClick={() => setSelectedNodeId(id)}
                    className="text-xs font-mono font-semibold text-slate-600 truncate py-0.5 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3 text-teal-400 shrink-0" />
                    <span>{id}</span>
                  </div>
                ))}
                {outgoing.length === 0 && (
                  <div className="text-xs text-slate-450 italic py-4 text-center font-medium">No outgoing imports</div>
                )}
              </div>
            </div>

            {/* Incoming: Consumers / Used By */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400 shadow-sm" />
                Incoming Consumers (Imported by {incoming.length})
              </h5>
              <div className="bg-slate-55 p-3 rounded-xl border border-slate-200/40 min-h-[80px] max-h-[160px] overflow-y-auto space-y-1">
                {incoming.map((id) => (
                  <div 
                    key={id} 
                    onClick={() => setSelectedNodeId(id)}
                    className="text-xs font-mono font-semibold text-slate-600 truncate py-0.5 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3 text-amber-400 rotate-180 shrink-0" />
                    <span>{id}</span>
                  </div>
                ))}
                {incoming.length === 0 && (
                  <div className="text-xs text-slate-450 italic py-4 text-center font-medium">No incoming connections</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render file card
  function renderCard(node: any) {
    const isSelected = selectedNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const hasFocus = activeFocusId !== null;

    // Check relationship to active focus
    const isFocusedNode = activeFocusId === node.id;
    const isImportedByFocused = activeRelations?.imports.includes(node.id) || false;
    const isConsumerOfFocused = activeRelations?.importedBy.includes(node.id) || false;

    // Highlight state classes
    let highlightClass = "bg-white border-slate-200 hover:border-slate-350 shadow-[0_2px_4px_rgba(0,0,0,0.015)]";
    if (hasFocus) {
      if (isFocusedNode) {
        highlightClass = "bg-indigo-50 border-indigo-400 shadow-indigo-50 ring-2 ring-indigo-150/40 z-10 scale-[1.02]";
      } else if (isImportedByFocused) {
        highlightClass = "bg-teal-50 border-teal-400 shadow-teal-50 z-10 scale-[1.01]";
      } else if (isConsumerOfFocused) {
        highlightClass = "bg-amber-50 border-amber-350 shadow-amber-50 z-10 scale-[1.01]";
      } else {
        highlightClass = "bg-white/40 border-slate-100 opacity-25 blur-[0.3px] scale-98 select-none";
      }
    } else if (isSelected) {
      highlightClass = "bg-indigo-50 border-indigo-400 shadow-indigo-50 ring-2 ring-indigo-100 z-10 scale-[1.02]";
    }

    // Border highlights inside card
    let sideBarGlow = "bg-slate-300";
    if (isFocusedNode) sideBarGlow = "bg-indigo-500 animate-pulse";
    else if (isImportedByFocused) sideBarGlow = "bg-teal-500";
    else if (isConsumerOfFocused) sideBarGlow = "bg-amber-500";

    const changeBadge = node.changeStatus !== "unchanged" && (
      <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 border ${
        node.changeStatus === "added" 
          ? "bg-emerald-50 border-emerald-250 text-emerald-600" 
          : "bg-rose-50 border-rose-200 text-rose-600"
      }`}>
        {node.changeStatus}
      </span>
    );

    return (
      <div
        key={node.id}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
        className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex gap-2.5 items-center relative select-none ${highlightClass}`}
      >
        {/* Glow relationship sidebar indicator */}
        <div className={`w-1 self-stretch rounded-full shrink-0 ${sideBarGlow}`} />

        <div className="space-y-1 overflow-hidden flex-1">
          <div className="flex items-center gap-1.5 justify-between">
            <h4 className="text-xs font-mono font-bold text-slate-800 truncate" title={node.id}>
              {node.label}
            </h4>
            {changeBadge}
          </div>
          
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
            <span>LOC: {Math.round(node.size / 45)} lines</span>
            <span>Functions: {node.functions?.length ?? 0}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render empty layer
  function renderEmptyState() {
    return (
      <div className="py-6 text-center text-slate-400 text-[10px] font-semibold italic border border-dashed border-slate-200 rounded-xl bg-white/40">
        No modules in this layer
      </div>
    );
  }
}
