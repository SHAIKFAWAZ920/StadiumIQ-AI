import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, AlertTriangle, AlertCircle, Sparkles, MessageSquare, 
  MapPin, LogOut, CheckCircle2, ChevronRight, FileSpreadsheet, Search 
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { incidentsApi, chatApi } from '../services/api';
import ChatBot from '../components/ChatBot';

export const VolunteerDashboard: React.FC = () => {
  const { crowdZones } = useSimulation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  
  // Incident Form state
  const [cat, setCat] = useState('trash');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('Gate A');
  const [sev, setSev] = useState('low');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ Search state
  const [faqQuery, setFaqQuery] = useState('');
  const [faqResult, setFaqResult] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);

  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Volunteer';

  // Seed tasks
  const tasks = [
    { id: 1, title: "Check ticket scanner at Gate B", zone: "Gate B", status: "completed" },
    { id: 2, title: "Monitor queue line spacing", zone: "Food Court East", status: "pending" },
    { id: 3, title: "Ensure wheelchair ramp safety paths", zone: "Section 102", status: "pending" },
  ];

  const fetchIncidents = async () => {
    try {
      const data = await incidentsApi.getAll();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc) return;
    setIsSubmitting(true);
    
    try {
      const newInc = await incidentsApi.create({
        category: cat,
        title,
        description: desc,
        location: loc,
        severity: sev
      });
      
      // Reset form
      setTitle('');
      setDesc('');
      fetchIncidents();
      setSelectedIncident(newInc);
    } catch (e) {
      console.error("Failed to submit incident", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaqSearch = async () => {
    if (!faqQuery.trim()) return;
    setFaqLoading(true);
    setFaqResult(null);
    try {
      const res = await chatApi.sendMessage(
        `FAQ Query: ${faqQuery}. Provide a short 2-sentence response based on regulations.`,
        "Information Desk"
      );
      setFaqResult(res.response);
    } catch (e) {
      setFaqResult("Failed to query information database. Try again.");
    } finally {
      setFaqLoading(false);
    }
  };

  const handleResolveIncident = async (id: number) => {
    try {
      await incidentsApi.updateStatus(id, "resolved");
      fetchIncidents();
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => ({ ...prev, status: "resolved" }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navbar */}
      <header className="glass-card sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between border-b border-white/5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">⚽ Stadium<span className="text-fifa-accent">IQ</span></span>
          <span className="px-2 py-0.5 rounded-full bg-fifa-accent/15 text-fifa-accent text-[10px] uppercase font-bold tracking-wider">Volunteer Console</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold hidden md:inline">Welcome, {username} (Zone B Crew)</span>
          <button
            onClick={handleLogout}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Tasks & Reporting Form */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Volunteer Shift Tasks */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-fifa-accent">
              <ClipboardList className="w-4.5 h-4.5" /> Shift Assignment List
            </h3>
            
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/5">
                  <div className="flex gap-2 items-start">
                    <CheckCircle2 className={`w-4.5 h-4.5 mt-0.5 ${task.status === 'completed' ? 'text-fifa-accent' : 'text-slate-500'}`} />
                    <div>
                      <h4 className={`text-xs font-semibold ${task.status === 'completed' ? 'line-through text-fifa-textSecondary' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <span className="text-[10px] text-fifa-textSecondary flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {task.zone}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Report an Incident Form */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4.5 h-4.5 animate-pulse" /> Log Live Incident
            </h3>
            
            <form onSubmit={handleReportIncident} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Category</label>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="trash">Trash Overflow</option>
                    <option value="obstacle">Blocked Path</option>
                    <option value="medical">Medical Event</option>
                    <option value="fire">Fire / Smoke</option>
                    <option value="security">Security Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Severity</label>
                  <select
                    value={sev}
                    onChange={(e) => setSev(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="high">High Severity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Location (Zone)</label>
                <select
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  {crowdZones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Issue Title</label>
                <input
                  type="text"
                  placeholder="e.g. Broken barrier"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Full Details</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Provide precise details to feed the Gemini analyzer..."
                  className="w-full p-3 rounded-xl glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Generating AI Summary..." : "Log Incident & Alert Control"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Active Incidents Board with Gemini instructions & FAQ Search */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active Incidents & GenAI Guidance */}
          <div className="glass-card rounded-3xl p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-red-400" /> Active Operations Incident Board
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 items-stretch">
              
              {/* Incident list */}
              <div className="md:col-span-5 border-r border-white/5 pr-2 max-h-[350px] overflow-y-auto space-y-2.5">
                {incidents.length === 0 ? (
                  <p className="text-xs text-fifa-textSecondary">No active incidents.</p>
                ) : (
                  incidents.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedIncident?.id === inc.id
                          ? 'bg-fifa-accent/10 border-fifa-accent'
                          : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="truncate pr-1">{inc.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                          inc.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          inc.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inc.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-fifa-textSecondary block mt-1">{inc.location}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Incident detail & Gemini safety checklist */}
              <div className="md:col-span-7 flex flex-col justify-between bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                {selectedIncident ? (
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start border-b border-white/5 pb-2">
                        <div>
                          <h4 className="font-bold text-sm text-white">{selectedIncident.title}</h4>
                          <span className="text-[10px] text-fifa-textSecondary">Location: {selectedIncident.location}</span>
                        </div>
                        <span className="text-[10px] font-bold text-fifa-accent uppercase bg-fifa-accent/5 px-2 py-0.5 rounded">
                          {selectedIncident.status}
                        </span>
                      </div>

                      {/* Brief details */}
                      <p className="text-xs text-fifa-textSecondary mt-2.5 italic">
                        "{selectedIncident.description}"
                      </p>

                      {/* Gemini Executive Summary */}
                      {selectedIncident.ai_summary && (
                        <div className="mt-3 bg-fifa-card border border-white/5 p-2.5 rounded-xl text-xs">
                          <span className="font-bold text-fifa-accent flex items-center gap-1 text-[10px]">
                            <Sparkles className="w-3.5 h-3.5" /> AI EXECUTIVE SUMMARY
                          </span>
                          <p className="text-white mt-1 text-[11px] leading-relaxed">
                            {selectedIncident.ai_summary}
                          </p>
                        </div>
                      )}

                      {/* Gemini checklist instructions */}
                      {selectedIncident.ai_volunteer_instructions && (
                        <div className="mt-3 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl text-xs">
                          <span className="font-bold text-red-400 flex items-center gap-1 text-[10px]">
                            <ClipboardList className="w-3.5 h-3.5" /> AI VOLUNTEER WORKFLOW CHECKLIST
                          </span>
                          <p className="text-fifa-textSecondary mt-1.5 text-[11px] leading-relaxed whitespace-pre-line">
                            {selectedIncident.ai_volunteer_instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedIncident.status !== "resolved" && (
                      <button
                        onClick={() => handleResolveIncident(selectedIncident.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-xs uppercase mt-4"
                      >
                        Resolve Task & Archive
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-fifa-textSecondary text-xs">
                    <FileSpreadsheet className="w-8 h-8 opacity-25 mb-2" />
                    Select an incident to view Gemini summary and action checklist.
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RAG-Powered FAQ Info Desk */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Search className="w-4.5 h-4.5 text-fifa-accent" /> RAG Knowledge Search Desk
            </h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about gate rules, wheelchairs, halal food, water refills..."
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFaqSearch()}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-fifa-textSecondary focus:outline-none"
              />
              <button
                onClick={handleFaqSearch}
                disabled={faqLoading}
                className="px-4 bg-fifa-accent hover:bg-fifa-accentHover disabled:bg-slate-700 text-fifa-dark font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1"
              >
                {faqLoading ? "Querying..." : "Search"}
              </button>
            </div>

            {faqResult && (
              <div className="mt-3.5 bg-slate-800/60 border border-white/5 p-3 rounded-2xl text-xs">
                <span className="font-bold text-fifa-accent flex items-center gap-1 text-[10px]">
                  <MessageSquare className="w-3.5 h-3.5" /> RECOGNIZED REGULATION
                </span>
                <p className="text-white mt-1 leading-relaxed text-[11px]">{faqResult}</p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="volunteer"
        currentLocation="Gate B Info Booth"
        preferredLanguage="en"
      />
    </div>
  );
};
export default VolunteerDashboard;
