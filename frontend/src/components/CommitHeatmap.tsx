"use client";

import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar, GitCommit, User, Clock, ArrowRight } from "lucide-react";

export default function CommitHeatmap({ 
  timeline, 
  onCommitClick, 
  activeCommitSha 
}: { 
  timeline: any[], 
  onCommitClick: (commit: any) => void,
  activeCommitSha: string | null 
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group commits by YYYY-MM-DD
  const commitsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    timeline.forEach(commit => {
      try {
        const dateStr = commit.timestamp.substring(0, 10);
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)!.push(commit);
      } catch (e) {
        console.error(e);
      }
    });
    return map;
  }, [timeline]);

  // Generate calendar days for the last 6 months (26 weeks)
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    // Go back 180 days to show a gorgeous 6-month contribution grid
    for (let i = 180; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      days.push({
        date: d,
        dateStr,
        commits: commitsByDate.get(dateStr) || []
      });
    }
    return days;
  }, [commitsByDate]);

  // Align days into weeks starting Sunday
  const gridWeeks = useMemo(() => {
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    
    const days = [...calendarDays];
    if (days.length === 0) return [];
    
    const firstDay = days[0].date;
    const startOffset = firstDay.getDay(); // 0 Sunday, 6 Saturday
    
    // Pre-pad first week
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push(null);
    }
    
    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [calendarDays]);

  // Find month boundaries for grid column labels
  const monthLabels = useMemo(() => {
    const labels: { text: string, colIndex: number }[] = [];
    let lastMonth = "";
    
    gridWeeks.forEach((week, wIdx) => {
      // Find the first valid day in the week
      const validDay = week.find(d => d !== null);
      if (validDay) {
        const mText = format(validDay.date, "MMM");
        if (mText !== lastMonth) {
          labels.push({ text: mText, colIndex: wIdx });
          lastMonth = mText;
        }
      }
    });
    
    return labels;
  }, [gridWeeks]);

  const selectedDayCommits = useMemo(() => {
    if (!selectedDate) return [];
    return commitsByDate.get(selectedDate) || [];
  }, [selectedDate, commitsByDate]);

  return (
    <div className="w-full space-y-6">
      
      {/* Dynamic Heatmap Subtitle & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">
            Commit Activity Hotspot Calendar
          </span>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-extrabold uppercase">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200/40" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-100" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-300" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-700" />
          <span>More</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[580px] flex flex-col space-y-1.5 select-none">
          
          {/* Month Labels */}
          <div className="relative h-4 text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
            {monthLabels.map((lbl, idx) => (
              <span 
                key={idx} 
                className="absolute" 
                style={{ left: `${lbl.colIndex * 21 + 24}px` }}
              >
                {lbl.text}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Weekday Labels */}
            <div className="flex flex-col justify-between h-[96px] text-[8px] text-slate-400 font-extrabold uppercase w-4 pr-1 py-0.5 leading-none">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1">
              {gridWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    if (!day) {
                      return (
                        <div 
                          key={`empty-${dIdx}`} 
                          className="w-3 h-3 bg-transparent" 
                        />
                      );
                    }

                    const count = day.commits.length;
                    const isSelected = selectedDate === day.dateStr;
                    
                    // GitHub contribution colors mapped to indigo
                    let colorClass = "bg-slate-100 hover:bg-slate-200";
                    if (count >= 5) {
                      colorClass = "bg-indigo-700 hover:bg-indigo-800 text-white";
                    } else if (count >= 3) {
                      colorClass = "bg-indigo-500 hover:bg-indigo-600 text-white";
                    } else if (count >= 2) {
                      colorClass = "bg-indigo-300 hover:bg-indigo-400 text-white";
                    } else if (count >= 1) {
                      colorClass = "bg-indigo-100 hover:bg-indigo-200 text-indigo-900";
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => setSelectedDate(isSelected ? null : day.dateStr)}
                        title={`${count} commits on ${format(day.date, "MMM d, yyyy")}`}
                        className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:scale-115 ${colorClass} ${
                          isSelected 
                            ? "ring-2 ring-indigo-600 ring-offset-1 scale-110 shadow-md" 
                            : ""
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Date Commits Drawer Panel */}
      {selectedDate && (
        <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-650">
                <GitCommit className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                {selectedDayCommits.length} Commits Processed
              </span>
              <h4 className="text-sm font-extrabold text-slate-800 mt-1">
                Activity on {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
              </h4>
            </div>
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded transition-colors cursor-pointer border border-slate-200/60 bg-slate-50 hover:bg-slate-100 shadow-sm"
            >
              ✕ Clear List
            </button>
          </div>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {selectedDayCommits.map((c) => {
              const isActive = activeCommitSha === c.sha;
              return (
                <div 
                  key={c.sha}
                  onClick={() => onCommitClick(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between gap-4 group ${
                    isActive 
                      ? "bg-indigo-50 border-indigo-400 shadow-sm ring-2 ring-indigo-150/20" 
                      : "bg-slate-50 border-slate-200/70 hover:border-slate-350 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    {/* User initials bubble */}
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-xs font-black text-slate-700 uppercase group-hover:border-indigo-300 transition-colors">
                      {c.author.substring(0, 2)}
                    </div>
                    
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {c.message}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {c.author}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[9px] bg-slate-200/60 text-slate-500 px-1 py-0.2 rounded">
                          {c.sha.substring(0, 7)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1 text-[10px] text-slate-450 font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {format(parseISO(c.timestamp), "h:mm a")}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors group-hover:translate-x-1 duration-300" />
                  </div>
                </div>
              );
            })}
            
            {selectedDayCommits.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No commit activity recorded on this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
