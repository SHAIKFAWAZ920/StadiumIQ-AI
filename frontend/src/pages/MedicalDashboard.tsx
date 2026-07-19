import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartPulse, Activity, Zap, Compass, Sparkles, 
  MapPin, LogOut, Loader2, CheckCircle2, AlertOctagon 
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { incidentsApi, chatApi } from '../services/api';
import StadiumMap from '../components/StadiumMap';
import ChatBot from '../components/ChatBot';

export const MedicalDashboard: React.FC = () => {
  const { crowdZones } = useSimulation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  
  // Medical Instructions search state
  const [medicalQuery, setMedicalQuery] = useState('');
  const [medicalSteps, setMedicalSteps] = useState<string | null>(null);
  const [medicalLoading, setMedicalLoading] = useState(false);
  
  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Medical Responder';

  const fetchIncidents = async () => {
    try {
      const dataAll = await incidentsApi.getAll();
      // Filter for medical category
      const filtered = dataAll.filter((i: any) => i.category === 'medical');
      setIncidents(filtered);
      if (filtered.length > 0 && !selectedIncident) {
        setSelectedIncident(filtered[0]);
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

  const handleFetchMedicalSteps = async () => {
    if (!medicalQuery.trim()) return;
    setMedicalLoading(true);
    setMedicalSteps(null);
    try {
      const prompt = `Provide immediate clinical first-aid instructions for: "${medicalQuery}". Format as a simple 3-step numbered list. Keep it extremely direct and safety-first.`;
      const res = await chatApi.sendMessage(prompt, "Medical Station");
      setMedicalSteps(res.response);
    } catch (e) {
      setMedicalSteps(
        "1. Check victim responsiveness and open airway.\n" +
        "2. Call central dispatcher for heavy support.\n" +
        "3. Apply pressure to wounds or administer cooling pads."
      );
    } finally {
      setMedicalLoading(false);
    }
  };

  const handleDispatchResponder = async (id: number) => {
    try {
      // Bumps incident status to resolving
      await incidentsApi.assign(id, 5); // ID 5 is standard medical user
      fetchIncidents();
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => ({ ...prev, status: "resolving" }));
      }
      alert("🚑 Response crew dispatched. Track path on vector stadium map.");
    } catch (e) {
      console.error(e);
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
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase font-bold tracking-wider">Medical Control</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold hidden md:inline">Station chief: {username}</span>
          <button
            onClick={handleLogout}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Map with Medical Overlay */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">First Aid & SOS Navigation</h2>
                <p className="text-xs text-fifa-textSecondary">Identifies nearest first-aid hubs (Red dots) and active victim reports.</p>
              </div>
            </div>
            
            <StadiumMap
              zones={crowdZones}
              selectedRoute={selectedIncident ? ["Section 102", "Concourse North", selectedIncident.location] : []}
              activeOverlay="normal"
            />
          </div>
        </div>

        {/* Right Side: Medical Incidents & First Aid Search Engine */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Medical Alerts */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-400">
              <HeartPulse className="w-4.5 h-4.5 animate-pulse" /> Active Triage Reports
            </h3>
            
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
              {incidents.length === 0 ? (
                <p className="text-xs text-fifa-textSecondary">No active medical events reported.</p>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer flex justify-between items-start ${
                      selectedIncident?.id === inc.id
                        ? 'bg-red-500/10 border-red-500'
                        : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                        {inc.title}
                      </h4>
                      <p className="text-[10px] text-fifa-textSecondary mt-1">Location: {inc.location}</p>
                    </div>
                    <span className="text-[8px] bg-red-600 text-white font-black uppercase px-2 py-0.5 rounded">
                      {inc.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {selectedIncident && (
              <div className="mt-4 bg-slate-950/40 border border-white/5 rounded-2xl p-3 text-xs">
                <div className="flex justify-between font-bold border-b border-white/5 pb-2">
                  <span>Incident #{selectedIncident.id}</span>
                  <span className="text-red-400">Triage: High</span>
                </div>
                <p className="text-fifa-textSecondary text-[11px] mt-2 italic">
                  "{selectedIncident.description}"
                </p>

                {selectedIncident.ai_summary && (
                  <div className="mt-3 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl">
                    <span className="font-bold text-red-400 flex items-center gap-1 text-[9px]">
                      <Sparkles className="w-3.5 h-3.5" /> AI EMERGENCY RECOMMENDATION
                    </span>
                    <p className="text-[10px] text-fifa-textSecondary mt-1 leading-relaxed">
                      {selectedIncident.ai_summary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {selectedIncident.status === "reported" && (
                    <button
                      onClick={() => handleDispatchResponder(selectedIncident.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs uppercase"
                    >
                      Dispatch Crew
                    </button>
                  )}
                  {selectedIncident.status !== "resolved" && (
                    <button
                      onClick={() => handleResolveIncident(selectedIncident.id)}
                      className="col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-xs uppercase"
                    >
                      Mark Victim Resolved
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clinical FAQ manual search */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-fifa-accent" /> AI Clinical Response Manual
            </h3>
            <p className="text-[10px] text-fifa-textSecondary mb-4">
              Enter symptoms or emergency type. Gemini will retrieve verified first-aid checklists.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. CPR guidelines, heat stroke, diabetic event..."
                value={medicalQuery}
                onChange={(e) => setMedicalQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchMedicalSteps()}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                onClick={handleFetchMedicalSteps}
                disabled={medicalLoading}
                className="px-4 bg-fifa-accent hover:bg-fifa-accentHover disabled:bg-slate-700 text-fifa-dark font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                {medicalLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {medicalSteps && (
              <div className="mt-3.5 bg-slate-800/60 border border-white/5 p-3 rounded-2xl text-xs">
                <span className="font-bold text-fifa-accent flex items-center gap-1 text-[10px]">
                  <Sparkles className="w-3.5 h-3.5" /> AI DIRECT CHECKLIST
                </span>
                <p className="text-white mt-1.5 leading-relaxed text-[11px] whitespace-pre-line">{medicalSteps}</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="medical"
        currentLocation="First Aid Center #1"
        preferredLanguage="en"
      />
    </div>
  );
};
export default MedicalDashboard;
