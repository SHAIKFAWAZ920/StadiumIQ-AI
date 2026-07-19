import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Users, Activity, BatteryCharging, Droplets, 
  Sparkles, LogOut, FileSpreadsheet, RefreshCw, Loader2, AlertOctagon 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip as ChartTooltip, BarChart, Bar, Cell 
} from 'recharts';
import { useSimulation } from '../hooks/useSimulation';
import { dashboardApi } from '../services/api';
import ChatBot from '../components/ChatBot';

export const OpsDashboard: React.FC = () => {
  const { kpis, loading, refresh } = useSimulation();
  
  // Chart and report states
  const [chartsData, setChartsData] = useState<any>(null);
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(true);

  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Operations Chief';

  const fetchCharts = async () => {
    try {
      const data = await dashboardApi.getCharts();
      setChartsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();
    const interval = setInterval(fetchCharts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReport(null);
    try {
      const data = await dashboardApi.generateReport();
      setReport(data.insights);
    } catch (e) {
      console.error(e);
      setReport("Failed to generate executive report. Verify GEMINI_API_KEY is configured.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Convert chart occupancy object to array
  const formattedOccupancy = chartsData?.zone_occupancy 
    ? Object.entries(chartsData.zone_occupancy)
        .filter(([name]) => name.startsWith("Section"))
        .map(([name, count]) => ({ name: name.replace("Section ", "Sec "), visitors: count }))
    : [];

  const formattedQueues = chartsData?.queue_times
    ? Object.entries(chartsData.queue_times).map(([name, time]) => ({ name, wait: time }))
    : [];

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navbar */}
      <header className="glass-card sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between border-b border-white/5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">⚽ Stadium<span className="text-fifa-accent">IQ</span></span>
          <span className="px-2 py-0.5 rounded-full bg-fifa-accent/15 text-fifa-accent text-[10px] uppercase font-bold tracking-wider">Tournament Operations Console</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold hidden md:inline">Operations chief: {username}</span>
          <button
            onClick={handleLogout}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 flex flex-col gap-6">
        
        {/* KPI Summary Cards */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Visitors card */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-fifa-accent/10 flex items-center justify-center text-fifa-accent">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-fifa-textSecondary uppercase font-bold">Total checked-in</span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">{kpis.total_visitors}</h4>
              </div>
            </div>

            {/* Entry/Exit rates */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-fifa-accent/10 flex items-center justify-center text-fifa-accent">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-fifa-textSecondary uppercase font-bold">Entry Rate / min</span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">{kpis.entry_rate_per_min} / min</h4>
              </div>
            </div>

            {/* Clean utilities Energy */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                <BatteryCharging className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-fifa-textSecondary uppercase font-bold">Clean Energy index</span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">{kpis.solar_contribution_pct}% Solar</h4>
              </div>
            </div>

            {/* Clean utilities Water */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-fifa-textSecondary uppercase font-bold">Recycled Water</span>
                <h4 className="text-xl font-extrabold text-white mt-0.5">{kpis.recycled_water_pct}% Recycled</h4>
              </div>
            </div>

          </div>
        )}

        {/* Dynamic Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Visitor Arrival area chart */}
          <div className="lg:col-span-8 glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-fifa-accent" /> Hourly Visitor Attendance Timeline
            </h3>
            
            <div className="h-[250px] w-full">
              {!chartsLoading && chartsData?.visitor_timeline ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.visitor_timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0df270" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0df270" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <ChartTooltip contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Area type="monotone" dataKey="visitors" stroke="#0df270" fillOpacity={1} fill="url(#colorVis)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-fifa-textSecondary">Loading timeline...</div>
              )}
            </div>
          </div>

          {/* Section Occupancy bars */}
          <div className="lg:col-span-4 glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-fifa-accent" /> Live Sector occupancy
            </h3>
            
            <div className="h-[250px] w-full">
              {!chartsLoading && formattedOccupancy.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedOccupancy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <ChartTooltip contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="visitors" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {formattedOccupancy.map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.visitors > 450 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-fifa-textSecondary">Loading sectors...</div>
              )}
            </div>
          </div>

        </div>

        {/* Secondary widgets: Restroom Queues & GenAI Operations briefing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Facility queues bars */}
          <div className="lg:col-span-6 glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart2 className="w-4.5 h-4.5 text-fifa-accent" /> Rest-Stop Wait Times (Minutes)
            </h3>
            
            <div className="h-[200px] w-full">
              {!chartsLoading && formattedQueues.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedQueues} layout="vertical" margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={8} />
                    <ChartTooltip contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="wait" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-fifa-textSecondary">Loading facility delays...</div>
              )}
            </div>
          </div>

          {/* AI operations report compiler */}
          <div className="lg:col-span-6 glass-card rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-fifa-accent">
                  <Sparkles className="w-4.5 h-4.5" /> Gemini Executive Report Compiler
                </h3>
                {report && (
                  <button onClick={() => setReport(null)} className="text-[10px] text-fifa-textSecondary hover:underline">
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[10px] text-fifa-textSecondary mb-4">
                Triggers a structural KPI audit. Gemini will aggregate active sector incidents, utility indicators, and congestion rates to write sharp operational insights.
              </p>
            </div>

            {report ? (
              <div className="bg-slate-900/70 border border-white/5 p-3.5 rounded-2xl text-xs flex-1 max-h-[160px] overflow-y-auto">
                <span className="text-[9px] uppercase font-bold text-fifa-accent tracking-wider block mb-1">Generated Operations briefing</span>
                <p className="text-white leading-relaxed text-[11px] whitespace-pre-line">{report}</p>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-xs text-fifa-textSecondary">
                <FileSpreadsheet className="w-7 h-7 mb-2 opacity-35" />
                Click below to generate Gemini-powered operational insights.
              </div>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="w-full bg-fifa-accent hover:bg-fifa-accentHover disabled:bg-slate-700 text-fifa-dark py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all mt-4 flex items-center justify-center gap-1.5"
            >
              {reportLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Sparkles className="w-4.5 h-4.5" />}
              Compile Operations Briefing
            </button>
          </div>

        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="manager"
        currentLocation="Tournament Control Room"
        preferredLanguage="en"
      />
    </div>
  );
};
export default OpsDashboard;
