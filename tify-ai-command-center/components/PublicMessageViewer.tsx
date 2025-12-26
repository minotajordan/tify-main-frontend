import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Message } from '../types';
import {
  Clock,
  Calendar,
  MapPin,
  Paperclip,
  Download,
  AlertTriangle,
  Eye,
  MessagesSquare,
  Hourglass,
  CheckIcon,
  X,
  ChevronDown,
  ChevronRight,
  Mail,
  Smartphone,
  Calendar as CalendarIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

// Initialize dayjs
dayjs.extend(relativeTime);
dayjs.locale('es');

const generateCalendarLinks = (event: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}) => {
  const formatDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d\d\d/g, ''); // YYYYMMDDTHHMMSSZ

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title
  )}&dates=${formatDate(event.start)}/${formatDate(
    event.end
  )}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
    event.location
  )}`;

  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${event.start.toISOString()}&enddt=${event.end.toISOString()}&subject=${encodeURIComponent(
    event.title
  )}&body=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
    event.location
  )}`;

  const yahoo = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(
    event.title
  )}&st=${formatDate(event.start)}&dur=${
    (event.end.getTime() - event.start.getTime()) / 60000
  }&desc=${encodeURIComponent(event.description)}&in_loc=${encodeURIComponent(
    event.location
  )}`;

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tify//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@tify.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

  const icsUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(
    icsContent
  )}`;

  return { google, outlook, yahoo, icsUrl };
};

