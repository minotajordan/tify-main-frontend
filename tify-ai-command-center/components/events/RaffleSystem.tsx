import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Filter, Sparkles, Armchair } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { api } from '../../services/api';

interface Ticket {
  id: string;
  customerName: string;
  status: string;
  zone?: { id: string; name: string; color?: string };
  seat?: { rowLabel: string; colLabel: string };
}

interface RaffleSystemProps {
  eventId: string;
}

const CARD_WIDTH = 220; // Width of each card
const GAP = 16; // Gap between cards
const ITEM_SIZE = CARD_WIDTH + GAP;

export default function RaffleSystem({ eventId }: RaffleSystemProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<{id: string, name: string}[]>([]);
  
  // Filters
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [zoneSearch, setZoneSearch] = useState('');
  
  // Raffle State
  const [winner, setWinner] = useState<Ticket | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [eligibleTickets, setEligibleTickets] = useState<Ticket[]>([]);
  const [rouletteItems, setRouletteItems] = useState<Ticket[]>([]);
  
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch tickets and event zones
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsData, eventData] = await Promise.all([
        api.getEventTickets(eventId),
        api.getEvent(eventId)
      ]);

      // 1. Process Zones
      let allZones = [];
      if (eventData.zones) {
        allZones = eventData.zones.map((z: any) => ({ id: z.id, name: z.name }));
      }

      // 2. Get Participants from Sold Seats (Source of Truth for Seats)
      const soldSeats = (eventData.seats || [])
        .filter((s: any) => s.status === 'SOLD')
        .map((s: any) => {
            // Find zone info
            const zone = allZones.find(z => z.id === s.zoneId);
            return {
                id: `seat-${s.id}`,
                customerName: s.holderName || 'Cliente',
                status: 'SOLD',
                zone: zone,
                seat: { rowLabel: s.rowLabel, colLabel: s.colLabel }
            };
        });

      // 3. Get Participants from General Admission Tickets (No Seat)
      const generalTickets = ticketsData
        .filter((t: any) => !t.seatId && (t.status === 'VALID' || t.status === 'USED'))
        .map((t: any) => ({
            ...t,
            // Ensure zone object matches structure if ticket has it
            zone: t.zone ? { id: t.zone.id, name: t.zone.name } : undefined
        }));

      // Combine both
      const allParticipants = [...soldSeats, ...generalTickets];
      setTickets(allParticipants);

      // Check for unassigned zones (General/Virtual) in the combined list
      const hasUncategorized = allParticipants.some((t: any) => !t.zone);
      if (hasUncategorized) {
        // Only add if not already present (though strict checking below handles it)
        if (!allZones.find(z => z.id === 'uncategorized')) {
             allZones.push({ id: 'uncategorized', name: 'General / Sin Zona' });
        }
      }

      setZones(allZones);
      
      // Auto-select all zones initially
      setSelectedZones(allZones.map((z: any) => z.id));

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  // Filter logic
  useEffect(() => {
    // Strict filtering: Only show tickets that match selected zones.
    // If selectedZones is empty, show 0.
    const filtered = tickets.filter(t => {
        if (t.zone) {
            return selectedZones.includes(t.zone.id);
        } else {
            return selectedZones.includes('uncategorized');
        }
    });
    
    setEligibleTickets(filtered);
    
    // Initial display items (just random ones to fill the void)
    if (filtered.length > 0) {
        // Create a buffer of items for the initial view
        setRouletteItems(Array(10).fill(null).map(() => filtered[Math.floor(Math.random() * filtered.length)]));
    } else {
        setRouletteItems([]);
    }
  }, [tickets, selectedZones]);

  const toggleZone = (zoneId: string) => {
    if (selectedZones.includes(zoneId)) {
      setSelectedZones(selectedZones.filter(id => id !== zoneId));
    } else {
      setSelectedZones([...selectedZones, zoneId]);
    }
  };

  const toggleAllZones = () => {
    if (selectedZones.length === zones.length) {
      setSelectedZones([]);
    } else {
      setSelectedZones(zones.map(z => z.id));
    }
  };

  const filteredZones = zones.filter(z => 
    z.name.toLowerCase().includes(zoneSearch.toLowerCase())
  );

  const handleSpin = async () => {
    if (eligibleTickets.length === 0 || isSpinning) return;
    
    setWinner(null);
    setIsSpinning(true);
    controls.stop();
    
    // 1. Prepare the sequence
    // We need a long sequence to scroll through.
    // Let's say we scroll for 70 items, and the winner is at index 65.
    const WINNER_INDEX = 70;
    const BUFFER_END = 5;
    const TOTAL_ITEMS = WINNER_INDEX + BUFFER_END + 1;
    
    const sequence: Ticket[] = [];
    
    // Fill with random items
    for (let i = 0; i < TOTAL_ITEMS; i++) {
        sequence.push(eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)]);
    }
    
    // Pick winner
    const selectedWinner = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];
    sequence[WINNER_INDEX] = selectedWinner;
    
    setRouletteItems(sequence);
    
    // Force a small delay to allow React to render the new list and Reset position
    await new Promise(resolve => setTimeout(resolve, 100));
    await controls.start({ x: 0, transition: { duration: 0 } });
    
    // Another small delay to ensure visual reset is perceived
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Calculate target X
    // We want the WINNER_INDEX item to be centered.
    // With pl-[50%], the list starts at the center of the container.
    // To center the item at WINNER_INDEX, we need to shift left by:
    // (WINNER_INDEX * ITEM_SIZE) + (CARD_WIDTH / 2)
    
    const targetX = -1 * ((WINNER_INDEX * ITEM_SIZE) + (CARD_WIDTH / 2));
    
    // Add a small random jitter to land somewhere within the card
    const jitter = (Math.random() * CARD_WIDTH * 0.8) - (CARD_WIDTH * 0.4); 
    
    // 2. Animate
    await controls.start({
        x: targetX + jitter,
        transition: { 
            duration: 8, 
            ease: [0.05, 0.90, 0.30, 1] // More aggressive spin curve
        }
    });
    
    setWinner(selectedWinner);
    setIsSpinning(false);
  };

  return (
    <div className="h-full flex gap-6 p-6 bg-gray-50 overflow-hidden">
      {/* Sidebar - Controls */}
      <div className="w-80 flex flex-col gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full overflow-y-auto shrink-0">
        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <Filter size={20} />
          Configuración
        </h3>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Filtrar por Zona</label>
          
          {/* Search Input */}
          <div className="mb-2">
            <input 
              type="text"
              placeholder="Buscar zona..."
              value={zoneSearch}
              onChange={(e) => setZoneSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Select All Checkbox */}
          <div className="mb-2 pb-2 border-b border-gray-100">
             <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={zones.length > 0 && selectedZones.length === zones.length}
                  onChange={toggleAllZones}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-gray-700">Seleccionar Todo</span>
              </label>
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {filteredZones.map(zone => (
              <label key={zone.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedZones.includes(zone.id)}
                  onChange={() => toggleZone(zone.id)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{zone.name}</span>
              </label>
            ))}
            {filteredZones.length === 0 && <p className="text-sm text-gray-400 p-2">No se encontraron zonas</p>}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
           <div className="text-sm text-gray-500 mb-2">
             Participantes: <span className="font-bold text-gray-900">{eligibleTickets.length}</span>
           </div>
           <button
             onClick={handleSpin}
             disabled={isSpinning || eligibleTickets.length === 0}
             className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex justify-center items-center gap-2"
           >
             {isSpinning ? <RotateCw className="animate-spin" /> : <Sparkles />}
             ¡GIRAR!
           </button>
        </div>
      </div>

      {/* Main Area - Visual */}
      <div className="flex-1 flex flex-col items-center bg-gray-900 rounded-xl shadow-inner relative overflow-hidden p-4">
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-900 to-gray-900"></div>
        
        {/* Title */}
        <div className="relative z-10 mt-8 mb-12 text-center">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase italic transform -skew-x-6">
                <span className="text-indigo-500">Tify</span> Roulette
            </h2>
            <p className="text-indigo-200/60 text-sm mt-2">Sistema de Sorteo Aleatorio Certificado</p>
        </div>

        {/* Roulette Window */}
        <div className="w-full max-w-5xl relative z-10">
            
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                 <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-yellow-400"></div>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 z-30 drop-shadow-[0_-4px_4px_rgba(0,0,0,0.5)]">
                 <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[30px] border-b-yellow-400"></div>
            </div>

            {/* Center Line Indicator */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400/30 z-20 pointer-events-none"></div>

            {/* Gradient Overlays for Fade Effect */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-900 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-900 to-transparent z-20 pointer-events-none"></div>

            {/* Track Container */}
            <div 
                ref={containerRef}
                className="h-[300px] bg-gray-800/50 border-y-4 border-indigo-500/30 backdrop-blur-sm relative overflow-hidden flex items-center"
            >
                <motion.div
                    animate={controls}
                    className="flex gap-4 pl-[50%]"
                    style={{ x: 0 }}
                >
                    {rouletteItems.map((ticket, index) => (
                        <div 
                            key={`${ticket.id}-${index}`}
                            className="shrink-0 relative"
                            style={{ width: CARD_WIDTH, height: 220 }}
                        >
                            <div className={`
                                w-full h-full rounded-xl border-4 flex flex-col items-center justify-center p-4 text-center bg-white shadow-lg transition-transform
                                ${winner && ticket.id === winner.id && index === 70 ? 'border-yellow-400 scale-105 shadow-[0_0_30px_rgba(250,204,21,0.6)] z-10' : 'border-indigo-500/50 grayscale-[0.3]'}
                            `}>
                                <div className="bg-gray-100 p-3 rounded-full mb-3">
                                    <Armchair className="text-gray-600" size={32} />
                                </div>
                                <div className="font-bold text-gray-900 text-lg line-clamp-2 leading-tight mb-2">
                                    {ticket.customerName}
                                </div>
                                <div className="mt-auto pt-2 border-t border-gray-100 w-full">
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                                        {ticket.zone?.name || 'General'}
                                    </div>
                                    {ticket.seat && (
                                        <div className="inline-block bg-gray-200 px-2 py-1 rounded text-xs font-mono font-medium">
                                            {ticket.seat.rowLabel}-{ticket.seat.colLabel}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>

        {/* Winner Announcement */}
        <div className="h-32 mt-8 flex items-center justify-center relative z-10">
            {winner && !isSpinning && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center bg-yellow-400 text-gray-900 px-12 py-4 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.4)]"
                >
                    <div className="text-xs font-black uppercase tracking-[0.2em] mb-1 opacity-75">Ganador Seleccionado</div>
                    <div className="text-3xl font-black">{winner.customerName}</div>
                </motion.div>
            )}
            {!winner && !isSpinning && (
                <div className="text-gray-500 text-sm">
                    Presiona GIRAR para comenzar el sorteo
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
