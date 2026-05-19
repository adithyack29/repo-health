"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl })
      });
      
      const data = await res.json();
      
      if (data.status === "processing" || data.status === "success") {
        // We'll just route to a dummy ID 1 for this hackathon if it's the first one,
        // or actually fetch the ID if the backend returns it.
        // For now, let's assume the backend returned repo_id or we poll the repos list.
        // As a shortcut, we'll fetch the repos list and take the first one or the one matching the URL.
        const reposRes = await fetch(`${API_BASE}/api/repositories`);
        const reposData = await reposRes.json();
        
        const repo = reposData.repositories.find((r: any) => r.url === repoUrl) || reposData.repositories[reposData.repositories.length - 1];
        
        if (repo) {
          router.push(`/dashboard/${repo.id}`);
        } else {
          // If async processing is slow, we might just route to 1 as fallback
          router.push(`/dashboard/1`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to ingest repository.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Scan Repository</h1>
          <p className="text-slate-500">Enter a public GitHub repository URL to analyze its health history.</p>
        </div>
        
        <form onSubmit={handleIngest} className="relative shadow-md rounded-xl overflow-hidden">
          <input 
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full bg-white border border-slate-200 rounded-xl px-6 py-4 pr-16 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm"
            required
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