const CalendarModal = ({
  isOpen,
  onClose,
  event,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}) => {
  if (!isOpen || !event) return null;

  const links = generateCalendarLinks({
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    start: new Date(event.start),
    end: new Date(event.end || new Date(event.start).getTime() + 3600000), // Default 1 hour
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col border border-gray-100">
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
              <CalendarIcon size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Añadir a Calendario</h3>
              <p className="text-indigo-100 text-sm font-medium opacity-90">
                Elige tu plataforma preferida
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-lg hover:shadow-indigo-100 transition-all gap-3 group"
          >
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform duration-300">
              <CalendarIcon size={24} />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700">
              Google
            </span>
          </a>
          <a
            href={links.outlook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 hover:border-sky-500 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100 transition-all gap-3 group"
          >
            <div className="p-3 bg-sky-100 text-sky-600 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Mail size={24} />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-sky-700">
              Outlook
            </span>
          </a>
          <a
            href={links.yahoo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 hover:shadow-lg hover:shadow-purple-100 transition-all gap-3 group"
          >
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Mail size={24} />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-purple-700">
              Yahoo
            </span>
          </a>
          <a
            href={links.icsUrl}
            download="evento.ics"
            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 hover:border-gray-500 hover:bg-gray-50 hover:shadow-lg hover:shadow-gray-100 transition-all gap-3 group"
          >
            <div className="p-3 bg-gray-100 text-gray-600 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Smartphone size={24} />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">
              Apple / iOS
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

const SmartDate = ({ date }: { date: string | Date }) => {
  const [showRelative, setShowRelative] = useState(true);
  const d = dayjs(date);

  return (
    <div
      className="cursor-pointer group select-none"
      onClick={() => setShowRelative(!showRelative)}
      title="Clic para cambiar formato"
    >
      <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors capitalize">
        {showRelative ? d.fromNow() : d.format('dddd, D [de] MMMM [de] YYYY')}
      </div>
      <div className="text-xs text-gray-500">
        {showRelative ? d.format('D MMM YYYY, HH:mm') : d.format('HH:mm')}
      </div>
    </div>
  );
};

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Eye size={20} />;
  if (['pdf'].includes(ext || '')) return <Paperclip size={20} />;
  return <Paperclip size={20} />;
};

const PublicMessageViewer: React.FC<{ messageId: string }> = ({ messageId }) => {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for expanded sections (default open for public view if content exists)
  const [expandedLocations, setExpandedLocations] = useState<boolean>(true);
  const [expandedAttachments, setExpandedAttachments] = useState<boolean>(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        const data = await api.getPublicMessage(messageId);
        setMessage(data);
      } catch (err) {
        setError('Mensaje no encontrado o no disponible públicamente.');
      } finally {
        setLoading(false);
      }
    };
    if (messageId) {
      fetchMessage();
    }
  }, [messageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Mensaje no disponible</h2>
          <p className="text-gray-500">{error || 'El mensaje que buscas no existe o ha expirado.'}</p>
        </div>
      </div>
    );
  }

  const m = message;
  const timeTo = (dateStr: string) => dayjs(dateStr).fromNow();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              T
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Tify</span>
          </div>
        </div>

        {/* Message Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    m.isEmergency
                      ? 'bg-red-100 text-red-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <MessagesSquare size={24} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">
                    {m.channel?.title || 'Canal Público'}
                  </h1>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <span>
                      {dayjs(m.createdAt).format('D [de] MMMM [a las] HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
              {m.isEmergency && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold tracking-wide border border-red-200 animate-pulse">
                  URGENTE
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Left Column: Main Content */}
            <div className="lg:col-span-2 p-6 border-r border-gray-100">
              {m.extra?.comunicado ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="prose prose-sm prose-indigo max-w-none">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      {m.extra.comunicado.title}
                    </h2>
                    {m.extra.comunicado.header && (
                      <div
                        className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600 italic"
                        dangerouslySetInnerHTML={{
                          __html: m.extra.comunicado.header,
                        }}
                      />
                    )}
                    <div
                      className="text-gray-800 leading-relaxed text-sm"
                      dangerouslySetInnerHTML={{
                        __html: m.extra.comunicado.content,
                      }}
                    />
                    {m.extra.comunicado.footer && (
                      <div
                        className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500"
                        dangerouslySetInnerHTML={{
                          __html: m.extra.comunicado.footer,
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-5 rounded-2xl text-base leading-relaxed whitespace-pre-wrap ${
                    m.isEmergency
                      ? 'bg-red-50 text-gray-900 border border-red-100'
                      : 'bg-gray-50 text-gray-800 border border-gray-100'
                  }`}
                >
                  {m.content}
                </div>
              )}

              {/* Schedule */}
              {m.extra &&
                m.extra.schedule &&
                Array.isArray(m.extra.schedule) &&
                m.extra.schedule.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-600" />
                        Agenda
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {m.extra.schedule
                          .sort(
                            (a: any, b: any) =>
                              new Date(a.date).getTime() - new Date(b.date).getTime()
                          )
                          .map((item: any, idx: number) => {
                            const isExpired =
                              new Date(item.date).getTime() < new Date().getTime();
                            return (
                              <div
                                key={idx}
                                className={`flex items-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm ${
                                  isExpired ? 'opacity-60 grayscale' : ''
                                }`}
                              >
                                <div className="w-16 text-center flex flex-col justify-center shrink-0 pr-4 border-r border-gray-100">
                                  <span
                                    className={`text-sm font-bold ${
                                      isExpired ? 'text-gray-400' : 'text-gray-600'
                                    }`}
                                  >
                                    {item.time || 'Día'}
                                  </span>
                                  <span className="text-xs text-gray-400 uppercase tracking-wide leading-none mt-1">
                                    {dayjs(item.date).format('D MMM')}
                                  </span>
                                </div>
                                <div className="flex-1 pl-4 min-w-0">
                                  <h4 className="font-bold text-gray-900 text-base truncate">
                                    {item.activity}
                                  </h4>
                                  <div className="flex items-center mt-1 text-sm text-gray-500">
                                    <span className="capitalize">
                                      {dayjs(item.date).format('dddd')}
                                    </span>
                                  </div>
                                </div>
                                {!isExpired && (
                                  <>
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping ml-2 shrink-0" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvent({
                                          title: item.activity,
                                          description: m.content || m.extra?.comunicado?.title || '',
                                          location: 'Ubicación del evento',
                                          start: new Date(item.date),
                                          end: new Date(new Date(item.date).getTime() + 60 * 60 * 1000),
                                        });
                                        setShowCalendarModal(true);
                                      }}
                                      className="ml-4 p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                                      title="Añadir al calendario"
                                    >
                                      <CalendarIcon size={20} />
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Right Column: Sidebar (Key Info & Extras) */}
            <div className="p-6 bg-gray-50 space-y-6">
              {/* Key Dates - Humanized */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Información Clave
                </h4>

                {m.eventAt && (
                  <div
                    className={`flex gap-3 items-start ${
                      new Date(m.eventAt).getTime() < new Date().getTime()
                        ? 'opacity-50 grayscale'
                        : ''
                    }`}
                  >
                    <div className="p-1.5 bg-indigo-50 rounded text-indigo-500 mt-0.5">
                      <Calendar size={14} />
                    </div>
                    <div className="w-full">
                      <div className="text-[10px] uppercase font-bold text-indigo-400">
                        Evento
                      </div>
                      <SmartDate date={m.eventAt} />

                      {/* Event Progress Bar */}
                      {(() => {
                        const start = new Date(m.createdAt).getTime();
                        const end = new Date(m.eventAt).getTime();
                        const now = new Date().getTime();

                        if (start >= end) return null;

                        const total = end - start;
                        const elapsed = now - start;
                        let percentage = Math.max(
                          0,
                          Math.min(100, (elapsed / total) * 100)
                        );

                        // Color logic for Event
                        let colorClass = 'bg-emerald-500';
                        if (percentage > 90) colorClass = 'bg-red-500';
                        else if (percentage > 75) colorClass = 'bg-amber-500';
                        else if (percentage > 50) colorClass = 'bg-indigo-400';

                        const remainingMs = end - now;
                        const remainingDays = Math.ceil(
                          remainingMs / (1000 * 60 * 60 * 24)
                        );
                        let remainingText = '';

                        if (remainingMs <= 0) {
                          remainingText = 'Finalizado';
                          percentage = 100;
                          colorClass = 'bg-gray-400';
                        } else if (remainingDays <= 1) {
                          const remainingHours = Math.ceil(
                            remainingMs / (1000 * 60 * 60)
                          );
                          remainingText = `En ${remainingHours}h`;
                        } else {
                          remainingText = `Faltan ${remainingDays} días`;
                        }

                        return (
                          <div className="mt-2 w-full pr-1">
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] text-gray-400 font-medium">
                                {remainingText}
                              </span>
                              {remainingMs > 0 && (
                                <span className="text-[9px] text-gray-300 font-medium">
                                  {Math.round(percentage)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {m.expiresAt && (
                  <div
                    className={`flex gap-3 items-start ${
                      new Date(m.expiresAt).getTime() < new Date().getTime()
                        ? 'opacity-50 grayscale'
                        : ''
                    }`}
                  >
                    <div className="p-1.5 bg-amber-50 rounded text-amber-500 mt-0.5">
                      <Hourglass size={14} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-500">
                        {new Date(m.expiresAt).getTime() < new Date().getTime()
                          ? 'Venció'
                          : 'Vence'}
                      </div>
                      <SmartDate date={m.expiresAt} />
                    </div>
                  </div>
                )}
              </div>



              {/* Location */}
              {m.extra &&
                m.extra.location &&
                (m.extra.location.markers?.length > 0 ||
                  m.extra.location.polylines?.length > 0) && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setExpandedLocations(!expandedLocations)}
                      className="w-full flex items-center justify-between group"
                    >
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-600" />
                        Ubicación
                      </h3>
                      {expandedLocations ? (
                        <ChevronDown
                          size={16}
                          className="text-gray-400 group-hover:text-indigo-600"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          className="text-gray-400 group-hover:text-indigo-600"
                        />
                      )}
                    </button>
                    {expandedLocations && (
                      <div className="h-48 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
                        <MapContainer
                          center={
                            m.extra.location.markers?.[0] ||
                            (Array.isArray(m.extra.location.polylines?.[0])
                              ? m.extra.location.polylines?.[0]?.[0]
                              : m.extra.location.polylines?.[0]?.points?.[0]) || [
                              0, 0,
                            ]
                          }
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          {m.extra.location.markers?.map(
                            (pos: [number, number], idx: number) => (
                              <Marker key={idx} position={pos} />
                            )
                          )}
                          {m.extra.location.polylines?.map(
                            (poly: any, idx: number) => (
                              <Polyline
                                key={idx}
                                positions={
                                  Array.isArray(poly) ? poly : poly.points
                                }
                                color={
                                  Array.isArray(poly) ? '#4F46E5' : poly.color
                                }
                              />
                            )
                          )}
                        </MapContainer>
                      </div>
                    )}
                  </div>
                )}

              {/* Attachments */}
              {m.extra &&
                m.extra.attachments &&
                m.extra.attachments.length > 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() =>
                        setExpandedAttachments(!expandedAttachments)
                      }
                      className="w-full flex items-center justify-between group"
                    >
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Paperclip size={16} className="text-indigo-600" />
                        Adjuntos
                      </h3>
                      {expandedAttachments ? (
                        <ChevronDown
                          size={16}
                          className="text-gray-400 group-hover:text-indigo-600"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          className="text-gray-400 group-hover:text-indigo-600"
                        />
                      )}
                    </button>
                    {expandedAttachments && (
                      <div className="grid grid-cols-1 gap-2">
                        {m.extra.attachments.map((att: any, idx: number) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                          >
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-all">
                              {getFileIcon(att.name || att.url)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {att.name || 'Adjunto sin nombre'}
                              </div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                                {att.type || 'ARCHIVO'}
                              </div>
                            </div>
                            <div className="text-gray-400 group-hover:text-indigo-600">
                              <Download size={18} />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Enviado por{' '}
              <span className="font-medium text-gray-900">
                {m.sender?.fullName || m.sender?.username || 'Sistema'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-medium rounded-full shadow-lg shadow-indigo-100 hover:bg-indigo-50 transition-all"
          >
            Ir a Tify Command Center
          </a>
        </div>

        <CalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          event={selectedEvent}
        />
      </div>
    </div>
  );
};

export default PublicMessageViewer;
