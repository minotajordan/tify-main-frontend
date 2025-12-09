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
  ChevronRight
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
  const [step, setStep] = useState<'selection' | 'checkout' | 'confirmation'>('selection');
  const [guestForm, setGuestForm] = useState({ fullName: '', email: '' });
  const [processing, setProcessing] = useState(false);

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
    // Calculate bounds to center the map
    // Default 800x600 canvas for relative positioning
    return (
      <div className="relative w-full h-[600px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
        <div className="absolute inset-0 overflow-auto">
          <div className="relative min-w-[800px] min-h-[600px] p-10">
            {event.zones?.map(zone => {
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
                      absolute border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors shadow-sm
                      ${isSoldOut 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-75' 
                        : 'bg-indigo-50 border-indigo-200 cursor-pointer hover:bg-indigo-100'
                      }
                    `}
                    style={{
                      left: zone.layout?.x || 50,
                      top: zone.layout?.y || 100,
                      width: zone.layout?.width || 200,
                      height: zone.layout?.height || 150
                    }}
                  >
                    <span className={`font-bold ${isSoldOut ? 'text-gray-500' : 'text-indigo-900'}`}>{zone.name}</span>
                    <span className={`text-xs mb-1 ${isSoldOut ? 'text-gray-400' : 'text-indigo-600'}`}>Entrada General (Ubicación Libre)</span>
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
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-indigo-100">
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
                );
              }

              // Render Seats
              
              return (
                <div 
                  key={zone.id}
                  className="absolute rounded-lg border-2 border-opacity-50 transition-all hover:border-opacity-100 hover:shadow-sm"
                  style={{
                    left: zone.layout?.x || 0,
                    top: zone.layout?.y || 0,
                    width: zone.layout?.width || (zone.cols * 40 + 40),
                    height: zone.layout?.height || (zone.rows * 40 + 40),
                    borderColor: zone.color || '#cbd5e1',
                    backgroundColor: zone.color ? `${zone.color}10` : 'rgba(255,255,255,0.5)'
                  }}
                >
                  <div 
                    className="absolute -top-7 left-0 px-2 py-1 rounded text-xs font-bold text-white shadow-sm flex items-center gap-2"
                    style={{ backgroundColor: zone.color || '#64748b' }}
                  >
                    <span>{zone.name}</span>
                    <span className="bg-white/20 px-1 rounded text-[10px]">${zone.price}</span>
                  </div>
                  
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
                      // Use same logic as SeatDesigner for consistency
                      const seatSize = 24;
                      const gap = zone.seatGap ?? 4;
                      const padding = 16; // Adjusted to match SeatDesigner
                      
                      width = seatSize;
                      height = seatSize;
                      
                      const r = seat.rowLabel.charCodeAt(0) - 65;
                      // Calculate column index based on direction
                      const dir = zone.numberingDirection || 'LTR';
                      const start = zone.startNumber ?? 1;
                      const labelNum = parseInt(seat.colLabel);
                      
                      let c;
                      if (dir === 'LTR') {
                          c = labelNum - start;
                      } else {
                          // RTL: col = cols - (label - start) - 1
                          c = zone.cols - (labelNum - start) - 1;
                      }
                      
                      left = padding + c * (seatSize + gap);
                      top = padding + r * (seatSize + gap);
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
                          absolute rounded-t-lg text-[10px] font-bold flex items-center justify-center transition-all shadow-sm
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
          <div className="max-w-md mx-auto text-center pt-10">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle size={48} />
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Compra Exitosa!</h2>
            <p className="text-slate-500 mb-8">
              Hemos enviado tus entradas a <strong>{guestForm.email}</strong>
            </p>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 text-left">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Resumen de Compra</h3>
              <div className="space-y-2 mb-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.zoneName} - {item.name}</span>
                    <span className="font-medium">${item.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-100 pt-2">
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
      </main>
    </div>
  );
}
