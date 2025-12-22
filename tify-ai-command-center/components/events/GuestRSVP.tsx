import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare,
  Gift,
  PartyPopper,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { TifyEvent, LocalEventGuest } from '../../types';

export default function GuestRSVP({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<TifyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guest, setGuest] = useState<LocalEventGuest | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<'identifying' | 'details' | 'success'>('identifying');
  const [identifier, setIdentifier] = useState('');
  
  // Form state
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined' | null>(null);
  const [extraData, setExtraData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const fetchedRef = React.useRef(false);

  useEffect(() => {
    // Extract token from URL search params
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    
    // Prevent double fetch in StrictMode or re-renders
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (t) setToken(t);

    loadEvent(t);
  }, [eventId]);

  const loadEvent = async (urlToken: string | null) => {
    try {
      setLoading(true);
      
      if (urlToken) {
        // Use new endpoint that handles both fetch and access tracking
        const data = await api.getEventByToken(urlToken);
        setEvent(data);
        
        if (data.currentGuest) {
          setGuest(data.currentGuest);
          setView('details');
        } else if (data.guestList) {
           // Fallback if currentGuest not returned but guestList is
           const found = data.guestList.find(g => g.token === urlToken);
           if (found) {
             setGuest(found);
             setView('details');
           }
        }
      } else {
        // Regular load by ID if no token (fallback or admin view)
        const data = await api.getEvent(eventId);
        setEvent(data);
        setView('identifying');
      }
    } catch (e) {
      setError('No se pudo cargar el evento. Verifica el enlace.');
    } finally {
      setLoading(false);
    }
  };

  const updateAccessCount = async (evt: TifyEvent, g: LocalEventGuest) => {
    // Optimistic update local state only
    if (evt.guestList) {
      const updatedList = evt.guestList.map(item => {
        if (item.token === g.token) {
          return { ...item, linkAccessCount: (item.linkAccessCount || 0) + 1 };
        }
        return item;
      });
      setEvent({ ...evt, guestList: updatedList });
    }
  };

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !event.guestList) return;

    // Search by phone or email (name is too loose, but let's try phone first)
    // In a real app, this would be more robust.
    const found = event.guestList.find(g => 
        (g.phoneNumber && g.phoneNumber.includes(identifier)) || 
        (g.name.toLowerCase().includes(identifier.toLowerCase()))
    );

    if (found) {
      setGuest(found);
      setView('details');
      updateAccessCount(event, found);
    } else {
      setError('No encontramos una invitación con esos datos.');
    }
  };

  const handleSubmitRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !guest || !rsvpStatus) return;

    setSubmitting(true);
    
    // Check if info is filled (if there are extra fields requested, logic would go here)
    // For now, we assume info is filled if they submit the form.
    const isInfoFilled = Object.keys(extraData).length > 0;

    const updatedGuest: LocalEventGuest = {
      ...guest,
      status: rsvpStatus,
      additionalData: { ...guest.additionalData, ...extraData },
      infoFilled: isInfoFilled || guest.infoFilled,
      updatedAt: new Date().toISOString()
    };

    const updatedGuestList = event.guestList?.map(g => 
      g.token === guest.token ? updatedGuest : g
    );

    try {
      await api.updateEvent(event.id, { guestList: updatedGuestList });
      setView('success');
    } catch (e) {
      setError('Error al guardar tu respuesta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  // Visual Styles based on template
  const isFestive = event.templateStyle === 'card-2';
  const headerBg = isFestive 
    ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
    : 'bg-gradient-to-r from-pink-500 to-purple-500';
  const textColor = isFestive ? 'text-gray-900' : 'text-gray-900';
  const accentColor = isFestive ? 'text-orange-600' : 'text-pink-600';
  const buttonBg = isFestive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-pink-600 hover:bg-pink-700';

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-8">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.01] duration-300">
          
          {/* Header Image/Pattern */}
          <div className={`h-48 ${headerBg} relative flex items-center justify-center overflow-hidden`}>
            <div className="absolute inset-0 opacity-20">
              {/* Abstract pattern circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full mix-blend-overlay"></div>
              <div className="absolute bottom-10 left-10 w-20 h-20 bg-white rounded-full mix-blend-overlay"></div>
            </div>
            
            <div className="relative z-10 text-center px-4">
              {isFestive ? (
                <PartyPopper className="w-16 h-16 text-white mx-auto mb-2 animate-bounce" />
              ) : (
                <Gift className="w-16 h-16 text-white mx-auto mb-2" />
              )}
              <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                {isFestive ? '¡ESTÁS INVITADO!' : 'Invitación Especial'}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${textColor} mb-2`}>{event.title}</h2>
              <p className="text-gray-500 italic">{event.description}</p>
            </div>

            {/* Event Details */}
            <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className={`w-5 h-5 ${accentColor}`} />
                <span className="font-medium">
                  {new Date(event.startDate).toLocaleDateString()}
                </span>
                <span className="text-gray-400">|</span>
                <Clock className={`w-5 h-5 ${accentColor}`} />
                <span>
                  {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className={`w-5 h-5 ${accentColor}`} />
                <span>{event.location}</span>
              </div>

              {guest && (
                 <div className="flex items-center gap-3 text-gray-700 border-t border-gray-200 pt-3 mt-3">
                    <User className={`w-5 h-5 ${accentColor}`} />
                    <span>Hola, <strong>{guest.name}</strong></span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                        {guest.quota} cupos
                    </span>
                 </div>
              )}
            </div>

            {/* View Switching */}
            {view === 'identifying' && (
               <form onSubmit={handleIdentify} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center mb-4">
                     <p className="text-sm text-gray-600">Para confirmar, ingresa tu número de teléfono o nombre tal como aparece en la invitación.</p>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      required
                      placeholder="Tu teléfono o nombre..."
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <button 
                    type="submit" 
                    className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transform transition hover:-translate-y-0.5 ${buttonBg}`}
                  >
                    Buscar mi Invitación
                  </button>
               </form>
            )}

            {view === 'details' && (
              <form onSubmit={handleSubmitRSVP} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setRsvpStatus('confirmed')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            rsvpStatus === 'confirmed' 
                            ? `border-green-500 bg-green-50 text-green-700` 
                            : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                        }`}
                    >
                        <CheckCircle className={`w-8 h-8 ${rsvpStatus === 'confirmed' ? 'text-green-600' : 'text-gray-300'}`} />
                        <span className="font-bold">Asistiré</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRsvpStatus('declined')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            rsvpStatus === 'declined' 
                            ? `border-red-500 bg-red-50 text-red-700` 
                            : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                        }`}
                    >
                        <XCircle className={`w-8 h-8 ${rsvpStatus === 'declined' ? 'text-red-600' : 'text-gray-300'}`} />
                        <span className="font-bold">No Asistiré</span>
                    </button>
                 </div>

                 {/* Extra Info Fields (Example: Dietary Restrictions) */}
                 {rsvpStatus === 'confirmed' && (
                    <div className="space-y-3 animate-in fade-in">
                        <label className="block text-sm font-medium text-gray-700">
                            <MessageSquare size={16} className="inline mr-2" />
                            ¿Alguna nota o restricción alimenticia?
                        </label>
                        <textarea 
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder="Ej. Soy vegetariano, soy alérgico a..."
                            value={extraData.notes || ''}
                            onChange={e => setExtraData({...extraData, notes: e.target.value})}
                        />
                    </div>
                 )}

                 <button 
                    type="submit"
                    disabled={!rsvpStatus || submitting}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${buttonBg}`}
                  >
                    {submitting ? 'Enviando...' : 'Confirmar Respuesta'}
                  </button>
              </form>
            )}

            {view === 'success' && (
                <div className="text-center py-8 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por responder!</h3>
                    <p className="text-gray-500">
                        {rsvpStatus === 'confirmed' 
                            ? 'Tu asistencia ha sido confirmada. ¡Nos vemos en la fiesta!' 
                            : 'Lamentamos que no puedas asistir. Gracias por avisar.'}
                    </p>
                </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400">
            Powered by Tify Events
          </div>
        </div>
      </div>
    </div>
  );
}
