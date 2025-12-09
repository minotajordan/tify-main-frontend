import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Move, 
  Grid3X3, 
  Save, 
  ZoomIn, 
  ZoomOut,
  MousePointer2,
  Armchair
} from 'lucide-react';
import { TifyEvent, EventZone, EventSeat, SeatStatus } from '../../types';
import { api } from '../../services/api';

interface SeatDesignerProps {
  event: TifyEvent;
  onUpdate: (updatedEvent: TifyEvent) => void;
  onSaveStart?: () => void;
}

const DEFAULT_ZONE_COLOR = '#4F46E5';
const GRID_SIZE = 20;

export default function SeatDesigner({ event, onUpdate, onSaveStart }: SeatDesignerProps) {
  const [zones, setZones] = useState<EventZone[]>(event.zones || []);
  const [seats, setSeats] = useState<EventSeat[]>(event.seats || []);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<'layout' | 'select' | 'type' | 'individual'>('layout');
  const [selectedSeatType, setSelectedSeatType] = useState<'REGULAR' | 'VIP' | 'ACCESSIBLE'>('REGULAR');
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Resize logic
  const resizingRef = useRef<{zoneId: string, startX: number, startY: number, startWidth: number, startHeight: number} | null>(null);
  const scaleRef = useRef(scale);

  // Sync state if prop changes
  useEffect(() => {
    setZones(event.zones || []);
    setSeats(event.seats || []);
  }, [event]);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedSeatId, selectedSeatIds]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const handleResizeStart = (e: React.PointerEvent, zone: EventZone) => {
    e.stopPropagation();
    e.preventDefault();
    const layout = zone.layout || { x: 0, y: 0, width: 100, height: 100 };
    
    resizingRef.current = {
      zoneId: zone.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: layout.width,
      startHeight: layout.height
    };

    const handleMove = (moveEvent: PointerEvent) => {
      if (!resizingRef.current) return;
      const { zoneId, startX, startY, startWidth, startHeight } = resizingRef.current;
      
      const currentScale = scaleRef.current;
      const deltaX = (moveEvent.clientX - startX) / currentScale;
      const deltaY = (moveEvent.clientY - startY) / currentScale;
      
      let newWidth = Math.max(GRID_SIZE, startWidth + deltaX);
      let newHeight = Math.max(GRID_SIZE, startHeight + deltaY);
      
      // Snap to grid
      newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
      newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;
      
      setZones(prev => prev.map(z => {
        if (z.id === zoneId) {
          return {
             ...z,
             layout: { ...z.layout!, width: newWidth, height: newHeight }
          };
        }
        return z;
      }));
    };

    const handleUp = () => {
      resizingRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleAddIndividualSeat = (x: number, y: number) => {
    if (!selectedZoneId) {
      alert('Selecciona o crea una zona primero para añadir sillas individuales');
      return;
    }
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return;

    // Snap to grid
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    
    // ... rest of logic
    
    // Let's try to detect if the selected zone is "Free Form" (rows=0, cols=0, capacity=0/null).
    const isFreeForm = (zone.rows === 0 && zone.cols === 0 && !zone.capacity);
    
    if (!isFreeForm) {
      // If it's a grid or general admission, we can't just add random dots easily without breaking the grid logic.
      // Prompt user to convert?
      const convert = confirm('Esta zona es de tipo Cuadrícula o General. ¿Deseas convertirla a "Ubicación Libre" para añadir sillas manualmente?');
      if (convert) {
         updateZone(zone.id, { 
           rows: 0, 
           cols: 0, 
           capacity: 0,
           layout: { ...(zone.layout || { x: 60, y: 60 }), width: 400, height: 300 }
         });
      } else {
        return;
      }
    }

    const newSeat: EventSeat = {
      id: `${zone.id}-free-${Date.now()}`,
      zoneId: zone.id,
      rowLabel: 'F', // Default
      colLabel: (seats.filter(s => s.zoneId === zone.id).length + 1).toString(),
      status: SeatStatus.AVAILABLE,
      type: 'REGULAR',
      x: snappedX,
      y: snappedY
    };
    
    setSeats([...seats, newSeat]);
  };

  const handleAddZone = () => {
    const newZone: EventZone = {
      id: Math.random().toString(36).substr(2, 9),
      eventId: event.id,
      name: `Zona ${zones.length + 1}`,
      color: DEFAULT_ZONE_COLOR,
      price: 0,
      rows: 5,
      cols: 10,
      type: 'SALE',
      layout: { x: 60, y: 60, width: 300, height: 200 }
    };
    
    // Generate initial seats for this zone
    const newSeats: EventSeat[] = [];
    for (let r = 0; r < newZone.rows; r++) {
      for (let c = 0; c < newZone.cols; c++) {
        newSeats.push({
          id: `${newZone.id}-${r}-${c}`,
          zoneId: newZone.id,
          rowLabel: String.fromCharCode(65 + r), // A, B, C...
          colLabel: (c + 1).toString(),
          status: SeatStatus.AVAILABLE,
          type: 'REGULAR'
        });
      }
    }

    setZones([...zones, newZone]);
    setSeats([...seats, ...newSeats]);
    setSelectedZoneId(newZone.id);
  };

  const updateZone = (id: string, updates: Partial<EventZone>) => {
    const updatedZones = zones.map(z => {
      if (z.id !== id) return z;
      const newZone = { ...z, ...updates };
      
      // If dimensions changed, regenerate seats (WARNING: Destructive)
      if (updates.rows !== undefined || updates.cols !== undefined) {
        // If switching to general admission (rows=0 or cols=0), clear seats
        if ((updates.rows === 0 || updates.cols === 0) || (newZone.rows === 0 || newZone.cols === 0)) {
           const filteredSeats = seats.filter(s => s.zoneId !== id);
           setSeats(filteredSeats);
        } else {
           // Standard grid regeneration
           const filteredSeats = seats.filter(s => s.zoneId !== id);
           const newSeats: EventSeat[] = [];
           for (let r = 0; r < newZone.rows; r++) {
             for (let c = 0; c < newZone.cols; c++) {
               newSeats.push({
                 id: `${newZone.id}-${r}-${c}`,
                 zoneId: newZone.id,
                 rowLabel: String.fromCharCode(65 + r),
                 colLabel: (c + 1).toString(),
                 status: SeatStatus.AVAILABLE,
                 type: 'REGULAR'
               });
             }
           }
           setSeats([...filteredSeats, ...newSeats]);
        }
      }
      
      return newZone;
    });
    setZones(updatedZones);
  };

  const handleSave = async () => {
    // Let's add a new prop `onSaveStart` to SeatDesigner.
    if (onSaveStart) onSaveStart();

    try {
      const updatedEvent = await api.updateEventLayout(event.id, zones, seats);
      onUpdate(updatedEvent);
    } catch (e) {
      console.error(e);
      alert('Error al guardar el diseño');
      // If we had onSaveError, we'd call it here.
    }
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="flex h-full border-t border-gray-200">
      {/* Sidebar Controls */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 flex flex-col overflow-y-auto shrink-0">
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-2">Herramientas</h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleAddZone}
              className="flex items-center justify-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Nueva Zona
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
            >
              <Save size={16} />
              Guardar
            </button>
          </div>
        </div>

        {selectedZone ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase text-gray-500">Editar Zona</h4>
              <button 
                onClick={() => {
                   const confirmed = confirm('¿Eliminar esta zona?');
                   if (confirmed) {
                     setZones(zones.filter(z => z.id !== selectedZoneId));
                     setSeats(seats.filter(s => s.zoneId !== selectedZoneId));
                     setSelectedZoneId(null);
                   }
                }}
                className="text-red-500 p-1 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select 
                  value={selectedZone.type || 'SALE'}
                  onChange={(e) => {
                    const newType = e.target.value as 'SALE' | 'INFO' | 'STAGE';
                    if (newType === 'INFO' || newType === 'STAGE') {
                      const hasSeats = seats.some(s => s.zoneId === selectedZone.id);
                      if (hasSeats) {
                        if (!confirm('Esta zona tiene sillas asignadas. Al cambiar a este tipo, las sillas no estarán disponibles para la venta. ¿Deseas continuar?')) {
                          return;
                        }
                      }
                    }
                    updateZone(selectedZone.id, { type: newType });
                  }}
                  className="w-full px-2 py-2 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value="SALE">Venta</option>
                  <option value="INFO">Informativa</option>
                  <option value="STAGE">Tarima / Escenario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={selectedZone.name}
                  onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-1 items-center h-[38px]">
                {['#4F46E5', '#DC2626', '#16A34A', '#D97706', '#9333EA', '#64748B', '#1F2937'].map(c => (
                  <button
                    key={c}
                    onClick={() => updateZone(selectedZone.id, { color: c })}
                    className={`w-5 h-5 rounded-full border-2 ${selectedZone.color === c ? 'border-gray-900' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
               <div className="col-span-2 text-xs font-bold text-gray-500 mb-1">Dimensiones Visuales</div>
               <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Ancho (px)</label>
                  <input 
                    type="number"
                    value={selectedZone.layout?.width || 100}
                    onChange={(e) => updateZone(selectedZone.id, { 
                      layout: { ...selectedZone.layout!, width: parseInt(e.target.value) || 100 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Alto (px)</label>
                  <input 
                    type="number"
                    value={selectedZone.layout?.height || 100}
                    onChange={(e) => updateZone(selectedZone.id, { 
                      layout: { ...selectedZone.layout!, height: parseInt(e.target.value) || 100 }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
               </div>
               {selectedZone.type === 'SALE' && (
                 <div className="col-span-2 mt-2">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Espacio entre sillas (Gap)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={selectedZone.seatGap ?? 4}
                        onChange={(e) => updateZone(selectedZone.id, { seatGap: parseInt(e.target.value) || 0 })}
                        className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 w-8 text-right">{selectedZone.seatGap ?? 4}px</span>
                    </div>
                 </div>
               )}
            </div>

            {selectedZone.type === 'SALE' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filas</label>
                    <input 
                      type="number" 
                      min="0" max="50"
                      value={selectedZone.rows}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value) || 0;
                        if (seats.some(s => s.zoneId === selectedZone.id)) {
                           // Debounce or confirm? For now, confirm to be safe given the destructive nature
                           if (!confirm('Cambiar las filas regenerará la cuadrícula y reiniciará el estado de las sillas. ¿Continuar?')) return;
                        }
                        updateZone(selectedZone.id, { rows: newVal });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Columnas</label>
                    <input 
                      type="number" 
                      min="0" max="50"
                      value={selectedZone.cols}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value) || 0;
                        if (seats.some(s => s.zoneId === selectedZone.id)) {
                           if (!confirm('Cambiar las columnas regenerará la cuadrícula y reiniciará el estado de las sillas. ¿Continuar?')) return;
                        }
                        updateZone(selectedZone.id, { cols: newVal });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Capacidad General</label>
                    <input 
                      type="number" 
                      min="0"
                      value={selectedZone.capacity || 0}
                      onChange={(e) => updateZone(selectedZone.id, { capacity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="0 si es numerada"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio Base</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                    <input 
                      type="number" 
                      value={selectedZone.price}
                      onChange={(e) => updateZone(selectedZone.id, { price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Button to open advanced seat manager */}
            {selectedZone.type === 'SALE' && (
              <button
                onClick={() => setEditingZoneId(selectedZone.id)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium mt-2 flex items-center justify-center gap-2"
              >
                <Armchair size={16} />
                Gestionar Sillas (Detallado)
              </button>
            )}

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">
                Haz clic en las sillas individuales en el mapa para bloquearlas o cambiar su estado.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            Selecciona una zona para editar sus propiedades
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex gap-2">
          <button 
            onClick={() => setScale(s => Math.min(s + 0.1, 2))}
            className="p-2 hover:bg-gray-50 rounded text-gray-600"
          >
            <ZoomIn size={18} />
          </button>
          <span className="flex items-center text-xs w-12 justify-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
            className="p-2 hover:bg-gray-50 rounded text-gray-600"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10 bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex gap-2">
           <button 
             onClick={() => setMode('layout')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${mode === 'layout' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
           >
             <Move size={14} /> Mover Zonas
           </button>
           <button 
             onClick={() => setMode('select')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${mode === 'select' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
           >
             <MousePointer2 size={14} /> Editar Estado
           </button>
           <button 
             onClick={() => setMode('type')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${mode === 'type' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
           >
             <Armchair size={14} /> Tipos de Silla
           </button>
           <button 
             onClick={() => setMode('individual')}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${mode === 'individual' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
           >
             <MousePointer2 size={14} /> Silla Individual
           </button>
        </div>

        {mode === 'type' && (
          <div className="absolute top-16 right-4 z-10 bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-2">
            <h5 className="text-xs font-bold text-gray-500 px-2">Asignar Tipo</h5>
            {[
              { type: 'REGULAR', label: 'Regular', icon: Armchair, color: 'text-gray-600' },
              { type: 'VIP', label: 'VIP', icon: Armchair, color: 'text-yellow-600' },
              { type: 'ACCESSIBLE', label: 'Accesible', icon: Armchair, color: 'text-blue-600' }
            ].map((t) => (
              <button
                key={t.type}
                onClick={() => setSelectedSeatType(t.type as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${selectedSeatType === t.type ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-gray-50 text-gray-600'}`}
              >
                <t.icon size={14} className={t.color} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* The "Stage" */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto relative cursor-grab active:cursor-grabbing p-20"
          style={{ 
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', 
            backgroundSize: '20px 20px' 
          }}
        >
          <div 
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              transition: 'transform 0.1s ease-out',
              width: '2000px', // Canvas size
              height: '2000px'
            }}
            className="relative"
          >
             {/* Stage visualizer - REMOVED (User manages stage as a zone) */}
             
             {zones.map(zone => {
               // Calculate seats for this zone
               const zoneSeats = seats.filter(s => s.zoneId === zone.id);
               const isInfo = zone.type === 'INFO';
               const isStage = zone.type === 'STAGE';
               const isInteractive = !isInfo && !isStage;
               
               return (
                 <motion.div
                   key={`${zone.id}-${zone.layout?.x || 0}-${zone.layout?.y || 0}`} // Force remount on drag end to reset transform
                   drag={mode === 'layout'}
                   dragMomentum={false}
                   onDragEnd={(_, info) => {
                      const currentLayout = zone.layout || { x: 50, y: 50, width: 100, height: 100 };
                      
                      // Calculate new position
                      let newX = currentLayout.x + info.offset.x;
                      let newY = currentLayout.y + info.offset.y;
                      
                      // Snap to grid
                      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                      
                      updateZone(zone.id, {
                        layout: {
                          ...currentLayout,
                          x: newX,
                          y: newY
                        }
                      });
                   }}
                   onClick={(e) => {
                     e.stopPropagation();
                     if (mode === 'individual' && isInteractive) {
                       handleAddIndividualSeat(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                       return;
                     }
                     setSelectedZoneId(zone.id);
                   }}
                   className={`absolute border-2 rounded-xl shadow-sm overflow-hidden 
                     ${selectedZoneId === zone.id ? 'border-indigo-600 ring-2 ring-indigo-200 z-20' : 'border-gray-300 z-10 hover:border-indigo-300'} 
                     ${isInfo ? 'bg-gray-50 border-dashed' : isStage ? 'bg-gray-800 border-gray-900' : 'bg-white'}
                   `}
                   style={{
                     left: zone.layout?.x || 50,
                     top: zone.layout?.y || 50,
                     minWidth: '50px',
                     minHeight: '50px',
                     width: zone.layout?.width ? `${zone.layout.width}px` : 'auto',
                     height: zone.layout?.height ? `${zone.layout.height}px` : 'auto'
                   }}
                 >
                   {/* Resize Handle */}
                   {selectedZoneId === zone.id && mode === 'layout' && (
                     <div
                       className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-30 flex items-center justify-center"
                       onPointerDown={(e) => handleResizeStart(e, zone)}
                     >
                       <div className="w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm" />
                     </div>
                   )}

                   {/* Zone Header */}
                   <div 
                     className="px-3 py-1 text-xs font-bold text-white flex justify-between items-center cursor-move"
                     style={{ backgroundColor: isStage ? '#000' : (isInfo ? '#64748B' : zone.color) }}
                   >
                     <span>{zone.name}</span>
                     {isInteractive && <span>${zone.price}</span>}
                   </div>

                   {/* Content */}
                   {isStage ? (
                     <div className="flex items-center justify-center h-[calc(100%-24px)] text-gray-500 font-bold uppercase tracking-widest text-sm p-2 text-center opacity-50">
                        TARIMA
                     </div>
                   ) : isInfo ? (
                     <div className="flex items-center justify-center h-[calc(100%-24px)] text-gray-400 font-bold uppercase tracking-wider text-xs p-2 text-center">
                       {zone.name}
                     </div>
                   ) : (
                     /* Grid or Free Form Seats Preview */
                     <div 
                       className="relative w-full h-full"
                     >
                       {(zone.rows > 0 && zone.cols > 0) ? (
                         /* Grid Render - Fixed Size with Gap */
                         <div className="relative w-full h-full overflow-hidden">
                           {Array.from({ length: zone.rows }).map((_, r) => (
                             Array.from({ length: zone.cols }).map((_, c) => {
                               // Fixed seat size for visualization, gap from props
                               const seatSize = 24; 
                               const gap = zone.seatGap ?? 4;
                               
                               const rowLabel = String.fromCharCode(65 + r);
                               // Calculate expected colLabel based on direction/start
                               const dir = zone.numberingDirection || 'LTR';
                               const start = zone.startNumber ?? 1;
                               let colNum = dir === 'LTR' ? (c + start) : (zone.cols - c - 1 + start);
                               const colLabel = colNum.toString();
                               
                               const seat = zoneSeats.find(s => {
                                 if (s.gridRow !== undefined && s.gridCol !== undefined) {
                                   return s.gridRow === r && s.gridCol === c;
                                 }
                                 return s.rowLabel === rowLabel && s.colLabel === colLabel;
                               });
                               
                               // Calculate position
                               // Center the grid in the zone? Or top-left? 
                               // User said "slide a la derecha", probably meaning just gap control.
                               // Usually top-left aligned with padding is safer.
                               const padding = 10;
                               const left = padding + c * (seatSize + gap);
                               const top = padding + r * (seatSize + gap);
                               
                               return (
                                 <div
                                   key={`${r}-${c}`}
                                   className={`absolute flex items-center justify-center rounded-sm text-[8px] border
                                     ${seat 
                                        ? (seat.status === SeatStatus.AVAILABLE ? 'bg-white border-gray-400 text-gray-700' : 'bg-gray-300 border-gray-400')
                                        : 'bg-gray-100 border-gray-200 opacity-50'
                                     }
                                   `}
                                   style={{
                                     left,
                                     top,
                                     width: seatSize,
                                     height: seatSize
                                   }}
                                   title={seat ? `${rowLabel}${colLabel}` : ''}
                                 >
                                    {seat?.colLabel || ''}
                                 </div>
                               );
                             })
                           ))}
                         </div>
                       ) : (
                         /* Free Form Seats */
                         zoneSeats.map(seat => (
                           <div
                             key={seat.id}
                             className={`absolute w-3 h-3 rounded-full ${seat.status === SeatStatus.AVAILABLE ? 'bg-green-500' : 'bg-gray-400'}`}
                             style={{ left: seat.x, top: seat.y }}
                           />
                         ))
                       )}
                     </div>
                   )}
                 </motion.div>
               );
             })}
          </div>
        </div>
      </div>

      {/* Advanced Seat Manager Modal */}
      {editingZoneId && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
           {(() => {
             const zone = zones.find(z => z.id === editingZoneId);
             if (!zone) return null;
             
             return (
               <>
                 <div className="px-6 py-4 border-b flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">Gestionar Sillas: {zone.name}</h3>
                      <p className="text-sm text-gray-500">Configura la distribución de sillas para esta zona</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingZoneId(null)} 
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                      >
                        Cerrar
                      </button>
                      <button 
                        onClick={() => setEditingZoneId(null)} 
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium"
                      >
                        Terminar
                      </button>
                    </div>
                 </div>
                 
                 <div className="flex-1 flex overflow-hidden">
                     {/* Sidebar for Seat Tools */}
                     <div className="w-80 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
                        {selectedSeatIds.length > 1 ? (
                          <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm">
                             <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-sm text-gray-900">{selectedSeatIds.length} Sillas Seleccionadas</h4>
                               <button 
                                 onClick={() => setSelectedSeatIds([])}
                                 className="text-gray-400 hover:text-gray-600"
                               >
                                 &times;
                               </button>
                             </div>

                             <div className="space-y-3">
                               <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1">Estado (Lote)</label>
                                  <select 
                                    onChange={(e) => {
                                       setSeats(seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, status: e.target.value as any } : s));
                                    }}
                                    className="w-full text-sm border-gray-300 rounded px-2 py-1"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Seleccionar estado...</option>
                                    <option value="AVAILABLE">Disponible</option>
                                    <option value="BLOCKED">Bloqueada</option>
                                    <option value="SOLD">Vendida</option>
                                  </select>
                               </div>

                               <div className="mt-4">
                                 {showDeleteConfirm ? (
                                   <div className="space-y-2 p-2 bg-red-50 rounded border border-red-100">
                                     <p className="text-xs text-red-800 font-medium mb-2">¿Cómo deseas eliminar {selectedSeatIds.length} sillas?</p>
                                     <button
                                       onClick={() => {
                                          setSeats(seats.filter(s => !selectedSeatIds.includes(s.id)));
                                          setSelectedSeatIds([]);
                                          setShowDeleteConfirm(false);
                                       }}
                                       className="w-full py-1.5 bg-white border border-red-200 text-red-700 rounded text-xs hover:bg-red-50 mb-1"
                                     >
                                       Opción 1: Dejar hueco
                                     </button>
                                     <button
                                       onClick={() => {
                                          // Opción 2: Reordenar (Close Gap + Renumber)
                                          const seatsToDelete = seats.filter(s => selectedSeatIds.includes(s.id));
                                          const remainingSeats = seats.filter(s => !selectedSeatIds.includes(s.id));
                                          const affectedRows = Array.from(new Set(seatsToDelete.map(s => `${s.zoneId}:${s.rowLabel}`)));
                                          const updates = new Map<string, string>();
                                          
                                          affectedRows.forEach(rowKey => {
                                             const [zId, rLabel] = rowKey.split(':');
                                             const zone = zones.find(z => z.id === zId);
                                             const startNum = zone?.startNumber ?? 1;
                                             
                                             const rowSeats = remainingSeats.filter(s => s.zoneId === zId && s.rowLabel === rLabel);
                                             
                                             const areNumeric = rowSeats.every(s => !isNaN(parseInt(s.colLabel)));
                                             if (areNumeric) {
                                                 const sorted = [...rowSeats].sort((a, b) => parseInt(a.colLabel) - parseInt(b.colLabel));
                                                 sorted.forEach((s, idx) => {
                                                     const newLabel = (startNum + idx).toString();
                                                     if (s.colLabel !== newLabel) {
                                                         updates.set(s.id, newLabel);
                                                     }
                                                 });
                                             }
                                          });
                                          
                                          setSeats(remainingSeats.map(s => updates.has(s.id) ? { ...s, colLabel: updates.get(s.id)! } : s));
                                          setSelectedSeatIds([]);
                                          setShowDeleteConfirm(false);
                                       }}
                                       className="w-full py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 mb-1"
                                     >
                                       Opción 2: Reordenar
                                     </button>
                                     <button
                                       onClick={() => {
                                          // Opción 3: Dejar hueco Reordenar (1, ,2)
                                          let currentSeats = [...seats];
                                          const seatsToDelete = currentSeats.filter(s => selectedSeatIds.includes(s.id));
                                          const remainingSeats = currentSeats.filter(s => !selectedSeatIds.includes(s.id));
                                          
                                          // Hydrate grid coordinates for ALL remaining seats in affected zones
                                          // This ensures they stay in their visual slots even if we change their labels
                                          const affectedZoneIds = Array.from(new Set(seatsToDelete.map(s => s.zoneId)));
                                          
                                          affectedZoneIds.forEach(zId => {
                                              const zone = zones.find(z => z.id === zId);
                                              if (zone && zone.rows > 0 && zone.cols > 0) {
                                                  const dir = zone.numberingDirection || 'LTR';
                                                  const start = zone.startNumber ?? 1;
                                                  
                                                  // Update remaining seats in this zone
                                                  remainingSeats.forEach(s => {
                                                      if (s.zoneId === zId && s.gridCol === undefined) {
                                                          const numericLabel = parseInt(s.colLabel);
                                                          if (!isNaN(numericLabel)) {
                                                              s.gridCol = dir === 'LTR' ? (numericLabel - start) : (zone.cols - 1 - (numericLabel - start));
                                                              // rowLabel to gridRow
                                                              const r = s.rowLabel.charCodeAt(0) - 65;
                                                              s.gridRow = r;
                                                          }
                                                      }
                                                  });
                                              }
                                          });

                                          const affectedRows = Array.from(new Set(seatsToDelete.map(s => `${s.zoneId}:${s.rowLabel}`)));
                                          const updates = new Map<string, string>();
                                          
                                          affectedRows.forEach(rowKey => {
                                             const [zId, rLabel] = rowKey.split(':');
                                             const zone = zones.find(z => z.id === zId);
                                             const startNum = zone?.startNumber ?? 1;
                                             
                                             const rowSeats = remainingSeats.filter(s => s.zoneId === zId && s.rowLabel === rLabel);
                                             
                                             const areNumeric = rowSeats.every(s => !isNaN(parseInt(s.colLabel)));
                                             if (areNumeric) {
                                                 // Sort by GRID POSITION (Physical Order)
                                                 // Use gridCol if available (preferred), else fallback to parsing colLabel
                                                 const sorted = [...rowSeats].sort((a, b) => {
                                                     if (a.gridCol !== undefined && b.gridCol !== undefined) {
                                                         return a.gridCol - b.gridCol;
                                                     }
                                                     return parseInt(a.colLabel) - parseInt(b.colLabel);
                                                 });
                                                 
                                                 // Reassign sequentially respecting Direction
                                                 const dir = zone?.numberingDirection || 'LTR';
                                                 sorted.forEach((s, idx) => {
                                                     const newLabel = (dir === 'LTR' 
                                                         ? (startNum + idx) 
                                                         : (startNum + sorted.length - 1 - idx)).toString();
                                                     
                                                     if (s.colLabel !== newLabel) {
                                                         updates.set(s.id, newLabel);
                                                     }
                                                 });
                                             }
                                          });
                                          
                                          setSeats(remainingSeats.map(s => updates.has(s.id) ? { ...s, colLabel: updates.get(s.id)! } : s));
                                          setSelectedSeatIds([]);
                                          setShowDeleteConfirm(false);
                                       }}
                                       className="w-full py-1.5 bg-white border border-red-200 text-red-700 rounded text-xs hover:bg-red-50 mb-1"
                                     >
                                       Opción 3: Dejar hueco Reordenar (1, ,2)
                                     </button>
                                     <button
                                       onClick={() => setShowDeleteConfirm(false)}
                                       className="w-full py-1.5 text-gray-500 text-xs hover:text-gray-700 underline mt-1"
                                     >
                                       Cancelar
                                     </button>
                                   </div>
                                 ) : (
                                   <button 
                                     onClick={() => setShowDeleteConfirm(true)}
                                     className="w-full py-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 mt-2"
                                   >
                                     Eliminar {selectedSeatIds.length} Sillas
                                   </button>
                                 )}
                               </div>
                             </div>
                          </div>
                        ) : selectedSeatId ? (
                          <div className="bg-white p-4 rounded-lg border border-indigo-200 shadow-sm">
                             <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-sm text-gray-900">Editar Silla</h4>
                               <button 
                                 onClick={() => setSelectedSeatId(null)}
                                 className="text-gray-400 hover:text-gray-600"
                               >
                                 &times;
                               </button>
                             </div>
                             
                             <div className="space-y-3">
                               <div>
                                 <label className="text-xs font-medium text-gray-700 block mb-1">Fila / Etiqueta</label>
                                 <input 
                                   type="text"
                                   value={seats.find(s => s.id === selectedSeatId)?.rowLabel || ''}
                                   onChange={(e) => {
                                     setSeats(seats.map(s => s.id === selectedSeatId ? { ...s, rowLabel: e.target.value } : s));
                                   }}
                                   className="w-full text-sm border-gray-300 rounded px-2 py-1"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs font-medium text-gray-700 block mb-1">Número</label>
                                 <input 
                                   type="text"
                                   value={seats.find(s => s.id === selectedSeatId)?.colLabel || ''}
                                   onChange={(e) => {
                                     setSeats(seats.map(s => s.id === selectedSeatId ? { ...s, colLabel: e.target.value } : s));
                                   }}
                                   className="w-full text-sm border-gray-300 rounded px-2 py-1"
                                 />
                               </div>
                               <div>
                                 <label className="text-xs font-medium text-gray-700 block mb-1">Tipo</label>
                                 <select 
                                   value={seats.find(s => s.id === selectedSeatId)?.type || 'REGULAR'}
                                   onChange={(e) => {
                                      setSeats(seats.map(s => s.id === selectedSeatId ? { ...s, type: e.target.value as any } : s));
                                   }}
                                   className="w-full text-sm border-gray-300 rounded px-2 py-1"
                                 >
                                   <option value="REGULAR">Regular</option>
                                   <option value="VIP">VIP</option>
                                   <option value="ACCESSIBLE">Accesible</option>
                                 </select>
                               </div>
                               <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1">Estado</label>
                                  <select 
                                    value={seats.find(s => s.id === selectedSeatId)?.status || 'AVAILABLE'}
                                    onChange={(e) => {
                                       setSeats(seats.map(s => s.id === selectedSeatId ? { ...s, status: e.target.value as any } : s));
                                    }}
                                    className="w-full text-sm border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="AVAILABLE">Disponible</option>
                                    <option value="BLOCKED">Bloqueada</option>
                                    <option value="SOLD">Vendida</option>
                                  </select>
                               </div>
                               <div className="mt-4">
                                 {showDeleteConfirm ? (
                                   <div className="space-y-2 p-2 bg-red-50 rounded border border-red-100">
                                     <p className="text-xs text-red-800 font-medium mb-2">¿Cómo deseas eliminar?</p>
                                     <button
                                       onClick={() => {
                                          setSeats(seats.filter(s => s.id !== selectedSeatId));
                                          setSelectedSeatId(null);
                                       }}
                                       className="w-full py-1.5 bg-white border border-red-200 text-red-700 rounded text-xs hover:bg-red-50 mb-1"
                                     >
                                       Opción 1: Dejar hueco (1, ,3)
                                     </button>
                                     <button
                                       onClick={() => {
                                          const seatToDelete = seats.find(s => s.id === selectedSeatId);
                                          if (seatToDelete) {
                                            const remainingSeats = seats.filter(s => s.id !== selectedSeatId);
                                            const zId = seatToDelete.zoneId;
                                            const rLabel = seatToDelete.rowLabel;
                                            const zone = zones.find(z => z.id === zId);
                                            const startNum = zone?.startNumber ?? 1;

                                            const rowSeats = remainingSeats.filter(s => s.zoneId === zId && s.rowLabel === rLabel);
                                            
                                            const updates = new Map<string, string>();
                                            const areNumeric = rowSeats.every(s => !isNaN(parseInt(s.colLabel)));
                                            if (areNumeric) {
                                                const sorted = [...rowSeats].sort((a, b) => parseInt(a.colLabel) - parseInt(b.colLabel));
                                                sorted.forEach((s, idx) => {
                                                    const newLabel = (startNum + idx).toString();
                                                    if (s.colLabel !== newLabel) {
                                                        updates.set(s.id, newLabel);
                                                    }
                                                });
                                            }
                                            setSeats(remainingSeats.map(s => updates.has(s.id) ? { ...s, colLabel: updates.get(s.id)! } : s));
                                          }
                                          setSelectedSeatId(null);
                                       }}
                                       className="w-full py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 mb-1"
                                     >
                                       Opción 2: Reordenar (1, 2, 3)
                                     </button>
                                     <button
                                       onClick={() => {
                                          const seatToDelete = seats.find(s => s.id === selectedSeatId);
                                          if (seatToDelete) {
                                            const remainingSeats = seats.filter(s => s.id !== selectedSeatId);
                                            const zId = seatToDelete.zoneId;
                                            
                                            // Hydrate grid coordinates for ALL remaining seats in this zone
                                            const zone = zones.find(z => z.id === zId);
                                            if (zone && zone.rows > 0 && zone.cols > 0) {
                                                const dir = zone.numberingDirection || 'LTR';
                                                const start = zone.startNumber ?? 1;
                                                
                                                remainingSeats.forEach(s => {
                                                    if (s.zoneId === zId && s.gridCol === undefined) {
                                                        const numericLabel = parseInt(s.colLabel);
                                                        if (!isNaN(numericLabel)) {
                                                            s.gridCol = dir === 'LTR' ? (numericLabel - start) : (zone.cols - 1 - (numericLabel - start));
                                                            const r = s.rowLabel.charCodeAt(0) - 65;
                                                            s.gridRow = r;
                                                        }
                                                    }
                                                });
                                            }

                                            const rLabel = seatToDelete.rowLabel;
                                            const startNum = zone?.startNumber ?? 1;

                                            const rowSeats = remainingSeats.filter(s => s.zoneId === zId && s.rowLabel === rLabel);
                                            
                                            const updates = new Map<string, string>();
                                            const areNumeric = rowSeats.every(s => !isNaN(parseInt(s.colLabel)));
                                            if (areNumeric) {
                                                const sorted = [...rowSeats].sort((a, b) => {
                                                     if (a.gridCol !== undefined && b.gridCol !== undefined) {
                                                         return a.gridCol - b.gridCol;
                                                     }
                                                     return parseInt(a.colLabel) - parseInt(b.colLabel);
                                                 });
                                                const dir = zone?.numberingDirection || 'LTR';
                                                sorted.forEach((s, idx) => {
                                                    const newLabel = (dir === 'LTR' 
                                                        ? (startNum + idx) 
                                                        : (startNum + sorted.length - 1 - idx)).toString();
                                                    
                                                    if (s.colLabel !== newLabel) {
                                                        updates.set(s.id, newLabel);
                                                    }
                                                });
                                            }
                                            setSeats(remainingSeats.map(s => updates.has(s.id) ? { ...s, colLabel: updates.get(s.id)! } : s));
                                          }
                                          setSelectedSeatId(null);
                                       }}
                                       className="w-full py-1.5 bg-white border border-red-200 text-red-700 rounded text-xs hover:bg-red-50 mb-1"
                                     >
                                       Opción 3: Dejar hueco Reordenar (1, ,2)
                                     </button>
                                     <button
                                       onClick={() => setShowDeleteConfirm(false)}
                                       className="w-full py-1.5 text-gray-500 text-xs hover:text-gray-700 underline mt-1"
                                     >
                                       Cancelar
                                     </button>
                                   </div>
                                 ) : (
                                   <button 
                                     onClick={() => setShowDeleteConfirm(true)}
                                     className="w-full py-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 mt-2"
                                   >
                                     Eliminar Silla
                                   </button>
                                 )}
                               </div>
                             </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-bold text-sm text-gray-700 mb-4">Herramientas de Diseño</h4>
                            
                            <div className="mb-6">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Generación Automática</h5>
                              <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Filas</label>
                                    <input 
                                      type="number" 
                                      value={zone.rows}
                                      onChange={(e) => updateZone(zone.id, { rows: parseInt(e.target.value) || 0 })}
                                      className="w-full text-sm border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Cols</label>
                                    <input 
                                      type="number" 
                                      value={zone.cols}
                                      onChange={(e) => updateZone(zone.id, { cols: parseInt(e.target.value) || 0 })}
                                      className="w-full text-sm border-gray-300 rounded"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">Dirección</label>
                                        <select
                                            className="w-full text-xs border-gray-300 rounded"
                                            value={zone.numberingDirection || 'LTR'}
                                            onChange={(e) => updateZone(zone.id, { numberingDirection: e.target.value as 'LTR' | 'RTL' })}
                                        >
                                            <option value="LTR">Izq a Der</option>
                                            <option value="RTL">Der a Izq</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">Inicio</label>
                                        <input
                                            type="number"
                                            value={zone.startNumber ?? 1}
                                            onChange={(e) => updateZone(zone.id, { startNumber: parseInt(e.target.value) || 1 })}
                                            className="w-full text-xs border-gray-300 rounded"
                                        />
                                    </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    // Regenerate seats
                                    const dir = zone.numberingDirection || 'LTR';
                                    const start = zone.startNumber ?? 1;
                                    
                                    const otherSeats = seats.filter(s => s.zoneId !== zone.id);
                                    
                                    const newSeats: EventSeat[] = [];
                                    for (let r = 0; r < zone.rows; r++) {
                                        for (let c = 0; c < zone.cols; c++) {
                                            const rowLabel = String.fromCharCode(65 + r);
                                            // Calculate col number based on direction
                                            let colNum = dir === 'LTR' ? (c + start) : (zone.cols - c - 1 + start);
                                            const colLabel = colNum.toString();
                                            
                                            newSeats.push({
                                               id: `${zone.id}-${r}-${c}-${Date.now()}`,
                                               zoneId: zone.id,
                                               rowLabel,
                                               colLabel,
                                               status: SeatStatus.AVAILABLE,
                                               type: 'REGULAR',
                                               gridRow: r,
                                               gridCol: c
                                           });
                                        }
                                    }
                                    
                                    setSeats([...otherSeats, ...newSeats]);
                                    updateZone(zone.id, { rows: zone.rows, cols: zone.cols });
                                  }}
                                  className="w-full py-2 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100"
                                >
                                  Generar Cuadrícula
                                </button>
                                <p className="text-[10px] text-gray-400 text-center">
                                  Advertencia: Esto reemplazará las sillas existentes.
                                </p>
                              </div>
                            </div>
     
                            <div>
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manual</h5>
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-600 mb-3">
                                  Haz clic en el área de diseño para añadir sillas individualmente. Arrástralas para moverlas. Haz clic en una silla para editarla.
                                </p>
                                <button 
                                  onClick={() => {
                                    // Convert grid to free form
                                    if (confirm('¿Cambiar a modo detallado? Esto fijará las posiciones actuales y permitirá mover sillas individualmente.')) {
                                      const zoneSeats = seats.filter(s => s.zoneId === zone.id);
                                      const fixedSeats: EventSeat[] = [];
                                      
                                      if (zone.rows > 0 && zone.cols > 0) {
                                          const seatSize = 24;
                                          const gap = zone.seatGap ?? 4;
                                          const padding = 16;
                                          const dir = zone.numberingDirection || 'LTR';
                                          const start = zone.startNumber ?? 1;
                                          
                                          // Iterate visual slots (0..rows, 0..cols) and find the seat that belongs there
                                          for (let r = 0; r < zone.rows; r++) {
                                              for (let c = 0; c < zone.cols; c++) {
                                                  const left = padding + c * (seatSize + gap);
                                                  const top = padding + r * (seatSize + gap);
                                                  
                                                  // Determine expected label for this slot
                                                  const rowLabel = String.fromCharCode(65 + r);
                                                  let colNum = dir === 'LTR' ? (c + start) : (zone.cols - c - 1 + start);
                                                  const colLabel = colNum.toString();
                                                  
                                                  const seat = zoneSeats.find(s => s.rowLabel === rowLabel && s.colLabel === colLabel);
                                                  
                                                  if (seat) {
                                                      fixedSeats.push({
                                                          ...seat,
                                                          x: left,
                                                          y: top
                                                      });
                                                  }
                                              }
                                          }
                                      } else {
                                          fixedSeats.push(...zoneSeats);
                                      }
                                      
                                      // Merge avoiding duplicates (though logic above filters by zone)
                                      const newSeatList = seats.filter(s => s.zoneId !== zone.id).concat(fixedSeats);
                                      setSeats(newSeatList);
                                      updateZone(zone.id, { rows: 0, cols: 0 });
                                    }
                                  }}
                                  className="w-full py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold hover:bg-gray-50"
                                >
                                  Activar Gestión Detallada (Mover/Eliminar)
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                     </div>
 
                     {/* Canvas for Seat Placement */}
                     <div 
                       className="flex-1 bg-gray-100 relative overflow-auto cursor-crosshair"
                       onClick={(e) => {
                          if (selectedSeatId) {
                            setSelectedSeatId(null);
                            return;
                          }
                          if (zone.rows === 0 && zone.cols === 0) {
                            // Add seat at click position relative to this container
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            
                            const newSeat: EventSeat = {
                              id: `${zone.id}-free-${Date.now()}`,
                              zoneId: zone.id,
                              rowLabel: 'F', 
                              colLabel: (seats.filter(s => s.zoneId === zone.id).length + 1).toString(),
                              status: SeatStatus.AVAILABLE,
                              type: 'REGULAR',
                              x,
                              y
                            };
                            setSeats([...seats, newSeat]);
                          }
                       }}
                     >
                        <div 
                          className="relative bg-white shadow-sm mx-auto my-10"
                          style={{
                            width: zone.layout?.width || 800,
                            height: zone.layout?.height || 600,
                            backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', 
                            backgroundSize: '20px 20px' 
                          }}
                          onClick={(e) => e.stopPropagation()} 
                        >
                           {/* Render Seats (Free Form or individual in manual mode) */}
                           {(zone.rows === 0 && zone.cols === 0) && seats.filter(s => s.zoneId === zone.id).map(seat => (
                             <motion.div
                               key={`${seat.id}-${seat.x}-${seat.y}`} // Force remount to reset transform after drag
                               drag={zone.rows === 0 && zone.cols === 0} // Only draggable in free mode
                               dragMomentum={false}
                               // We rely on absolute positioning via style, not 'initial' layout animation for static placement
                               onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                     // Toggle selection
                                     if (selectedSeatIds.includes(seat.id)) {
                                       setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat.id));
                                     } else {
                                       setSelectedSeatIds([...selectedSeatIds, seat.id]);
                                     }
                                     // Also update single selection focus if adding
                                     if (!selectedSeatIds.includes(seat.id)) {
                                        setSelectedSeatId(seat.id);
                                     }
                                  } else {
                                     // Single select
                                     setSelectedSeatId(seat.id);
                                     setSelectedSeatIds([seat.id]);
                                  }
                               }}
                               onDragEnd={(_, info) => {
                                 if (seat.x === undefined || seat.y === undefined) return;
                                 
                                 // Calculate new position
                                 let newX = seat.x + info.offset.x;
                                 let newY = seat.y + info.offset.y;
                                 
                                 // Snap to grid
                                 newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                                 newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                                 
                                 // Update state with new position
                                 const newSeats = seats.map(s => {
                                   if (s.id === seat.id) {
                                     return { ...s, x: newX, y: newY };
                                   }
                                   return s;
                                 });
                                 setSeats(newSeats);
                              }}
                               className={`absolute w-6 h-6 rounded-t-lg border flex items-center justify-center text-[8px] font-bold cursor-pointer transition-colors ${selectedSeatIds.includes(seat.id) ? 'ring-2 ring-indigo-500 z-10' : 'border-gray-400'} ${seat.type === 'VIP' ? 'bg-yellow-100 text-yellow-800' : seat.type === 'ACCESSIBLE' ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700'}`}
                               style={{ 
                                 left: (zone.rows > 0 && zone.cols > 0) ? undefined : seat.x, 
                                 top: (zone.rows > 0 && zone.cols > 0) ? undefined : seat.y,
                                 position: (zone.rows > 0 && zone.cols > 0) ? 'relative' : 'absolute' 
                               }}
                             >
                               {seat.colLabel}
                               {/* Status indicator */}
                               <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${
                                  seat.status === SeatStatus.BLOCKED ? 'bg-red-500' : 
                                  seat.status === SeatStatus.SOLD ? 'bg-gray-400' : 'bg-green-400'
                               }`} />
                             </motion.div>
                           ))}
                           
                           {/* If grid, render grid container with robust positioning */}
                           {(zone.rows > 0 && zone.cols > 0) && (
                             <div className="relative w-full h-full bg-white">
                               {Array.from({ length: zone.rows * zone.cols }).map((_, index) => {
                                const row = Math.floor(index / zone.cols);
                                const col = index % zone.cols;
                                const rowLabel = String.fromCharCode(65 + row);
                                
                                // Calculate expected colLabel based on direction/start
                                const dir = zone.numberingDirection || 'LTR';
                                const start = zone.startNumber ?? 1;
                                let colNum = dir === 'LTR' ? (col + start) : (zone.cols - col - 1 + start);
                                const colLabel = colNum.toString();
                                
                                // Fixed size logic
                                const seatSize = 24;
                                 const gap = zone.seatGap ?? 4;
                                 const padding = 16;
                                 const left = padding + col * (seatSize + gap);
                                 const top = padding + row * (seatSize + gap);
                                 
                                 const commonStyle = {
                                     position: 'absolute' as any,
                                     left,
                                     top,
                                     width: seatSize,
                                     height: seatSize
                                 };
                                 
                                 // Find seat at this position
                                const seat = seats.find(s => {
                                  if (s.gridRow !== undefined && s.gridCol !== undefined) {
                                    return s.zoneId === zone.id && s.gridRow === row && s.gridCol === col;
                                  }
                                  return s.zoneId === zone.id && s.rowLabel === rowLabel && s.colLabel === colLabel;
                                });

                                 if (!seat) {
                                   return (
                                     <div 
                                       key={`empty-${row}-${col}`}
                                       className="border border-dashed border-gray-200 rounded-t-lg flex items-center justify-center text-[8px] text-gray-300 hover:bg-gray-50 cursor-pointer"
                                       style={commonStyle}
                                       title={`Crear ${rowLabel}${colLabel}`}
                                       onClick={(e) => {
                                        e.stopPropagation();
                                        const newSeat: EventSeat = {
                                           id: `${zone.id}-${row}-${col}-${Date.now()}`,
                                           zoneId: zone.id,
                                           rowLabel,
                                           colLabel,
                                           status: SeatStatus.AVAILABLE,
                                           type: 'REGULAR',
                                           gridRow: row,
                                           gridCol: col
                                        };
                                        
                                        // Renumber row logic (Creation)
                                        const currentSeats = [...seats, newSeat];
                                        const rowSeats = currentSeats.filter(s => s.zoneId === zone.id && s.rowLabel === rowLabel);
                                        
                                        // Hydrate gridCol if missing for siblings (legacy support)
                                        rowSeats.forEach(s => {
                                            if (s.gridCol === undefined) {
                                                const dir = zone.numberingDirection || 'LTR';
                                                const start = zone.startNumber ?? 1;
                                                const numericLabel = parseInt(s.colLabel);
                                                if (!isNaN(numericLabel)) {
                                                    s.gridCol = dir === 'LTR' ? (numericLabel - start) : (zone.cols - 1 - (numericLabel - start));
                                                    s.gridRow = row; // Assume same row
                                                }
                                            }
                                        });

                                        const updates = new Map<string, string>();
                                        const areNumeric = rowSeats.every(s => !isNaN(parseInt(s.colLabel)));
                                        
                                        if (areNumeric) {
                                            // Sort by GRID POSITION (Physical Order)
                                            // Fallback to colLabel if gridCol is somehow still missing?
                                            const sorted = [...rowSeats].sort((a, b) => {
                                                const posA = a.gridCol ?? 0;
                                                const posB = b.gridCol ?? 0;
                                                return posA - posB;
                                            });
                                            
                                            const startNum = zone.startNumber ?? 1;
                                            const dir = zone.numberingDirection || 'LTR';
                                            sorted.forEach((s, idx) => {
                                                const newLabel = (dir === 'LTR' 
                                                    ? (startNum + idx) 
                                                    : (startNum + sorted.length - 1 - idx)).toString();
                                                
                                                if (s.colLabel !== newLabel) {
                                                    updates.set(s.id, newLabel);
                                                }
                                            });
                                        }

                                        setSeats(currentSeats.map(s => updates.has(s.id) ? { ...s, colLabel: updates.get(s.id)! } : s));
                                      }}
                                     >
                                       +
                                     </div>
                                   );
                                 }

                                 return (
                                   <div 
                                     key={seat.id}
                                     style={commonStyle}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                          if (selectedSeatIds.includes(seat.id)) {
                                            setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat.id));
                                          } else {
                                            setSelectedSeatIds([...selectedSeatIds, seat.id]);
                                          }
                                          if (!selectedSeatIds.includes(seat.id)) {
                                             setSelectedSeatId(seat.id);
                                          }
                                       } else {
                                          setSelectedSeatId(seat.id);
                                          setSelectedSeatIds([seat.id]);
                                       }
                                     }}
                                     className={`rounded-t-lg border flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors relative
                                       ${selectedSeatIds.includes(seat.id) ? 'ring-2 ring-indigo-500 z-10' : 'border-gray-300'} 
                                       ${seat.type === 'VIP' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                         seat.type === 'ACCESSIBLE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                         'bg-white text-gray-700 hover:border-indigo-300'}
                                     `}
                                   >
                                     {seat.colLabel}
                                     {/* Status indicator dot */}
                                     <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                                        seat.status === SeatStatus.BLOCKED ? 'bg-red-500' : 
                                        seat.status === SeatStatus.SOLD ? 'bg-gray-400' : 'bg-green-400'
                                     }`} />
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </>
             );
           })()}
        </div>
      )}
    </div>
  );
}
