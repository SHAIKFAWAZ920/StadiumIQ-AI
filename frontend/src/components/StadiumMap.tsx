import React, { useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, HeatmapLayer } from '@react-google-maps/api';
import { MapPin, Shield, Info, Activity, Navigation, Droplets } from 'lucide-react';

interface StadiumMapProps {
  zones: any[];
  selectedRoute?: string[];
  activeOverlay?: 'heatmap' | 'normal' | 'emergency';
  onZoneSelect?: (zoneName: string) => void;
}

// Coordinate mapping for Google Maps (MetLife Stadium center)
const GOOGLE_COORDS: Record<string, { lat: number; lng: number }> = {
  "Gate A": { lat: 40.8148, lng: -74.0743 },
  "Gate B": { lat: 40.8122, lng: -74.0743 },
  "Gate C": { lat: 40.8135, lng: -74.0722 },
  "Gate D": { lat: 40.8135, lng: -74.0764 },
  "Concourse North": { lat: 40.8142, lng: -74.0743 },
  "Concourse South": { lat: 40.8128, lng: -74.0743 },
  "Concourse East": { lat: 40.8135, lng: -74.0730 },
  "Concourse West": { lat: 40.8135, lng: -74.0756 },
  "Section 101": { lat: 40.8139, lng: -74.0750 },
  "Section 102": { lat: 40.8139, lng: -74.0736 },
  "Section 104": { lat: 40.8135, lng: -74.0733 },
  "Section 108": { lat: 40.8131, lng: -74.0736 },
  "Section 112": { lat: 40.8131, lng: -74.0750 },
  "Section 204": { lat: 40.8135, lng: -74.0753 },
  "Section 208": { lat: 40.8128, lng: -74.0752 },
  "Section 218": { lat: 40.8142, lng: -74.0734 },
  "Food Court East": { lat: 40.8138, lng: -74.0728 },
  "Food Court West": { lat: 40.8132, lng: -74.0758 },
  "Parking Lot A": { lat: 40.8155, lng: -74.0743 },
  "Parking Lot B": { lat: 40.8115, lng: -74.0743 },
  "Auxiliary Walkway": { lat: 40.8136, lng: -74.0750 },
  "Gate C Detour Lane": { lat: 40.8138, lng: -74.0718 }
};

// Facility Marker Locations
const GOOGLE_PINS = [
  { id: 1, name: "Green FIFA Grills (Halal)", type: "food", position: { lat: 40.8131, lng: -74.0736 }, desc: "Sec 108" },
  { id: 2, name: "EcoBites (Vegan/Kosher)", type: "food", position: { lat: 40.8131, lng: -74.0750 }, desc: "Sec 112" },
  { id: 3, name: "Water Refill Station 1", type: "water", position: { lat: 40.8142, lng: -74.0743 }, desc: "Sec 101 Lobby" },
  { id: 4, name: "Water Refill Station 2", type: "water", position: { lat: 40.8128, lng: -74.0743 }, desc: "Sec 120 Lobby" },
  { id: 5, name: "First Aid Station 1", type: "medical", position: { lat: 40.8139, lng: -74.0736 }, desc: "Sec 102" },
  { id: 6, name: "First Aid Station 2", type: "medical", position: { lat: 40.8128, lng: -74.0752 }, desc: "Sec 208" }
];

const MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const StadiumMap: React.FC<StadiumMapProps> = ({
  zones = [],
  selectedRoute = [],
  activeOverlay = 'normal',
  onZoneSelect
}) => {
  const [filter, setFilter] = useState<'all' | 'food' | 'restroom' | 'medical' | 'water'>('all');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // 1. Load Google Maps Script
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: MAP_API_KEY || '',
    libraries: ['visualization']
  });

  // Calculate paths for Google Maps polyline
  const getGooglePath = () => {
    return selectedRoute
      .map(node => GOOGLE_COORDS[node])
      .filter(coord => coord !== undefined);
  };

  // Compile Google Maps Heatmap Weight points
  const getHeatmapData = () => {
    if (!isLoaded || typeof window === 'undefined' || !(window as any).google) return [];
    
    return zones.map(zone => {
      const coord = GOOGLE_COORDS[zone.name];
      if (!coord) return null;
      
      let weight = 1;
      if (zone.status === 'medium') weight = 5;
      if (zone.status === 'high') weight = 10;
      if (zone.status === 'critical') weight = 20;

      return {
        location: new (window as any).google.maps.LatLng(coord.lat, coord.lng),
        weight: weight
      };
    }).filter(p => p !== null) as any[];
  };

  // Coordinates mapping for standard SVG vector map (Fallback Mode)
  const svgCoordinates: Record<string, [number, number]> = {
    "Gate A": [250, 45], "Gate B": [250, 455], "Gate C": [455, 250], "Gate D": [45, 250],
    "Concourse North": [250, 110], "Concourse South": [250, 390], "Concourse East": [390, 250], "Concourse West": [110, 250],
    "Section 101": [190, 170], "Section 102": [310, 170], "Section 104": [350, 250], "Section 108": [310, 330], "Section 112": [190, 330],
    "Section 204": [150, 190], "Section 208": [150, 310], "Section 218": [350, 190],
    "Food Court East": [410, 180], "Food Court West": [90, 320],
    "Parking Lot A": [250, 15], "Parking Lot B": [250, 485]
  };

  const svgPins = [
    { id: 1, name: "Green FIFA Grills (Halal)", type: "food", x: 310, y: 330 },
    { id: 2, name: "EcoBites (Vegan/Kosher)", type: "food", x: 190, y: 330 },
    { id: 3, name: "Water Refill #1", type: "water", x: 250, y: 110 },
    { id: 4, name: "Water Refill #2", type: "water", x: 250, y: 390 },
    { id: 5, name: "First Aid Station 1", type: "medical", x: 310, y: 170 },
    { id: 6, name: "First Aid Station 2", type: "medical", x: 150, y: 310 }
  ];

  const getSVGZoneColor = (zoneName: string) => {
    if (activeOverlay === 'emergency') {
      if (zoneName.startsWith("Gate")) return "rgba(13, 242, 112, 0.4)";
      if (zoneName === "Section 104") return "rgba(239, 68, 68, 0.8)";
      return "rgba(255, 255, 255, 0.05)";
    }
    const zone = zones.find(z => z.name === zoneName);
    if (!zone) return "rgba(255, 255, 255, 0.08)";
    if (activeOverlay === 'heatmap') {
      switch (zone.status) {
        case 'low': return 'rgba(13, 242, 112, 0.2)';
        case 'medium': return 'rgba(250, 196, 25, 0.35)';
        case 'high': return 'rgba(249, 115, 22, 0.55)';
        case 'critical': return 'rgba(239, 68, 68, 0.8)';
        default: return 'rgba(255, 255, 255, 0.08)';
      }
    }
    return hoveredZone === zoneName ? 'rgba(13, 242, 112, 0.15)' : 'rgba(255, 255, 255, 0.04)';
  };

  const renderSVGRoute = () => {
    if (!selectedRoute || selectedRoute.length < 2) return null;
    let pathD = "";
    selectedRoute.forEach((node, idx) => {
      const coords = svgCoordinates[node];
      if (coords) {
        if (idx === 0) pathD += `M ${coords[0]} ${coords[1]}`;
        else pathD += ` L ${coords[0]} ${coords[1]}`;
      }
    });
    if (!pathD) return null;
    return (
      <>
        <path d={pathD} fill="none" stroke="#0df270" strokeWidth="6" strokeLinecap="round" className="opacity-40 blur-xs" />
        <path d={pathD} fill="none" stroke="#0df270" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="8 6" className="animate-[dash_2s_linear_infinite]" />
      </>
    );
  };

  // Google Maps rendering block
  const renderGoogleMap = () => {
    const center = { lat: 40.8135, lng: -74.0743 };
    const filteredPins = GOOGLE_PINS.filter(p => filter === 'all' || p.type === filter);

    return (
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={17}
        options={{
          mapTypeId: 'satellite',
          tilt: 45,
          disableDefaultUI: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#041021' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#041021' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] }
          ]
        }}
      >
        {/* Real-time Heatmap Density Overlay */}
        {activeOverlay === 'heatmap' && getHeatmapData().length > 0 && (
          <HeatmapLayer
            data={getHeatmapData()}
            options={{
              radius: 35,
              opacity: 0.8,
              gradient: [
                'rgba(0, 255, 0, 0)',
                'rgba(0, 255, 0, 1)',
                'rgba(255, 255, 0, 1)',
                'rgba(255, 0, 0, 1)'
              ]
            }}
          />
        )}

        {/* Navigation Polyline Route */}
        {selectedRoute.length >= 2 && (
          <Polyline
            path={getGooglePath()}
            options={{
              strokeColor: activeOverlay === 'emergency' ? '#ef4444' : '#0df270',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true
            }}
          />
        )}

        {/* Custom Marker Pins */}
        {filteredPins.map((pin) => (
          <Marker
            key={pin.id}
            position={pin.position}
            title={pin.name}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
              fillColor: pin.type === 'food' ? '#f59e0b' : pin.type === 'water' ? '#3b82f6' : '#ef4444',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
              scale: 8
            }}
          />
        ))}
      </GoogleMap>
    );
  };

  // SVG Fallback Rendering block
  const renderSVGFallback = () => {
    return (
      <svg viewBox="0 0 500 500" className="w-full h-full select-none" role="img" aria-label="MetLife Stadium Map Layout">
        <defs>
          <style>{`@keyframes dash { to { stroke-dashoffset: -40; } }`}</style>
        </defs>
        <rect x="25" y="25" width="450" height="450" rx="120" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <rect x="80" y="80" width="340" height="340" rx="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <rect x="160" y="190" width="180" height="120" fill="rgba(13, 242, 112, 0.04)" stroke="rgba(13, 242, 112, 0.25)" strokeWidth="1.5" />
        <circle cx="250" cy="250" r="30" fill="none" stroke="rgba(13, 242, 112, 0.2)" strokeWidth="1.5" />
        <line x1="250" y1="190" x2="250" y2="310" stroke="rgba(13, 242, 112, 0.2)" strokeWidth="1.5" />

        {/* Polygons */}
        {Object.keys(svgCoordinates).filter(k => k.startsWith("Section")).map(zone => (
          <path
            key={zone}
            d={zone === "Section 101" ? "M 120 120 L 240 120 L 240 180 L 170 180 Z" :
               zone === "Section 102" ? "M 260 120 L 380 120 L 330 180 L 260 180 Z" :
               zone === "Section 104" ? "M 390 130 L 390 370 L 340 310 L 340 190 Z" :
               zone === "Section 108" ? "M 260 320 L 330 320 L 380 380 L 260 380 Z" :
               zone === "Section 112" ? "M 170 320 L 240 320 L 240 380 L 120 380 Z" :
                                        "M 110 130 L 110 370 L 60 370 L 60 130 Z"}
            fill={getSVGZoneColor(zone)}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            className="cursor-pointer transition-colors duration-200"
            role="button"
            aria-label={`Select ${zone} details`}
            onClick={() => onZoneSelect?.(zone)}
            onMouseEnter={() => setHoveredZone(zone)}
            onMouseLeave={() => setHoveredZone(null)}
          />
        ))}

        {/* Exits */}
        {["Gate A", "Gate B", "Gate C", "Gate D"].map((gate, idx) => {
          const coords = svgCoordinates[gate];
          return (
            <g key={gate}>
              <circle
                cx={coords[0]} cy={coords[1]} r="14"
                fill={getSVGZoneColor(gate)}
                stroke="#0df270"
                strokeWidth="1.5"
                className="cursor-pointer"
                role="button"
                aria-label={`Select ${gate} status`}
                onClick={() => onZoneSelect?.(gate)}
                onMouseEnter={() => setHoveredZone(gate)}
                onMouseLeave={() => setHoveredZone(null)}
              />
              <text x={coords[0]} y={coords[1]+4} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">
                {gate.replace("Gate ", "")}
              </text>
            </g>
          );
        })}

        {renderSVGRoute()}

        {/* Pins */}
        {svgPins.filter(p => filter === 'all' || p.type === filter).map(pin => (
          <circle key={pin.id} cx={pin.x} cy={pin.y} r="7" fill={pin.type === 'food' ? '#f59e0b' : pin.type === 'water' ? '#3b82f6' : '#ef4444'} className="animate-pulse" />
        ))}
      </svg>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center w-full">
        {(['all', 'food', 'water', 'medical'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              filter === cat
                ? 'bg-fifa-accent text-fifa-dark font-bold shadow-md shadow-fifa-accent/20'
                : 'bg-fifa-card hover:bg-slate-800 text-fifa-textSecondary border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative w-full max-w-[500px] aspect-square glass-card rounded-2xl p-4 overflow-hidden">
        {MAP_API_KEY && isLoaded ? renderGoogleMap() : renderSVGFallback()}

        {hoveredZone && (
          <div className="absolute bottom-4 left-4 right-4 bg-fifa-card/95 border border-white/10 rounded-xl p-2.5 text-xs z-10 backdrop-blur-sm">
            <div className="font-bold flex items-center justify-between">
              <span>{hoveredZone}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                zones.find(z => z.name === hoveredZone)?.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                zones.find(z => z.name === hoveredZone)?.status === 'high' ? 'bg-orange-500/20 text-orange-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {zones.find(z => z.name === hoveredZone)?.status || 'low'}
              </span>
            </div>
            <div className="text-fifa-textSecondary mt-1 flex justify-between">
              <span>Visitors: {zones.find(z => z.name === hoveredZone)?.current_count || 0}</span>
              <span>Max Capacity: {zones.find(z => z.name === hoveredZone)?.max_capacity || 500}</span>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1 bg-black/60 backdrop-blur-xs p-2 rounded-lg text-[9px] border border-white/5">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> Low</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Medium</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> High</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Critical</div>
        </div>
      </div>
      
      {!MAP_API_KEY && (
        <span className="text-[10px] text-fifa-textSecondary mt-2 text-center">
          ℹ️ Running in SVG map fallback. Set `VITE_GOOGLE_MAPS_API_KEY` for Google Satellite view.
        </span>
      )}
    </div>
  );
};
export default StadiumMap;
