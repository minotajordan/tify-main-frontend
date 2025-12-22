import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Layout, 
  Play, 
  Settings, 
  ChevronLeft,
  Search,
  Ticket,
  Share,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Gift,
  Upload,
  FileSpreadsheet,
  PieChart,
  Home,
  Link,
  Clock,
  Eye,
  Activity,
  Save,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { TifyEvent, EventStatus, LocalEventGuest } from '../../types';
import SeatDesigner from './SeatDesigner';
import SalesDetails from './SalesDetails';
import RaffleSystem from './RaffleSystem';
import ShareEventModal from './ShareEventModal';

interface LiveStats {
  totalRevenue: number;
  ticketsSold: number;
  revenueByZone: {
    id: string;
    name: string;
    count: number;
    revenue: number;
    capacity: number;
  }[];
  recentSales: {
    id: string;
    customerName: string;
    purchaseDate: string;
    zoneId: string;
    price: number;
    status: string;
    seat?: {
      rowLabel: string;
      colLabel: string;
    };
  }[];
}

const downloadTemplate = () => {
  const headers = ['Nombre Completo', 'Teléfono', 'País', 'Cupos', 'Email', 'Notas'];
  const content = headers.join(',') + '\n' + 'Juan Pérez,+573001234567,Colombia,2,juan@example.com,Vegetariano';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'plantilla_invitados.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseGuestListCSV = (content: string): LocalEventGuest[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const guests: LocalEventGuest[] = [];
  
  if (lines.length === 0) return [];

  // Detect header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('nombre') || firstLine.includes('name');
  
  let headers: string[] = [];
  let startIdx = 0;

  if (hasHeader) {
      headers = lines[0].split(',').map(h => h.trim());
      startIdx = 1;
  } else {
      headers = ['nombre', 'telefono', 'pais', 'cupos']; // Default fallback
      startIdx = 0;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length === 0 || !parts[0]) continue;

    const guest: any = {
        status: 'pending',
        additionalData: {},
        linkAccessCount: 0,
        infoFilled: false,
        quota: 1 // Default quota
    };

    parts.forEach((part, index) => {
        const header = headers[index] ? headers[index].toLowerCase() : `col_${index}`;
        
        if (header.includes('nombre') || header.includes('name')) {
            guest.name = part;
        } else if (header.includes('tel') || header.includes('phone') || header.includes('cel')) {
            guest.phoneNumber = part;
        } else if (header.includes('pais') || header.includes('country')) {
            guest.country = part;
        } else if (header.includes('cupo') || header.includes('quota')) {
            guest.quota = parseInt(part) || 1;
        } else {
            // Extra data
            guest.additionalData[headers[index] || `col_${index}`] = part;
        }
    });

    // Fallback if no specific columns mapped but we have data (legacy/simple support)
    if (!guest.name && parts[0] && !hasHeader) {
         // If no header was detected, we might have used the fallback headers, so the loop above worked.
         // But if logic failed, ensure at least name is set.
    }

    if (guest.name) {
        guests.push(guest as LocalEventGuest);
    }
  }
  return guests;
};

