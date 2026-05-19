"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HealthTimeline from "@/components/HealthTimeline";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import HotspotMap from "@/components/HotspotMap";
import CommitHeatmap from "@/components/CommitHeatmap";
import AIExplanation from "@/components/AIExplanation";
import { 
  Loader2, ShieldAlert, GitCommit, GitBranch, GitPullRequest, Search, 
  TrendingUp, TrendingDown, Users, BookOpen, AlertTriangle, 
  CheckCircle, RefreshCw, BarChart2, Shield, Heart, Cpu, Info, BrainCircuit,
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function RepositoryAnalysis() {
  const { repoId } = useParams();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCommit, setActiveCommit] = useState<any>(null);
  const [graphElements, setGraphElements] = useState<any[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [repoStats, setRepoStats] = useState<{ url: string, total_commits: number } | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Diff Mode States
  const [diffMode, setDiffMode] = useState(false);
  const [baseCommitSha, setBaseCommitSha] = useState<string>("");
  const [compareCommitSha, setCompareCommitSha] = useState<string>("");
  const [diffElements, setDiffElements] = useState<any[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);

  useEffect(() => {
    fetchTimeline();
    
    // Poll every 3 seconds if timeline is empty or ingestion is likely still happening
    const interval = setInterval(() => {
      fetchTimeline(false); // pass false to avoid resetting loading state
    }, 3000);
    
    return () => clearInterval(interval);
  }, [repoId]);

  const fetchTimeline = async (showLoading = true) => {
    if (showLoading && timeline.length === 0) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeline/${repoId}`);
      const data = await res.json();
      
      if (data.status === "success") {
        setRepoStats({ url: data.repo_url, total_commits: data.total_commits_in_repo });
      }

      if (data.timeline && data.timeline.length > 0) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Only auto-select the latest commit when we first load the timeline
  useEffect(() => {
    if (timeline.length > 0 && !activeCommit) {
      const active = timeline[timeline.length - 1];
      handleNodeClick(active, timeline);
      
      setCompareCommitSha(active.sha);
      const prevIdx = timeline.length - 2;
      if (prevIdx >= 0) {
        setBaseCommitSha(timeline[prevIdx].sha);
      } else {
        setBaseCommitSha(active.sha);
      }
    }
  }, [timeline, activeCommit]);

  const fetchDiff = async (baseSha: string, targetSha: string) => {
    if (!baseSha || !targetSha) return;
    setDiffLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/diff/${baseSha}/${targetSha}`);
      const data = await res.json();
      if (data.status === "success") {
        const base = data.base_graph || { nodes: [], edges: [] };
        const target = data.target_graph || { nodes: [], edges: [] };
        
        const baseNodes = base.nodes || [];
        const targetNodes = target.nodes || [];
        const baseEdges = base.edges || [];
        const targetEdges = target.edges || [];
        
        const baseNodeIds = new Set(baseNodes.map((n: any) => n.data.id));
        const targetNodeIds = new Set(targetNodes.map((n: any) => n.data.id));
        
        // Nodes diff
        const combinedNodes = [];
        for (const n of targetNodes) {
          if (baseNodeIds.has(n.data.id)) {
            combinedNodes.push({ ...n, data: { ...n.data, changeStatus: 'unchanged' } });
          } else {
            combinedNodes.push({ ...n, data: { ...n.data, changeStatus: 'added' } });
          }
        }
        for (const n of baseNodes) {
          if (!targetNodeIds.has(n.data.id)) {
            combinedNodes.push({ ...n, data: { ...n.data, changeStatus: 'removed' } });
          }
        }
        
        // Edges diff
        const baseEdgeIds = new Set(baseEdges.map((e: any) => `${e.data.source}->${e.data.target}`));
        const targetEdgeIds = new Set(targetEdges.map((e: any) => `${e.data.source}->${e.data.target}`));
        
        const combinedEdges = [];
        for (const e of targetEdges) {
          const id = `${e.data.source}->${e.data.target}`;
          if (baseEdgeIds.has(id)) {
            combinedEdges.push({ ...e, data: { ...e.data, changeStatus: 'unchanged' } });
          } else {
            combinedEdges.push({ ...e, data: { ...e.data, changeStatus: 'added' } });
          }
        }
        for (const e of baseEdges) {
          const id = `${e.data.source}->${e.data.target}`;
          if (!targetEdgeIds.has(id)) {
            combinedEdges.push({ ...e, data: { ...e.data, changeStatus: 'removed' } });
          }
        }
        
        setDiffElements([...combinedNodes, ...combinedEdges]);
      }
    } catch (err) {
      console.error("Failed to fetch graph diff:", err);
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    if (diffMode && baseCommitSha && compareCommitSha) {
      fetchDiff(baseCommitSha, compareCommitSha);
    }
  }, [diffMode, baseCommitSha, compareCommitSha]);

  const handleNodeClick = async (commit: any, currentTimeline = timeline) => {
    setActiveCommit(commit);
    setCompareCommitSha(commit.sha);
    
    // Default base SHA to previous commit
    const list = currentTimeline.length > 0 ? currentTimeline : timeline;
    const currIdx = list.findIndex(c => c.sha === commit.sha);
    if (currIdx > 0) {
      setBaseCommitSha(list[currIdx - 1].sha);
    } else {
      setBaseCommitSha(commit.sha);
    }
    
    // Fetch Graph for this commit
    try {
      const gRes = await fetch(`${API_BASE}/api/graph/${commit.sha}`);
      const gData = await gRes.json();
      setGraphElements(gData.graph || []);
    } catch (err) {
      console.error(err);
    }

    // Fetch AI Explanation if not already available in the commit object
    if (commit.ai_explanation) {
      setExplanation(commit.ai_explanation);
    } else {
      setAiLoading(true);
      try {
        const aiRes = await fetch(`${API_BASE}/api/ai-explanation/${repoId}/${commit.sha}`, { method: 'POST' });
        const aiData = await aiRes.json();
        setExplanation(aiData.explanation);
        
        // Update local state to cache it
        setTimeline(prev => prev.map(c => c.sha === commit.sha ? { ...c, ai_explanation: aiData.explanation } : c));
      } catch (err) {
        console.error(err);
        setExplanation("Failed to generate explanation.");
      } finally {
        setAiLoading(false);
      }
    }
  };

  if (loading || timeline.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center mx-auto shadow-sm">
            <Cpu className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Initializing Repository Scan</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              We are cloning your remote repository tree and initializing the AST syntax parser. This normally takes only a few seconds.
            </p>
          </div>
          
          <div className="space-y-2.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
              <div className="bg-indigo-600 h-full rounded-full animate-[pulse_1.5s_infinite] shadow-sm" style={{ width: '40%' }}></div>
            </div>
            <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Cloning Git branches...</div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Navigation Tabs
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "commits", label: "Commits", icon: GitCommit },
    { id: "architecture", label: "Architecture", icon: Cpu },
    { id: "contributors", label: "Contributors", icon: Users },
    { id: "insights", label: "Insights", icon: BrainCircuit },
  ];

  // 2. Calculations for Top Cards:
  const latestCommit = timeline[timeline.length - 1];
  const healthScore = activeCommit?.composite_health ?? latestCommit?.composite_health ?? 81;
  
  // Risk level
  let riskLevel = "Medium";
  let riskColor = "text-amber-600 bg-amber-50 border-amber-200";
  if (healthScore >= 80) {
    riskLevel = "Low";
    riskColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  } else if (healthScore < 60) {
    riskLevel = "High";
    riskColor = "text-rose-600 bg-rose-50 border-rose-200";
  }

  // Commits count
  const commitCount = repoStats?.total_commits ?? timeline.length ?? 0;
  const commitCountStr = commitCount > 500 ? "500+ commits" : `${commitCount} commits`;

  // Architecture stability
  const depRot = activeCommit?.dependency_rot ?? latestCommit?.dependency_rot ?? 0;
  let stability = "Moderate";
  let stabilityColor = "text-amber-600";
  if (depRot <= 3.0) {
    stability = "Stable";
    stabilityColor = "text-emerald-600 font-bold";
  } else if (depRot > 6.0) {
    stability = "Risky";
    stabilityColor = "text-rose-600 font-bold";
  }

  // Bus Factor dynamic calculation
  const authors = Array.from(new Set(timeline.map(c => c.author)));
  const busFactorVal = authors.length || 2;
  let busRisk = "Medium";
  if (busFactorVal === 1) {
    busRisk = "High";
  } else if (busFactorVal > 2) {
    busRisk = "Low";
  }

  // Complexity Score
  const rawComplexity = activeCommit?.complexity_score ?? latestCommit?.complexity_score ?? 12;
  const complexityPct = Math.min(95, Math.max(30, Math.round(rawComplexity * 5.5)));

  // Progress tracking:
  const totalCommits = repoStats?.total_commits ?? 0;
  const processedCommits = timeline.length;
  const isProcessing = totalCommits > 0 && processedCommits < totalCommits;
  const progressPercent = totalCommits > 0 ? Math.round((processedCommits / totalCommits) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Sticky Premium Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-lg text-slate-900 tracking-tight hover:opacity-90 transition-all">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-mono text-base shadow-md">
                RH
              </span>
              <span>Repo Health <span className="text-indigo-600">Intelligence</span></span>
            </Link>
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full select-none">
              PREMIUM
            </span>
          </div>
          
          <nav className="flex h-full items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-full px-3 md:px-4 flex items-center gap-2 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                    isActive 
                      ? "border-indigo-600 text-indigo-600 font-bold" 
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              ← Back to Scan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="container mx-auto px-4 py-8 space-y-6 flex-1">
        
        {/* Title and Repo Details */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {repoStats?.url ? repoStats.url.replace('https://github.com/', '') : "Target Repository"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Analyzing code dependency matrices and architectural risk factors.</p>
          </div>
          {activeCommit && (
            <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm self-start md:self-auto">
              <GitCommit className="w-4 h-4 text-indigo-600" />
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{activeCommit.sha.substring(0,7)}</span>
              <span className="text-indigo-900/60">by {activeCommit.author}</span>
            </div>
          )}
        </div>

        {/* Live Background Processing Banner */}
        {isProcessing && (
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 shadow-[0_4px_20px_rgba(99,102,241,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 font-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Background AST Analysis Active</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Parsing commits: <span className="font-bold text-indigo-600">{processedCommits}</span> of <span className="font-bold text-slate-700">{totalCommits}</span> completed.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 min-w-[200px] sm:min-w-[300px]">
              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden border border-slate-200/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-xs font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shadow-sm">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* 6 Top Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
          {/* Card 1: Repository Health Score */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Health Score</div>
            <div>
              <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                {healthScore.toFixed(0)}<span className="text-slate-400 text-lg">/100</span>
              </div>
              <div className="text-[9px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Dynamic Rating
              </div>
            </div>
          </div>

          {/* Card 2: Risk Level */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Risk Level</div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black uppercase tracking-tight ${riskColor.split(' ')[0]}`}>{riskLevel}</span>
                <span className="relative flex h-3.5 w-3.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    riskLevel === "Low" ? "bg-emerald-400" : (riskLevel === "Medium" ? "bg-amber-400" : "bg-rose-400")
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    riskLevel === "Low" ? "bg-emerald-500" : (riskLevel === "Medium" ? "bg-amber-500" : "bg-rose-500")
                  }`}></span>
                </span>
              </div>
              <div className="text-[10px] text-slate-450 font-semibold mt-1">Based on active state</div>
            </div>
          </div>

          {/* Card 3: Commit Count */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Commit Count</div>
            <div>
              <div className="font-mono text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {commitCountStr}
              </div>
              <div className="text-[10px] text-slate-450 font-semibold mt-1">All analyzed history</div>
            </div>
          </div>

          {/* Card 4: Architecture Stability */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Architecture Stability</div>
            <div>
              <div className={`text-2xl font-black ${stabilityColor}`}>
                {stability}
              </div>
              <div className="text-[10px] text-slate-450 font-semibold mt-1">Coupling rot index</div>
            </div>
          </div>

          {/* Card 5: Bus Factor */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Bus Factor</div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-1.5">
                {busFactorVal} 
                <span className={`text-[9px] px-1.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${
                  busRisk === "High" ? "bg-rose-50 border-rose-150 text-rose-600" : (busRisk === "Medium" ? "bg-amber-50 border-amber-150 text-amber-600" : "bg-emerald-50 border-emerald-150 text-emerald-600")
                }`}>
                  {busRisk}
                </span>
              </div>
              <div className="text-[10px] text-slate-450 font-semibold mt-1">Unique Git authors</div>
            </div>
          </div>

          {/* Card 6: Complexity Score */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] backdrop-blur-md flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Complexity Score</div>
            <div>
              <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                {complexityPct}%
              </div>
              <div className="text-[10px] text-slate-450 font-semibold mt-1">Weighted code index</div>
            </div>
          </div>
        </div>

        {/* Tab Selection Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Row: Timeline and AI Explanation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Health Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HealthTimeline 
                    data={timeline} 
                    onNodeClick={handleNodeClick} 
                    activeCommitSha={activeCommit?.sha || null} 
                  />
                </CardContent>
              </Card>
              
              <div className="flex flex-col gap-6">
                <AIExplanation explanation={explanation} loading={aiLoading} />
                
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-850">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      Risk Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeCommit ? (
                      <div className="space-y-4 pt-4">
                        <MetricRow label="Complexity Score" value={activeCommit.complexity_score} />
                        <MetricRow label="Complexity Drift" value={activeCommit.complexity_drift} />
                        <MetricRow label="Test Coverage" value={activeCommit.test_coverage} />
                        <MetricRow label="Hotspot Risk" value={activeCommit.hotspot_risk} />
                        <MetricRow label="Dependency Rot" value={activeCommit.dependency_rot} />
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-sm pt-4">Select a commit on the timeline</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Row: File Hotspot & Commit Activity Heatmap Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-850 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Code Module Hotspot Map
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HotspotMap elements={graphElements} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-850 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Commit Activity Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommitHeatmap 
                    timeline={timeline}
                    onCommitClick={handleNodeClick}
                    activeCommitSha={activeCommit?.sha || null}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "commits" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left 2/3: Search & List */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <GitCommit className="w-5 h-5 text-indigo-500" />
                    Commit Ingestion History
                  </CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
                    <input
                      type="text"
                      placeholder="Search author, message, SHA..."
                      value={searchTerm === "" ? "" : searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm font-medium"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {timeline
                    .filter(c => 
                      c.message.toLowerCase().includes(searchTerm) ||
                      c.author.toLowerCase().includes(searchTerm) ||
                      c.sha.toLowerCase().includes(searchTerm)
                    )
                    .slice()
                    .reverse() // latest first
                    .map((c) => {
                      const isActive = activeCommit?.sha === c.sha;
                      const dateStr = new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      return (
                        <div
                          key={c.sha}
                          onClick={() => handleNodeClick(c)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isActive 
                              ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-xs">
                              {c.author.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {c.sha.substring(0, 7)}
                                </span>
                                <span className="text-xs text-slate-400 font-semibold">{dateStr}</span>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 truncate mt-1">{c.message}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              c.composite_health >= 80 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                : (c.composite_health >= 60 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200")
                            }`}>
                              {c.composite_health.toFixed(0)}% Health
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Right 1/3: Focus Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-800">Active Commit Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeCommit ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Full Commit Message</div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{activeCommit.message}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Commit Info</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Author:</span>
                        <span className="font-bold text-slate-700">{activeCommit.author}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Timestamp:</span>
                        <span className="font-bold text-slate-700">{new Date(activeCommit.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Is Pull Request:</span>
                        <span className="font-bold text-indigo-600">{activeCommit.is_pr ? "Yes" : "No"}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Metrics Summary</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Composite Health:</span>
                          <span className="font-bold text-emerald-600">{activeCommit.composite_health.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Complexity Score:</span>
                          <span className="font-bold text-slate-800">{activeCommit.complexity_score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Dependency Rot:</span>
                          <span className="font-bold text-slate-800">{activeCommit.dependency_rot.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-sm text-center py-12">Select a commit from history</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "architecture" && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-500" />
                  Architecture Knowledge Graph
                </CardTitle>
                <p className="text-slate-500 text-xs mt-1">Explores dynamic file dependency clusters and structural dependencies.</p>
              </div>
              <button 
                onClick={() => setDiffMode(!diffMode)}
                className={`text-xs px-3.5 py-2 rounded-xl border font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                  diffMode 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {diffMode ? "Diff Mode Active" : "Enable Graph Diff"}
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {diffMode && (
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold uppercase">Base:</span>
                    <select 
                      value={baseCommitSha} 
                      onChange={(e) => setBaseCommitSha(e.target.value)}
                      className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-slate-750 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 max-w-[150px] truncate shadow-sm cursor-pointer"
                    >
                      {timeline.map((c) => (
                        <option key={`base-${c.sha}`} value={c.sha}>
                          {c.message.split('\n')[0]} ({c.sha.substring(0, 7)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold uppercase">Compare:</span>
                    <select 
                      value={compareCommitSha} 
                      onChange={(e) => setCompareCommitSha(e.target.value)}
                      className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-slate-750 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 max-w-[150px] truncate shadow-sm cursor-pointer"
                    >
                      {timeline.map((c) => (
                        <option key={`compare-${c.sha}`} value={c.sha}>
                          {c.message.split('\n')[0]} ({c.sha.substring(0, 7)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3.5 ml-auto text-[10px] font-extrabold font-mono text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Added</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></span> Removed</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm"></span> Unchanged</span>
                  </div>
                </div>
              )}
              
              <div className="rounded-xl overflow-hidden bg-slate-50/50 border border-slate-100">
                {diffMode ? (
                  diffLoading ? (
                    <div className="h-[400px] w-full flex items-center justify-center bg-white/[0.01]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <KnowledgeGraph elements={diffElements} />
                  )
                ) : (
                  <KnowledgeGraph elements={graphElements} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "contributors" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left 2/3: Author Commit Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Repository Contributors Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {(() => {
                    const authorMap: Record<string, number> = {};
                    timeline.forEach(c => {
                      authorMap[c.author] = (authorMap[c.author] || 0) + 1;
                    });
                    const sortedAuthors = Object.entries(authorMap)
                      .sort((a, b) => b[1] - a[1]);
                    
                    const totalCommits = timeline.length;
                    return sortedAuthors.map(([authorName, commitsCount]) => {
                      const percentage = Math.round((commitsCount / totalCommits) * 100);
                      return (
                        <div key={authorName} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-650 font-extrabold text-xs">
                                {authorName.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800">{authorName}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-500">
                              {commitsCount} commits ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Right 1/3: Bus Factor Card */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    Bus Factor Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
                    <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Calculated Index</div>
                    <div className="text-5xl font-black text-indigo-900 mt-2">{busFactorVal}</div>
                    <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border mt-3 ${
                      busRisk === "High" 
                        ? "bg-rose-50 text-rose-600 border-rose-200" 
                        : (busRisk === "Medium" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200")
                    }`}>
                      {busRisk} Risk Rating
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    <strong>Bus Factor</strong> represents the minimum number of core developers who, if they suddenly left the project, would cause the project to stall completely due to loss of architecture knowledge.
                  </p>
                  
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 font-bold" />
                      <span>{authors.length} unique authors tracked</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      {busFactorVal > 1 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 font-bold" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500 font-bold" />
                      )}
                      <span>Contribution spread over {busFactorVal} authors</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left 2/3: Refactoring Action Items & Warnings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-500" />
                  Architectural Insights & Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Complexity Hotspot Identified</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        Your codebase has files tracking with hotspot risk above average index. Refactoring complex modules will prevent regression bugs in highly-churned files.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">High Modular Coupling</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        A high dependency rot index indicates tighter imports coupling. We suggest introducing abstract interfaces or hooks to decouple structural utilities.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Decaying Unit Specs Coverage</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        Test coverage index shows below 60%. Increasing coverage on frequently churned hotspots dramatically reduces architectural risks.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right 1/3: Concrete Suggestions Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-800">Improvement Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked readOnly className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-xs text-slate-450 font-semibold line-through">Ingest Git history tree</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked readOnly className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-xs text-slate-450 font-semibold line-through">Calculate active complexity score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" readOnly className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-xs text-slate-700 font-semibold">Refactor highest scoring Hotspot Map files</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" readOnly className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-xs text-slate-700 font-semibold">Add missing test suites to main modules</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" readOnly className="w-4 h-4 accent-indigo-600 rounded" />
                    <span className="text-xs text-slate-700 font-semibold">Perform modular decoupled cleanup</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string, value: number }) {
  let valueStr = value.toFixed(1);
  let color = "text-emerald-600";
  
  if (label === "Complexity Score") {
    color = value > 15 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold";
  } else if (label === "Complexity Drift") {
    valueStr = value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
    color = value > 0 ? "text-rose-600 font-bold" : (value < 0 ? "text-emerald-600 font-bold" : "text-slate-500");
  } else if (label === "Test Coverage") {
    valueStr = `${value.toFixed(1)}%`;
    color = value < 60 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold";
  } else if (label === "Hotspot Risk") {
    color = value > 100 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold";
  } else if (label === "Dependency Rot") {
    color = value > 5 ? "text-rose-600 font-bold" : "text-emerald-600 font-semibold";
  }

  return (
    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-650 font-medium">{label}</span>
      <span className={`font-mono ${color}`}>
        {valueStr}
      </span>
    </div>
  );
}
