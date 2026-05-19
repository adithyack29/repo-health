"use client";

import { BrainCircuit } from "lucide-react";

export default function AIExplanation({ explanation, loading }: { explanation: string | null, loading: boolean }) {
  return (
    <div className="relative p-6 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="flex items-center gap-3 mb-4 text-indigo-600">
        <BrainCircuit className="w-5 h-5" />
        <h3 className="font-bold text-xs tracking-wider uppercase">Architectural Insight</h3>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : explanation ? (
        <p className="text-slate-600 leading-relaxed text-sm font-medium">
          {explanation}
        </p>
      ) : (
        <p className="text-slate-400 italic text-sm">
          Select a commit on the timeline to generate an explanation.
        </p>
      )}
    </div>
  );
}
