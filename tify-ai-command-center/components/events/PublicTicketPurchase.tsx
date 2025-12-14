import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Ticket, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Share2,
  ArrowLeft
} from 'lucide-react';
import { TifyEvent, EventZone, EventSeat, SeatStatus } from '../../types';
import { api } from '../../services/api';
import { motion } from 'framer-motion';

interface PublicTicketPurchaseProps {
  eventId: string;
}

interface CartItem {
  id: string; // seatId or zoneId for GA
  type: 'seat' | 'general';
  name: string; // "Row A Seat 1" or "General Admission"
  price: number;
  zoneId: string;
  zoneName: string;
}

export default function PublicTicketPurchase({ eventId }: PublicTicketPurchaseProps) {
  const [event, setEvent] = useState<TifyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'selection' | 'checkout' | 'confirmation' | 'manage'>('selection');
  const [guestForm, setGuestForm] = useState({ fullName: '', email: '', phone: '', docId: '' });
  const [processing, setProcessing] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [ticketToTransfer, setTicketToTransfer] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({ name: '', email: '', phone: '', docId: '' });

  // Zoom and Pan State
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await api.getEvent(eventId);
        setEvent(data);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el evento. Verifica el enlace.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Calculate optimal zoom and center when event loads or window resizes
  useEffect(() => {
    if (!event?.zones || event.zones.length === 0 || !containerRef.current) return;

    const calculateBounds = () => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      event.zones.forEach(zone => {
        let x = 0, y = 0, width = 0, height = 0;

        if (zone.type === 'STAGE') {
          x = zone.layout?.x || 50;
          y = zone.layout?.y || 50;
          width = zone.layout?.width || 200;
          height = zone.layout?.height || 100;
        } else if (zone.type === 'INFO') {
          x = zone.layout?.x || 0;
          y = zone.layout?.y || 0;
          width = zone.layout?.width || 100;
          height = zone.layout?.height || 50;
        } else {
          // General or Seated
          const zoneSeats = zone.seats || event.seats?.filter(s => s.zoneId === zone.id) || [];
          const hasSeats = zoneSeats.length > 0;
          const isGeneral = !hasSeats && (zone.capacity || 0) > 0;

          if (isGeneral) {
            x = zone.layout?.x || 50;
            y = zone.layout?.y || 100;
            width = zone.layout?.width || 200;
            height = zone.layout?.height || 150;
          } else {
            x = zone.layout?.x || 0;
            y = zone.layout?.y || 0;
            width = zone.layout?.width || (zone.cols * 40 + 40);
            height = zone.layout?.height || (zone.rows * 40 + 40);
          }
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });

      // Add padding
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const scaleX = clientWidth / contentWidth;
        const scaleY = clientHeight / contentHeight;
        
        // Use the smaller scale to fit everything
        // Limit max scale to 1.2 to avoid too much zoom on few items
        const scale = Math.min(Math.min(scaleX, scaleY), 1.2);
        
        // Center the content
        const x = (clientWidth - contentWidth * scale) / 2 - minX * scale;
        const y = (clientHeight - contentHeight * scale) / 2 - minY * scale;

        setTransform({ scale, x, y });
      }
    };

    calculateBounds();
    window.addEventListener('resize', calculateBounds);
    return () => window.removeEventListener('resize', calculateBounds);
  }, [event]);

  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 3)
    }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.2)
    }));
  };

  const handleResetZoom = () => {
    // Trigger re-calculation
    const evt = new Event('resize');
    window.dispatchEvent(evt);
  };


  const toggleSeat = (seat: EventSeat, zone: EventZone) => {
    if (seat.status !== SeatStatus.AVAILABLE) return;
    
    const isInCart = cart.some(item => item.id === seat.id);
    if (isInCart) {
      setCart(cart.filter(item => item.id !== seat.id));
    } else {
      setCart([...cart, {
        id: seat.id,
        type: 'seat',
        name: `${seat.rowLabel}${seat.colLabel}`,
        price: seat.price || zone.price,
        zoneId: zone.id,
        zoneName: zone.name
      }]);
    }
  };

  const updateGeneralAdmission = (zone: EventZone, quantity: number) => {
    // Remove existing items for this zone
    const others = cart.filter(item => item.zoneId !== zone.id);
    const newItems: CartItem[] = [];
    for (let i = 0; i < quantity; i++) {
      newItems.push({
        id: `${zone.id}-ga-${i}`, // Temporary ID
        type: 'general',
        name: 'General Admission',
        price: zone.price,
        zoneId: zone.id,
        zoneName: zone.name
      });
    }
    setCart([...others, ...newItems]);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToTransfer) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`http://localhost:3333/api/tickets/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketToTransfer.id,
          newOwner: transferForm,
          currentOwnerEmail: guestForm.email
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al transferir el boleto');
      }

      const data = await response.json();
      
      // Update local state
      setPurchasedTickets(prev => prev.map(t => 
        t.id === ticketToTransfer.id ? { ...t, ...data.ticket } : t
      ));

      alert('¡Boleto transferido exitosamente! Se ha enviado un correo al nuevo propietario.');
      setStep('confirmation');
      setTicketToTransfer(null);
      setTransferForm({ name: '', email: '', phone: '', docId: '' });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al transferir el boleto');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const response = await fetch(`http://localhost:3333/api/events/${eventId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: guestForm
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la compra');
      }

      const data = await response.json();
      setPurchasedTickets(data.tickets || []);
      setStep('confirmation');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Hubo un error al procesar tu compra. Por favor intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500">{error || 'Evento no encontrado'}</p>
        </div>
      </div>
    );
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  // Render Seat Map
  const renderSeatMap = () => {
    return (
      <div 
        ref={containerRef}
        className={`relative w-full h-[600px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={(e) => {
           // Ignore clicks on buttons
           if ((e.target as HTMLElement).closest('button')) return;
           
           e.preventDefault();
           setIsDragging(true);
           dragStartRef.current = { 
             x: e.clientX - transform.x, 
             y: e.clientY - transform.y 
           };
        }}
        onMouseMove={(e) => {
           if (isDragging) {
             setTransform(prev => ({
               ...prev,
               x: e.clientX - dragStartRef.current.x,
               y: e.clientY - dragStartRef.current.y
             }));
           }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 bg-white rounded-lg shadow-md border border-slate-200 p-1">
          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600 transition-colors"
            title="Acercar"
          >
            <ZoomIn size={20} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600 transition-colors"
            title="Alejar"
          >
            <ZoomOut size={20} />
          </button>
          <button 
            onClick={handleResetZoom}
            className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600 transition-colors"
            title="Restablecer vista"
          >
            <Maximize size={20} />
          </button>
        </div>

        <div 
          className="absolute origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%',
            height: '100%'
          }}
        >
          <div className="relative min-w-[800px] min-h-[600px]">
            {event?.zones?.map(zone => {
              // Handle Stage Zones
              if (zone.type === 'STAGE') {
                return (
                  <div
                    key={zone.id}
                    className="absolute border-2 rounded-xl shadow-sm overflow-hidden bg-gray-800 border-gray-900 z-0"
                    style={{
                      left: zone.layout?.x || 50,
                      top: zone.layout?.y || 50,
                      width: zone.layout?.width || 200,
                      height: zone.layout?.height || 100
                    }}
                  >
                    <div className="px-3 py-1 text-xs font-bold text-white bg-black">
                      {zone.name}
                    </div>
                    <div className="flex items-center justify-center h-[calc(100%-24px)] text-gray-500 font-bold uppercase tracking-widest text-sm p-2 text-center opacity-50">
                      TARIMA
                    </div>
                  </div>
                );
              }

              // Handle Info Zones
              if (zone.type === 'INFO') {
                return (
                  <div
                    key={zone.id}
                    className="absolute flex items-center justify-center bg-gray-200 border-2 border-gray-300 border-dashed rounded-lg text-gray-500 font-bold text-xs uppercase tracking-widest opacity-80"
                    style={{
                      left: zone.layout?.x || 0,
                      top: zone.layout?.y || 0,
                      width: zone.layout?.width || 100,
                      height: zone.layout?.height || 50
                    }}
                  >
                    {zone.name}
                  </div>
                );
              }

              const zoneSeats = zone.seats || event.seats?.filter(s => s.zoneId === zone.id) || [];
              const hasSeats = zoneSeats.length > 0;
              const isGeneral = !hasSeats && (zone.capacity || 0) > 0;
              
              if (isGeneral) {
                // Render a box for General Admission
                const soldCount = zone._count?.tickets || 0;
                const capacity = zone.capacity || 0;
                const available = Math.max(0, capacity - soldCount);
                const isSoldOut = available === 0;
                const currentInCart = cart.filter(i => i.zoneId === zone.id).length;

                return (
                  <div
                    key={zone.id}
                    className={`
                      absolute border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors shadow-sm group
                      ${isSoldOut 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-75' 
                        : (zone.color === 'transparent' ? 'bg-transparent border-indigo-200 cursor-pointer' : 'bg-indigo-50 border-indigo-200 cursor-pointer hover:bg-indigo-100')
                      }
                    `}
                    style={{
                      left: zone.layout?.x || 50,
                      top: zone.layout?.y || 100,
                      width: zone.layout?.width || 200,
                      height: zone.layout?.height || 150,
                      backgroundColor: zone.color === 'transparent' ? 'transparent' : (zone.color ? `${zone.color}10` : undefined),
                      borderColor: zone.color || undefined,
                      transform: zone.rotation ? `rotate(${zone.rotation}deg)` : 'none',
                      transformOrigin: 'center center'
                    }}
                  >
                    <div className={`flex flex-col items-center w-full ${zone.color === 'transparent' ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''}`}>
                        <span className={`font-bold ${isSoldOut ? 'text-gray-500' : 'text-indigo-900'}`}>{zone.name}</span>
                        <span className={`text-xs mb-1 ${isSoldOut ? 'text-gray-400' : 'text-indigo-600'}`}>Entrada General</span>
                        <span className="text-sm font-semibold">${zone.price.toLocaleString()}</span>
                        
                        {isSoldOut ? (
                          <div className="mt-2 px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">
                            AGOTADO
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-gray-500 mb-2 mt-1">
                              {available} disponibles
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-indigo-100 shadow-sm">
                              <button 
                                className="w-6 h-6 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentInCart > 0) updateGeneralAdmission(zone, currentInCart - 1);
                                }}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{currentInCart}</span>
                              <button 
                                className={`w-6 h-6 flex items-center justify-center rounded text-white ${
                                  currentInCart >= available 
                                    ? 'bg-gray-300 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentInCart < available) updateGeneralAdmission(zone, currentInCart + 1);
                                }}
                                disabled={currentInCart >= available}
                              >
                                +
                              </button>
                            </div>
                          </>
                        )}
                    </div>
                  </div>
                );
              }

              // Render Seats
              
              return (
                <div 
                  key={zone.id}
                  className="absolute border-2 rounded-xl shadow-sm overflow-hidden flex flex-col group"
                  style={{
                    left: zone.layout?.x || 0,
                    top: zone.layout?.y || 0,
                    width: zone.layout?.width || (zone.cols * 40 + 40),
                    height: zone.layout?.height || (zone.rows * 40 + 40),
                    borderColor: zone.color || '#cbd5e1',
                    backgroundColor: zone.color === 'transparent' ? 'transparent' : (zone.color ? `${zone.color}10` : 'rgba(255,255,255,0.5)'),
                    transform: zone.rotation ? `rotate(${zone.rotation}deg)` : 'none',
                    transformOrigin: 'center center'
                  }}
                >
                  <div 
                    className={`px-3 py-1 text-xs font-bold text-white flex justify-center items-center ${zone.color === 'transparent' ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''}`}
                    style={{ backgroundColor: zone.color === 'transparent' ? '#374151' : (zone.color || '#64748b') }}
                  >
                    <span>{zone.name}</span>
                  </div>
                  
                  <div className="flex-1 relative w-full">
                  {zoneSeats.map(seat => {
                    const isSelected = cart.some(item => item.id === seat.id);
                    const isAvailable = seat.status === SeatStatus.AVAILABLE;
                    
                    let left = 0, top = 0;
                    let width = 28, height = 28; // Default size
                    
                    if (seat.x != null && seat.y != null) {
                      // Individual placement
                      left = seat.x;
                      top = seat.y;
                    } else if (zone.rows > 0 && zone.cols > 0) {
                      // Grid calculation - Fixed size with gap
                      const seatSize = 24;
                      const gapX = zone.seatGapX ?? (zone.seatGap ?? 4);
                      const gapY = zone.seatGapY ?? (zone.seatGap ?? 4);
                      const padding = 10; // Match SeatDesigner padding (it was 10 in designer, 16 here previously)
                      
                      width = seatSize;
                      height = seatSize;
                      
                      // Use grid coordinates if available (Preferred)
                      if (seat.gridRow !== undefined && seat.gridCol !== undefined) {
                        left = padding + seat.gridCol * (seatSize + gapX);
                        top = padding + seat.gridRow * (seatSize + gapY);
                      } else {
                        // Fallback Legacy Calculation
                        const r = seat.rowLabel.charCodeAt(0) - 65;
                        const dir = zone.numberingDirection || 'LTR';
                        const start = zone.startNumber ?? 1;
                        const labelNum = parseInt(seat.colLabel);
                        
                        let c;
                        if (dir === 'LTR') {
                            c = labelNum - start;
                        } else {
                            c = zone.cols - (labelNum - start) - 1;
                        }
                        
                        left = padding + c * (seatSize + gapX);
                        top = padding + r * (seatSize + gapY);
                      }
                    } else {
                      // Fallback for missing coords/grid
                      const r = seat.rowLabel.charCodeAt(0) - 65;
                      const c = parseInt(seat.colLabel) - 1;
                      left = c * 35 + 20;
                      top = r * 35 + 20;
                    }

                    return (
                      <button
                        key={seat.id}
                        onClick={() => toggleSeat(seat, zone)}
                        disabled={!isAvailable}
                        className={`
                          absolute rounded-sm text-[10px] font-bold flex items-center justify-center transition-all shadow-sm
                          ${!isAvailable 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300' 
                            : isSelected
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 scale-110 z-10'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                          }
                        `}
                        style={{ left, top, width, height }}
                        title={`${zone.name} - ${seat.rowLabel}${seat.colLabel} - $${seat.price || zone.price}`}
                      >
                        {width > 15 && `${seat.colLabel}`} 
                      </button>
                    );
                  })}
                  </div>
                  
                  {/* Zone Footer */}
                  <div 
                      className={`px-3 py-1 text-[10px] font-bold text-white flex justify-center items-center ${zone.color === 'transparent' ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''}`}
                      style={{ backgroundColor: zone.color === 'transparent' ? '#374151' : (zone.color || '#64748b') }}
                  >
                      <span>${zone.price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{event.title}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.startDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-lg font-bold text-indigo-600">${totalPrice.toLocaleString()}</div>
            </div>
            <button 
              onClick={() => totalPrice > 0 && setStep('checkout')}
              disabled={totalPrice === 0 || step !== 'selection'}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md
                ${totalPrice > 0 && step === 'selection'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              `}
            >
              <Ticket size={18} />
              Comprar ({cart.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        {step === 'selection' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 overflow-hidden">
                {renderSeatMap()}
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-2">Acerca del evento</h3>
                <p className="text-slate-600 leading-relaxed">{event.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Ticket className="text-indigo-600" size={20} />
                  Tu Selección
                </h3>
                
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p>Selecciona sillas o entradas en el mapa</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                        <div>
                          <div className="font-medium text-slate-900">{item.zoneName}</div>
                          <div className="text-xs text-slate-500">{item.name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600">${item.price.toLocaleString()}</span>
                          <button 
                            onClick={() => {
                              const newCart = [...cart];
                              newCart.splice(idx, 1);
                              setCart(newCart);
                            }}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <AlertCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2 text-slate-500">
                    <span>Subtotal</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-6 text-slate-500">
                    <span>Servicio</span>
                    <span>$0</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold text-slate-900">
                    <span>Total</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium"
            >
              <ChevronRight className="rotate-180" size={16} />
              Volver a la selección
            </button>
            
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">Finalizar Compra</h2>
                <p className="text-slate-500 text-sm">Ingresa tus datos para recibir las entradas</p>
              </div>
              
              <div className="p-8">
                <form onSubmit={handleCheckout} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text"
                          value={guestForm.fullName}
                          onChange={e => setGuestForm({...guestForm, fullName: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="Juan Pérez"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="email"
                          value={guestForm.email}
                          onChange={e => setGuestForm({...guestForm, email: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          placeholder="juan@ejemplo.com"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Enviaremos tus entradas a este correo.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="tel"
                            value={guestForm.phone}
                            onChange={e => setGuestForm({...guestForm, phone: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="+57 300..."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Documento ID</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="text"
                            value={guestForm.docId}
                            onChange={e => setGuestForm({...guestForm, docId: e.target.value})}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="123456789"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                       <p className="font-semibold mb-1">💡 Mejora tu experiencia</p>
                       <p>Registrar tus datos completos nos permite generar tu factura y asegurar tus boletos. Además, podrás transferirlos fácilmente si no puedes asistir.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-3">Método de Pago</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" className="p-4 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-xl flex flex-col items-center justify-center gap-2 font-medium">
                          <CreditCard size={24} />
                          Tarjeta Crédito/Débito
                        </button>
                        <button type="button" className="p-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 font-medium transition-colors">
                          <span className="text-xl font-bold">PSE</span>
                          Transferencia
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={processing}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        Pagar ${totalPrice.toLocaleString()}
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Pago Exitoso!</h2>
            <p className="text-slate-600 mb-8">
              Hemos enviado tus entradas a <strong>{guestForm.email}</strong>
            </p>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 text-left">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Tus Boletos</h3>
              <div className="space-y-4">
                {purchasedTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Ticket size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{ticket.zone?.name || 'Zona'}</p>
                        <p className="text-sm text-slate-600">
                           {ticket.seat ? `Fila ${ticket.seat.rowLabel} - Asiento ${ticket.seat.colLabel}` : 'Entrada General'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Propietario: {ticket.ownerName || guestForm.fullName}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-slate-900">${ticket.price.toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setTicketToTransfer(ticket);
                          setStep('manage');
                        }}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <Share2 size={14} />
                        Transferir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-100 pt-4 mt-6">
                <span>Total Pagado</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {step === 'manage' && ticketToTransfer && (
          <div className="max-w-2xl mx-auto py-8">
            <button 
              onClick={() => {
                setStep('confirmation');
                setTicketToTransfer(null);
              }}
              className="flex items-center text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft size={20} className="mr-2" />
              Volver a mis boletos
            </button>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Transferir Boleto</h2>
              <p className="text-slate-600 mb-6">
                Ingresa los datos de la persona a quien deseas transferir este boleto. Una vez transferido, no podrás recuperarlo.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Ticket size={20} className="text-indigo-600" />
                </div>
                <div>
                   <p className="font-bold text-slate-900">{ticketToTransfer.zone?.name}</p>
                   <p className="text-sm text-slate-600">
                      {ticketToTransfer.seat ? `Fila ${ticketToTransfer.seat.rowLabel} - Asiento ${ticketToTransfer.seat.colLabel}` : 'Entrada General'}
                   </p>
                </div>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Nombre del nuevo titular"
                        value={transferForm.name}
                        onChange={e => setTransferForm({...transferForm, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="correo@ejemplo.com"
                        value={transferForm.email}
                        onChange={e => setTransferForm({...transferForm, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="tel" 
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+57 300 123 4567"
                        value={transferForm.phone}
                        onChange={e => setTransferForm({...transferForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Documento ID</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="CC 123456789"
                        value={transferForm.docId}
                        onChange={e => setTransferForm({...transferForm, docId: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setStep('confirmation');
                      setTicketToTransfer(null);
                    }}
                    className="flex-1 py-3 bg-white text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Share2 size={18} />
                        Confirmar Transferencia
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