const ProcessingModal = ({ 
  isOpen, 
  status, 
  message, 
  title,
  onClose 
}: { 
  isOpen: boolean; 
  status: 'loading' | 'success' | 'error'; 
  message: string; 
  title?: string;
  onClose?: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Loader2 size={32} className="text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || 'Procesando...'}</h3>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || '¡Éxito!'}</h3>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Entendido
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || 'Error'}</h3>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const GuestDetailModal = ({
  isOpen,
  guest,
  onClose,
  onSave
}: {
  isOpen: boolean;
  guest: LocalEventGuest | null;
  onClose: () => void;
  onSave: (updatedGuest: LocalEventGuest) => Promise<void> | void;
}) => {
  const [formData, setFormData] = useState<LocalEventGuest | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (guest) {
      setFormData({ ...guest });
    }
  }, [guest]);

  if (!isOpen || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      case 'attended': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusLabel = (status: string) => {
     switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'declined': return 'Rechazado';
      case 'attended': return 'Asistió';
      default: return 'Pendiente';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-indigo-600 to-violet-600">
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
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Detalles del Invitado</h3>
                <p className="text-indigo-100 text-sm font-medium opacity-90">Administra la información y estado</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form id="guest-form" onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Main Info Section */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    Información Personal
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusColor(formData.status || 'pending')}`}>
                    {getStatusLabel(formData.status || 'pending')}
                  </span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Nombre Completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900 placeholder-gray-400"
                        placeholder="Ej. Juan Pérez"
                      />
                      <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900 placeholder-gray-400"
                        placeholder="juan@ejemplo.com"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">@</div>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Teléfono</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.phoneNumber || ''}
                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900 placeholder-gray-400"
                        placeholder="+57 300 123 4567"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">#</div>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">País</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900 placeholder-gray-400"
                        placeholder="Colombia"
                      />
                      <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                  </div>
               </div>
            </div>

            <div className="w-full h-px bg-gray-100"></div>

            {/* Event Details Section */}
             <div className="space-y-6">
               <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                 Detalles del Evento
               </h4>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Cupos Asignados</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formData.quota}
                        onChange={e => setFormData({ ...formData, quota: parseInt(e.target.value) || 1 })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900"
                      />
                      <Ticket size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Estado de Asistencia</label>
                    <div className="relative">
                       <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900 appearance-none cursor-pointer"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="declined">Rechazado</option>
                        <option value="attended">Asistió</option>
                      </select>
                      <Activity size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronLeft size={16} className="-rotate-90" />
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="w-full h-px bg-gray-100"></div>

            {/* Metrics & Extra Data */}
            <div className="space-y-6">
               <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                 Métricas y Datos Adicionales
               </h4>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                     <div>
                       <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide block mb-1">Visualizaciones</span>
                       <span className="text-2xl font-bold text-indigo-900">{formData.linkAccessCount || 0}</span>
                     </div>
                     <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <Eye size={20} />
                     </div>
                  </div>

                  <div className={`bg-gradient-to-br p-4 rounded-2xl border flex items-center justify-between group hover:shadow-md transition-shadow ${formData.infoFilled ? 'from-green-50 to-white border-green-100' : 'from-gray-50 to-white border-gray-200'}`}>
                     <div>
                       <span className={`text-xs font-semibold uppercase tracking-wide block mb-1 ${formData.infoFilled ? 'text-green-500' : 'text-gray-400'}`}>Formulario</span>
                       <span className={`text-lg font-bold flex items-center gap-2 ${formData.infoFilled ? 'text-green-700' : 'text-gray-500'}`}>
                         {formData.infoFilled ? 'Completado' : 'Pendiente'}
                       </span>
                     </div>
                     <div className={`w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform ${formData.infoFilled ? 'text-green-500' : 'text-gray-400'}`}>
                        {formData.infoFilled ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                     </div>
                  </div>
               </div>

               {formData.additionalData && Object.keys(formData.additionalData).length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/60">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Datos Importados (CSV)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(formData.additionalData).map(([key, value]) => (
                        <div key={key} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <span className="text-xs font-semibold text-gray-400 block mb-0.5">{key}</span>
                          <span className="text-sm font-medium text-gray-800 break-words">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="guest-form"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

const EventTypeSelectionModal = ({
  isOpen,
  onClose,
  onSelect
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'macro' | 'local') => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Crear Nuevo Evento</h2>
          <p className="text-gray-500 text-lg">Selecciona el tipo de evento que deseas organizar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Evento Macro */}
          <button
            onClick={() => onSelect('macro')}
            className="group relative flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/30 transition-all duration-300 text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Ticket size={40} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-700">Evento Macro</h3>
            <p className="text-gray-500 leading-relaxed">
              Ideal para conciertos, estadios y grandes aforos. Incluye gestión de boletería, pagos, diseño de zonas y reserva de sillas.
            </p>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <Plus size={20} className="text-white" />
              </div>
            </div>
          </button>

          {/* Evento Local */}
          <button
            onClick={() => onSelect('local')}
            className="group relative flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-pink-500 hover:bg-pink-50/30 transition-all duration-300 text-center"
          >
            <div className="w-20 h-20 bg-pink-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Gift size={40} className="text-pink-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-pink-700">Evento Local / Celebración</h3>
            <p className="text-gray-500 leading-relaxed">
              Perfecto para cumpleaños, grados y reuniones. Incluye invitaciones personalizadas, links únicos, gestión de invitados y plantillas web.
            </p>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <Plus size={20} className="text-white" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function EventManager() {
  const [events, setEvents] = useState<TifyEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TifyEvent | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'details' | 'create-local'>('list');
  const [activeTab, setActiveTab] = useState<'info' | 'seats' | 'control' | 'sales' | 'raffle' | 'dashboard' | 'guests'>('info');
  const [loading, setLoading] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TifyEvent>>({});
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: 'loading' | 'success' | 'error';
    message: string;
    title?: string;
  }>({ isOpen: false, status: 'loading', message: '' });

  const [selectedGuest, setSelectedGuest] = useState<LocalEventGuest | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Event Type Selection
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [guestList, setGuestList] = useState<any[]>([]);
  const [activeGuestTab, setActiveGuestTab] = useState<'csv' | 'manual' | null>(null);
  const [manualGuest, setManualGuest] = useState<Partial<LocalEventGuest>>({});
  
  // Local Event Wizard State
  const [localStep, setLocalStep] = useState(1);
  const [localEventData, setLocalEventData] = useState<Partial<TifyEvent>>({});
  const [guestsPerInviteMode, setGuestsPerInviteMode] = useState<'fixed' | 'variable'>('fixed');

  useEffect(() => {
    api.getEventTemplates().then(setTemplates);
  }, [view]); // Reload templates when entering create view

  // Load events
  useEffect(() => {
    loadEvents();
  }, []);

  // Poll for live stats
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStats = async () => {
      if (activeTab === 'control' && selectedEvent) {
        try {
          const res = await fetch(`http://localhost:3333/api/events/${selectedEvent.id}/stats`);
          if (res.ok) {
            const data = await res.json();
            setLiveStats(data);
          }
        } catch (e) {
          console.error('Error fetching stats:', e);
        }
      }
    };

    if (activeTab === 'control' && selectedEvent) {
      fetchStats();
      interval = setInterval(fetchStats, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, selectedEvent]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setModalState({
      isOpen: true,
      status: 'loading',
      title: 'Creando evento',
      message: 'Estamos configurando tu nuevo evento...'
    });

    const formData = new FormData(e.target as HTMLFormElement);
    
    let templateData = {};
    if (selectedTemplateId) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
            // Deep copy to avoid reference issues
            templateData = {
                zones: JSON.parse(JSON.stringify(template.zones)),
                seats: JSON.parse(JSON.stringify(template.seats))
            };
        }
    }

    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      location: formData.get('location') as string,
      categories: (formData.get('categories') as string).split(',').map(c => c.trim()).filter(Boolean),
      paymentInfo: formData.get('paymentInfo') as string,
      status: EventStatus.DRAFT,
      ...templateData
    };

    try {
      const newEvent = await api.createEvent(data);
      setEvents([...events, newEvent]);
      setSelectedEvent(newEvent);
      
      // Switch to details view and seats tab immediately
      setView('details');
      setActiveTab('seats');
      
      setModalState({
        isOpen: true,
        status: 'success',
        title: '¡Evento creado!',
        message: 'El evento se ha creado correctamente. Configura el escenario a continuación.'
      });

      // Wait for user to close modal or auto-close logic if preferred
      // But for now, we'll let the user click "Entendido" which will trigger the view change
    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        status: 'error',
        title: 'Error',
        message: 'No se pudo crear el evento. Inténtalo de nuevo.'
      });
    }
  };

  const handleManualAddGuest = () => {
    if (!manualGuest.name) return;
    
    const newGuest: LocalEventGuest = {
        name: manualGuest.name,
        phoneNumber: manualGuest.phoneNumber,
        country: manualGuest.country,
        quota: manualGuest.quota || 1,
        status: 'pending',
        additionalData: {},
        linkAccessCount: 0,
        infoFilled: false
    };

    setGuestList(prev => [...prev, newGuest]);
    setManualGuest({});
  };

  const handleAddGuestToEvent = () => {
    if (!manualGuest.name || !selectedEvent) return;
    
    const newGuest: LocalEventGuest = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: manualGuest.name,
        phoneNumber: manualGuest.phoneNumber,
        country: manualGuest.country,
        quota: manualGuest.quota || 1,
        status: 'pending',
        additionalData: {},
        linkAccessCount: 0,
      infoFilled: false,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      updatedAt: new Date().toISOString()
    };

    const updatedEvent = {
        ...selectedEvent,
        guestList: [...(selectedEvent.guestList || []), newGuest]
    };
    
    setSelectedEvent(updatedEvent);
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setManualGuest({});
    
    // Auto-save to API
    api.updateEvent(updatedEvent.id, updatedEvent).catch(console.error);
  };

  const handleLocalNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    // Validation for Step 2
    if (localStep === 2) {
       if (data.privacy === 'private_password' && !data.password) {
           alert('Por favor ingresa una contraseña para el evento privado.');
           return;
       }
    }
    
    setLocalEventData(prev => ({ ...prev, ...data }));
    setLocalStep(prev => prev + 1);
  };

  const handleLocalFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setModalState({
      isOpen: true,
      status: 'loading',
      title: 'Creando evento local',
      message: 'Configurando evento y generando links de invitación...'
    });

    const formData = new FormData(e.target as HTMLFormElement);
    const finalStepData = Object.fromEntries(formData.entries());
    
    // Combine all data
    const allData = { ...localEventData, ...finalStepData };

    let templateData = {};
    if (selectedTemplateId) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
            templateData = {
                zones: JSON.parse(JSON.stringify(template.zones)),
                seats: JSON.parse(JSON.stringify(template.seats))
            };
        }
    }

    const categoriesList = ['LOCAL', 'CELEBRACION'];
    
    // Process guests to add tokens
    const processedGuests = guestList.map(g => ({
        ...g,
        token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
        quota: allData.guestsPerInviteMode === 'fixed' 
               ? Number(allData.guestsPerInvite || 1) 
               : (g.quota || 1)
    }));

    const data = {
      title: allData.title as string,
      description: allData.description as string,
      startDate: allData.startDate as string,
      endDate: allData.endDate as string,
      location: allData.location as string,
      categories: categoriesList,
      paymentInfo: 'Evento Gratuito / Reservas',
      status: EventStatus.DRAFT,
      privacy: allData.privacy as any,
      password: allData.password as string,
      guestsPerInviteMode: allData.guestsPerInviteMode as any,
      guestsPerInvite: Number(allData.guestsPerInvite || 1),
      reservationMode: allData.reservationMode as any,
      guestList: processedGuests,
      ...templateData
    };

    try {
      const newEvent = await api.createEvent(data);
      setEvents([...events, newEvent]);
      setSelectedEvent(newEvent);
      
      setView('details');
      setActiveTab('dashboard');
      
      setModalState({
        isOpen: true,
        status: 'success',
        title: '¡Evento Local Creado!',
        message: `El evento se ha creado correctamente. ${processedGuests.length > 0 ? `Se han generado ${processedGuests.length} links de invitación únicos.` : 'Ahora puedes gestionar tus invitados.'}`
      });

    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        status: 'error',
        title: 'Error',
        message: 'No se pudo crear el evento local. Inténtalo de nuevo.'
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedEvent) return;
    
    setModalState({
      isOpen: true,
      status: 'loading',
      title: 'Guardando cambios',
      message: 'Actualizando la información del evento...'
    });

    try {
      const updated = await api.updateEvent(selectedEvent.id, editForm);
      setSelectedEvent(updated);
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      setIsEditing(false);
      
      setModalState({
        isOpen: true,
        status: 'success',
        title: 'Cambios guardados',
        message: 'La información del evento ha sido actualizada.'
      });
    } catch (e) {
      console.error('Error updating event:', e);
      setModalState({
        isOpen: true,
        status: 'error',
        title: 'Error',
        message: 'No se pudieron guardar los cambios.'
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.')) return;
    
    setModalState({
      isOpen: true,
      status: 'loading',
      title: 'Eliminando evento',
      message: 'Por favor espera mientras eliminamos el evento...'
    });

    try {
      await api.deleteEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setView('list');
      }
      
      setModalState({
        isOpen: true,
        status: 'success',
        title: 'Evento eliminado',
        message: 'El evento ha sido eliminado correctamente.'
      });
    } catch (e) {
      console.error('Error deleting event:', e);
      setModalState({
        isOpen: true,
        status: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el evento.'
      });
    }
  };

  const handleCheckIn = () => {
    if (!checkInCode) return;
    alert(`Entrada validada: ${checkInCode}\nAsistente: Usuario Simulado\nEstado: ACCESO CONCEDIDO`);
    setCheckInCode('');
  };

  if (view === 'list') {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
            <p className="text-sm text-gray-500">Administra tus eventos, aforos y boletería</p>
          </div>
          <button
            onClick={() => setShowTypeModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Nuevo Evento
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center p-12">Cargando...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay eventos creados</h3>
              <p className="text-gray-500 mb-6">Comienza creando tu primer evento para gestionar el aforo.</p>
              <button
                onClick={() => setView('create')}
                className="text-indigo-600 font-medium hover:underline"
              >
                Crear Evento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <div 
                  key={event.id}
                  className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all relative hover:border-indigo-200"
                >
                  {/* Share Button & QR Popover */}
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQrFor(showQrFor === event.id ? null : event.id);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      title="Compartir evento"
                    >
                      <Share size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    {showQrFor === event.id && (
                      <div className="absolute top-10 right-0 bg-white p-4 rounded-xl shadow-xl border border-gray-100 w-64 animate-in fade-in zoom-in duration-200 z-20">
                         <div className="flex justify-between items-center mb-3">
                           <span className="text-sm font-bold text-gray-900">Compra de Boletas</span>
                           <button onClick={(e) => { e.stopPropagation(); setShowQrFor(null); }} className="text-gray-400 hover:text-gray-600">
                             <X size={14} />
                           </button>
                         </div>
                         <div className="bg-white p-2 rounded-lg border border-gray-100 flex justify-center mb-3">
                           <QRCodeSVG value={`http://localhost:3000/events/${event.id}/public`} size={150} />
                         </div>
                         <p className="text-xs text-center text-gray-500 mb-3">Escanea para acceder al flujo de compra</p>
                         <div className="flex items-center gap-2 bg-gray-50 p-2 rounded text-xs text-gray-600 break-all">
                           <span className="truncate flex-1">{`http://localhost:3000/events/${event.id}/public`}</span>
                         </div>
                      </div>
                    )}
                  </div>

                  <div 
                    className="cursor-pointer"
                    onClick={async () => { 
                      setSelectedEvent(event); 
                      setView('details');
                      try {
                        const fullEvent = await api.getEvent(event.id);
                        setSelectedEvent(fullEvent);
                      } catch (e) {
                        console.error('Error fetching event details:', e);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4 pr-12">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Calendar size={24} />
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        event.status === EventStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Ticket size={14} />
                        {event.seats?.length || 0} Sillas
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <ProcessingModal 
          isOpen={modalState.isOpen}
          status={modalState.status}
          message={modalState.message}
          title={modalState.title}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        />

        <EventTypeSelectionModal 
            isOpen={showTypeModal}
            onClose={() => setShowTypeModal(false)}
            onSelect={(type) => {
                setShowTypeModal(false);
                if (type === 'macro') setView('create');
                if (type === 'local') {
                    setLocalStep(1);
                    setLocalEventData({});
                    setGuestsPerInviteMode('fixed');
                    setGuestList([]);
                    setView('create-local');
                }
            }}
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="h-full flex flex-col bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto w-full">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"
          >
            <ChevronLeft size={18} />
            Volver a eventos
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nuevo Evento</h2>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              
              {templates.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                    <Layout size={18} />
                    Plantilla de Escenario
                  </h3>
                  <p className="text-sm text-indigo-700 mb-3">
                    Puedes comenzar con un escenario vacío o usar una plantilla guardada.
                  </p>
                  <select 
                    className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">Escenario Vacío (Crear desde cero)</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título del Evento</label>
                <input required name="title" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Concierto de Verano" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea name="description" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Detalles del evento..." />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                  <input required name="startDate" type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input required name="endDate" type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input required name="location" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Estadio Principal" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorías</label>
                <input name="categories" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Concierto, Rock, Aire Libre (separadas por coma)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Información de Pagos / Boletería</label>
                <textarea name="paymentInfo" rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Detalles sobre precios, cuentas bancarias o métodos de pago..." />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  Continuar a Escenario
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <ProcessingModal 
          isOpen={modalState.isOpen}
          status={modalState.status}
          message={modalState.message}
          title={modalState.title}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  if (view === 'create-local') {
    return (
      <div className="h-full flex flex-col bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto w-full">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"
          >
            <ChevronLeft size={18} />
            Volver a eventos
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Progress Bar */}
            <div className="bg-gray-50 px-8 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Gift className="text-pink-500" />
                    <span className="font-bold text-gray-900">Nuevo Evento Local</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded ${localStep >= 1 ? 'bg-pink-100 text-pink-700 font-bold' : 'text-gray-400'}`}>1. Info</span>
                    <span className="text-gray-300">→</span>
                    <span className={`px-2 py-1 rounded ${localStep >= 2 ? 'bg-pink-100 text-pink-700 font-bold' : 'text-gray-400'}`}>2. Configuración</span>
                    <span className="text-gray-300">→</span>
                    <span className={`px-2 py-1 rounded ${localStep >= 3 ? 'bg-pink-100 text-pink-700 font-bold' : 'text-gray-400'}`}>3. Invitados</span>
                </div>
            </div>

            <div className="p-8">
                {localStep === 1 && (
                    <form onSubmit={handleLocalNextStep} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Celebración</label>
                            <input required defaultValue={localEventData.title} name="title" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="Ej: Cumpleaños de Juan" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Mensaje para invitados</label>
                            <textarea defaultValue={localEventData.description} name="description" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="¡Ven a celebrar conmigo!..." />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
                                <input required defaultValue={localEventData.startDate} name="startDate" type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                                <input required defaultValue={localEventData.endDate} name="endDate" type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                            <input required defaultValue={localEventData.location} name="location" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="Ej: Casa de Juan / Salón Social" />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">
                                Continuar
                            </button>
                        </div>
                    </form>
                )}

                {localStep === 2 && (
                    <form onSubmit={handleLocalNextStep} className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Configuración de Privacidad */}
                             <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Settings size={18} className="text-pink-500" />
                                    Privacidad y Acceso
                                </h3>
                                
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-pink-50 transition-colors">
                                        <input type="radio" name="privacy" value="public" defaultChecked={localEventData.privacy === 'public'} className="mt-1 text-pink-600 focus:ring-pink-500" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Público</span>
                                            <span className="text-sm text-gray-500">Visible en búsquedas, cualquiera puede ver.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-pink-50 transition-colors">
                                        <input type="radio" name="privacy" value="private_link" defaultChecked={!localEventData.privacy || localEventData.privacy === 'private_link'} className="mt-1 text-pink-600 focus:ring-pink-500" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Privado (Solo Link)</span>
                                            <span className="text-sm text-gray-500">Solo accesible para quienes tengan el link.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-pink-50 transition-colors">
                                        <input type="radio" name="privacy" value="private_password" defaultChecked={localEventData.privacy === 'private_password'} className="mt-1 text-pink-600 focus:ring-pink-500" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Privado con Contraseña</span>
                                            <span className="text-sm text-gray-500">Requiere clave para acceder.</span>
                                        </div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (Opcional)</label>
                                    <input name="password" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" placeholder="Ej: FIESTA2025" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">Cupos por Invitación</label>
                                    <div className="flex gap-4 mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="guestsPerInviteMode" 
                                                value="fixed" 
                                                checked={guestsPerInviteMode === 'fixed'}
                                                onChange={() => setGuestsPerInviteMode('fixed')}
                                                className="text-pink-600 focus:ring-pink-500" 
                                            />
                                            <span className="text-sm text-gray-700">Fijo (Igual para todos)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="guestsPerInviteMode" 
                                                value="variable" 
                                                checked={guestsPerInviteMode === 'variable'}
                                                onChange={() => setGuestsPerInviteMode('variable')}
                                                className="text-pink-600 focus:ring-pink-500" 
                                            />
                                            <span className="text-sm text-gray-700">Variable (Por invitado)</span>
                                        </label>
                                    </div>
                                    
                                    {guestsPerInviteMode === 'fixed' ? (
                                        <div>
                                            <input name="guestsPerInvite" type="number" min="1" defaultValue="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" />
                                            <p className="text-xs text-gray-500 mt-1">Cuántas personas pueden entrar con una sola invitación.</p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-pink-50 text-pink-700 rounded-lg text-sm border border-pink-100">
                                            Se tomará el valor de la columna <strong>Cupos</strong> en tu archivo de invitados.
                                            <input type="hidden" name="guestsPerInvite" value="1" /> {/* Fallback */}
                                        </div>
                                    )}
                                </div>
                             </div>

                             {/* Selección de Plantilla Visual */}
                             <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Layout size={18} className="text-pink-500" />
                                    Estilo de la Invitación
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="cursor-pointer group">
                                        <input type="radio" name="templateStyle" value="card-1" defaultChecked className="hidden peer" />
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden peer-checked:border-pink-500 transition-all">
                                            <div className="h-24 bg-gradient-to-r from-pink-500 to-purple-500 p-4 flex items-center justify-center text-white font-serif italic text-2xl">
                                                Mis 15 Años
                                            </div>
                                            <div className="p-3 bg-white">
                                                <span className="font-bold text-gray-900 block mb-1">Elegante & Formal</span>
                                                <span className="text-xs text-gray-500">Perfecto para bodas, 15 años y galas.</span>
                                            </div>
                                        </div>
                                    </label>

                                    <label className="cursor-pointer group">
                                        <input type="radio" name="templateStyle" value="card-2" className="hidden peer" />
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden peer-checked:border-pink-500 transition-all">
                                            <div className="h-24 bg-gradient-to-r from-yellow-400 to-orange-500 p-4 flex items-center justify-center text-white font-bold text-2xl tracking-tighter transform -rotate-2">
                                                ¡FIESTA!
                                            </div>
                                            <div className="p-3 bg-white">
                                                <span className="font-bold text-gray-900 block mb-1">Divertido & Festivo</span>
                                                <span className="text-xs text-gray-500">Ideal para cumpleaños, asados y reuniones.</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                             </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                            <button type="button" onClick={() => setLocalStep(1)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Atrás</button>
                            <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium">
                                Continuar
                            </button>
                        </div>
                    </form>
                )}

                {localStep === 3 && (
                    <form onSubmit={handleLocalFinalSubmit} className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                         {/* Guest List Management */}
                        <div className="bg-pink-50 border border-pink-100 rounded-lg p-6">
                            <h3 className="font-bold text-pink-900 mb-4 flex items-center gap-2">
                                <Users size={20} />
                                Lista de Invitados y Reservas
                            </h3>
                            <p className="text-sm text-pink-700 mb-4">
                                Gestiona tu lista de invitados. Puedes subirlos masivamente o agregarlos uno a uno.
                            </p>
                            
                            {/* Tabs */}
                            <div className="flex gap-2 mb-6 border-b border-pink-200">
                                <button 
                                    type="button"
                                    onClick={() => setActiveGuestTab('csv')}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeGuestTab === 'csv' ? 'bg-white text-pink-600 border-t border-x border-pink-200' : 'text-gray-500 hover:text-pink-600'}`}
                                >
                                    Carga Masiva (CSV/Excel)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setActiveGuestTab('manual')}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeGuestTab === 'manual' ? 'bg-white text-pink-600 border-t border-x border-pink-200' : 'text-gray-500 hover:text-pink-600'}`}
                                >
                                    Entrada Manual
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-b-lg rounded-tr-lg border border-pink-200 -mt-[1px]">
                                {activeGuestTab === 'csv' ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium text-gray-900">Subir Archivo</h4>
                                            <button 
                                                type="button" 
                                                onClick={downloadTemplate}
                                                className="text-sm text-pink-600 hover:underline flex items-center gap-1"
                                            >
                                                <FileSpreadsheet size={16} />
                                                Descargar Plantilla
                                            </button>
                                        </div>
                                        
                                        <label className="border-2 border-dashed border-pink-200 rounded-lg p-8 text-center bg-gray-50 hover:bg-pink-50/50 transition-colors cursor-pointer group block">
                                            <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-pink-200 transition-colors">
                                                <Upload size={24} className="text-pink-500" />
                                            </div>
                                            <p className="font-medium text-gray-900">Click para seleccionar archivo</p>
                                            <p className="text-sm text-gray-500 mt-1">Soporta CSV, TXT</p>
                                            <input type="file" className="hidden" accept=".csv,.txt" onChange={(e) => {
                                                 if (e.target.files?.[0]) {
                                                     const file = e.target.files[0];
                                                     const reader = new FileReader();
                                                     reader.onload = (event) => {
                                                        const content = event.target?.result as string;
                                                        const parsed = parseGuestListCSV(content);
                                                        setGuestList(prev => [...prev, ...parsed]);
                                                     };
                                                     reader.readAsText(file);
                                                 }
                                            }} />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-900">Agregar Invitado</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input 
                                                type="text" 
                                                placeholder="Nombre Completo" 
                                                value={manualGuest.name || ''}
                                                onChange={e => setManualGuest(prev => ({ ...prev, name: e.target.value }))}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Teléfono (Opcional)" 
                                                value={manualGuest.phoneNumber || ''}
                                                onChange={e => setManualGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Cupos" 
                                                min="1"
                                                value={manualGuest.quota || ''}
                                                onChange={e => setManualGuest(prev => ({ ...prev, quota: parseInt(e.target.value) }))}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleManualAddGuest}
                                                disabled={!manualGuest.name}
                                                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Agregar a la Lista
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Guest List Display */}
                            {guestList.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-gray-900">Invitados ({guestList.length})</h4>
                                        <button 
                                            type="button"
                                            onClick={() => setGuestList([])}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            Limpiar Lista
                                        </button>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                                <tr>
                                                    <th className="px-4 py-2">Nombre</th>
                                                    <th className="px-4 py-2">Teléfono</th>
                                                    <th className="px-4 py-2 text-center">Cupos</th>
                                                    <th className="px-4 py-2">Estado</th>
                                                    <th className="px-4 py-2 text-center">Accesos</th>
                                                    <th className="px-4 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {guestList.map((guest, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2">
                                                            <div className="font-medium text-gray-900">{guest.name}</div>
                                                            {guest.additionalData && Object.keys(guest.additionalData).length > 0 && (
                                                                <div className="text-xs text-gray-400">
                                                                    +{Object.keys(guest.additionalData).length} datos extra
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-500">{guest.phoneNumber || '-'}</td>
                                                        <td className="px-4 py-2 text-center">{guest.quota}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${guest.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                {guest.status === 'pending' ? 'Pendiente' : guest.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-xs text-gray-500">
                                                            {guest.linkAccessCount || 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setGuestList(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-pink-100">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Modo de Reserva</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="cursor-pointer">
                                        <input type="radio" name="reservationMode" value="predetermined" defaultChecked className="hidden peer" />
                                        <div className="p-4 border rounded-xl hover:bg-gray-50 peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all text-center h-full">
                                            <div className="font-bold text-gray-900 mb-1">Predeterminada</div>
                                            <p className="text-xs text-gray-500">Asigna cupos fijos según la lista subida.</p>
                                        </div>
                                    </label>
                                    <label className="cursor-pointer">
                                        <input type="radio" name="reservationMode" value="random" className="hidden peer" />
                                        <div className="p-4 border rounded-xl hover:bg-gray-50 peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all text-center h-full">
                                            <div className="font-bold text-gray-900 mb-1">Aleatoria</div>
                                            <p className="text-xs text-gray-500">El sistema distribuye mesas automáticamente.</p>
                                        </div>
                                    </label>
                                    <label className="cursor-pointer">
                                        <input type="radio" name="reservationMode" value="manual" className="hidden peer" />
                                        <div className="p-4 border rounded-xl hover:bg-gray-50 peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all text-center h-full">
                                            <div className="font-bold text-gray-900 mb-1">Manual</div>
                                            <p className="text-xs text-gray-500">Confirmas cada reserva manualmente.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                            <button type="button" onClick={() => setLocalStep(2)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Atrás</button>
                            <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-lg shadow-pink-200 transform hover:scale-105 transition-all">
                                Crear Evento y Generar Links
                            </button>
                        </div>
                    </form>
                )}
            </div>
          </div>
        </div>
        
        <ProcessingModal 
          isOpen={modalState.isOpen}
          status={modalState.status}
          message={modalState.message}
          title={modalState.title}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setView('list'); setIsEditing(false); }}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{selectedEvent?.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={14} /> {selectedEvent?.startDate ? new Date(selectedEvent.startDate).toLocaleDateString() : ''}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {selectedEvent?.location}</span>
            </div>
          </div>
        </div>
        
        {activeTab === 'info' && (
          <div className="flex items-center gap-2">
             {!isEditing ? (
               <button 
                 onClick={() => {
                   if (selectedEvent) {
                     setEditForm(selectedEvent);
                     setIsEditing(true);
                   }
                 }}
                 className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg"
               >
                 Editar Info
               </button>
             ) : (
               <button 
                 onClick={() => setIsEditing(false)}
                 className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
               >
                 Cancelar
               </button>
             )}
             
             {isEditing && (
               <button 
                 onClick={handleSaveChanges}
                 className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
               >
                 Guardar Cambios
               </button>
             )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {selectedEvent?.categories?.includes('LOCAL') || selectedEvent?.categories?.includes('CELEBRACION') ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Home size={16} />
                  Resumen
                </div>
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Invitados
                </div>
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} />
                  Configuración
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} />
                  Detalles
                </div>
              </button>
              <button
                onClick={() => setActiveTab('seats')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'seats' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Layout size={16} />
                  Escenario y Sillas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('control')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'control' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Play size={16} />
                  Control en Vivo
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sales' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Ticket size={16} />
                  Detalles de Ventas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('raffle')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'raffle' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Gift size={16} />
                  Sorteo
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === 'seats' && selectedEvent && (
          <SeatDesigner 
            event={selectedEvent} 
            onSaveStart={() => {
              setModalState({
                isOpen: true,
                status: 'loading',
                title: 'Guardando diseño',
                message: 'Actualizando la distribución de zonas y sillas...'
              });
            }}
            onUpdate={(updated) => {
             // Update local state to reflect changes immediately
             setSelectedEvent(updated);
             // Also update in list
             setEvents(events.map(e => e.id === updated.id ? updated : e));
             
             // Show success modal
             setModalState({
                isOpen: true,
                status: 'success',
                title: 'Diseño guardado',
                message: 'La configuración de aforo y sillas se ha guardado correctamente.'
             });
          }} />
        )}
        {activeTab === 'sales' && selectedEvent && (
          <SalesDetails eventId={selectedEvent.id} />
        )}
        {activeTab === 'raffle' && selectedEvent && (
          <RaffleSystem eventId={selectedEvent.id} />
        )}
        {activeTab === 'info' && (
          <div className="p-8 max-w-3xl mx-auto space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h3 className="text-lg font-semibold mb-4">Información General</h3>
               
               {isEditing ? (
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                     <input 
                       type="text" 
                       value={editForm.title || ''} 
                       onChange={e => setEditForm({...editForm, title: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                     <textarea 
                       rows={3}
                       value={editForm.description || ''} 
                       onChange={e => setEditForm({...editForm, description: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                       <input 
                         type="text"
                         value={editForm.location || ''} 
                         onChange={e => setEditForm({...editForm, location: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                       <select 
                         value={editForm.status} 
                         onChange={e => setEditForm({...editForm, status: e.target.value as EventStatus})}
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                       >
                         <option value={EventStatus.DRAFT}>Borrador</option>
                         <option value={EventStatus.PUBLISHED}>Publicado</option>
                        <option value={EventStatus.ENDED}>Finalizado</option>
                        <option value={EventStatus.CANCELLED}>Cancelado</option>
                      </select>
                     </div>
                   </div>

                   {(selectedEvent?.categories?.includes('LOCAL') || selectedEvent?.categories?.includes('CELEBRACION')) && (
                      <div className="bg-pink-50 p-4 rounded-lg space-y-4 border border-pink-100">
                          <h4 className="font-medium text-pink-900 flex items-center gap-2">
                              <Gift size={16} /> Configuración de Celebración
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Privacidad</label>
                                  <select 
                                      value={editForm.privacy || 'private_link'} 
                                      onChange={e => setEditForm({...editForm, privacy: e.target.value as any})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                  >
                                      <option value="public">Público</option>
                                      <option value="private_link">Privado (Solo Link)</option>
                                      <option value="private_password">Privado con Contraseña</option>
                                  </select>
                              </div>
                              
                              {editForm.privacy === 'private_password' && (
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                      <input 
                                          type="text"
                                          value={editForm.password || ''} 
                                          onChange={e => setEditForm({...editForm, password: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                          placeholder="Contraseña de acceso"
                                      />
                                  </div>
                              )}

                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Reserva</label>
                                  <select 
                                      value={editForm.reservationMode || 'predetermined'} 
                                      onChange={e => setEditForm({...editForm, reservationMode: e.target.value as any})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                  >
                                      <option value="predetermined">Predeterminada (Lista)</option>
                                      <option value="random">Aleatoria</option>
                                      <option value="manual">Manual</option>
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Cupos por Invitación</label>
                                  <input 
                                      type="number"
                                      min="1"
                                      value={editForm.guestsPerInvite || 1} 
                                      onChange={e => setEditForm({...editForm, guestsPerInvite: parseInt(e.target.value)})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                  />
                              </div>
                          </div>
                      </div>
                   )}

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Categorías (separadas por coma)</label>
                     <input 
                       type="text"
                       value={editForm.categories?.join(', ') || ''} 
                       onChange={e => setEditForm({...editForm, categories: e.target.value.split(',').map(c => c.trim())})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Información de Pagos / Boletería</label>
                     <textarea 
                       rows={4}
                       value={editForm.paymentInfo || ''} 
                       onChange={e => setEditForm({...editForm, paymentInfo: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                     />
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-gray-500">Descripción</label>
                     <p className="text-gray-900 mt-1">{selectedEvent?.description || 'Sin descripción'}</p>
                   </div>
                   
                   <div>
                     <label className="text-sm font-medium text-gray-500">Categorías</label>
                     <div className="flex gap-2 mt-1 flex-wrap">
                       {selectedEvent?.categories?.length ? selectedEvent.categories.map((cat, i) => (
                         <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{cat}</span>
                       )) : <span className="text-gray-400 text-sm">Sin categorías</span>}
                     </div>
                   </div>

                   {(selectedEvent?.categories?.includes('LOCAL') || selectedEvent?.categories?.includes('CELEBRACION')) && (
                      <div className="bg-pink-50 p-4 rounded-lg space-y-2 border border-pink-100">
                          <h4 className="font-medium text-pink-900 text-sm flex items-center gap-2">
                              <Gift size={14} /> Detalles de Celebración
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                  <span className="text-gray-500 block">Privacidad</span>
                                  <span className="font-medium text-gray-900">
                                      {selectedEvent.privacy === 'public' ? 'Público' : 
                                       selectedEvent.privacy === 'private_password' ? 'Privado con clave' : 'Privado (Link)'}
                                  </span>
                              </div>
                              <div>
                                  <span className="text-gray-500 block">Reserva</span>
                                  <span className="font-medium text-gray-900">
                                      {selectedEvent.reservationMode === 'random' ? 'Aleatoria' : 
                                       selectedEvent.reservationMode === 'manual' ? 'Manual' : 'Predeterminada'}
                                  </span>
                              </div>
                              <div>
                                  <span className="text-gray-500 block">Cupos/Invitación</span>
                                  <span className="font-medium text-gray-900">{selectedEvent.guestsPerInvite || 1}</span>
                              </div>
                          </div>
                      </div>
                   )}

                   <div>
                     <label className="text-sm font-medium text-gray-500">Información de Pagos / Boletería</label>
                     <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedEvent?.paymentInfo || 'No configurada'}</p>
                   </div>
           </div>
        )}
             </div>
          </div>
        )}
        
        {activeTab === 'dashboard' && selectedEvent && (
          <div className="p-8 max-w-6xl mx-auto space-y-6 h-full overflow-y-auto">
            {/* Dashboard Content */}
            {(() => {
               const guests = selectedEvent.guestList || [];
               const totalGuests = guests.length;
               const confirmedGuests = guests.filter(g => g.status === 'confirmed');
               const declinedGuests = guests.filter(g => g.status === 'declined');
               const pendingGuests = guests.filter(g => !g.status || g.status === 'pending');
               const viewedGuests = guests.filter(g => (g.linkAccessCount || 0) > 0);
               
               const totalQuota = guests.reduce((acc, g) => acc + (g.quota || 1), 0);
               const confirmedQuota = confirmedGuests.reduce((acc, g) => acc + (g.quota || 1), 0);
               
               const recentActivity = [...guests]
                 .filter(g => g.updatedAt)
                 .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
                 .slice(0, 5);

               return (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Invitados</h3>
                              <Users className="text-indigo-500" size={20} />
                           </div>
                           <div className="text-2xl font-bold text-gray-900">{totalGuests}</div>
                           <div className="text-xs text-gray-500 mt-1">
                              {viewedGuests.length} han visto la invitación ({totalGuests > 0 ? Math.round((viewedGuests.length / totalGuests) * 100) : 0}%)
                           </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Confirmados</h3>
                              <CheckCircle className="text-green-500" size={20} />
                           </div>
                           <div className="text-2xl font-bold text-green-600">{confirmedGuests.length}</div>
                           <div className="text-xs text-gray-500 mt-1">
                              {confirmedQuota} cupos ocupados
                           </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pendientes</h3>
                              <Clock className="text-yellow-500" size={20} />
                           </div>
                           <div className="text-2xl font-bold text-yellow-600">{pendingGuests.length}</div>
                           <div className="text-xs text-gray-500 mt-1">
                              Esperando respuesta
                           </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                           <div className="flex justify-between items-start mb-2">
                              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Rechazados</h3>
                              <X className="text-red-500" size={20} />
                           </div>
                           <div className="text-2xl font-bold text-red-600">{declinedGuests.length}</div>
                           <div className="text-xs text-gray-500 mt-1">
                              No asistirán
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                           <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <PieChart size={18} className="text-gray-400" />
                              Ocupación del Evento
                           </h3>
                           <div className="space-y-6">
                              <div>
                                 <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Cupos Confirmados</span>
                                    <span className="font-bold text-gray-900">{confirmedQuota} / {totalQuota}</span>
                                 </div>
                                 <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                       className="h-full bg-green-500 rounded-full transition-all duration-500"
                                       style={{ width: `${totalQuota > 0 ? (confirmedQuota / totalQuota) * 100 : 0}%` }}
                                    />
                                 </div>
                              </div>
                              <div>
                                 <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Tasa de Respuesta</span>
                                    <span className="font-bold text-gray-900">
                                       {totalGuests > 0 ? Math.round(((confirmedGuests.length + declinedGuests.length) / totalGuests) * 100) : 0}%
                                    </span>
                                 </div>
                                 <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                       className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                       style={{ width: `${totalGuests > 0 ? ((confirmedGuests.length + declinedGuests.length) / totalGuests) * 100 : 0}%` }}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                           <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <Activity size={18} className="text-gray-400" />
                              Actividad Reciente
                           </h3>
                           <div className="flex-1 overflow-y-auto pr-2 max-h-60">
                              {recentActivity.length > 0 ? (
                                 <div className="space-y-4">
                                    {recentActivity.map((guest, idx) => (
                                       <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                             <div className={`w-2 h-2 rounded-full ${
                                                guest.status === 'confirmed' ? 'bg-green-500' : 
                                                guest.status === 'declined' ? 'bg-red-500' : 'bg-gray-300'
                                             }`} />
                                             <div>
                                                <div className="font-medium text-sm text-gray-900">{guest.name}</div>
                                                <div className="text-xs text-gray-500">
                                                   {guest.updatedAt ? new Date(guest.updatedAt).toLocaleDateString() + ' ' + new Date(guest.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Reciente'}
                                                </div>
                                             </div>
                                          </div>
                                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                             guest.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                             guest.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                                          }`}>
                                             {guest.status === 'confirmed' ? 'Confirmado' : guest.status === 'declined' ? 'Rechazado' : 'Pendiente'}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              ) : (
                                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm py-8">
                                    <Clock size={24} className="mb-2 opacity-20" />
                                    No hay actividad reciente
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })()}

            {/* Share Link Section */}
             <div className="p-0 rounded-xl shadow-sm ">
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3 items-center justify-between">
                   <div className="flex gap-3 items-start">
                      <div className="p-2 bg-white rounded-full text-indigo-600 shadow-sm h-fit">
                         <Sparkles size={16} />
                      </div>
                      <div>
                         <h4 className="font-bold text-indigo-900 text-sm mb-1">Tip Pro</h4>
                         <p className="text-sm text-indigo-700">
                            Los enlaces personalizados precargan los datos del invitado y ofrecen una experiencia VIP. ¡Úsalos para aumentar la tasa de confirmación!
                         </p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsShareModalOpen(true)}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap shadow-sm"
                   >
                      <Share size={18} /> Copiar Link Invitación
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'guests' && selectedEvent && (
           <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-900">Gestión de Invitados</h2>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveGuestTab(activeGuestTab === 'manual' ? null : 'manual')}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeGuestTab === 'manual' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      {activeGuestTab === 'manual' ? <X size={18} /> : <Plus size={18} />}
                      {activeGuestTab === 'manual' ? 'Cerrar Formulario' : 'Nuevo Invitado'}
                    </button>
                    <button 
                      onClick={() => setActiveGuestTab(activeGuestTab === 'csv' ? null : 'csv')}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeGuestTab === 'csv' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {activeGuestTab === 'csv' ? <X size={18} /> : <FileSpreadsheet size={18} />}
                      {activeGuestTab === 'csv' ? 'Cerrar Carga' : 'Importar CSV'}
                    </button>
                 </div>
              </div>
              
              {activeGuestTab === 'manual' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in slide-in-from-top-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Agregar Invitado Manualmente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={manualGuest.name || ''}
                        onChange={e => setManualGuest(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input 
                        type="tel" 
                        value={manualGuest.phoneNumber || ''}
                        onChange={e => setManualGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="+57 300..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cupos</label>
                      <input 
                        type="number" 
                        min="1"
                        value={manualGuest.quota || 1}
                        onChange={e => setManualGuest(prev => ({ ...prev, quota: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button 
                      onClick={handleAddGuestToEvent}
                      disabled={!manualGuest.name}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {activeGuestTab === 'csv' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Carga Masiva de Invitados</h3>
                            <p className="text-sm text-gray-500">Sube un archivo CSV con la lista de tus invitados.</p>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-2 bg-indigo-50 rounded-lg transition-colors"
                        >
                            <FileSpreadsheet size={16} />
                            Descargar Plantilla
                        </button>
                    </div>

                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-gray-50 group">
                        <Upload className="mx-auto h-10 w-10 text-gray-400 group-hover:text-indigo-500 transition-colors mb-3" />
                        <p className="text-sm text-gray-600 mb-2 font-medium">Arrastra tu archivo aquí o haz clic para buscar</p>
                        <p className="text-xs text-gray-400 mb-4">Soporta archivos .csv, .xls, .xlsx</p>
                        <input 
                            type="file" 
                            accept=".csv,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        const content = event.target?.result as string;
                                        const parsed = parseGuestListCSV(content);
                                        // Process guests to add tokens
                                        const processedGuests = parsed.map(g => ({
                                            ...g,
                                            token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                                            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(),
                                        }));

                                        const updatedEvent = {
                                            ...selectedEvent,
                                            guestList: [...(selectedEvent.guestList || []), ...processedGuests]
                                        };
                                        
                                        setSelectedEvent(updatedEvent);
                                        setEvents(events.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
                                        
                                        // Auto-save to API
                                        api.updateEvent(updatedEvent.id, { guestList: updatedEvent.guestList }).catch(console.error);
                                        
                                        alert(`Se han importado ${processedGuests.length} invitados correctamente.`);
                                    };
                                    reader.readAsText(file);
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm group-hover:border-indigo-500 group-hover:text-indigo-600 transition-all">
                            Seleccionar Archivo
                        </button>
                    </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                 <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse">
                       <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Invitado</th>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Cupos</th>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Visualizaciones</th>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Info</th>
                             <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {(!selectedEvent.guestList || selectedEvent.guestList.length === 0) && (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-gray-500">
                                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium text-gray-900 mb-1">No hay invitados registrados</p>
                                <p className="text-sm text-gray-500">Comienza agregando invitados manualmente o importa una lista CSV.</p>
                              </td>
                            </tr>
                          )}
                          {selectedEvent.guestList?.map((guest, idx) => (
                             <tr 
                               key={idx} 
                               className="hover:bg-gray-50 cursor-pointer transition-colors"
                               onClick={() => {
                                  setSelectedGuest(guest);
                                  setIsGuestModalOpen(true);
                               }}
                             >
                                <td className="p-4">
                                   <div className="font-medium text-gray-900">{guest.name}</div>
                                   <div className="text-xs text-gray-500">{guest.phoneNumber}</div>
                                </td>
                                <td className="p-4">
                                   <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      guest.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      guest.status === 'declined' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                   }`}>
                                      {guest.status === 'confirmed' ? 'Confirmado' : 
                                       guest.status === 'declined' ? 'Rechazado' : 'Pendiente'}
                                   </span>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{guest.quota}</td>
                                <td className="p-4 text-sm text-gray-600">{guest.linkAccessCount || 0}</td>
                                <td className="p-4">
                                   {guest.infoFilled ? (
                                      <CheckCircle size={16} className="text-green-500" />
                                   ) : (
                                      <span className="text-gray-300">-</span>
                                   )}
                                </td>
                                <td className="p-1">
                                   <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          const link = `${window.location.origin}/events/${selectedEvent.id}/rsvp?token=${guest.token}`;
                                          navigator.clipboard.writeText(link);
                                          alert('Link copiado al portapapeles');
                                       }}
                                       className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                       title="Copiar Link de Invitación"
                                     >
                                        <Link size={14} />
                                        Copiar Link
                                     </button>


                                    <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          const newGuestList = selectedEvent.guestList?.filter((_, i) => i !== idx);
                                        const updated = { ...selectedEvent, guestList: newGuestList };
                                        setSelectedEvent(updated);
                                        setEvents(events.map(e => e.id === updated.id ? updated : e));
                                        api.updateEvent(updated.id, { guestList: newGuestList }).catch(console.error);
                                     }}
                                       className="inline-flex m-2 items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                       title="Copiar Link de Invitación"
                                     >
                                        <Trash2 size={16} />
                                        Quitar invitación
                                     </button>
                                </td>
                                
                             </tr>
                          ))}
                          {(!selectedEvent.guestList || selectedEvent.guestList.length === 0) && (
                             <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                   No hay invitados registrados.
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}
        {activeTab === 'control' && (
           <div className="h-full flex flex-col p-6 max-w-4xl mx-auto w-full">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
               {/* Scanner Section */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 flex-shrink-0">
                   <Ticket size={20} />
                   Control de Acceso
                 </h3>
                 
                 <div className="w-full flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-6 p-6 flex-shrink-0">
                   <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-sm mb-4 flex items-center justify-center">
                     <Search size={32} className="text-gray-300" />
                   </div>
                   <p className="text-sm text-gray-500 text-center mb-4">Escanea el código QR del asistente o ingresa el código manual</p>
                   
                   <div className="flex w-full gap-2">
                     <input 
                       type="text" 
                       value={checkInCode}
                       onChange={(e) => setCheckInCode(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                       placeholder="Código de ticket (ej: T-123)" 
                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                     />
                     <button 
                       onClick={handleCheckIn}
                       className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                     >
                       Validar
                     </button>
                   </div>
                 </div>

                 <div className="space-y-2 flex-1 flex flex-col min-h-0">
                   <h4 className="font-medium text-sm text-gray-700 flex-shrink-0">Últimas Ventas</h4>
                   <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                   {liveStats?.recentSales?.length ? (
                     liveStats.recentSales.map(sale => (
                       <div key={sale.id} className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{sale.customerName}</span>
                            <span className="text-xs opacity-75">
                              {sale.seat 
                                ? `Fila ${sale.seat.rowLabel} - Silla ${sale.seat.colLabel}`
                                : `Zona: ${liveStats.revenueByZone.find(z => z.id === sale.zoneId)?.name || 'General'}`
                              }
                            </span>
                          </div>
                          <span className="text-xs font-bold">{new Date(sale.purchaseDate).toLocaleTimeString()}</span>
                        </div>
                     ))
                   ) : (
                     <div className="text-center py-4 text-gray-400 text-sm italic">
                       No hay ventas recientes
                     </div>
                   )}
                   </div>
                 </div>
               </div>

               {/* Stats Section */}
               <div className="flex flex-col gap-6 h-full overflow-hidden">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-shrink-0">
                   <h3 className="text-lg font-bold text-gray-900 mb-4">Estadísticas en Vivo</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-indigo-50 rounded-xl">
                       <div className="text-2xl font-bold text-indigo-600">{liveStats?.ticketsSold || 0}</div>
                       <div className="text-xs text-indigo-700 font-medium">Boletas Vendidas</div>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-xl">
                       <div className="text-2xl font-bold text-gray-600">
                         {liveStats && liveStats.revenueByZone.reduce((acc, z) => acc + z.capacity, 0) > 0 
                           ? Math.round((liveStats.ticketsSold / liveStats.revenueByZone.reduce((acc, z) => acc + z.capacity, 0)) * 100) 
                           : 0}%
                       </div>
                       <div className="text-xs text-gray-500 font-medium">Ocupación Actual</div>
                     </div>
                     <div className="p-4 bg-green-50 rounded-xl">
                       <div className="text-2xl font-bold text-green-600">
                         ${(liveStats?.totalRevenue || 0).toLocaleString()}
                       </div>
                       <div className="text-xs text-green-700 font-medium">Ventas Totales</div>
                     </div>
                     <div className="p-4 bg-yellow-50 rounded-xl">
                       <div className="text-2xl font-bold text-yellow-600">
                         {liveStats?.revenueByZone.length || 0}
                       </div>
                       <div className="text-xs text-yellow-700 font-medium">Zonas Activas</div>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
                   <h3 className="text-lg font-bold text-gray-900 mb-4 flex-shrink-0">Estado de Zonas</h3>
                   <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                     {liveStats?.revenueByZone.map(zone => {
                       const percentage = zone.capacity > 0 ? (zone.count / zone.capacity) * 100 : 0;
                       const originalZone = selectedEvent?.zones.find(z => z.id === zone.id);
                       return (
                         <div key={zone.id}>
                           <div className="flex justify-between text-sm mb-1">
                             <span className="font-medium text-gray-700">{zone.name}</span>
                             <span className="text-gray-500">{zone.count}/{zone.capacity}</span>
                           </div>
                           <div className="w-full bg-gray-100 rounded-full h-2">
                             <div 
                               className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                               style={{ width: `${percentage}%`, backgroundColor: originalZone?.color || '#4f46e5' }}
                             ></div>
                           </div>
                         </div>
                       );
                     })}
                     {!liveStats && <div className="text-center text-gray-400 py-4">Cargando estadísticas...</div>}
                   </div>
                 </div>
               </div>
             </div>
           </div>
        )}
      </div>
      
      <ShareEventModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        event={selectedEvent}
      />
      
      <GuestDetailModal 
        isOpen={isGuestModalOpen}
        guest={selectedGuest}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={async (updatedGuest) => {
           if (updatedGuest.id) {
             try {
               const res = await api.updateGuest(updatedGuest.id, updatedGuest);
               if (res) {
                 // Update local state
                 const newGuestList = selectedEvent?.guestList?.map(g => 
                   g.id === updatedGuest.id ? { ...g, ...updatedGuest } : g
                 );
                 if (selectedEvent && newGuestList) {
                   const updatedEvent = { ...selectedEvent, guestList: newGuestList };
                   setSelectedEvent(updatedEvent);
                   setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
                 }
               }
             } catch (e) {
               console.error('Error saving guest', e);
               throw e;
             }
           }
        }}
      />

      <ProcessingModal 
        isOpen={modalState.isOpen}
        status={modalState.status}
        message={modalState.message}
        title={modalState.title}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
