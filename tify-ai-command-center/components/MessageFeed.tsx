import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  CheckCheck,
  AlertTriangle,
  Bell,
  User,
  Hash,
  MoreVertical,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  LayoutList,
  LayoutGrid,
  Download,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { Message, MessagePriority, DeliveryMethod } from '../types';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessageFeedProps {
  channelId?: string;
  className?: string;
}

type ViewMode = 'timeline' | 'cards';

const getPriorityColor = (priority: MessagePriority) => {
  switch (priority) {
    case MessagePriority.HIGH:
      return 'text-red-600 bg-red-50 border-red-200';
    case MessagePriority.MEDIUM:
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case MessagePriority.LOW:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={16} />;
  if (['mp4', 'mov', 'avi'].includes(ext || '')) return <Film size={16} />;
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={16} />;
  return <File size={16} />;
};

// --- Shared Components ---

const AttachmentPreview: React.FC<{ attachment: any }> = ({ attachment }) => (
  <a
    href={attachment.url}
    target="_blank"
    rel="noreferrer"
    className="group flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-sm max-w-full sm:max-w-xs"
  >
    <div className="p-2 bg-slate-50 rounded-md text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
      {getFileIcon(attachment.name)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-slate-700 truncate">{attachment.name}</p>
      <p className="text-xs text-slate-400">
        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Archivo adjunto'}
      </p>
    </div>
    <Download
      size={14}
      className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
    />
  </a>
);

// --- View 1: Timeline Style ---
// Optimized for scanning history, density, and flow.

const MessageTimelineItem: React.FC<{ message: Message }> = ({ message }) => {
  const isEmergency = message.isEmergency;

  const getDotColor = () => {
    if (isEmergency) return 'bg-red-600 animate-pulse';
    switch (message.priority) {
      case MessagePriority.HIGH:
        return 'bg-red-500';
      case MessagePriority.MEDIUM:
        return 'bg-amber-500';
      case MessagePriority.LOW:
        return 'bg-blue-500';
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <div className="relative pl-8 py-4 group hover:bg-slate-50/50 transition-colors rounded-r-xl -ml-4 pr-4">
      {/* Timeline Connector */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200 group-hover:bg-slate-300 transition-colors" />
      <div
        className={`absolute left-[13px] top-6 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 
        ${getDotColor()}
      `}
      />

      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="font-bold text-slate-900">{message.sender.fullName}</span>
          <span className="text-slate-400 text-xs flex items-center gap-1">
            {format(new Date(message.createdAt), 'HH:mm', { locale: es })}
          </span>

          {isEmergency && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold uppercase tracking-wide animate-pulse">
              <AlertTriangle size={10} />
              Emergencia
            </span>
          )}
        </div>

        {/* Content */}
        <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.attachments.map((att, idx) => (
              <AttachmentPreview key={idx} attachment={att} />
            ))}
          </div>
        )}

        {/* Footer / Stats */}
        <div className="flex items-center gap-4 mt-1 opacity-60 group-hover:opacity-100 transition-opacity text-xs text-slate-400">
          {message.deliveryStats && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="Entregado">
                <CheckCheck size={14} className="text-green-600" />
                {message.deliveryStats.delivered}
              </span>
              <span className="flex items-center gap-1" title="Leído">
                <Eye size={14} className="text-blue-500" />
                {message.deliveryStats.read}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- View 2: Card Style ---
// Optimized for distinctness, manageability, and visual impact.

const MessageCardItem: React.FC<{ message: Message }> = ({ message }) => {
  const isEmergency = message.isEmergency;
  const priorityColor = getPriorityColor(message.priority);

  return (
    <div
      className={`
      relative bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-200
      ${isEmergency ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200 hover:border-indigo-200'}
    `}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {message.sender.avatarUrl ? (
              <img
                src={message.sender.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {message.sender.fullName.substring(0, 2).toUpperCase()}
              </div>
            )}
            {isEmergency && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-sm border-2 border-white">
                <AlertTriangle size={10} />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {message.sender.fullName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <Clock size={12} />
              {format(new Date(message.createdAt), 'd MMM, HH:mm', { locale: es })}
            </div>
          </div>
        </div>

        {/* Priority tag removed as requested, relying on color indicators */}
      </div>

      {/* Card Body */}
      <div className="mb-4">
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>

      {/* Attachments Area */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-4 bg-slate-50/50 rounded-lg p-3 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <PaperclipIcon size={12} /> {message.attachments.length} Adjuntos
          </p>
          <div className="grid grid-cols-1 gap-2">
            {message.attachments.map((att, idx) => (
              <AttachmentPreview key={idx} attachment={att} />
            ))}
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          {message.deliveryStats && (
            <>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-md">
                <CheckCheck size={12} />
                <span className="font-medium">{message.deliveryStats.delivered}</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                <Eye size={12} />
                <span className="font-medium">{message.deliveryStats.read}</span>
              </span>
            </>
          )}
        </div>

        <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-50 rounded">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};

// Helper for icon needed above
const PaperclipIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

// --- Main Component ---

const MessageFeed: React.FC<MessageFeedProps> = ({ channelId, className }) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Demo Data Generator
  const loadDemoData = () => {
    const demoMessages: Message[] = [
      {
        id: '1',
        content:
          '🚨 ALERTA SÍSMICA: Se ha detectado movimiento telúrico en la costa. Activar protocolos de evacuación zona B inmediatamente.',
        createdAt: new Date().toISOString(),
        sender: {
          id: 's1',
          fullName: 'Sistema de Alerta',
          username: 'alert',
          avatarUrl: undefined,
        },
        priority: MessagePriority.HIGH,
        isEmergency: true,
        channelId: 'c1',
        attachments: [],
        senderId: 's1',
        categoryId: 'cat1',
        isImmediate: true,
        deliveryMethod: DeliveryMethod.BOTH,
        status: 'SENT',
        channel: { title: 'Alerta Emergencia', icon: '🚨' },
        deliveryStats: { total: 2355, delivered: 1250, read: 1100, failed: 5 },
      },
      {
        id: '2',
        content:
          'Reporte de estado de las unidades de transporte. Todas las unidades se encuentran en ruta sin novedades, excepto la unidad 404 que requiere mantenimiento.',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        sender: {
          id: 's2',
          fullName: 'Carlos Operaciones',
          username: 'carlos',
          avatarUrl: undefined,
        },
        priority: MessagePriority.MEDIUM,
        isEmergency: false,
        channelId: 'c1',
        attachments: [
          {
            id: 'a1',
            url: '#',
            name: 'reporte_diario.pdf',
            size: 1024 * 500,
            type: 'application/pdf',
          },
        ],
        senderId: 's2',
        categoryId: 'cat2',
        isImmediate: false,
        deliveryMethod: DeliveryMethod.PUSH,
        status: 'SENT',
        channel: { title: 'Operaciones Logísticas', icon: '🚚' },
        deliveryStats: { total: 45, delivered: 45, read: 32, failed: 0 },
      },
      {
        id: '3',
        content:
          'Reunión de coordinación programada para mañana a las 09:00 AM en la sala principal.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        sender: { id: 's3', fullName: 'Admin General', username: 'admin', avatarUrl: undefined },
        priority: MessagePriority.LOW,
        isEmergency: false,
        channelId: 'c1',
        attachments: [],
        senderId: 's3',
        categoryId: 'cat3',
        isImmediate: false,
        deliveryMethod: DeliveryMethod.EMAIL,
        status: 'SENT',
        channel: { title: 'Comunicados Generales', icon: '📢' },
        deliveryStats: { total: 10, delivered: 10, read: 5, failed: 0 },
      },
      {
        id: '4',
        content: 'Evidencia fotográfica del incidente en la zona norte.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
        sender: { id: 's4', fullName: 'Guardia Norte', username: 'guardia', avatarUrl: undefined },
        priority: MessagePriority.MEDIUM,
        isEmergency: false,
        channelId: 'c1',
        attachments: [
          { id: 'a2', url: '#', name: 'evidencia_01.jpg', size: 1024 * 2000, type: 'image/jpeg' },
        ],
        senderId: 's4',
        categoryId: 'cat2',
        isImmediate: false,
        deliveryMethod: DeliveryMethod.PUSH,
        status: 'SENT',
        channel: { title: 'Seguridad Física', icon: '🛡️' },
        deliveryStats: { total: 5, delivered: 5, read: 5, failed: 0 },
      },
    ];
    setMessages(demoMessages);
  };

  useEffect(() => {
    if (!channelId) return;

    setLoading(true);
    api
      .getChannelMessages(channelId, 1, 50)
      .then((res) => {
        setMessages(res.messages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [channelId]);

  const groupedMessages = messages.reduce(
    (acc, msg) => {
      const date = new Date(msg.createdAt);
      let dateKey = format(date, 'EEEE, d MMMM yyyy', { locale: es });
      if (isToday(date)) dateKey = 'Hoy';
      if (isYesterday(date)) dateKey = 'Ayer';

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(msg);
      return acc;
    },
    {} as Record<string, Message[]>
  );

  if (!channelId) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200 ${className}`}
      >
        <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-4 text-indigo-100">
          <Hash size={32} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">Selecciona un canal</h3>
        <p className="text-sm max-w-xs mx-auto">
          Elige un canal del menú para ver el historial de mensajes, alertas y comunicados.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-3 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-sm font-medium text-indigo-600 animate-pulse">
          Cargando mensajes...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full ${className}`}
    >
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-md text-slate-600 text-xs font-medium">
            <Bell size={14} />
            <span>{messages.length} Mensajes</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista de Línea de Tiempo"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
            <Search size={18} />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Content Feed */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth bg-slate-50/30"
        ref={scrollRef}
      >
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div
            key={date}
            className="mb-8 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {/* Date Header */}
            <div className="sticky top-0 z-10 flex justify-center mb-6">
              <span className="px-4 py-1.5 bg-white/90 backdrop-blur border border-slate-200/60 shadow-sm rounded-full text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {date}
              </span>
            </div>

            {/* Messages Container */}
            <div
              className={
                viewMode === 'cards'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'flex flex-col gap-0'
              }
            >
              {msgs.map((msg) => (
                <React.Fragment key={msg.id}>
                  {viewMode === 'timeline' ? (
                    <MessageTimelineItem message={msg} />
                  ) : (
                    <MessageCardItem message={msg} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 opacity-0 animate-in fade-in duration-700 fill-mode-forwards"
            style={{ animationDelay: '200ms' }}
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-indigo-50/50">
              <Bell size={32} className="text-indigo-300" />
            </div>
            <h4 className="text-slate-600 font-medium text-lg">Todo está tranquilo</h4>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              No hay mensajes en este canal todavía.
            </p>

            <button
              onClick={loadDemoData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-sm font-medium"
            >
              <Eye size={16} />
              Ver Datos de Ejemplo (Demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageFeed;
