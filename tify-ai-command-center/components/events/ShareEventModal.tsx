import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Copy,
  Search,
  Check,
  Users,
  Globe,
  ShieldAlert,
  Sparkles,
  Share2,
} from 'lucide-react';
import { TifyEvent, LocalEventGuest } from '../../types';

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TifyEvent | null;
}

export default function ShareEventModal({ isOpen, onClose, event }: ShareEventModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generalCopied, setGeneralCopied] = useState(false);
  const [showGeneralLink, setShowGeneralLink] = useState(false);
  const [filteredGuests, setFilteredGuests] = useState<LocalEventGuest[]>([]);

  useEffect(() => {
    if (event?.guestList) {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredGuests(
        event.guestList.filter(
          (g) =>
            g.name.toLowerCase().includes(lowerSearch) ||
            g.email?.toLowerCase().includes(lowerSearch) ||
            g.phoneNumber?.includes(lowerSearch)
        )
      );
    }
  }, [event, searchTerm]);

  if (!isOpen || !event) return null;

  const baseUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/events/${event.id}/rsvp` : '';

  const copyToClipboard = async (text: string, id: string | 'general') => {
    try {
      await navigator.clipboard.writeText(text);
      if (id === 'general') {
        setGeneralCopied(true);
        setTimeout(() => setGeneralCopied(false), 2000);
      } else {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getGuestLink = (guest: LocalEventGuest) => {
    if (!guest.token) return baseUrl;
    return `${baseUrl}?token=${guest.token}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-gray-100">
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-pink-600 to-rose-600">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
              <Share2 size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Compartir Evento</h3>
              <p className="text-pink-100 text-sm font-medium opacity-90">
                Gestiona los enlaces de invitación
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* General Link Section (Collapsed by default) */}
          <div className="bg-gray-50 rounded-2xl p-1 border border-gray-200">
            {!showGeneralLink ? (
              <button
                onClick={() => setShowGeneralLink(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm border border-gray-100 group-hover:text-indigo-500 transition-colors">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-gray-700 text-sm group-hover:text-gray-900">
                      ¿Necesitas un enlace general?
                    </span>
                    <span className="block text-xs text-gray-500">
                      Menos seguro, pero útil para grupos grandes.
                    </span>
                  </div>
                </div>
                <div className="text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                  Mostrar
                </div>
              </button>
            ) : (
              <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Enlace Público General</h4>
                      <p className="text-xs text-gray-500">
                        Cualquiera con este link puede intentar acceder.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGeneralLink(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 pr-1.5 focus-within:ring-2 focus-within:ring-pink-100 transition-shadow">
                  <div className="pl-3 py-2 flex-1 text-xs font-mono text-gray-500 truncate select-all">
                    {baseUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(baseUrl, 'general')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      generalCopied
                        ? 'bg-green-500 text-white shadow-md shadow-green-200'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {generalCopied ? <Check size={16} /> : <Copy size={16} />}
                    {generalCopied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-sm text-gray-400 font-medium uppercase tracking-wider">
                O Invitaciones Personalizadas
              </span>
            </div>
          </div>

          {/* Personalized Links Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar invitado por nombre, email o teléfono..."
                  value={searchTerm}
                  autoComplete="off"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all text-sm font-medium"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg border border-pink-100 text-xs font-bold">
                <Users size={14} />
                {filteredGuests.length} Invitados
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredGuests.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Search size={24} />
                  </div>
                  <p className="text-gray-500 font-medium">No se encontraron invitados</p>
                  <p className="text-xs text-gray-400 mt-1">Intenta con otra búsqueda</p>
                </div>
              ) : (
                filteredGuests.map((guest, index) => (
                  <div
                    key={guest.id || index}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-pink-200 hover:shadow-md hover:shadow-pink-50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                          guest.status === 'confirmed'
                            ? 'bg-green-100 text-green-600'
                            : guest.status === 'declined'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {guest.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-gray-900 truncate">{guest.name}</h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {guest.quota && (
                            <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 border border-gray-100">
                              <Users size={10} /> {guest.quota}
                            </span>
                          )}
                          {guest.phoneNumber && (
                            <span className="truncate">{guest.phoneNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        copyToClipboard(getGuestLink(guest), guest.id || `idx-${index}`)
                      }
                      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                        copiedId === (guest.id || `idx-${index}`)
                          ? 'bg-green-50 text-green-600 border-green-200'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50'
                      }`}
                    >
                      {copiedId === (guest.id || `idx-${index}`) ? (
                        <>
                          <Check size={14} />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Link size={14} />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 flex gap-3 border border-indigo-100">
            <Sparkles size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-indigo-900 text-sm mb-1">Tip Pro</h5>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Los enlaces personalizados precargan los datos del invitado y ofrecen una
                experiencia VIP. ¡Úsalos para aumentar la tasa de confirmación!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
