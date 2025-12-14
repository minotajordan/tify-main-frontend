import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Check, MapPin, Route, Trash2, Navigation, Search, Layers, Palette } from 'lucide-react';

// Fix Leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  onSave: (data: { markers: [number, number][]; polylines: { points: [number, number][]; color: string }[] }) => void;
  onClose: () => void;
  initialData?: { markers: [number, number][]; polylines: any[] } | null;
}

type Mode = 'view' | 'marker' | 'polyline';

const MapEvents = ({
  mode,
  onMapClick,
}: {
  mode: Mode;
  onMapClick: (latlng: L.LatLng) => void;
}) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// Component to fly to location
const MapController = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13);
    }
  }, [center, map]);
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ onSave, onClose, initialData }) => {
  const [mode, setMode] = useState<Mode>('view');
  const [markers, setMarkers] = useState<[number, number][]>(initialData?.markers || []);
  
  // Normalize polylines to new format
  const [polylines, setPolylines] = useState<{ points: [number, number][]; color: string }[]>(() => {
    if (!initialData?.polylines) return [];
    return initialData.polylines.map(p => {
      if (Array.isArray(p)) {
        return { points: p as [number, number][], color: '#4F46E5' };
      }
      return p;
    });
  });

  const [currentPolyline, setCurrentPolyline] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#4F46E5'); // Indigo-600

  const colors = ['#4F46E5', '#DC2626', '#16A34A', '#CA8A04', '#2563EB'];

  const handleMapClick = (latlng: L.LatLng) => {
    if (mode === 'marker') {
      setMarkers((prev) => [...prev, [latlng.lat, latlng.lng]]);
    } else if (mode === 'polyline') {
      setCurrentPolyline((prev) => [...prev, [latlng.lat, latlng.lng]]);
    }
  };

  const finishPolyline = () => {
    if (currentPolyline.length > 1) {
      setPolylines((prev) => [...prev, { points: currentPolyline, color: selectedColor }]);
    }
    setCurrentPolyline([]);
  };

  useEffect(() => {
    if (mode !== 'polyline' && currentPolyline.length > 0) {
      finishPolyline();
    }
  }, [mode]);

  const handleSave = () => {
    // If there is an unfinished polyline, add it
    let finalPolylines = [...polylines];
    if (currentPolyline.length > 1) {
      finalPolylines.push({ points: currentPolyline, color: selectedColor });
    }
    onSave({ markers, polylines: finalPolylines });
  };

  const clearAll = () => {
    setMarkers([]);
    setPolylines([]);
    setCurrentPolyline([]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative border border-gray-100">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 min-w-fit">
              <Navigation size={20} className="text-indigo-600" />
              Location & Routes
            </h3>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full max-w-md ml-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search place..."
                className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </form>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-2 border border-gray-200/50">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setMode('view')}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                mode === 'view' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="View Mode"
            >
              <Navigation size={20} />
            </button>
            <button
              onClick={() => setMode('marker')}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                mode === 'marker'
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Add Marker"
            >
              <MapPin size={20} />
            </button>
            <button
              onClick={() => setMode('polyline')}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                mode === 'polyline'
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Draw Route"
            >
              <Route size={20} />
            </button>
          </div>
          
          <div className="h-px bg-gray-200 my-1" />
          
          <div className="p-1 flex flex-col gap-2 items-center">
             <Palette size={16} className="text-gray-400" />
             <div className="flex flex-col gap-1">
               {colors.map(color => (
                 <button
                   key={color}
                   onClick={() => setSelectedColor(color)}
                   className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                   style={{ backgroundColor: color }}
                 />
               ))}
             </div>
          </div>

          <div className="h-px bg-gray-200 my-1" />

          <button
            onClick={clearAll}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Clear All"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative bg-slate-50 isolate">
          <MapContainer
            center={[4.6097, -74.0817]} // Default to Bogota
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents mode={mode} onMapClick={handleMapClick} />
            <MapController center={mapCenter} />
            
            {markers.map((pos, idx) => (
              <Marker key={`marker-${idx}`} position={pos} />
            ))}

            {polylines.map((poly, idx) => (
              <Polyline key={`poly-${idx}`} positions={poly.points} color={poly.color} />
            ))}

            {currentPolyline.length > 0 && (
              <Polyline positions={currentPolyline} color={selectedColor} dashArray="5, 10" />
            )}
          </MapContainer>
          
          {/* Instructions Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-6 py-2.5 rounded-full shadow-lg border border-gray-200 text-sm font-medium text-gray-700 flex items-center gap-3">
             {mode === 'view' && <><Navigation size={16} className="text-indigo-600"/> Pan and zoom to explore</>}
             {mode === 'marker' && <><MapPin size={16} className="text-indigo-600"/> Click map to place markers</>}
             {mode === 'polyline' && <><Route size={16} className="text-indigo-600"/> Click to draw path points. Switch mode to finish.</>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center z-10">
          <div className="text-xs text-gray-500">
             {markers.length} markers, {polylines.length} routes
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <Check size={18} />
              Attach Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default LocationPicker;