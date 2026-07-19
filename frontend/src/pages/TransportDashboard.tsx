import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, Clock, Droplets, MapPin, LogOut, Loader2, 
  Settings, AlertCircle, RefreshCw, BarChart2 
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { transportApi } from '../services/api';
import ChatBot from '../components/ChatBot';

export const TransportDashboard: React.FC = () => {
  const { transport, loading, refresh } = useSimulation();
  
  // Selection states for updates
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [delay, setDelay] = useState(0);
  const [status, setStatus] = useState('On Time');
  const [isUpdating, setIsUpdating] = useState(false);

  const navigate = useNavigate();
  const username = localStorage.getItem('stadium_iq_username') || 'Transport Planner';

  const handleUpdateDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRouteId === null) return;
    setIsUpdating(true);
    try {
      await transportApi.updateDelay(selectedRouteId, delay, status);
      refresh(); // Reload simulation state
      alert("Transit schedule delay updated successfully.");
      setSelectedRouteId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update transit line parameters.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectRoute = (t: any) => {
    setSelectedRouteId(t.id);
    setDelay(t.delay_minutes);
    setStatus(t.status);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Parking Lot seed capacities
  const parkingLots = [
    { name: "Parking Lot A (VVIP & ADA)", capacity: "800/1000", pct: 80, status: "critical" },
    { name: "Parking Lot B (General)", capacity: "300/1000", pct: 30, status: "low" },
    { name: "West Lot (Permit)", capacity: "450/500", pct: 90, status: "critical" },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navbar */}
      <header className="glass-card sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between border-b border-white/5 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">⚽ Stadium<span className="text-fifa-accent">IQ</span></span>
          <span className="px-2 py-0.5 rounded-full bg-fifa-accent/15 text-fifa-accent text-[10px] uppercase font-bold tracking-wider">Transport Control</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold hidden md:inline">Transit coordinator: {username}</span>
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
        
        {/* Left Side: Schedule board & delay logging */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Active Schedule board */}
          <div className="glass-card rounded-3xl p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-lg font-bold">Transit Network Status Board</h2>
                <p className="text-xs text-fifa-textSecondary">Logs public shuttles, metro trains, and parking shuttle departure timers.</p>
              </div>
              <button onClick={() => refresh()} className="p-2 hover:bg-slate-800 rounded-lg text-fifa-accent border border-white/5">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3.5">
              {transport.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectRoute(t)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer flex justify-between items-center transition-colors ${
                    selectedRouteId === t.id
                      ? 'bg-fifa-accent/10 border-fifa-accent'
                      : 'bg-slate-900/60 border-white/5 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-fifa-accent">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{t.route_name}</h4>
                      <span className="text-[10px] text-fifa-textSecondary capitalize mt-0.5 block">Type: {t.type} • Saves {t.carbon_savings_kg}kg CO2/person</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'On Time' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {t.status}
                    </span>
                    <p className="text-[10px] text-fifa-textSecondary mt-1">Delay: {t.delay_minutes} min • ETA: {t.estimated_time_minutes}m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delay Logger Form (Displays when a route is clicked) */}
          {selectedRouteId !== null && (
            <div className="glass-card rounded-3xl p-5 border border-fifa-accent/30 animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm text-fifa-accent flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Transit Line Parameters Control
                </h3>
                <button onClick={() => setSelectedRouteId(null)} className="text-xs text-red-400 hover:underline">Cancel</button>
              </div>

              <form onSubmit={handleUpdateDelay} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Delay Mins</label>
                  <input
                    type="number"
                    value={delay}
                    onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-fifa-textSecondary mb-1.5">Line Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="On Time">On Time</option>
                    <option value="Minor Delays">Minor Delays</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="sm:col-span-2 bg-fifa-accent hover:bg-fifa-accentHover text-fifa-dark font-bold py-2.5 rounded-xl text-xs uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  {isUpdating ? "Saving Line Parameters..." : "Broadcast Delay Update"}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Right Side: Parking Telemetry & Carbon Impact summary */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Parking telemetry */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <BarChart2 className="w-4.5 h-4.5 text-fifa-accent" /> Parking Lot occupancy
            </h3>
            
            <div className="space-y-3.5">
              {parkingLots.map((lot) => (
                <div key={lot.name} className="flex flex-col gap-1 border-b border-white/5 pb-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{lot.name}</span>
                    <span className="text-fifa-textSecondary">{lot.capacity} cars</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lot.pct > 75 ? 'bg-red-500' : 'bg-green-400'
                      }`}
                      style={{ width: `${lot.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Carbon savings ledger */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="font-bold text-sm mb-2.5 flex items-center gap-2 text-green-400">
              <Droplets className="w-4.5 h-4.5" /> Environmental Carbon Ledger
            </h3>
            <p className="text-xs text-fifa-textSecondary leading-relaxed">
              We monitor public transit utility indexes and calculate total tournament emissions offset by fans choosing buses and trains over private taxi transfers.
            </p>

            <div className="mt-4 bg-green-950/20 border border-green-500/10 rounded-2xl p-4 text-center">
              <span className="text-3xl font-black text-fifa-accent block">1,845.2 kg</span>
              <span className="text-[10px] uppercase font-bold text-fifa-textSecondary tracking-wider mt-1 block">Total CO2 offset this match</span>
            </div>
          </div>

        </div>

      </main>

      {/* Floating Chat Assistant */}
      <ChatBot
        userRole="transport"
        currentLocation="Transit Command Room"
        preferredLanguage="en"
      />
    </div>
  );
};
export default TransportDashboard;
