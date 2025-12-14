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
  MoreHorizontal,
  Ticket,
  Share,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api';
import { TifyEvent, EventStatus } from '../../types';
import SeatDesigner from './SeatDesigner';

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

export default function EventManager() {
  const [events, setEvents] = useState<TifyEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TifyEvent | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
  const [activeTab, setActiveTab] = useState<'info' | 'seats' | 'control'>('info');
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

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
            onClick={() => setView('create')}
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

                   <div>
                     <label className="text-sm font-medium text-gray-500">Información de Pagos / Boletería</label>
                     <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedEvent?.paymentInfo || 'No configurada'}</p>
                   </div>
                 </div>
               )}
             </div>
          </div>
        )}
        {activeTab === 'control' && (
           <div className="h-full flex flex-col p-6 max-w-4xl mx-auto w-full">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
               {/* Scanner Section */}
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                   <Ticket size={20} />
                   Control de Acceso
                 </h3>
                 
                 <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-6 p-6">
                   <div className="w-48 h-48 bg-white p-2 rounded-lg shadow-sm mb-4 flex items-center justify-center">
                     <Search size={48} className="text-gray-300" />
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

                 <div className="space-y-2">
                   <h4 className="font-medium text-sm text-gray-700">Últimas Ventas</h4>
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

               {/* Stats Section */}
               <div className="space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1">
                   <h3 className="text-lg font-bold text-gray-900 mb-4">Estado de Zonas</h3>
                   <div className="space-y-4">
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
