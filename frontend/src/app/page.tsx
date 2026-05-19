import Link from "next/link";
import { ArrowRight, GitBranch, Activity, ShieldAlert, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 bg-slate-50">
      
      {/* Premium Background Graphic */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center">
        <div className="w-[1000px] h-[1000px] border border-indigo-100/40 rounded-full absolute" />
        <div className="w-[800px] h-[800px] border border-indigo-100/60 rounded-full absolute" />
        <div className="w-[600px] h-[600px] border border-indigo-100/80 rounded-full absolute" />
        <div className="w-[400px] h-[400px] border border-indigo-200/40 rounded-full absolute" />
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06)_0%,rgba(255,255,255,0)_70%)] absolute" />
      </div>

      <div className="z-10 max-w-4xl text-center space-y-8 mt-20 animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800">
          Track how software systems evolve.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Repo Health Intelligence analyzes architectural decay, hotspots, complexity drift, and dependency health across your repository history.
        </p>

        <div className="pt-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-indigo-600 text-white font-semibold text-sm transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:scale-105 active:scale-95"
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4 animate-pulse" />
          </Link>
        </div>
      </div>

      <div className="z-10 w-full max-w-5xl mt-32 grid grid-cols-1 md:grid-cols-4 gap-6 pb-20 animate-fade-in animation-delay-200">
        <FeatureCard 
          icon={<Activity className="w-5 h-5 text-indigo-600" />}
          title="Health Timeline"
          description="Visualize system degradation and improvements across every commit."
        />
        <FeatureCard 
          icon={<GitBranch className="w-5 h-5 text-indigo-600" />}
          title="Knowledge Graph Diff"
          description="See exactly how dependencies and coupling change over time."
        />
        <FeatureCard 
          icon={<ShieldAlert className="w-5 h-5 text-indigo-600" />}
          title="Hotspot Detection"
          description="Identify high-churn, high-complexity areas introducing risk."
        />
        <FeatureCard 
          icon={<Cpu className="w-5 h-5 text-indigo-600" />}
          title="AI Explanations"
          description="Automated architectural insights explaining sudden health drops."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-start text-left p-6 rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-md shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-md hover:border-indigo-500/20 group">
      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 mb-4 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
