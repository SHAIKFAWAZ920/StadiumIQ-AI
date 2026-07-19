import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, AlertOctagon, Eye, Send, Sparkles, Languages, 
  MapPin, LogOut, Loader2, Video, AlertCircle 
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { incidentsApi, chatApi } from '../services/api';
import StadiumMap from '../components/StadiumMap';
import ChatBot from '../components/ChatBot';

export const SecurityDashboard: React.FC = () => {
  const { crowdZones } = useSimulation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  
  // Alert dispatch state
  const [alertText, setAlertText] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'fan' | 'volunteer'>('all');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<any>(null);
  
  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Security';

  // CCTV Mock Cameras
  const cameras = [
    { id: 1, name: "Gate A - Ticket Scanners", status: "active", region: "Gate A" },
    { id: 2, name: "Section 104 - Exit Vomitory", status: "active", region: "Section 104" },
    { id: 3, name: "Concourse East - Food Lobby", status: "active", region: "Concourse East" },
    { id: 4, name: "Parking Lot B - Shuttle Gate", status: "active", region: "Parking Lot B" },
  ];

  const fetchIncidents = async () => {
    try {
      const data = await incidentsApi.getAll("security");
      const dataAll = await incidentsApi.getAll();
      // Filter high severity or security-specific
      const filtered = dataAll.filter((i: any) => i.category === 'security' || i.severity === 'high');
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

  const handleTranslateAlert = async () => {
    if (!alertText.trim()) return;
    setIsTranslating(true);
    try {
      // Direct prompt to translate into standard FIFA languages
      const prompt = `Translate this announcement: "${alertText}" into Spanish, French, and Arabic. Return a JSON object with keys "es", "fr", "ar". Output ONLY valid JSON, no notes.`;
      const res = await chatApi.sendMessage(prompt, "Security Desk");
      
      // Clean JSON parsing
      const jsonStart = res.response.indexOf('{');
      const jsonEnd = res.response.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(res.response.substring(jsonStart, jsonEnd));
        setTranslations(parsed);
      } else {
        setTranslations({
          es: `[ES] ${alertText}`,
          fr: `[FR] ${alertText}`,
          ar: `[AR] ${alertText}`
        });
      }
    } catch (e) {
      console.error("AI Translation failed:", e);
      setTranslations({
        es: `[ES] ${alertText}`,
        fr: `[FR] ${alertText}`,
        ar: `[AR] ${alertText}`
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDispatchAlert = () => {
    // In production, posts announcements to database. For hackathon, shows toast/log.
    alert(`📢 ALERT DISPATCHED TO: ${targetRole.toUpperCase()}\nOriginal: ${alertText}\nSpanish: ${translations?.es || "None"}\nFrench: ${translations?.fr || "None"}`);
    setAlertText('');
    setTranslations(null);
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
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase font-bold tracking-wider">Security Command</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold hidden md:inline">Command Officer: {username}</span>
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
        
        {/* Left Side: Crowd Map & CCTV feeds */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Heatmap Stadium representation */}
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold">Crowd Congestion Overview</h2>
                <p className="text-xs text-fifa-textSecondary">Real-time heat density overlay mapped from gate sensors.</p>
              </div>
            </div>
            
            <StadiumMap
              zones={crowdZones}
              activeOverlay="heatmap"
              onZoneSelect={(zone) => setSelectedIncident(prev => prev?.location === zone ? prev : null)}
            />
          </div>

          {/* CCTV Feeds simulated */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-400">
              <Video className="w-4.5 h-4.5" /> CCTV Video Surveillance Node
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {cameras.map((cam) => (
                <div key={cam.id} className="relative aspect-video bg-black/90 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center">
                  {/* Visual grid filter simulation */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,0,0.1)_0%,transparent_100%)] pointer-events-none"></div>
                  <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] pointer-events-none bg-[size:100%_4px,3px_100%]"></div>
                  
                  {/* Scanner dots */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono border border-white/10 text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    REC: {cam.name}
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    Feed region: {cam.region}
                  </span>
                  <span className="text-[9px] text-fifa-accent/40 font-mono mt-1">CCTV CAMERA STABLE</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Security Incidents & Announcement Dispatcher */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Security Incident list */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4.5 h-4.5" /> Security & Severity Alerts
            </h3>
            
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
              {incidents.length === 0 ? (
                <p className="text-xs text-fifa-textSecondary">No security threats detected.</p>
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
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                        {inc.title}
                      </h4>
                      <p className="text-[10px] text-fifa-textSecondary mt-1">Zone: {inc.location}</p>
                    </div>
                    <span className="text-[8px] bg-red-600 text-white font-black uppercase px-2 py-0.5 rounded animate-pulse">
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
                  <span className="text-red-400">{selectedIncident.category}</span>
                </div>
                <p className="text-fifa-textSecondary text-[11px] mt-2 italic">
                  "{selectedIncident.description}"
                </p>

                {/* Gemini instructions */}
                {selectedIncident.ai_volunteer_instructions && (
                  <div className="mt-3 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl">
                    <span className="font-bold text-red-400 flex items-center gap-1 text-[9px]">
                      <Sparkles className="w-3.5 h-3.5" /> AI SUGGESTED CONTAINMENT PROCEDURES
                    </span>
                    <p className="text-[10px] text-fifa-textSecondary mt-1 leading-relaxed whitespace-pre-line">
                      {selectedIncident.ai_volunteer_instructions}
                    </p>
                  </div>
                )}

                {selectedIncident.status !== "resolved" && (
                  <button
                    onClick={() => handleResolveIncident(selectedIncident.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs uppercase mt-3 transition-colors"
                  >
                    Mark Threat Resolved
                  </button>
                )}
              </div>
            )}
          </div>

          {/* AI Announcement Multilingual Dispatcher */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Languages className="w-4.5 h-4.5 text-fifa-accent" /> AI Multilingual Announcement Dispatch
            </h3>
            <p className="text-[10px] text-fifa-textSecondary mb-4">
              Enter alert text in English. Gemini will automatically translate it for Arabic, Spanish, and French audiences.
            </p>

            <div className="space-y-4">
              <div>
                <textarea
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-fifa-textSecondary/50 focus:outline-none"
                  placeholder="e.g. Exit Gate C is closed. Use Gate B."
                />
              </div>

              <div className="flex justify-between items-center gap-3">
                <select
                  value={targetRole}
                  onChange={(e: any) => setTargetRole(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl p-2"
                >
                  <option value="all">Broadcast to All</option>
                  <option value="fan">Fans Only</option>
                  <option value="volunteer">Volunteers Only</option>
                </select>

                <button
                  type="button"
                  onClick={handleTranslateAlert}
                  disabled={isTranslating || !alertText.trim()}
                  className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-white/10 text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  {isTranslating ? <Loader2 className="w-4 h-4 animate-spin text-fifa-accent" /> : <Sparkles className="w-4 h-4 text-fifa-accent" />}
                  Translate Alert
                </button>
              </div>

              {translations && (
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-2 text-[11px]">
                  <p className="font-bold text-[10px] text-fifa-textSecondary uppercase tracking-wider">Generated Translations</p>
                  <div>
                    <span className="text-fifa-accent font-bold">ES:</span> {translations.es}
                  </div>
                  <div>
                    <span className="text-fifa-accent font-bold">FR:</span> {translations.fr}
                  </div>
                  <div>
                    <span className="text-fifa-accent font-bold">AR:</span> {translations.ar}
                  </div>

                  <button
                    onClick={handleDispatchAlert}
                    className="w-full bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all mt-4"
                  >
                    Broadcast Multilingual Alert &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="security"
        currentLocation="Security Control Center"
        preferredLanguage="en"
      />
    </div>
  );
};
export default SecurityDashboard;
