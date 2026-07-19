import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Navigation, Clock, Trash2, Droplets, MapPin, AlertOctagon, 
  Train, LogOut, Flame, AlertCircle, Sparkles, HelpCircle, HeartPulse, UserX, X 
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { crowdApi, incidentsApi } from '../services/api';
import StadiumMap from '../components/StadiumMap';
import ChatBot from '../components/ChatBot';

export const FanDashboard: React.FC = () => {
  const { crowdZones, queues, transport, loading } = useSimulation();
  const [currentLoc, setCurrentLoc] = useState('Gate A');
  const [destLoc, setDestLoc] = useState('Section 104');
  const [selectedRoute, setSelectedRoute] = useState<string[]>([]);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  
  // Accessibility controls
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');
  const [colorblindMode, setColorblindMode] = useState<'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [preferredLang, setPreferredLang] = useState('en');

  // Emergency States
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [sosCategory, setSosCategory] = useState('medical');
  const [sosDescription, setSosDescription] = useState('Feeling dizzy and dehydrated near seat.');
  const [sosRouteActive, setSosRouteActive] = useState(false);

  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Fan';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleCalculateRoute = async () => {
    try {
      const data = await crowdApi.recommendRoute(currentLoc, destLoc);
      setSelectedRoute(data.recommended_path);
      setRouteInfo(data);
      setSosRouteActive(false); // Disable emergency evac paths
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSOS = async () => {
    try {
      // 1. Log emergency incident on backend
      await incidentsApi.create({
        category: sosCategory,
        title: `CRITICAL SOS: ${sosCategory.toUpperCase()} at ${currentLoc}`,
        description: sosDescription,
        location: currentLoc,
        severity: "high"
      });

      // 2. Plot escape evacuation route on map
      // Exit route goes from current location to nearest Gate
      const nearestGate = currentLoc.startsWith("Gate") ? currentLoc : "Gate B";
      setSelectedRoute([currentLoc, "Concourse South", nearestGate]);
      setSosRouteActive(true);
      setRouteInfo({
        estimated_time_minutes: 2,
        alternative_route_reason: "🚨 EMERGENCY EVACUATION ACTIVE. Proceed to Green Zone exits immediately."
      });

      setIsSOSOpen(false);
    } catch (e) {
      console.error("SOS creation failed", e);
    }
  };

  // Build root class string for accessibility options
  const getAccessibilityClasses = () => {
    let classes = [];
    if (textSize === 'large') classes.push('accessibility-large-text');
    if (colorblindMode !== 'normal') classes.push(`colorblind-${colorblindMode}`);
    if (highContrast) classes.push('accessibility-high-contrast');
    return classes.join(' ');
  };

  return (
    <div className={`min-h-screen pb-20 ${getAccessibilityClasses()}`}>
      
      {/* SVG Colorblind filters injection */}
      <svg style={{ position: 'absolute', height: 0, width: 0 }}>
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95, 0.05,  0, 0, 0  0,  0.433, 0.567, 0, 0  0,  0.475, 0.525, 0, 0  0,  0, 0, 1, 0" />
          </filter>
        </defs>
      </svg>

      {/* Top Navbar */}
      <header className="glass-card sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between border-b border-white/5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">⚽ Stadium<span className="text-fifa-accent">IQ</span></span>
          <span className="px-2 py-0.5 rounded-full bg-fifa-accent/15 text-fifa-accent text-[10px] uppercase font-bold tracking-wider">Fan</span>
        </div>

        {/* Accessibility Panel Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800/80 rounded-lg p-1.5 border border-white/5">
            {/* Text Zoom */}
            <button
              onClick={() => setTextSize(prev => prev === 'normal' ? 'large' : 'normal')}
              className={`px-2 py-1 rounded ${textSize === 'large' ? 'bg-fifa-accent text-fifa-dark font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Large A+
            </button>
            {/* High Contrast */}
            <button
              onClick={() => setHighContrast(prev => !prev)}
              className={`px-2 py-1 rounded ${highContrast ? 'bg-fifa-accent text-fifa-dark font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              High Contrast
            </button>
            {/* Colorblind Toggle */}
            <select
              value={colorblindMode}
              onChange={(e) => setColorblindMode(e.target.value as any)}
              className="bg-slate-900 border border-white/10 text-white text-[11px] rounded p-1"
            >
              <option value="normal">Default Color</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold hidden md:inline">Welcome, {username}</span>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Primary Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Map & Route Navigation Planner */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Interactive Map Wrapper */}
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Interactive Stadium Guide</h2>
                <p className="text-xs text-fifa-textSecondary">Tap sectors for queue length and capacity details.</p>
              </div>
              
              {/* Trigger SOS button */}
              <button
                onClick={() => setIsSOSOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/30 animate-pulse"
              >
                <AlertOctagon className="w-4 h-4" />
                SOS Emergency
              </button>
            </div>
            
            <StadiumMap
              zones={crowdZones}
              selectedRoute={selectedRoute}
              activeOverlay={sosRouteActive ? 'emergency' : 'heatmap'}
              onZoneSelect={(zone) => {
                // Clicking a zone sets the destination automatically
                setDestLoc(zone);
              }}
            />
          </div>

          {/* Navigation Planner */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-fifa-accent">
              <Navigation className="w-4 h-4" /> Navigation Path Planner
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1">Your Location</label>
                <select
                  value={currentLoc}
                  onChange={(e) => setCurrentLoc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs focus:border-fifa-accent"
                >
                  {crowdZones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1">Destination Seat / Gate</label>
                <select
                  value={destLoc}
                  onChange={(e) => setDestLoc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs focus:border-fifa-accent"
                >
                  {crowdZones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleCalculateRoute}
              className="w-full bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Calculate Crowdfree Route &rarr;
            </button>

            {routeInfo && (
              <div className="mt-4 bg-slate-800/60 border border-white/5 p-3 rounded-xl text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Path Found:</span>
                  <span className="text-fifa-accent">{routeInfo.estimated_time_minutes} min walk</span>
                </div>
                <p className="text-fifa-textSecondary mt-1 leading-relaxed text-[11px]">
                  {routeInfo.alternative_route_reason}
                </p>
                <div className="mt-2 text-[10px] text-green-400 font-bold flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" /> Walking saves {routeInfo.carbon_savings_kg}kg of carbon footprint!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Wait Times, Public Transit, Sustainability */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Wait Times Tracker */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-fifa-accent" /> Facilities Queue Wait Times
            </h3>
            
            <div className="space-y-3.5">
              {queues.slice(0, 5).map((q) => (
                <div key={q.name} className="flex flex-col gap-1 border-b border-white/5 pb-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{q.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      q.status === 'red' ? 'bg-red-500/20 text-red-400' :
                      q.status === 'yellow' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {q.wait_time_minutes} mins
                    </span>
                  </div>
                  {/* Wait timeline bar */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        q.status === 'red' ? 'bg-red-500' :
                        q.status === 'yellow' ? 'bg-amber-500' :
                        'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(100, (q.wait_time_minutes / 30) * 100)}%` }}
                    />
                  </div>
                  
                  {/* Recommendation fallback */}
                  {q.status === 'red' && q.alternative_facility_name && (
                    <span className="text-[10px] text-fifa-textSecondary">
                      💡 Crowded! Try <strong>{q.alternative_facility_name}</strong> (approx {q.alternative_wait_time} min wait).
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sustainability Index */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-green-400">
              <Sparkles className="w-4 h-4" /> Green Stadium Action
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                <span className="text-2xl font-black text-fifa-accent">3</span>
                <p className="text-[9px] uppercase tracking-wider text-fifa-textSecondary mt-1">Refills Done</p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                <span className="text-2xl font-black text-fifa-accent">2.4 kg</span>
                <p className="text-[9px] uppercase tracking-wider text-fifa-textSecondary mt-1">CO2 Saved Today</p>
              </div>
            </div>
            
            <div className="mt-4 bg-green-950/20 border border-green-500/15 rounded-2xl p-3 text-xs text-green-300">
              <p className="font-bold mb-1">💡 Waste Segregation Guide</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-fifa-textSecondary">
                <li>Blue Bin: Clean plastic cups & paper programs.</li>
                <li>Green Bin: Food waste, biodegradable boxes.</li>
                <li>Red Bin: General trash, wrappers, aluminum.</li>
              </ul>
            </div>
          </div>

          {/* Public Transport Schedule */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Train className="w-4 h-4 text-fifa-accent" /> Public Transit Departures
            </h3>
            
            <div className="space-y-3.5">
              {transport.map((t) => (
                <div key={t.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2.5">
                  <div>
                    <h4 className="font-semibold">{t.route_name}</h4>
                    <span className="text-[10px] text-fifa-textSecondary capitalize">Type: {t.type}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'On Time' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {t.status}
                    </span>
                    <p className="text-[10px] text-fifa-textSecondary mt-1">ETA: {t.estimated_time_minutes}m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="fan"
        currentLocation={currentLoc}
        preferredLanguage={preferredLang}
        onLanguageChange={(l) => setPreferredLang(l)}
      />

      {/* SOS MODAL OVERLAY */}
      {isSOSOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md border border-red-500/35 relative">
            <button 
              onClick={() => setIsSOSOpen(false)}
              className="absolute top-4 right-4 text-fifa-textSecondary hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-red-500 mb-4">
              <AlertCircle className="w-6 h-6 animate-bounce" />
              <h3 className="text-xl font-bold">Trigger SOS Emergency</h3>
            </div>

            <p className="text-xs text-fifa-textSecondary mb-4">
              Alerts the first-aid responder, medical dispatch team, and security personnel to your exact location ({currentLoc}) immediately.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Emergency Type</label>
                <select
                  value={sosCategory}
                  onChange={(e) => setSosCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="medical">Medical Event / Sick</option>
                  <option value="fire">Fire / Smoke hazard</option>
                  <option value="security">Security Alert / Fight</option>
                  <option value="obstacle">Blocked exit path</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Description / Symptoms</label>
                <textarea
                  value={sosDescription}
                  onChange={(e) => setSosDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-fifa-textSecondary/50 focus:outline-none"
                  placeholder="Provide immediate details (e.g. Chest pain, smoke near garbage bin)..."
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setIsSOSOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTriggerSOS}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-md"
                >
                  CONFIRM SOS SIGNAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FanDashboard;
