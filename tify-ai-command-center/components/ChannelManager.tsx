import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Shield,
  ShieldCheck,
  Lock,
  Globe,
  EyeOff,
  Eye,
  MailCheck,
  MoreHorizontal,
  Plus,
  Search,
  CheckCircle,
  Loader2,
  Bell,
  BellRing,
  AlertTriangle,
  MapPin,
  MessagesSquare,
  Users,
  Megaphone,
  Zap,
  Mail,
  Send,
  Phone,
  AudioWaveform,
  RadioTower,
  Camera,
  Image,
  Clock,
  Calendar,
  Sparkles,
  Paperclip,
  Target,
  Settings,
  MessageSquarePlus,
  Share2,
  QrCode,
  X,
  Maximize2,
  Minimize2,
  Link,
  Check as CheckIcon,
  Hourglass,
  LucideEye,
  Trash,
  Table,
  LayoutList,
  Info,
  BarChart2,
  ListTree,
  Save,
  FileText,
  CalendarPlus,
  Film,
  File,
  Edit,
  LayoutTemplate,
  Type,
  Code,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  Hash,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  MoveHorizontal,
  ToggleLeft,
  ToggleRight,
  Palette,
  MousePointer2,
  Download,
  Sidebar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, uploadFile } from '../services/api';
import { generateMessageDraft } from '../services/geminiService';
import {
  Channel,
  VerificationStatus,
  ApprovalPolicy,
  MessagePriority,
  DeliveryMethod,
} from '../types';
import { SF_SYMBOLS } from '../constants';
import { useI18n } from '../i18n';
import QRCodeStyling from 'qr-code-styling';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import LocationPicker from './LocationPicker';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Autocomplete, Popper, TextField } from '@mui/material';
import RichTextEditor from './forms/RichTextEditor';
import MainChannelSearchModal from './MainChannelSearchModal';

  const splitHtmlContent = (html: string, initialOffset: number = 0): string[] => {
    if (typeof document === 'undefined') return [html];

    // Create a container that mimics the page dimensions and styles
    const container = document.createElement('div');
    container.style.width = '21cm'; // Match A4 width
    container.style.paddingLeft = '4rem'; // Match md:p-16 (4rem) - Desktop view
    container.style.paddingRight = '4rem';
    container.style.paddingTop = '3rem';
    container.style.paddingBottom = '3rem';
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.className = 'prose max-w-none font-serif text-gray-800 leading-relaxed text-justify'; // Match preview classes
    document.body.appendChild(container);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const pages: string[] = [];
    let currentPageNodes: Node[] = [];
    let currentHeight = 0;
    // Further reduce height to be extremely safe for headers/footers and margins
    // A4 (297mm) ~ 1123px at 96dpi.
    // Margins (top/bottom) + Header/Footer take significant space.
    // Let's use a smaller safe content area.
    const BASE_MAX_HEIGHT = 650; 

    // Helper to get height of a node
    const getNodeHeight = (node: Node): number => {
      const clone = node.cloneNode(true);
      container.innerHTML = '';
      container.appendChild(clone);
      return container.offsetHeight;
    };

    // Helper to process nodes
    const processNodes = (nodes: NodeList) => {
      Array.from(nodes).forEach((node) => {
        // Determine max height for current page
        // If pages.length is 0, we are on the first page, so subtract initialOffset
        const currentMaxHeight = pages.length === 0 ? BASE_MAX_HEIGHT - initialOffset : BASE_MAX_HEIGHT;

        if (node.nodeType === Node.TEXT_NODE) {
          // For text nodes, we might need to wrap them in a span to measure
          if (!node.textContent?.trim()) return;
          const span = document.createElement('span');
          span.textContent = node.textContent;
          const height = getNodeHeight(span);
          
          if (currentHeight + height > currentMaxHeight && currentPageNodes.length > 0) {
            // Push current page
            const pageDiv = document.createElement('div');
            currentPageNodes.forEach(n => pageDiv.appendChild(n.cloneNode(true)));
            pages.push(pageDiv.innerHTML);
            currentPageNodes = [];
            currentHeight = 0;
          }
          currentPageNodes.push(node);
          currentHeight += height;
        } else {
          // Element node
          const height = getNodeHeight(node);
          
          if (currentHeight + height > currentMaxHeight) {
            // If it's a large block that doesn't fit, we might want to push current page first
            if (currentPageNodes.length > 0) {
               const pageDiv = document.createElement('div');
               currentPageNodes.forEach(n => pageDiv.appendChild(n.cloneNode(true)));
               pages.push(pageDiv.innerHTML);
               currentPageNodes = [];
               currentHeight = 0;
            }
            
            // If the element itself is larger than max height, we just have to put it on a new page
            // (Note: Ideally we would split the block, but that's complex. For now, pushing to next page is safer)
            currentPageNodes.push(node);
            currentHeight += height;
          } else {
            currentPageNodes.push(node);
            currentHeight += height;
          }
        }
      });
    };

    processNodes(tempDiv.childNodes);

    // Push remaining nodes
    if (currentPageNodes.length > 0) {
      const pageDiv = document.createElement('div');
      currentPageNodes.forEach(n => pageDiv.appendChild(n.cloneNode(true)));
      pages.push(pageDiv.innerHTML);
    }

    document.body.removeChild(container);
    return pages.length > 0 ? pages : [html];
  };

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image size={16} className="text-purple-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) {
    return <FileText size={16} className="text-blue-500" />;
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
    return <Film size={16} className="text-pink-500" />;
  }
  return <File size={16} className="text-gray-500" />;
};

const ApproverSpeedDial: React.FC<{ messageId: string; channelId: string }> = ({ messageId }) => {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<
    Array<{
      userId: string;
      user: any;
      status: 'APPROVED' | 'REJECTED' | 'PENDING';
      decidedAt?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const resetComposeForm = () => {
    /*setComposeContent('');
    setComposePriority(MessagePriority.MEDIUM);
    setComposeIsEmergency(false);
    setComposeSendAt('');
    setComposeEventAt('');
    setComposeExpiresAt('');
    setComposeAttachments([]);
    setComposeIsGenerating(false);
    setSendPickerOpen(false);
    setEventPickerOpen(false);
    setExpiresPickerOpen(false);*/
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .getMessageApprovals(messageId)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open, messageId]);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-full text-indigo-600 hover:bg-indigo-50"
        aria-label="Ver aprobadores"
      >
        <Users size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
            <div className="text-sm font-semibold text-gray-700 mb-2">Aprobadores</div>
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1">
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">Sin aprobadores</div>
              ) : (
                list.map((a) => (
                  <div
                    key={a.userId}
                    className="flex items-center justify-between px-2 py-1 text-xs"
                  >
                    <span className="text-gray-700 truncate max-w-[9rem]">
                      {a.user?.fullName || a.user?.username || a.userId}
                    </span>
                    {a.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <CheckIcon size={12} /> Aprobado
                      </span>
                    ) : a.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        <X size={12} /> Rechazado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                        <Clock size={12} /> Pendiente
                      </span>
                    )}

                  </div>
                ))
              )}
            </div>
          </div>
</>
      )}
    </div>
  );
};

function ChannelStatsPanel({
                             channelId,
                             range,
                           }: {
  channelId: string;
  range: '1h' | '24h' | '7d' | '1m' | 'all';
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    delivered: number;
    read: number;
    unread: number;
    subscribers: number;
    approvers: number;
  } | null>(null);
  const { t } = useI18n();
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getChannelStats(channelId, range)
      .then((s) => {
        if (mounted) setStats(s);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [channelId, range]);
  return (
    <div className="relative">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg border border-gray-100 bg-gradient-to-br from-indigo-50 to-white">
            <div className="text-xs font-medium text-gray-600">{t('stats.delivered')}</div>
            <div className="mt-2 flex items-center gap-2">
              <MailCheck size={18} className="text-indigo-600" />
              <div className="text-xl font-semibold text-gray-900">
                {stats.delivered.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100 bg-gradient-to-br from-emerald-50 to-white">
            <div className="text-xs font-medium text-gray-600">{t('stats.read')}</div>
            <div className="mt-2 flex items-center gap-2">
              <Eye size={18} className="text-emerald-600" />
              <div className="text-xl font-semibold text-gray-900">
                {stats.read.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100 bg-gradient-to-br from-amber-50 to-white">
            <div className="text-xs font-medium text-gray-600">{t('stats.unread')}</div>
            <div className="mt-2 flex items-center gap-2">
              <EyeOff size={18} className="text-amber-600" />
              <div className="text-xl font-semibold text-gray-900">
                {stats.unread.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100 bg-gradient-to-br from-sky-50 to-white">
            <div className="text-xs font-medium text-gray-600">{t('stats.subscribers')}</div>
            <div className="mt-2 flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              <div className="text-xl font-semibold text-gray-900">
                {stats.subscribers.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100 bg-gradient-to-br from-purple-50 to-white">
            <div className="text-xs font-medium text-gray-600">{t('stats.approvers')}</div>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck size={18} className="text-purple-600" />
              <div className="text-xl font-semibold text-gray-900">
                {stats.approvers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">{t('common.noData')}</div>
      )}
    </div>
  );
}

const ICON_MAP: Record<string, any> = {
  bell: Bell,
  'bell.circle': BellRing,
  globe: Globe,
  'exclamationmark.triangle': AlertTriangle,
  'mappin.and.ellipse': MapPin,
  'bubble.left.and.bubble.right': MessagesSquare,
  'person.2': Users,
  'shield.checkerboard': ShieldCheck,
  lock: Lock,
  megaphone: Megaphone,
  bolt: Zap,
  envelope: Mail,
  paperplane: Send,
  phone: Phone,
  waveform: AudioWaveform,
  radio: RadioTower,
  'antenna.radiowaves.left.and.right': RadioTower,
  camera: Camera,
  photo: Image,
  clock: Clock,
  calendar: Calendar,
};

const IconView: React.FC<{ name?: string; size?: number; className?: string }> = ({
                                                                                    name,
                                                                                    size = 14,
                                                                                    className,
                                                                                  }) => {
  const Comp = (name && ICON_MAP[name]) || MessagesSquare;
  return <Comp size={size} className={className} />;
};

const MaterialInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = " ", 
  type = "text",
  className = "",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
}) => (
  <div className={`relative ${className}`}>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`peer w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-transparent disabled:bg-gray-50 disabled:text-gray-400 ${value ? 'border-gray-400' : ''}`}
      placeholder={placeholder}
      disabled={disabled}
    />
    <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:-top-2 peer-focus:text-xs peer-focus:text-indigo-600 font-medium pointer-events-none">
      {label}
    </label>
  </div>
);

const FontSizeSelector = ({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (val: string) => void; 
}) => {
  const sizes = [
    { id: 'xs', icon: Heading5, label: 'Muy Pequeño' },
    { id: 'sm', icon: Heading4, label: 'Pequeño' },
    { id: 'base', icon: Heading3, label: 'Normal' },
    { id: 'lg', icon: Heading2, label: 'Grande' },
    { id: 'xl', icon: Heading1, label: 'Muy Grande' },
  ];

  return (
    <div className="flex bg-white rounded-lg border border-gray-200 p-1 gap-1">
      {sizes.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded transition-all ${
            value === s.id 
              ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
          title={s.label}
        >
          <s.icon size={18} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
};

const ChannelManager: React.FC = () => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subchannelModalOpen, setSubchannelModalOpen] = useState(false);
  const [currentSubchannelParent, setCurrentSubchannelParent] = useState<Channel | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    websiteUrl: string;
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
    logoUrl: string;
    icon: string;
    isPublic: boolean;
    isHidden: boolean;
    asSub: boolean;
  }>({
    title: '',
    description: '',
    websiteUrl: '',
    instagram: '',
    facebook: '',
    twitter: '',
    tiktok: '',
    logoUrl: '',
    icon: '',
    isPublic: true,
    isHidden: false,
    asSub: false,
  });
  const [owners, setOwners] = useState<any[]>([]);
  const [ownerId, setOwnerId] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [orgNit, setOrgNit] = useState<string>('');
  const [subTitle, setSubTitle] = useState<string>('');
  const [subDesc, setSubDesc] = useState<string>('');
  const [subIcon, setSubIcon] = useState<string>('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [parentChannel, setParentChannel] = useState<Channel | null>(null);
  const [showSubCreate, setShowSubCreate] = useState(false);
  const [showChannelSearch, setShowChannelSearch] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [composePriority, setComposePriority] = useState<MessagePriority>(MessagePriority.MEDIUM);
  const [composeIsEmergency, setComposeIsEmergency] = useState(false);
  const [composeSendAt, setComposeSendAt] = useState<string>('');
  const [composeEventAt, setComposeEventAt] = useState<string>('');
  const [composeExpiresAt, setComposeExpiresAt] = useState<string>('');
  const [sendPickerOpen, setSendPickerOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [expiresPickerOpen, setExpiresPickerOpen] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<
    { name: string; size: number; type: string; url?: string; uploading?: boolean; error?: string }[]
  >([]);
  const [composeComunicado, setComposeComunicado] = useState<string | null>(null);
  const [comunicadoTitle, setComunicadoTitle] = useState('');
  const [isComunicadoModalOpen, setIsComunicadoModalOpen] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [composeLocationData, setComposeLocationData] = useState<{
    markers: [number, number][];
    polylines: { points: [number, number][]; color: string }[];
  } | null>(null);

  const handleLocationSave = (data: { markers: [number, number][]; polylines: { points: [number, number][]; color: string }[] }) => {
    setComposeLocationData({
      markers: data.markers,
      polylines: data.polylines
    });
    setShowLocationPicker(false);
  };
  
  // Header/Footer State
  const [headerLayout, setHeaderLayout] = useState<'inline' | 'drawer'>('inline');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isHeaderFooterModalOpen, setIsHeaderFooterModalOpen] = useState(false);
  const [headerFooterTab, setHeaderFooterTab] = useState<'header' | 'footer'>('header');

  // Auto-collapse header when switching to drawer mode
  useEffect(() => {
    if (headerLayout === 'drawer') {
      setIsHeaderCompact(true);
    }
  }, [headerLayout]);
  
  interface TemplateStructure {
    layout: 'full' | 'split';
    alignment: 'left' | 'center' | 'right';
    columns: { 
      left: string; center: string; right: string;
      leftImage?: string; centerImage?: string; rightImage?: string;
    };
    options: {
      fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
      showDate: boolean;
      dateFormat: string;
      showPage: boolean;
      showVersion: boolean;
      versionText: string;
      backgroundImage?: string;
    };
  }

  interface Template {
    id: string;
    name: string;
    content: string;
    type: 'text' | 'image' | 'html';
    structure?: TemplateStructure;
  }

  const [savedHeaders, setSavedHeaders] = useState<Template[]>([]);
  const [savedFooters, setSavedFooters] = useState<Template[]>([]);
  const [selectedHeader, setSelectedHeader] = useState<Template | null>(null);
  const [selectedFooter, setSelectedFooter] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'text' | 'image' | 'html'>('text');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Advanced Builder State
  const [newTemplateLayout, setNewTemplateLayout] = useState<'full' | 'split'>('full');
  const [newTemplateAlignment, setNewTemplateAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [newTemplateColumns, setNewTemplateColumns] = useState<{
    left: string; center: string; right: string;
    leftImage?: string; centerImage?: string; rightImage?: string;
  }>({ left: '', center: '', right: '', leftImage: undefined, centerImage: undefined, rightImage: undefined });
  const [newTemplateOptions, setNewTemplateOptions] = useState<TemplateStructure['options']>({
    fontSize: 'base',
    showDate: false,
    dateFormat: 'DD/MM/YYYY',
    showPage: false,
    showVersion: false,
    versionText: 'v1.0',
    backgroundImage: undefined
  });

  // Load saved templates on mount
  useEffect(() => {
    const headers = localStorage.getItem('tify_saved_headers');
    const footers = localStorage.getItem('tify_saved_footers');
    if (headers) setSavedHeaders(JSON.parse(headers));
    if (footers) setSavedFooters(JSON.parse(footers));
  }, []);

  const [isUploadingTemplateImage, setIsUploadingTemplateImage] = useState(false);
  const [isUploadingBgImage, setIsUploadingBgImage] = useState(false);

  const handleTemplateImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTemplateImage(true);
    try {
      const { url } = await uploadFile(file);
      setNewTemplateContent(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setIsUploadingTemplateImage(false);
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBgImage(true);
    try {
      const { url } = await uploadFile(file);
      setNewTemplateOptions(prev => ({ ...prev, backgroundImage: url }));
    } catch (error) {
      console.error('Error uploading bg image:', error);
      alert('Error al subir la imagen de fondo');
    } finally {
      setIsUploadingBgImage(false);
    }
  };

  const handleColumnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, col: 'left' | 'center' | 'right') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingTemplateImage(true);
    try {
      const { url } = await uploadFile(file);
      setNewTemplateColumns(prev => ({
        ...prev,
        [`${col}Image`]: url
      }));
    } catch (error) {
      console.error(`Error uploading ${col} image:`, error);
      alert('Error al subir la imagen de la columna');
    } finally {
      setIsUploadingTemplateImage(false);
    }
  };

  const saveTemplate = (forceNew: any = false) => {
    // Handle event object being passed as first arg if called directly
    const isNew = typeof forceNew === 'boolean' ? forceNew : false;

    if (!newTemplateName) return;
    
    // Validation
    if (newTemplateType === 'image' && !newTemplateContent) return;
    if (newTemplateType === 'html' && !newTemplateContent) return;
    if (newTemplateType === 'text') {
       if (newTemplateLayout === 'full' && !newTemplateContent) return;
       if (newTemplateLayout === 'split' && !newTemplateColumns.left && !newTemplateColumns.center && !newTemplateColumns.right && !newTemplateColumns.leftImage && !newTemplateColumns.centerImage && !newTemplateColumns.rightImage) return;
    }
    
    // Construct content for list view / fallback
    let contentToSave = newTemplateContent;
    if (newTemplateType === 'text' && newTemplateLayout === 'split') {
        contentToSave = [newTemplateColumns.left, newTemplateColumns.center, newTemplateColumns.right].filter(Boolean).join(' | ');
    }
    
    const newItem: Template = {
      id: (editingTemplateId && !isNew) ? editingTemplateId : Date.now().toString(),
      name: newTemplateName,
      content: contentToSave,
      type: newTemplateType,
      structure: newTemplateType === 'text' ? {
        layout: newTemplateLayout,
        alignment: newTemplateAlignment,
        columns: newTemplateColumns,
        options: newTemplateOptions
      } : undefined
    };
    
    if (headerFooterTab === 'header') {
      let newHeaders;
      if (editingTemplateId && !isNew) {
        newHeaders = savedHeaders.map(h => h.id === editingTemplateId ? newItem : h);
      } else {
        newHeaders = [...savedHeaders, newItem];
      }
      setSavedHeaders(newHeaders);
      localStorage.setItem('tify_saved_headers', JSON.stringify(newHeaders));
    } else {
      let newFooters;
      if (editingTemplateId && !isNew) {
        newFooters = savedFooters.map(f => f.id === editingTemplateId ? newItem : f);
      } else {
        newFooters = [...savedFooters, newItem];
      }
      setSavedFooters(newFooters);
      localStorage.setItem('tify_saved_footers', JSON.stringify(newFooters));
    }
    
    setNewTemplateName('');
    setNewTemplateContent('');
    setNewTemplateColumns({ left: '', center: '', right: '', leftImage: undefined, centerImage: undefined, rightImage: undefined });
    setNewTemplateOptions({
      fontSize: 'base',
      showDate: false,
      dateFormat: 'DD/MM/YYYY',
      showPage: false,
      showVersion: false,
      versionText: 'v1.0',
      backgroundImage: undefined
    });
    setEditingTemplateId(null);
    setIsCreatingTemplate(false);
  };

  const [expandedComunicados, setExpandedComunicados] = useState<Record<string, boolean>>({});
  const [viewingComunicado, setViewingComunicado] = useState<any>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewingComunicado && viewingComunicado.extra?.comunicado && pdfContainerRef.current && !pdfBlobUrl) {
      setIsGeneratingPdf(true);
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        const element = pdfContainerRef.current;
        const opt: any = {
          margin: 0,
          filename: `${viewingComunicado.extra.comunicado.title || 'comunicado'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).output('bloburl').then((pdfUrl: string) => {
          setPdfBlobUrl(pdfUrl);
          setIsGeneratingPdf(false);
        }).catch((err: any) => {
          console.error('PDF Generation Error:', err);
          setIsGeneratingPdf(false);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [viewingComunicado, pdfBlobUrl]);

  // Reset PDF state when closing preview
  useEffect(() => {
    if (!viewingComunicado) {
      setPdfBlobUrl(null);
      setIsGeneratingPdf(false);
    }
  }, [viewingComunicado]);
  const [composeSchedule, setComposeSchedule] = useState<{ date: string; time?: string; activity: string }[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleWeekMode, setScheduleWeekMode] = useState(true);
  const [scheduleStartDate, setScheduleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [designProposal, setDesignProposal] = useState<'A' | 'B'>('B');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendAnchorRef = useRef<HTMLButtonElement | null>(null);
  const eventAnchorRef = useRef<HTMLButtonElement | null>(null);
  const expiresAnchorRef = useRef<HTMLButtonElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const [composeIsGenerating, setComposeIsGenerating] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  const [previewSub, setPreviewSub] = useState<Channel | null>(null);
  const [previewApprovers, setPreviewApprovers] = useState<any[]>([]);
  const [previewCounts, setPreviewCounts] = useState<{ pending: number; sent: number }>({
    pending: 0,
    sent: 0,
  });
  const [subItems, setSubItems] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subLimit, setSubLimit] = useState(10);
  const [subPages, setSubPages] = useState(1);
  const [subLoading, setSubLoading] = useState(false);
  const [approverTipOpen, setApproverTipOpen] = useState(false);
  const [approverModalOpen, setApproverModalOpen] = useState(false);
  const [approverTipSub, setApproverTipSub] = useState<Channel | null>(null);
  const [approverTipList, setApproverTipList] = useState<any[]>([]);
  const [approverSearch, setApproverSearch] = useState('');
  const [approverAddSearch, setApproverAddSearch] = useState('');
  const [approverEligible, setApproverEligible] = useState<Array<{ id: string; user: any }>>([]);
  const [approverEligibleLoading, setApproverEligibleLoading] = useState(false);
  const [approverPendingAdds, setApproverPendingAdds] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [approverAuthorizeOpen, setApproverAuthorizeOpen] = useState(false);
  const [approverRemoveId, setApproverRemoveId] = useState<string | null>(null);
  const [approverRemoveLoading, setApproverRemoveLoading] = useState(false);
  const [approverAddLoading, setApproverAddLoading] = useState(false);
  const [approverRemoveAnchorEl, setApproverRemoveAnchorEl] = useState<HTMLElement | null>(null);
  const [approverProfileOpen, setApproverProfileOpen] = useState(false);
  const [approverProfileUserId, setApproverProfileUserId] = useState<string | null>(null);
  const [approverProfileLoading, setApproverProfileLoading] = useState(false);
  const [approverProfile, setApproverProfile] = useState<any>(null);
  const [approverProfileSubs, setApproverProfileSubs] = useState<any[]>([]);
  const [approverProfileApprovers, setApproverProfileApprovers] = useState<any[]>([]);
  const [approverHoverUserId, setApproverHoverUserId] = useState<string | null>(null);
  const [approverHoverAnchorEl, setApproverHoverAnchorEl] = useState<HTMLElement | null>(null);
  const [inlineStatsHidden, setInlineStatsHidden] = useState(false);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [rangeMenuAnchorEl, setRangeMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState<'details' | 'stats' | 'content' | 'messages'>('details');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastVisitedSubchannelId, setLastVisitedSubchannelId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      } else {
        setViewMode('table');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      if (lastVisitedSubchannelId) {
        setActiveTab('content');
        const t = setTimeout(() => setLastVisitedSubchannelId(null), 2500);
        return () => clearTimeout(t);
      } else {
        setActiveTab('messages');
      }
    }
  }, [selectedChannel?.id]);


  const filteredChannels = React.useMemo(() => {
    if (!filterText) return channels;
    const lower = filterText.toLowerCase();
    const filterTree = (nodes: Channel[]): Channel[] => {
      return nodes
        .map((node) => {
          const matchSelf = node.title.toLowerCase().includes(lower);
          const filteredSubs = node.subchannels ? filterTree(node.subchannels) : [];
          if (matchSelf || filteredSubs.length > 0) {
            return { ...node, subchannels: filteredSubs };
          }
          return null;
        })
        .filter((n) => n !== null) as Channel[];
    };
    return filterTree(channels);
  }, [channels, filterText]);

  useEffect(() => {
    const load = async () => {
      if (!approverProfileOpen || !approverProfileUserId) return;
      setApproverProfileLoading(true);
      try {
        const [profile, subs, assigns] = await Promise.all([
          api.getUserProfile(approverProfileUserId),
          api.getUserSubscriptions(approverProfileUserId),
          api.getUserApproverAssignments(approverProfileUserId),
        ]);
        setApproverProfile(profile);
        setApproverProfileSubs(subs || []);
        setApproverProfileApprovers(assigns || []);
      } catch {
        setApproverProfile(null);
        setApproverProfileSubs([]);
        setApproverProfileApprovers([]);
      } finally {
        setApproverProfileLoading(false);
      }
    };
    load();
  }, [approverProfileOpen, approverProfileUserId]);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingForSub, setPendingForSub] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPages, setPendingPages] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [composeSending, setComposeSending] = useState(false);

  const [subsModalOpen, setSubsModalOpen] = useState(false);
  const [subsForSub, setSubsForSub] = useState<string | null>(null);
  const [subsItems, setSubsItems] = useState<any[]>([]);
  const [subsSearch, setSubsSearch] = useState('');
  const [subsPage, setSubsPage] = useState(1);
  const [subsPages, setSubsPages] = useState(1);
  const [subsLimit, setSubsLimit] = useState(10);
  const [subsLoading, setSubsLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approverLoading, setApproverLoading] = useState(false);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [messagesForSub, setMessagesForSub] = useState<string | null>(null);
  const [messagesItems, setMessagesItems] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPages, setMessagesPages] = useState(1);
  const [messagesLimit, setMessagesLimit] = useState(20);
  const [createdTipId, setCreatedTipId] = useState<string | null>(null);
  const [eventTipId, setEventTipId] = useState<string | null>(null);
  const [expiresTipId, setExpiresTipId] = useState<string | null>(null);
  const [configTipOpen, setConfigTipOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [qrTipOpen, setQrTipOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const [messagesSearch, setMessagesSearch] = useState('');
  const [messagesSearchDebounced, setMessagesSearchDebounced] = useState('');
  const [messagesQuick, setMessagesQuick] = useState<
    'all' | 'emergency' | 'high' | 'vigent' | 'expired' | 'hasApprovals' | 'noApprovals'
  >('all');
  const [messagesFilterOpen, setMessagesFilterOpen] = useState(false);
  const [messagesFilter, setMessagesFilter] = useState<{
    priority?: MessagePriority;
    emergency?: boolean;
    expired?: boolean;
    hasApprovals?: boolean;
  }>({});
  const [infoTipOpen, setInfoTipOpen] = useState(true);
  const [statsRange, setStatsRange] = useState<'1h' | '24h' | '7d' | '1m' | 'all'>('24h');
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({});
  const [expandedApprovers, setExpandedApprovers] = useState<Record<string, boolean>>({});
  const [calendarConfirmOpen, setCalendarConfirmOpen] = useState(false);
  const [calendarConfirmEvent, setCalendarConfirmEvent] = useState<{ date: string; time?: string; activity: string } | null>(null);
  const [emergencyCount, setEmergencyCount] = useState(0);

  useEffect(() => {
    if (!selectedChannel) return;
    const fetchEmergencyCount = async () => {
      try {
        const res = await api.getChannelMessages(selectedChannel.id, 1, 1, { emergency: true });
        setEmergencyCount(res.pagination.total);
      } catch {
        setEmergencyCount(0);
      }
    };
    fetchEmergencyCount();
  }, [selectedChannel, messagesItems]); // Update when channel changes or messages list updates

  const resetMessagesFilters = () => {
    setMessagesSearch('');
    setMessagesQuick('all');
    setMessagesFilter({
      priority: undefined,
      emergency: undefined,
      expired: undefined,
      hasApprovals: undefined,
    });
    setMessagesFilterOpen(false);
    setMessagesPage(1);
  };
  const downloadIcs = (event: { date: string; time?: string; activity: string }) => {
    const { date, time, activity } = event;
    let dtStart = date.replace(/-/g, '');
    let dtEnd = dtStart;
    let isAllDay = true;

    if (time) {
      isAllDay = false;
      const [hours, minutes] = time.split(':');
      const startDate = new Date(`${date}T${time}:00`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const format = (d: Date) =>
        `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

      dtStart = format(startDate);
      dtEnd = format(endDate);
    } else {
      const d = new Date(date);
      d.setDate(d.getDate() + 1);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      dtEnd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tify//ChannelManager//ES',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@tify.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART${isAllDay ? ';VALUE=DATE' : ''}:${dtStart}`,
      `DTEND${isAllDay ? ';VALUE=DATE' : ''}:${dtEnd}`,
      `SUMMARY:${activity}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'evento.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareUrl =
    typeof window !== 'undefined' && selectedChannel
      ? `${window.location.origin}/c/${selectedChannel.referenceCode || selectedChannel.id}`
      : '';
  const copyShare = async () => {
    try {
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1200);
    } catch {}
  };

  useEffect(() => {
    if (composeIsEmergency) {
      setComposeSendAt('');
      setSendPickerOpen(false);
    }
  }, [composeIsEmergency]);

  useEffect(() => {
    if (!composeEventAt) return;
    if (composeExpiresAt && new Date(composeExpiresAt) > new Date(composeEventAt)) {
      setComposeExpiresAt(composeEventAt);
    }
  }, [composeEventAt]);

  useEffect(() => {
    if (!composeSendAt) return;
    if (composeExpiresAt && new Date(composeExpiresAt) <= new Date(composeSendAt)) {
      setComposeExpiresAt('');
    }
  }, [composeSendAt]);

  const approverTipSubId = approverTipSub ? approverTipSub.id : undefined;
  const selectedChannelId = selectedChannel ? selectedChannel.id : undefined;

  useEffect(() => {
    const t = setTimeout(() => {
      setMessagesSearchDebounced(messagesSearch);
    }, 400);
    return () => clearTimeout(t);
  }, [messagesSearch]);

  useEffect(() => {
    const inlineActive = !!(selectedChannel && selectedChannel.parentId && activeTab === 'messages');
    const parentMessagesTabActive = activeTab === 'messages' && selectedChannel && !selectedChannel.parentId;
    const subId = messagesModalOpen
      ? messagesForSub
      : inlineActive
        ? selectedChannel?.id
        : parentMessagesTabActive
          ? selectedChannel?.subchannels?.[0]?.id
          : null;

    if (!subId) return;
    setMessagesLoading(true);
    const start =
      statsRange === '1h'
        ? new Date(Date.now() - 3600000)
        : statsRange === '24h'
          ? new Date(Date.now() - 86400000)
          : statsRange === '7d'
            ? new Date(Date.now() - 7 * 86400000)
            : statsRange === '1m'
              ? new Date(Date.now() - 30 * 86400000)
              : null;
    const q =
      messagesSearchDebounced && messagesSearchDebounced.trim().length >= 2
        ? messagesSearchDebounced
        : undefined;
    api
      .getChannelMessages(subId as string, messagesPage, messagesLimit, {
        q,
        quick: messagesQuick,
        priority: messagesFilter.priority,
        emergency: messagesFilter.emergency,
        expired: messagesFilter.expired,
        hasApprovals: messagesFilter.hasApprovals,
        start: start ? start.toISOString() : undefined,
      })
      .then((res) => {
        setMessagesItems(res.messages as any);
        setMessagesPages(res.pagination.pages);
        setMessagesLoading(false);
      })
      .catch(() => setMessagesLoading(false));
  }, [
    messagesModalOpen,
    messagesForSub,
    selectedChannel?.id,
    selectedChannel?.parentId,
    selectedChannel?.subchannels,
    activeTab,
    messagesPage,
    messagesLimit,
    messagesSearchDebounced,
    messagesQuick,
    messagesFilter,
    statsRange,
  ]);

  const loadApproverEligible = async (subId: string, q: string) => {
    if (!q || q.trim().length < 2) {
      setApproverEligible([]);
      return;
    }
    setApproverEligibleLoading(true);
    try {
      const res = await api.getChannelSubscribers(subId, 1, 10, q);
      setApproverEligible(res.items || []);
    } catch {
      setApproverEligible([]);
    } finally {
      setApproverEligibleLoading(false);
    }
  };
  useEffect(() => {
    const subId = approverTipSubId ?? selectedChannelId;
    if (!approverModalOpen || !subId) return;
    setApproverEligible([]);
  }, [approverModalOpen, approverTipSubId, selectedChannelId]);

  useEffect(() => {
    const subId = approverTipSubId ?? selectedChannelId;
    if (!approverModalOpen || !subId) return;
    const h = setTimeout(() => {
      loadApproverEligible(subId, approverAddSearch);
    }, 250);
    return () => {
      clearTimeout(h);
    };
  }, [approverModalOpen, approverTipSubId, selectedChannelId, approverAddSearch]);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => (t + 1) % 1000000), 1000);
    return () => clearInterval(id);
  }, []);

  const qrRef = useRef<HTMLDivElement | null>(null);
  const qrInstance = useRef<any>(null);
  const downloadQr = () => {
    try {
      qrInstance.current?.download({ name: 'tify-qr', extension: 'png' });
    } catch {}
  };
  useEffect(() => {
    if (!qrTipOpen || !qrRef.current) return;
    const opts: any = {
      width: 160,
      height: 160,
      data: shareUrl || '',
      image: tLogoDataUrl || undefined,
      dotsOptions: { type: 'rounded', color: '#111827' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#111827' },
      cornersDotOptions: { type: 'dot', color: '#111827' },
      backgroundOptions: { color: '#ffffff' },
      imageOptions: { crossOrigin: 'anonymous', margin: 0, imageSize: 0.28 },
    };
    qrInstance.current = new QRCodeStyling(opts);
    qrRef.current.innerHTML = '';
    qrInstance.current.append(qrRef.current);
    if (tLogoDataUrl) {
      try {
        qrInstance.current?.update({ image: tLogoDataUrl });
      } catch {}
    }
  }, [qrTipOpen, shareUrl]);
  const [tLogoDataUrl, setTLogoDataUrl] = useState<string>('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };
      drawRoundedRect(8, 8, 112, 112, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 0;
      const grad = ctx.createLinearGradient(64, 32, 64, 96);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#fb923c');
      ctx.fillStyle = grad;
      ctx.font = '700 120px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('t', 64, 70);
      setTLogoDataUrl(canvas.toDataURL('image/png'));
    } catch {}
  }, []);

  useEffect(() => {
    api
      .getChannels()
      .then((data) => {
        const topLevel = data.filter((c: any) => !c.parentId);
        setChannels(topLevel);
        // Do not auto-select first channel to show list by default
        // if (topLevel.length > 0) setSelectedChannel(topLevel[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedChannel) return;
      setDetailsLoading(true);
      try {
        const details = await api.getChannelDetails(selectedChannel.id);
        setSelectedChannel(details);
      } finally {
        setDetailsLoading(false);
      }
    };
    loadDetails().catch(() => {
      setDetailsLoading(false);
    });
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (!selectedChannel?.parentId) {
      setParentChannel(null);
      return;
    }
    api
      .getChannelDetails(selectedChannel.parentId)
      .then(setParentChannel)
      .catch(() => setParentChannel(null));
  }, [selectedChannel?.parentId]);

  const prevPendingOpen = useRef(pendingModalOpen);
  useEffect(() => {
    if (prevPendingOpen.current && !pendingModalOpen) {
      setRefreshKey((k) => k + 1);
    }
    prevPendingOpen.current = pendingModalOpen;
  }, [pendingModalOpen]);

  const prevMessagesOpen = useRef(messagesModalOpen);
  useEffect(() => {
    if (prevMessagesOpen.current && !messagesModalOpen) {
      setRefreshKey((k) => k + 1);
    }
    prevMessagesOpen.current = messagesModalOpen;
  }, [messagesModalOpen]);

  useEffect(() => {
    if (!selectedChannel || selectedChannel.parentId) return;
    setSubLoading(true);
    api
      .getSubchannels(selectedChannel.id, subPage, subLimit)
      .then((res: any) => {
        setSubItems(res.items || []);
        setSubPages(res.pagination?.pages || 1);
      })
      .catch(() => {
        setSubItems([]);
        setSubPages(1);
      })
      .finally(() => setSubLoading(false));
  }, [selectedChannel?.id, subPage, subLimit, refreshKey]);

  useEffect(() => {
    const items: any[] = [];
    if (selectedChannel && !selectedChannel.parentId) {
      items.push({ label: t('nav.channels'), view: 'channels' });
      items.push({ label: selectedChannel.title || selectedChannel.id });
    } else if (selectedChannel && selectedChannel.parentId) {
      items.push({ label: t('nav.channels'), view: 'channels' });
      if (parentChannel) items.push({ label: parentChannel.title || parentChannel.id });
      items.push({ label: selectedChannel.title || selectedChannel.id });
    } else {
      items.push({ label: t('nav.channels'), view: 'channels' });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tify_breadcrumbs', { detail: items }));
    }
  }, [selectedChannel?.id, selectedChannel?.parentId, parentChannel?.id]);

  useEffect(() => {
    if (!pendingModalOpen || !pendingForSub) return;
    setPendingLoading(true);
    api
      .getChannelPendingApprovals(pendingForSub, pendingPage, pendingLimit)
      .then((res) => {
        setPendingItems(res.messages || []);
        setPendingPages(res.pagination?.pages || 1);
      })
      .catch(() => {
        setPendingItems([]);
        setPendingPages(1);
      })
      .finally(() => setPendingLoading(false));
  }, [pendingModalOpen, pendingForSub, pendingPage, pendingLimit]);

  useEffect(() => {
    if (!subsModalOpen || !subsForSub) return;
    setSubsLoading(true);
    api
      .getChannelSubscribers(subsForSub, subsPage, subsLimit, subsSearch)
      .then((res: any) => {
        setSubsItems(res.items || []);
        setSubsPages(res.pagination?.pages || 1);
      })
      .catch(() => {
        setSubsItems([]);
        setSubsPages(1);
      })
      .finally(() => setSubsLoading(false));
  }, [subsModalOpen, subsForSub, subsPage, subsLimit, subsSearch]);

  useEffect(() => {
    if (!showCreate) return;
    api
      .getUsers()
      .then(setOwners)
      .catch(() => {});
  }, [showCreate]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const flattenVisible = (
    nodes: Channel[],
    parents: string[] = []
  ): { channel: Channel; parents: string[] }[] => {
    return nodes.flatMap((node) => {
      const current = { channel: node, parents };
      const showChildren = expanded[node.id] || filterText;
      const children =
        showChildren && node.subchannels
          ? flattenVisible(node.subchannels, [...parents, node.title])
          : [];
      return [current, ...children];
    });
  };

  const renderCards = (list: Channel[]) => {
    const flatList = flattenVisible(list);
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {flatList.map(({ channel, parents }) => (
          <div
            key={channel.id}
            onClick={() => setSelectedChannel(channel)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedChannel?.id === channel.id
                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500 shrink-0">
                  <IconView name={channel.icon} size={16} />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-gray-900 truncate">{channel.title}</div>
                  {parents.length > 0 && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      {parents.map((p, i) => (
                        <span key={i} className="flex items-center">
                          {p} <ChevronRight size={10} className="mx-0.5" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {channel.isHidden && <EyeOff size={14} className="text-gray-400" />}
                {!channel.isPublic && <Lock size={14} className="text-amber-500" />}
              </div>
            </div>

            {channel.description && (
              <div className="text-xs text-gray-500 line-clamp-2 mb-2 pl-9">
                {channel.description}
              </div>
            )}

            {channel.subchannels && channel.subchannels.length > 0 && (
              <div className="flex items-center justify-between pl-9 mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {channel.subchannels.length} subcanales
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSubchannelParent(channel);
                    setSubchannelModalOpen(true);
                  }}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium flex items-center gap-1"
                >
                  <ChevronRight size={14} /> Ver subcanales
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };


  const handleCreate = async () => {
    const social: Record<string, string> = {};
    if (form.instagram) social.instagram = form.instagram;
    if (form.facebook) social.facebook = form.facebook;
    if (form.twitter) social.twitter = form.twitter;
    if (form.tiktok) social.tiktok = form.tiktok;
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      websiteUrl: form.websiteUrl || undefined,
      socialLinks: Object.keys(social).length ? social : undefined,
      logoUrl: form.logoUrl || undefined,
      icon: form.icon || undefined,
      ownerId: ownerId || selectedChannel?.owner?.id,
      isPublic: form.isPublic,
      isHidden: form.isHidden,
    };
    if (orgName && orgNit) {
      payload.organizationName = orgName;
      payload.nit = orgNit;
    } else if (selectedChannel?.organizationId) {
      payload.organizationId = selectedChannel.organizationId;
    }
    if (form.asSub && selectedChannel) {
      await api.createSubchannel(selectedChannel.id, payload);
    } else {
      await api.createChannel(payload);
    }
    const data = await api.getChannels();
    setChannels(data);
    setShowCreate(false);
    setForm({
      title: '',
      description: '',
      websiteUrl: '',
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      logoUrl: '',
      icon: '',
      isPublic: true,
      isHidden: false,
      asSub: false,
    });
    setOwnerId('');
    setOrgName('');
    setOrgNit('');
  };

  const handleCreateSubInline = async () => {
    if (!selectedChannel || !subTitle) return;
    const payload: any = {
      title: subTitle,
      description: subDesc || undefined,
      icon: subIcon || undefined,
      ownerId: selectedChannel.owner?.id,
      organizationId: selectedChannel.organizationId,
      isPublic: true,
      isHidden: false,
    };
    await api.createSubchannel(selectedChannel.id, payload);
    const fresh = await api.getChannelDetails(selectedChannel.id);
    setSelectedChannel(fresh);
    setSubTitle('');
    setSubDesc('');
    setSubIcon('');
  };

  const draftKey = () => (selectedChannel ? `draft:${selectedChannel.id}` : '');

  const loadDraft = () => {
    const key = draftKey();
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw);
        setComposeContent(d.content || '');
        setComposePriority(d.priority || MessagePriority.MEDIUM);
        setComposeIsEmergency(!!d.isEmergency);
        if (d.location) setComposeLocationData(d.location);
      }
    } catch {}
  };

  const saveDraft = () => {
    const key = draftKey();
    if (!key) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        content: composeContent,
        priority: composePriority,
        isEmergency: composeIsEmergency,
        location: composeLocationData,
      })
    );
  };

  const clearDraft = () => {
    const key = draftKey();
    if (!key) return;
    localStorage.removeItem(key);
    setComposeContent('');
  };

  const openCompose = () => {
    loadDraft();
    setShowCompose(true);
  };

  const closeComposeAutoSave = () => {
    if (composeContent.trim()) saveDraft();
    setShowCompose(false);
    setComposePriority(MessagePriority.MEDIUM);
    setComposeIsEmergency(false);
    setComposeSendAt('');
    setComposeEventAt('');
    setComposeExpiresAt('');
    setComposeAttachments([]);
    setComposeSchedule([]);
    setComposeLocationData(null);
    setComposeComunicado(null);
    setComunicadoTitle('');
    setComposeIsGenerating(false);
    setSendPickerOpen(false);
    setEventPickerOpen(false);
    setExpiresPickerOpen(false);
  };

  const cancelCompose = () => {
    const ok = window.confirm('¿Cancelar y descartar borrador?');
    if (ok) {
      clearDraft();
      setShowCompose(false);
      setComposePriority(MessagePriority.MEDIUM);
      setComposeIsEmergency(false);
      setComposeSendAt('');
      setComposeEventAt('');
      setComposeExpiresAt('');
      setComposeAttachments([]);
      setComposeSchedule([]);
      setComposeLocationData(null);
      setComposeComunicado(null);
      setComunicadoTitle('');
      setComposeIsGenerating(false);
      setSendPickerOpen(false);
      setEventPickerOpen(false);
      setExpiresPickerOpen(false);
    }
  };

  const sendCompose = async () => {
    if (!selectedChannel) return;
    if (composeComunicado && !composeContent.trim()) {
      alert('Para enviar un comunicado, debes incluir un breve resumen o introducción en el campo de mensaje principal.');
      return;
    }
    if (!composeContent.trim()) return;

    setComposeSending(true);
    try {
      const targetId = selectedChannel.parentId
        ? selectedChannel.id
        : selectedChannel.subchannels && selectedChannel.subchannels[0]
          ? selectedChannel.subchannels[0].id
          : selectedChannel.id;
      if (composeSendAt && new Date(composeSendAt) <= new Date()) {
        setComposeSendAt('');
      }
      if (composeEventAt && new Date(composeEventAt) <= new Date()) {
        setComposeEventAt('');
      }
      if (composeExpiresAt && new Date(composeExpiresAt) <= new Date()) {
        setComposeExpiresAt('');
      }

      let finalContent = composeContent;

      const publishedAtISO = composeSendAt ? new Date(composeSendAt).toISOString() : undefined;
      let eventAtISO = composeEventAt ? new Date(composeEventAt).toISOString() : undefined;

      // If no explicit event date is set but there is a schedule, use the first schedule date
      if (!eventAtISO && composeSchedule.length > 0) {
        const sorted = [...composeSchedule].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (sorted.length > 0) {
          eventAtISO = new Date(sorted[0].date).toISOString();
        }
      }

      let expiresAtISO: string | undefined;
      if (composeExpiresAt) {
        let expires = new Date(composeExpiresAt);
        if (eventAtISO && expires > new Date(eventAtISO)) {
          expires = new Date(eventAtISO);
        }
        if (composeSendAt && expires <= new Date(composeSendAt)) {
          expires = new Date(new Date(composeSendAt).getTime() + 60000);
        }
        expiresAtISO = expires.toISOString();
      }
      await api.createMessage({
        channelId: targetId,
        content: finalContent,
        priority: composePriority,
        isEmergency: composeIsEmergency,
        categoryId: composeIsEmergency
          ? '310729e9-c571-11f0-8d01-1be21eee4db9'
          : composePriority === MessagePriority.LOW
            ? '31072b53-c571-11f0-8d01-1be21eee4db9'
            : composePriority === MessagePriority.MEDIUM
              ? '31072b7f-c571-11f0-8d01-1be21eee4db9'
              : '31072ba7-c571-11f0-8d01-1be21eee4db9',
        senderId: api.getCurrentUserId() || '',
        isImmediate: composeIsEmergency,
        deliveryMethod: DeliveryMethod.PUSH,
        publishedAt: publishedAtISO,
        eventAt: eventAtISO,
        expiresAt: expiresAtISO,
        extra: {
          ...(composeSchedule.length > 0 ? { schedule: composeSchedule } : {}),
          ...(composeLocationData ? { location: composeLocationData } : {}),
          ...(composeAttachments.length > 0 ? { attachments: composeAttachments } : {}),
          ...(composeComunicado ? {
            type: 'comunicado',
            comunicado: {
              title: comunicadoTitle,
              content: composeComunicado,
              header: selectedHeader,
              footer: selectedFooter
            }
          } : {})
        },
      });
      clearDraft();
      setShowCompose(false);
      setComposeContent('');
      setComposePriority(MessagePriority.MEDIUM);
      setComposeIsEmergency(false);
      setComposeSendAt('');
      setComposeEventAt('');
      setComposeExpiresAt('');
      setComposeAttachments([]);
      setComposeSchedule([]);
      setComposeComunicado(null);
      setComunicadoTitle('');
      setComposeIsGenerating(false);
      setSendPickerOpen(false);
      setEventPickerOpen(false);
      setExpiresPickerOpen(false);
    } catch (e) {
    } finally {
      setComposeSending(false);
    }
  };

  const handleComposeAIAssist = async () => {
    if (!composeContent.trim()) return;
    setComposeIsGenerating(true);
    const channelName = selectedChannel?.title || 'General';
    const draft = await generateMessageDraft(composeContent, channelName);
    setComposeContent(draft);
    setComposeIsGenerating(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Check file count (max 2)
    if (composeAttachments.length >= 2) {
      alert('Solo se pueden subir un máximo de 2 archivos por mensaje.');
      e.target.value = '';
      return;
    }

    const file = e.target.files[0];
    
    // Check file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('El archivo excede el tamaño máximo permitido de 20MB');
      e.target.value = '';
      return;
    }

    // Add placeholder for uploading state
    const tempId = Date.now().toString();
    setComposeAttachments(prev => [...prev, {
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: true
    }]);

    try {
      const result = await api.uploadFile(file);
      
      setComposeAttachments(prev => prev.map(att => {
        if (att.name === file.name && att.uploading) {
          return {
            name: result.originalName || result.filename,
            size: result.size,
            type: result.mimetype,
            url: result.url,
            uploading: false
          };
        }
        return att;
      }));
    } catch (error) {
      console.error('Upload failed', error);
      setComposeAttachments(prev => prev.map(att => {
        if (att.name === file.name && att.uploading) {
          return {
            ...att,
            uploading: false,
            error: 'Error al subir archivo'
          };
        }
        return att;
      }));
    } finally {
      e.target.value = '';
    }
  };

  const fetchPreviewData = async (id: string) => {
    try {
      setApproverLoading(true);
      const details = await api.getChannelDetails(id);
      const approvers = details.approvers || [];
      setPreviewApprovers(approvers);
      setApproverTipList(approvers);
      const msgs = (details as any).messages || [];
      const pending = msgs.filter((m: any) => !m.publishedAt).length;
      const sent = msgs.filter((m: any) => !!m.publishedAt).length;
      setPreviewCounts({ pending, sent });
    } catch {
      setPreviewApprovers([]);
      setApproverTipList([]);
      setPreviewCounts({ pending: 0, sent: 0 });
    } finally {
      setApproverLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChannel) return;
    if (selectedChannel.parentId) {
      setPreviewSub(selectedChannel);
      fetchPreviewData(selectedChannel.id);
    } else if (selectedChannel.subchannels && selectedChannel.subchannels.length > 0) {
      const def = selectedChannel.subchannels[0] as any;
      setPreviewSub(def);
      fetchPreviewData(def.id);
    } else {
      setPreviewSub(null);
      setPreviewApprovers([]);
      setPreviewCounts({ pending: 0, sent: 0 });
    }
  }, [selectedChannel?.id]);

  const [isHeaderCompact, setIsHeaderCompact] = useState(true);

  const StatusBadge = ({ status }: { status?: VerificationStatus }) => {
    switch (status) {
      case VerificationStatus.VERIFIED_CERTIFIED:
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <ShieldCheck size={12} /> Certified
          </span>
        );
      case VerificationStatus.VERIFIED:
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <CheckCircle size={12} /> Verified
          </span>
        );
      default:
        return <></>;
    }
  };

  const PolicyBadge = ({ policy }: { policy: ApprovalPolicy }) => {
    const colors = {
      [ApprovalPolicy.REQUIRED]: 'bg-amber-100 text-amber-700 border-amber-200',
      [ApprovalPolicy.OPTIONAL]: 'bg-blue-100 text-blue-700 border-blue-200',
      [ApprovalPolicy.DISABLED]: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded border ${colors[policy]}`}>
        {policy} Approval
      </span>
    );
  };

  const timeTo = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = d - now;
    const abs = Math.abs(diff);
    const units = [
      { n: 30 * 24 * 60 * 60 * 1000, l: 'mes' },
      { n: 7 * 24 * 60 * 60 * 1000, l: 'semana' },
      { n: 24 * 60 * 60 * 1000, l: 'día' },
      { n: 60 * 60 * 1000, l: 'hora' },
      { n: 60 * 1000, l: 'minuto' },
      { n: 1000, l: 'segundo' },
    ];
    const u = units.find((u) => abs >= u.n) || units[units.length - 1];
    const v = Math.floor(abs / u.n);
    const pl =
      v !== 1
        ? u.l === 'día'
          ? 'días'
          : u.l === 'hora'
            ? 'horas'
            : u.l === 'minuto'
              ? 'minutos'
              : u.l === 'semana'
                ? 'semanas'
                : u.l === 'mes'
                  ? 'meses'
                  : 'segundos'
        : u.l;
    const pre = diff > 0 ? 'en' : 'hace';
    return `${pre} ${v} ${pl}`;
  };
  const formatLocal = (s?: string) => {
    if (!s) return 'dd/mm/aaaa, --:--';
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
  };
  const relativeIn = (s?: string) => {
    if (!s) return '--';
    const d = new Date(s).getTime();
    const now = Date.now();
    const diff = Math.max(0, d - now);
    const units = [
      { n: 30 * 24 * 60 * 60 * 1000, l: 'mes' },
      { n: 7 * 24 * 60 * 60 * 1000, l: 'semana' },
      { n: 24 * 60 * 60 * 1000, l: 'día' },
      { n: 60 * 60 * 1000, l: 'hora' },
      { n: 60 * 1000, l: 'minuto' },
      { n: 1000, l: 'segundo' },
    ];
    const u = units.find((u) => diff >= u.n) || units[units.length - 1];
    const v = Math.floor(diff / u.n);
    const pl =
      v !== 1
        ? u.l === 'día'
          ? 'días'
          : u.l === 'hora'
            ? 'horas'
            : u.l === 'minuto'
              ? 'minutos'
              : u.l === 'semana'
                ? 'semanas'
                : u.l === 'mes'
                  ? 'meses'
                  : 'segundos'
        : u.l;
    return `${v} ${pl}`;
  };
  const relativeFrom = (s?: string) => {
    if (!s) return '--';
    const d = new Date(s).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);
    const units = [
      { n: 30 * 24 * 60 * 60 * 1000, l: 'mes' },
      { n: 7 * 24 * 60 * 60 * 1000, l: 'semana' },
      { n: 24 * 60 * 60 * 1000, l: 'día' },
      { n: 60 * 60 * 1000, l: 'hora' },
      { n: 60 * 1000, l: 'minuto' },
      { n: 1000, l: 'segundo' },
    ];
    const u = units.find((u) => diff >= u.n) || units[units.length - 1];
    const vRaw = Math.floor(diff / u.n);
    const v = Math.max(1, vRaw);
    const pl =
      v !== 1
        ? u.l === 'día'
          ? 'días'
          : u.l === 'hora'
            ? 'horas'
            : u.l === 'minuto'
              ? 'minutos'
              : u.l === 'semana'
                ? 'semanas'
                : u.l === 'mes'
                  ? 'meses'
                  : 'segundos'
        : u.l;
    return `${v} ${pl}`;
  };
  const nowInput = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const renderTree = (list: Channel[], level = 0) => {
    return list.map((channel) => (
      <div key={channel.id} className="select-none">
        <div
          onClick={() => setSelectedChannel(channel)}
          className={`flex items-center gap-2 py-3 px-3 cursor-pointer transition-colors rounded-md ${
            selectedChannel?.id === channel.id
              ? 'bg-indigo-50 text-indigo-700'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          {channel.subchannels && channel.subchannels.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(channel.id);
              }}
              className="p-1.5 hover:bg-indigo-100 rounded touch-manipulation"
            >
              {expanded[channel.id] || filterText ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <span className="w-7" />
          )}

          <div className="relative">
            {channel.isHidden ? (
              <EyeOff size={16} className="text-gray-400" />
            ) : (
              <Globe size={16} className="text-gray-400" />
            )}
            {channel.isPublic ? null : (
              <Lock size={12} className="absolute -top-1 -right-1 text-amber-500" />
            )}
          </div>
          <span className="text-base md:text-sm font-medium truncate flex-1">
            {channel.title}
          </span>
        </div>

        {channel.subchannels && (expanded[channel.id] || filterText) && (
          <div className="border-l border-gray-200 ml-6">
            {renderTree(channel.subchannels, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading)
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col md:p-8">
        <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-28 bg-gray-200 rounded" />
              <div className="h-6 w-6 bg-gray-200 rounded" />
            </div>
            <div className="mb-3">
              <div className="h-8 w-full bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2 rounded">
                  <div className="h-4 w-4 bg-gray-200 rounded" />
                  <div className="h-4 w-4 bg-gray-200 rounded-full" />
                  <div className="h-4 w-44 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col relative">
      {/* Tree Sidebar */}
      <div className={`w-full h-full bg-white rounded-xl shadow-sm flex flex-col ${selectedChannel ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4 sticky top-0 z-10 bg-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{t('channels.title')}</h3>
            <div className="flex items-center gap-1">
              <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista de lista"
                >
                  <Table size={16} />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1 rounded-md transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Vista de tarjetas"
                >
                  <LayoutList size={16} />
                </button>
              </div>
              <button
                onClick={() => setShowCreate((prev) => !prev)}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t('channels.filterPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="p-0 md:p-1">
          {showCreate && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
              />
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="Website URL"
                className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="Instagram URL"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="Facebook URL"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.twitter}
                  onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  placeholder="Twitter URL"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.tiktok}
                  onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                  placeholder="TikTok URL"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
              </div>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="Logo image URL"
                className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
              />
              <div className="space-y-2">
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Icon (SF Symbol)"
                  className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                  {SF_SYMBOLS.filter((s) => s.includes(form.icon)).map((name) => (
                    <button
                      key={name}
                      onClick={() => setForm({ ...form, icon: name })}
                      className={`w-full text-left px-2 py-1 text-xs flex items-center gap-2 ${form.icon === name ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                    >
                      <IconView name={name} size={14} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Propietario</label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                >
                  <option value="">Selecciona un propietario</option>
                  {owners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Nombre de organización"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded col-span-2"
                />
                <input
                  value={orgNit}
                  onChange={(e) => setOrgNit(e.target.value)}
                  placeholder="NIT"
                  className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded"
                />
              </div>
              <div className="text-[11px] text-gray-500">
                Si no existe organización, se crea automáticamente con estos datos.
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  />{' '}
                  Public
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isHidden}
                    onChange={(e) => setForm({ ...form, isHidden: e.target.checked })}
                  />{' '}
                  Hidden
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={form.asSub}
                    onChange={(e) => setForm({ ...form, asSub: e.target.checked })}
                  />{' '}
                  Create as subchannel
                </label>
              </div>
              <button
                onClick={handleCreate}
                disabled={!ownerId || ((!orgName || !orgNit) && !selectedChannel?.organizationId)}
                className={`px-3 py-1.5 text-sm rounded ${!ownerId || ((!orgName || !orgNit) && !selectedChannel?.organizationId) ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
              >
                {t('channels.create')}
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 h-full overflow-y-auto p-2 space-y-1 custom-scrollbar md:m-6 ">
          {
            // viewMode === 'table' ? renderTree(filteredChannels) : 
            renderCards(filteredChannels) 
          }
        </div>
      </div>

      {/* Details Panel  --  w-full*/}
      <div className={` h-full md:m-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${selectedChannel ? 'flex' : 'hidden'}`}>
        {selectedChannel ? (
  detailsLoading ? (
    <div className="p-6 flex-1 overflow-y-auto animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="h-6 w-48 bg-gray-200 rounded" />
      </div>
      <div className="h-4 w-3/5 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <>
      {/* Tu contenido aquí cuando detailsLoading es false */}
      <div className="bg-white shrink-0 border-b border-gray-100 flex flex-col sticky top-0 z-10 rounded-t-xl">
        {/* Top Bar: Navigation & Actions */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                if (selectedChannel.parentId && parentChannel) {
                  setLastVisitedSubchannelId(selectedChannel.id);
                  setSelectedChannel(parentChannel);
                } else {
                  setSelectedChannel(null);
                }
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              title="Volver a la lista"
            >
              <ArrowLeft size={20} />
            </button>
            
            {/* Breadcrumbs or Compact Info */}
            <div className="flex items-center gap-2 overflow-hidden">
              {!isHeaderCompact ? (
                // Original Breadcrumbs for Expanded Mode
                <>
                  {parentChannel && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 truncate flex shrink-0">
                      <button
                        onClick={() => {
                          if (selectedChannel.parentId) {
                            setLastVisitedSubchannelId(selectedChannel.id);
                            setSelectedChannel(parentChannel);
                          } else {
                            setSelectedChannel(parentChannel);
                          }
                        }}
                        className="hover:underline hover:text-gray-700 truncate max-w-[150px]"
                      >
                        {parentChannel.title}
                      </button>
                      <ChevronRight size={14} className="shrink-0 text-gray-400" />
                    </div>
                  )}
                  <h2 className="text-base font-semibold text-gray-900 truncate">
                    {selectedChannel.parentId ? selectedChannel.title : 'Canales'}
                  </h2>
                </>
              ) : (
                // Compact Mode Info
                <div className="flex items-center gap-3">
                  {selectedChannel.logoUrl ? (
                    <img
                      src={selectedChannel.logoUrl}
                      alt={selectedChannel.title}
                      className="w-8 h-8 rounded-lg border border-gray-100 object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-100 shadow-sm">
                      {selectedChannel.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900 truncate">
                        {selectedChannel.title}
                      </h2>
                      <StatusBadge status={selectedChannel.verificationStatus} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        {selectedChannel.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                        {selectedChannel.isPublic ? 'Público' : 'Privado'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {selectedChannel.memberCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setHeaderLayout(prev => prev === 'inline' ? 'drawer' : 'inline')}
              className="hidden md:flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mr-2"
              title="Cambiar estilo de visualización"
            >
              {headerLayout === 'inline' ? <LayoutList size={14} /> : <Sidebar size={14} />}
              {headerLayout === 'inline' ? 'Expandible' : 'Lateral'}
            </button>
            <div className="relative">
              <button
                onClick={() => setSpeedDialOpen((v) => !v)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Compartir"
              >
                <Share2 size={20} />
              </button>
              {speedDialOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSpeedDialOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
                    <button
                      onClick={copyShare}
                      className="w-full flex items-center justify-between px-2 py-1 text-sm hover:bg-gray-50 rounded"
                    >
                      <span className="text-gray-600">Copiar enlace</span>
                      <span className="text-xs text-indigo-600">
                        {shareCopied ? 'Copiado' : ''}
                      </span>
                    </button>
                    <button
                      onClick={() => setQrTipOpen(true)}
                      className="w-full flex items-center justify-between px-2 py-1 text-sm hover:bg-gray-50 rounded mt-1"
                    >
                      <span className="text-gray-600">Código QR</span>
                      <QrCode size={16} className="text-indigo-600" />
                    </button>
                  </div>
                </>
              )}
              {qrTipOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQrTipOpen(false)} />
                  <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-900">Código QR</span>
                      <button
                        onClick={() => setQrTipOpen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div ref={qrRef} className="w-40 h-40 mx-auto" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate max-w-[9rem]">
                        {shareUrl}
                      </span>
                      <button
                        onClick={downloadQr}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Descargar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Configuración"
            >
              <Settings size={20} />
            </button>
            {/* Header Toggle Button (Only for Inline Mode) */}
            {headerLayout === 'inline' && (
              <button
                onClick={() => setIsHeaderCompact((prev) => !prev)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={isHeaderCompact ? "Expandir encabezado" : "Contraer encabezado"}
              >
                {isHeaderCompact ? <ChevronDown size={20} /> : <ChevronRight size={20} className="rotate-[-90deg]" />}
              </button>
            )}
          </div>
        </div>

        {/* Identity Section (Only in Expanded Mode and Inline Layout) */}
        {!isHeaderCompact && headerLayout === 'inline' && (
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-start gap-5">
            <div className="shrink-0">
              {selectedChannel.logoUrl ? (
                <img
                  src={selectedChannel.logoUrl}
                  alt={selectedChannel.title}
                  className="w-16 h-16 rounded-2xl border border-gray-100 object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-indigo-600 font-bold text-2xl border border-indigo-100 shadow-sm">
                  {selectedChannel.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-tight break-words">
                  {selectedChannel.title}
                </h2>
                <StatusBadge status={selectedChannel.verificationStatus} />
              </div>
              
              <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                <span
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                    selectedChannel.isPublic
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {selectedChannel.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  <span className="font-medium text-xs">{selectedChannel.isPublic ? 'Público' : 'Privado'}</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Users size={14} className="text-gray-400" />
                  {selectedChannel.memberCount || 0} miembros
                </span>
                {selectedChannel.referenceCode && (
                  <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 text-xs hidden sm:inline-block">
                    {selectedChannel.referenceCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      
      <div className="flex items-center px-4 border-b border-gray-100 overflow-x-auto shrink-0 scrollbar-hide">
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'messages'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessagesSquare size={16} />
          Mensajes
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Info size={16} />
          Detalles
        </button>
      </div>

      {/* Drawer Panel for Proposal 2 */}
      {headerLayout === 'drawer' && drawerOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-semibold text-gray-900">Detalles del Canal</h3>
            <button 
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex flex-col items-center text-center mb-6">
              {selectedChannel.logoUrl ? (
                <img
                  src={selectedChannel.logoUrl}
                  alt={selectedChannel.title}
                  className="w-20 h-20 rounded-2xl border border-gray-100 object-cover shadow-sm mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-indigo-600 font-bold text-3xl border border-indigo-100 shadow-sm mb-3">
                  {selectedChannel.title.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {selectedChannel.title}
              </h2>
              <StatusBadge status={selectedChannel.verificationStatus} />
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Información</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Visibilidad</span>
                    <span className="flex items-center gap-1.5 font-medium text-gray-900">
                      {selectedChannel.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                      {selectedChannel.isPublic ? 'Público' : 'Privado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Miembros</span>
                    <span className="flex items-center gap-1.5 font-medium text-gray-900">
                      <Users size={14} />
                      {selectedChannel.memberCount || 0}
                    </span>
                  </div>
                  {selectedChannel.referenceCode && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Código</span>
                      <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-700 text-xs">
                        {selectedChannel.referenceCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descripción</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedChannel.description || 'Sin descripción'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <button
                   onClick={() => setActiveTab('details')}
                   className="w-full py-2 px-4 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                 >
                   Ver configuración completa
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <>
        <div className="p-3 flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Info size={16} className="text-indigo-600" />
                    Información General
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-500 block">Descripción</span>
                      <p className="text-sm text-gray-800 mt-1">
                        {selectedChannel.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-500 block">Creado el</span>
                        <span className="text-sm text-gray-800">
                          {new Date(selectedChannel.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Código de Referencia</span>
                        <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                          {selectedChannel.referenceCode || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Miembros</span>
                        <span className="text-sm text-gray-800 flex items-center gap-1">
                          <Users size={12} className="text-gray-400" />
                          {selectedChannel.memberCount || 0}
                        </span>
                      </div>
                    </div>

                    {(selectedChannel.websiteUrl || (selectedChannel.socialLinks && Object.keys(selectedChannel.socialLinks).length > 0)) && (
                      <div className="pt-2 border-t border-gray-50 mt-2">
                        <span className="text-xs text-gray-500 block mb-2">Enlaces</span>
                        <div className="space-y-2">
                          {selectedChannel.websiteUrl && (
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-gray-400" />
                              <a href={selectedChannel.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">
                                {selectedChannel.websiteUrl}
                              </a>
                            </div>
                          )}
                          {selectedChannel.socialLinks && Object.entries(selectedChannel.socialLinks).map(([platform, url]) => (
                            <div key={platform} className="flex items-center gap-2">
                              <Link size={14} className="text-gray-400" />
                              <span className="text-xs text-gray-500 capitalize">{platform}:</span>
                              <a href={url as string} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">
                                {url as string}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>



                <div className="bg-white rounded-lg border border-gray-100 p-4 md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    Propiedad
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                        {selectedChannel.owner?.fullName?.charAt(0) ||
                          selectedChannel.owner?.username?.charAt(0) ||
                          'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedChannel.owner?.fullName ||
                            selectedChannel.owner?.username ||
                            'Desconocido'}
                        </div>
                        <div className="text-xs text-gray-500">Propietario del Canal</div>
                        <div className="text-xs text-gray-400 mt-0.5">ID: {selectedChannel.ownerId}</div>
                      </div>
                    </div>
                    {selectedChannel.organizationId && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
                          <RadioTower size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Organización
                          </div>
                          <div className="text-xs text-gray-500">ID: {selectedChannel.organizationId}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="px-3 py-4">
              <div className="relative w-full bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 border border-gray-200 rounded-full p-1 bg-white shadow-sm">
                  {(['1h', '24h', '7d', '1m', 'all'] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => setStatsRange(key)}
                      className={`px-2 py-1 text-xs rounded-full ${statsRange === key ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {key === '1h'
                        ? t('stats.range.1h')
                        : key === '24h'
                          ? t('stats.range.24h')
                          : key === '7d'
                            ? t('stats.range.7d')
                            : key === '1m'
                              ? t('stats.range.1m')
                              : t('stats.range.all')}
                    </button>
                  ))}
                </div>
                <ChannelStatsPanel channelId={selectedChannel.id} range={statsRange} />
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <>
              <div className="">
              <div className={`${selectedChannel?.parentId ? 'hidden' : ''}`}>
                {subLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={`sk-${i}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            <div className="h-3 w-1/2 bg-gray-200 rounded" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                          <div className="h-8 bg-gray-200 rounded" />
                          <div className="h-8 bg-gray-200 rounded" />
                          <div className="h-8 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : subItems && subItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {subItems.map((sc) => (
                        <motion.div
                          key={sc.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -2 }}
                          className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${
                            lastVisitedSubchannelId === sc.id
                              ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-100'
                              : 'bg-white border-gray-200'
                          }`}
                          onClick={() => setSelectedChannel(sc as any)}
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                             <ChevronRight size={16} className="text-gray-400" />
                          </div>
                          
                          <div className="flex flex-col space-y-3">
                            {/* Main Title Row */}
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors text-indigo-600">
                                <IconView name={sc.icon} size={24} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 truncate" title={sc.title}>
                                    {sc.title}
                                  </h4>
                                  {selectedChannel.subchannels &&
                                    selectedChannel.subchannels[0]?.id === sc.id && (
                                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center">
                                        <Target size={10} className="mr-1" /> Defecto
                                      </span>
                                    )}
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                {(sc.counts?.unread || 0) > 0 && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm" title="Mensajes sin leer" />
                                )}
                                {(sc.counts?.pending || 0) > 0 && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white shadow-sm" title="Pendientes" />
                                )}
                              </div>
                            </div>

                            {/* Stats Rows */}
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-50">
                              {/* Members Row */}
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 transition-colors group/stat"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubsForSub(sc.id);
                                  setSubsModalOpen(true);
                                  setSubsPage(1);
                                  setSubsSearch('');
                                }}
                              >
                                <div className="text-gray-400 group-hover/stat:text-indigo-600 transition-colors">
                                  <Users size={20} />
                                </div>
                                <div className="h-6 w-px bg-gray-200" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] text-gray-500 font-medium truncate">Miembros</span>
                                  <span className="text-sm font-bold text-gray-900 leading-none">
                                    {sc.memberCount.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Approvers Row */}
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 transition-colors group/stat"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApproverTipSub(sc as any);
                                  setApproverModalOpen(true);
                                  fetchPreviewData(sc.id);
                                }}
                              >
                                <div className="text-gray-400 group-hover/stat:text-purple-600 transition-colors">
                                  <ShieldCheck size={20} />
                                </div>
                                <div className="h-6 w-px bg-gray-200" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] text-gray-500 font-medium truncate">Aprobadores</span>
                                  <span className="text-sm font-bold text-gray-900 leading-none">
                                    {sc.counts?.approvers ?? 0}
                                  </span>
                                </div>
                              </div>

                              {/* Pending Row */}
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 transition-colors group/stat"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingForSub(sc.id);
                                  setPendingModalOpen(true);
                                  setPendingPage(1);
                                }}
                              >
                                <div className="text-gray-400 group-hover/stat:text-amber-600 transition-colors">
                                  <Hourglass size={20} />
                                </div>
                                <div className="h-6 w-px bg-gray-200" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] text-gray-500 font-medium truncate">Pendientes</span>
                                  <span className="text-sm font-bold text-gray-900 leading-none">
                                    {sc.counts?.pending ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                               <div className="text-[10px] text-gray-400 truncate max-w-[100px]">
                                 ID: {sc.id.slice(0, 8)}
                               </div>
                               <button
                                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMessagesForSub(sc.id);
                                    setMessagesModalOpen(true);
                                    setMessagesPage(1);
                                    setMessagesLoading(true);
                                    api
                                      .getChannelMessages(sc.id, 1, messagesLimit, {
                                        quick: 'all',
                                        start:
                                          statsRange === '1h'
                                            ? new Date(Date.now() - 3600000).toISOString()
                                            : statsRange === '24h'
                                              ? new Date(Date.now() - 86400000).toISOString()
                                              : statsRange === '7d'
                                                ? new Date(Date.now() - 7 * 86400000).toISOString()
                                                : statsRange === '1m'
                                                  ? new Date(
                                                      Date.now() - 30 * 86400000
                                                    ).toISOString()
                                                  : undefined,
                                      })
                                      .then((res) => {
                                        setMessagesItems(res.messages as any);
                                        setMessagesPages(res.pagination.pages);
                                        setMessagesLoading(false);
                                      })
                                      .catch(() => setMessagesLoading(false));
                                  }}
                               >
                                 <MessagesSquare size={14} />
                                 Mensajes
                               </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ListTree size={24} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{t('channels.approvers_empty')}</h3>
                    <p className="text-gray-500 mt-1 max-w-sm mx-auto text-sm">
                      No hay subcanales en este momento.
                    </p>
                  </div>
                )}
              </div>

              {!selectedChannel?.parentId && (
                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={subPage <= 1}
                      onClick={() => setSubPage((p) => p - 1)}
                      className={`px-3 py-1.5 text-sm rounded border ${subPage <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-500">
                      Página {subPage} de {subPages}
                    </span>
                    <button
                      disabled={subPage >= subPages}
                      onClick={() => setSubPage((p) => p + 1)}
                      className={`px-3 py-1.5 text-sm rounded border ${subPage >= subPages ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Siguiente
                    </button>
                  </div>
                  {!showSubCreate ? (
                    <button
                      onClick={() => {
                        setShowSubCreate(true);
                        setSubTitle('');
                        setSubDesc('');
                        setSubIcon('');
                      }}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded"
                    >
                      {t('channels.createSubchannel')}
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <input
                        value={subTitle}
                        onChange={(e) => setSubTitle(e.target.value)}
                        placeholder="Título del subcanal"
                        className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded col-span-3"
                      />
                      <input
                        value={subDesc}
                        onChange={(e) => setSubDesc(e.target.value)}
                        placeholder="Descripción"
                        className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded col-span-3"
                      />
                      <input
                        value={subIcon}
                        onChange={(e) => setSubIcon(e.target.value)}
                        placeholder="Icono (SF Symbol)"
                        className="px-2 py-1 text-base md:text-sm border border-gray-300 rounded col-span-3"
                      />
                      <div className="max-h-24 overflow-y-auto border border-gray-200 rounded col-span-3">
                        {SF_SYMBOLS.filter((s) => s.includes(subIcon))
                          .slice(0, 25)
                          .map((name) => (
                            <button
                              key={name}
                              onClick={() => setSubIcon(name)}
                              className={`w-full text-left px-2 py-1 text-xs flex items-center gap-2 ${subIcon === name ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                            >
                              <IconView name={name} size={14} />
                              <span>{name}</span>
                            </button>
                          ))}
                      </div>
                      <div className="col-span-3 flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setShowSubCreate(false)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateSubInline}
                          disabled={!subTitle}
                          className={`px-3 py-1.5 text-sm rounded ${!subTitle ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
                        >
                          {t('channels.createSubchannel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

            {approverModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <ShieldCheck size={20} className="text-purple-200" />
                        {t('channels.approvers')}
                      </h3>
                      <p className="text-xs text-indigo-100 opacity-90 mt-1">
                        Gestión de aprobadores del subcanal
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setApproverModalOpen(false);
                        setApproverTipOpen(false);
                      }}
                      className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="mb-3"></div>
                    <Autocomplete
                      multiple
                      disablePortal
                      openOnFocus
                      clearOnBlur={false}
                      selectOnFocus
                      filterSelectedOptions
                      disableClearable
                      loading={approverEligibleLoading}
                      noOptionsText="Escribe para buscar inscritos"
                      options={approverEligible
                        .filter(
                          (opt) =>
                            !(approverTipList || []).some((a) => a.userId === opt.user?.id)
                        )
                        .filter((opt) =>
                          approverAddSearch
                            ? (opt.user?.fullName || '')
                              .toLowerCase()
                              .includes(approverAddSearch.toLowerCase()) ||
                            (opt.user?.username || '')
                              .toLowerCase()
                              .includes(approverAddSearch.toLowerCase())
                            : true
                        )
                        .slice(0, 10)}
                      getOptionLabel={(s) => s.user?.fullName || s.user?.username || ''}
                      isOptionEqualToValue={(a, b) => a.user?.id === b.user?.id}
                      getOptionDisabled={() => false}
                      value={approverPendingAdds.map(
                        (p) =>
                          approverEligible.find((s) => s.user?.id === p.id) || {
                            id: p.id,
                            user: { id: p.id, fullName: p.name, username: '' },
                          }
                      )}
                      inputValue={approverAddSearch}
                      onInputChange={(e, v) => setApproverAddSearch(v)}
                      onChange={(e, value) => {
                        const pending = value.map((v) => ({
                          id: v.user!.id,
                          name: v.user!.fullName || v.user!.username,
                        }));
                        setApproverPendingAdds(pending);
                      }}
                      ListboxProps={{ style: { maxHeight: 180, overflowY: 'auto' } }}
                      sx={{ width: '100%' }}
                      slotProps={{ popper: { placement: 'bottom-start' } }}
                      PopperComponent={(props) => (
                        <Popper
                          {...props}
                          placement="bottom-start"
                          modifiers={[
                            { name: 'preventOverflow', enabled: false },
                            { name: 'flip', enabled: false },
                            { name: 'offset', options: { offset: [0, 8] } },
                          ]}
                          style={{ width: (props.anchorEl as any)?.clientWidth }}
                        />
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Busca y selecciona inscritos"
                          size="small"
                          fullWidth
                        />
                      )}
                    />
                    <div className="mt-3 flex items-center justify-end">
                      {approverPendingAdds.length > 0 && (
                        <button
                          onClick={() => setApproverAuthorizeOpen(true)}
                          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded"
                        >
                          Autorizar seleccionados
                        </button>
                      )}
                    </div>

                    <hr className="my-4 border-gray-200" />
                    {approverLoading ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-10 bg-gray-100 rounded" />
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                          {(approverTipList || [])
                            .filter((a) =>
                              (a.user?.fullName || a.userId)
                                .toLowerCase()
                                .includes(approverSearch.toLowerCase())
                            )
                            .map((a) => (
                              <div
                                key={a.id}
                                className="py-3 flex items-center justify-between"
                              >
                                <button
                                  onClick={() => {
                                    setApproverProfileUserId(a.userId);
                                    setApproverProfileOpen(true);
                                  }}
                                  className="text-left text-sm text-gray-700 font-medium hover:underline"
                                >
                                  {a.user?.fullName || a.userId}{' '}
                                  <span className="text-gray-400 text-xs font-normal">
                                      @{a.user?.username}
                                    </span>
                                </button>
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      setApproverRemoveAnchorEl(
                                        e.currentTarget as HTMLElement
                                      );
                                      setApproverRemoveId(a.userId);
                                    }}
                                    className="p-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded inline-flex items-center justify-center"
                                    aria-label={t('channels.remove')}
                                    title={t('channels.remove')}
                                  >
                                    <Trash size={14} />
                                  </button>
                                  {approverRemoveId === a.userId && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[900] bg-black/30 transition-opacity duration-200"
                                        onClick={() =>
                                          !approverRemoveLoading && setApproverRemoveId(null)
                                        }
                                      />
                                      <Popper
                                        open
                                        placement="bottom-end"
                                        anchorEl={approverRemoveAnchorEl}
                                        style={{ zIndex: 1000 }}
                                      >
                                        <div className="relative bg-white border border-gray-200 rounded shadow-lg p-2">
                                          <div className="absolute -top-1 right-3 w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45"></div>
                                          <div className="text-xs text-gray-700 mb-2">
                                            ¿Eliminar aprobador?
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => setApproverRemoveId(null)}
                                              disabled={approverRemoveLoading}
                                              className="px-2 py-1 text-xs border border-gray-300 rounded"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (!approverTipSub || !approverRemoveId)
                                                  return;
                                                setApproverRemoveLoading(true);
                                                try {
                                                  await api.removeChannelApprover(
                                                    approverTipSub.id,
                                                    approverRemoveId
                                                  );
                                                  const fresh = await api.getChannelDetails(
                                                    approverTipSub.id
                                                  );
                                                  setApproverTipList(fresh.approvers || []);
                                                  if (
                                                    selectedChannel &&
                                                    !selectedChannel.parentId
                                                  ) {
                                                    try {
                                                      const res = await api.getSubchannels(
                                                        selectedChannel.id,
                                                        subPage,
                                                        subLimit
                                                      );
                                                      setSubItems(res.items || []);
                                                      setSubPages(res.pagination?.pages || 1);
                                                    } catch {}
                                                  }
                                                } finally {
                                                  setApproverRemoveLoading(false);
                                                  setApproverRemoveId(null);
                                                }
                                              }}
                                              disabled={approverRemoveLoading}
                                              className="px-2 py-1 text-xs bg-red-600 text-white rounded inline-flex items-center gap-1"
                                            >
                                              {approverRemoveLoading ? (
                                                <Loader2 size={14} className="animate-spin" />
                                              ) : null}{' '}
                                              Confirmar
                                            </button>
                                          </div>
                                        </div>
                                      </Popper>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          {(!approverTipList || approverTipList.length === 0) && (
                            <div className="py-4 text-sm text-gray-400 text-center">
                              {t('channels.approvers_empty')}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 border-t border-gray-100 pt-4">
                          {approverAuthorizeOpen && (
                            <div className="fixed inset-0 z-50">
                              <div
                                className="absolute inset-0 bg-black/20"
                                onClick={() =>
                                  !approverAddLoading && setApproverAuthorizeOpen(false)
                                }
                              />
                              <div className="absolute left-1/2 -translate-x-1/2 top-1/3 bg-white rounded-lg shadow-lg border border-gray-200 w-[420px] p-4">
                                <div className="text-sm text-gray-800 mb-3">
                                  ¿Autorizar aprobadores para el canal {approverTipSub?.title}
                                  ?
                                </div>
                                <div className="max-h-32 overflow-y-auto text-xs text-gray-700 mb-3">
                                  {approverPendingAdds.map((p) => (
                                    <div key={p.id} className="py-1">
                                      {p.name}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      !approverAddLoading && setApproverAuthorizeOpen(false)
                                    }
                                    disabled={approverAddLoading}
                                    className="px-3 py-1.5 text-xs border border-gray-300 rounded"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!approverTipSub || approverAddLoading) return;
                                      setApproverAddLoading(true);
                                      try {
                                        for (const p of approverPendingAdds) {
                                          try {
                                            await api.addChannelApprover(
                                              approverTipSub.id,
                                              p.id
                                            );
                                          } catch {}
                                        }
                                        const fresh = await api.getChannelDetails(
                                          approverTipSub.id
                                        );
                                        setApproverTipList(fresh.approvers || []);
                                        const res = await api.getChannelSubscribers(
                                          approverTipSub.id,
                                          1,
                                          20,
                                          approverAddSearch
                                        );
                                        setApproverEligible(res.items || []);
                                        setApproverPendingAdds([]);
                                        setApproverAuthorizeOpen(false);
                                        if (selectedChannel && !selectedChannel.parentId) {
                                          try {
                                            const r = await api.getSubchannels(
                                              selectedChannel.id,
                                              subPage,
                                              subLimit
                                            );
                                            setSubItems(r.items || []);
                                            setSubPages(r.pagination?.pages || 1);
                                          } catch {}
                                        }
                                      } finally {
                                        setApproverAddLoading(false);
                                      }
                                    }}
                                    disabled={approverAddLoading}
                                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded inline-flex items-center gap-1"
                                  >
                                    {approverAddLoading ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : null}{' '}
                                    Confirmar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {approverProfileOpen && (
                            <div className="fixed inset-0 z-50">
                              <div
                                className="absolute inset-0 bg-black/30"
                                onClick={() => setApproverProfileOpen(false)}
                              />
                              <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Users size={18} className="text-indigo-600" />
                                    <span className="text-sm font-semibold text-gray-900">
                                        Perfil
                                      </span>
                                  </div>
                                  <button
                                    onClick={() => setApproverProfileOpen(false)}
                                    className="p-2 rounded hover:bg-gray-50 text-gray-500"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <div className="p-4 h-full overflow-y-auto">
                                  {approverProfileLoading ? (
                                    <div className="space-y-3 animate-pulse">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                                        <div className="h-4 w-40 bg-gray-200 rounded" />
                                      </div>
                                      <div className="h-4 w-3/5 bg-gray-200 rounded" />
                                      <div className="h-4 w-1/2 bg-gray-200 rounded" />
                                      <div className="h-4 w-1/3 bg-gray-200 rounded" />
                                      <div className="h-5 w-24 bg-gray-200 rounded" />
                                      <div className="h-5 w-24 bg-gray-200 rounded" />
                                    </div>
                                  ) : approverProfile ? (
                                    <>
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                          <Users size={18} />
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {approverProfile.fullName ||
                                              approverProfile.username}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            @{approverProfile.username}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="p-2 rounded border bg-white">
                                          <div className="text-[11px] text-gray-500">
                                            Suscripciones
                                          </div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {approverProfile.subscribedChannelsCount?.toLocaleString?.() ||
                                              0}
                                          </div>
                                        </div>
                                        <div className="p-2 rounded border bg-white">
                                          <div className="text-[11px] text-gray-500">
                                            Canales propios
                                          </div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {approverProfile.ownedChannelsCount?.toLocaleString?.() ||
                                              0}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mb-3 text-xs font-semibold text-gray-700">
                                        Asignaciones como aprobador
                                      </div>
                                      <div className="space-y-2 mb-4">
                                        {approverProfileApprovers.length === 0 ? (
                                          <div className="text-xs text-gray-400">
                                            Sin asignaciones
                                          </div>
                                        ) : (
                                          approverProfileApprovers.map((ap) => (
                                            <div
                                              key={ap.id}
                                              className="p-2 rounded border bg-white flex items-center justify-between"
                                            >
                                              <div className="flex items-center gap-2">
                                                <IconView
                                                  name={ap.channel?.icon}
                                                  size={14}
                                                  className="text-gray-500"
                                                />
                                                <div className="text-sm text-gray-800">
                                                  {ap.channel?.title}
                                                </div>
                                              </div>
                                              {ap.channel?.parentId ? (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center">
                                                    Subcanal
                                                  </span>
                                              ) : null}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                      <div className="mb-3 text-xs font-semibold text-gray-700">
                                        Suscripciones
                                      </div>
                                      <div className="space-y-2">
                                        {approverProfileSubs.length === 0 ? (
                                          <div className="text-xs text-gray-400">
                                            Sin suscripciones activas
                                          </div>
                                        ) : (
                                          approverProfileSubs.map((s) => (
                                            <div
                                              key={s.id}
                                              className="p-2 rounded border bg-white flex items-center gap-2"
                                            >
                                              <IconView
                                                name={s.channel?.icon}
                                                size={14}
                                                className="text-gray-500"
                                              />
                                              <div className="text-sm text-gray-800">
                                                {s.channel?.title}
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-xs text-gray-400">
                                      No se pudo cargar el perfil
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {subsModalOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Inscritos</h3>
                      <p className="text-xs text-gray-500">
                        Usuarios inscritos en el subcanal
                      </p>
                    </div>
                    <button
                      onClick={() => setSubsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6">
                    <input
                      value={subsSearch}
                      onChange={(e) => setSubsSearch(e.target.value)}
                      placeholder="Buscar usuario..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3"
                    />
                    {subsLoading ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-10 bg-gray-100 rounded" />
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                        {subsItems.map((s) => (
                          <div key={s.id} className="py-2 flex items-center justify-between">
                            <div className="text-sm text-gray-700 font-medium">
                              {s.user?.fullName || s.user?.username || s.user?.email}{' '}
                              <span className="text-gray-400 text-xs font-normal">
                                  @{s.user?.username}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <Clock size={12} className="inline-block mr-1 text-gray-400" />
                              {`hace ${relativeFrom(s.subscribedAt)}`}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                {formatLocal(s.subscribedAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {subsItems.length === 0 && (
                          <div className="py-4 text-sm text-gray-400 text-center">
                            Sin inscritos
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={subsPage <= 1}
                          onClick={() => setSubsPage((p) => p - 1)}
                          className={`px-3 py-1.5 text-sm rounded border ${subsPage <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            Página {subsPage} de {subsPages}
                          </span>
                        <button
                          disabled={subsPage >= subsPages}
                          onClick={() => setSubsPage((p) => p + 1)}
                          className={`px-3 py-1.5 text-sm rounded border ${subsPage >= subsPages ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Siguiente
                        </button>
                      </div>
                      <div />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pendingModalOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-gray-200 max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pendientes por aprobar
                      </h3>
                      <p className="text-xs text-gray-500">
                        Mensajes en espera de aprobación
                      </p>
                    </div>
                    <button
                      onClick={() => setPendingModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                    {pendingLoading ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded" />
                        ))}
                      </div>
                    ) : messagesFilter.priority && messagesFilter.emergency === true ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center">
                        <MessageSquarePlus size={48} className="text-gray-300 mb-2" />
                        <div className="text-sm font-medium text-gray-900">
                          Los mensajes emergentes no tienen clasificación de prioridad
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Quita el filtro de prioridad o desmarca emergente
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingItems.map((m) => (
                          <div
                            key={m.id}
                            className={`p-4 rounded-lg border ${m.isEmergency ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">
                                {m.channel?.title || selectedChannel?.title || 'Canal'}
                              </div>
                              <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full border ${m.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : m.priority === 'LOW' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                                  >
                                    {m.priority === 'HIGH'
                                      ? t('priority.high')
                                      : m.priority === 'LOW'
                                        ? t('priority.low')
                                        : t('priority.medium')}
                                  </span>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-800">{m.content}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-500" />
                                {m.sender?.fullName ||
                                  m.sender?.username ||
                                  'Desconocido'} · {timeTo(m.createdAt)}
                              </div>
                              {m.eventAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} className="text-indigo-600" />
                                  Evento {timeTo(m.eventAt)}
                                </div>
                              )}
                              {m.expiresAt && (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} className="text-amber-600" />
                                  Expira {timeTo(m.expiresAt)}
                                </div>
                              )}
                              {m.isEmergency && (
                                <div className="flex items-center gap-1 text-amber-700">
                                  <AlertTriangle size={12} />
                                  Emergencia
                                </div>
                              )}
                              <ApproverSpeedDial messageId={m.id} channelId={m.channelId} />
                            </div>
                          </div>
                        ))}
                        {pendingItems.length === 0 && (
                          <div className="py-4 text-sm text-gray-400 text-center">
                            Sin pendientes
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={pendingPage <= 1}
                          onClick={() => setPendingPage((p) => p - 1)}
                          className={`px-3 py-1.5 text-sm rounded border ${pendingPage <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                            Página {pendingPage} de {pendingPages}
                          </span>
                        <button
                          disabled={pendingPage >= pendingPages}
                          onClick={() => setPendingPage((p) => p + 1)}
                          className={`px-3 py-1.5 text-sm rounded border ${pendingPage >= pendingPages ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          Siguiente
                        </button>
                      </div>
                      <div />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(messagesModalOpen || activeTab === 'messages') && (
              <div
                className={`${(activeTab === 'messages') ? ' v-full h-full static bg-transparent z-auto' : 'fixed inset-0 bg-black/40 z-50'} flex items-center justify-center`}
              >
                <div
                  className={`bg-white w-full h-full v-full flex flex-col overflow-hidden ${(activeTab === 'messages') ? '' : 'max-w-3xl'} rounded-xl`}
                >
                  <div className="p-2 border-b border-gray-100 flex items-center justify-between gap-2 bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-2 shrink-0">
                      
                      <button
                        onClick={() => setShowChannelSearch(true)}
                        className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors group -ml-2"
                      >
                        <span className="mx-1">Subcanal:</span> 
                        <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[100px] sm:max-w-[150px]">
                        {(() => {
                          const subId = messagesModalOpen
                            ? messagesForSub
                            : (selectedChannel?.parentId && activeTab === 'messages')
                              ? selectedChannel?.id
                              : (activeTab === 'messages' && selectedChannel && !selectedChannel.parentId)
                                ? selectedChannel?.subchannels?.[0]?.id
                                : null;

                          if (!subId) return selectedChannel?.title;
                          if (subId === selectedChannel?.id) return selectedChannel?.title;
                          const sub = selectedChannel?.subchannels?.find(s => s.id === subId);
                          return sub ? sub.title : selectedChannel?.title;
                        })()}
                      </h3>
                      <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <div className="relative group">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search size={12} />
                            </div>
                            <input
                                value={messagesSearch}
                                onChange={(e) => setMessagesSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-24 sm:w-32 md:w-48 pl-7 pr-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:bg-white focus:border-indigo-300 transition-all"
                            />
                            {messagesSearch && (
                                <button onClick={() => setMessagesSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              setRangeMenuOpen((v) => !v);
                              setRangeMenuAnchorEl(e.currentTarget as HTMLElement);
                            }}
                            className="px-6 py-1 rounded border border-gray-300 bg-white text-[10px] text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                          >
                            {statsRange === '1h'
                              ? '1 Hora'
                              : statsRange === '24h'
                                ? '24 Horas'
                                : statsRange === '7d'
                                  ? '1 Semana'
                                  : statsRange === '1m'
                                    ? '1 Mes'
                                    : 'Historico'}
                            <ChevronDown size={10} className="text-gray-500" />
                          </button>
                          {rangeMenuOpen && (
                            <Popper
                              open
                              placement="bottom-start"
                              anchorEl={rangeMenuAnchorEl}
                              style={{ zIndex: 1000 }}
                            >
                              <div className="bg-white border border-gray-200 rounded shadow p-1 text-xs">
                                <button onClick={() => { setStatsRange('1h'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1 H</button>
                                <button onClick={() => { setStatsRange('24h'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">24 H</button>
                                <button onClick={() => { setStatsRange('7d'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1 Semana</button>
                                <button onClick={() => { setStatsRange('1m'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1 Mes</button>
                                <button onClick={() => { setStatsRange('all'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">Histórico</button>
                              </div>
                            </Popper>
                          )}
                      </div>
                        
                        <div className="hidden md:flex items-center border border-gray-200 rounded overflow-hidden">
                          <button
                            onClick={() => { setMessagesFilter(prev => ({ ...prev, priority: (prev.priority === MessagePriority.LOW ? undefined : MessagePriority.LOW) as MessagePriority | undefined })); setMessagesQuick('all'); }}
                            className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${messagesFilter.priority === MessagePriority.LOW ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Baja
                          </button>
                          <div className="w-px h-full bg-gray-200" />
                          <button
                            onClick={() => { setMessagesFilter(prev => ({ ...prev, priority: (prev.priority === MessagePriority.MEDIUM ? undefined : MessagePriority.MEDIUM) as MessagePriority | undefined })); setMessagesQuick('all'); }}
                            className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${messagesFilter.priority === MessagePriority.MEDIUM ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            Media
                          </button>
                          <div className="w-px h-full bg-gray-200" />
                          <button
                            onClick={() => { setMessagesFilter(prev => ({ ...prev, priority: (prev.priority === MessagePriority.HIGH ? undefined : MessagePriority.HIGH) as MessagePriority | undefined })); setMessagesQuick('all'); }}
                            className={`px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${messagesFilter.priority === MessagePriority.HIGH ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Alta
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium ${messagesFilter.emergency ? 'text-red-600' : 'text-gray-600'}`}>Prioritario</span>
                            <button
                                onClick={() => { setMessagesFilter(prev => ({ ...prev, emergency: !prev.emergency })); setMessagesQuick('all'); }}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${messagesFilter.emergency ? 'bg-red-600' : 'bg-gray-200'}`}
                                title="Prioritario"
                            >
                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${messagesFilter.emergency ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        <button
                          className={`p-1 rounded hover:bg-gray-100 ${messagesFilterOpen ? 'bg-slate-100 text-indigo-600' : 'text-gray-400'}`}
                          onClick={() => setMessagesFilterOpen((o) => !o)}
                          title="Filtros avanzados (Estado y Aprobaciones)"
                        >
                          <Settings size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {!selectedChannel?.parentId && (
                          <button
                            onClick={() => {
                              setMessagesSearch('');
                              setMessagesQuick('all');
                              setMessagesFilter({ priority: undefined, emergency: undefined, expired: undefined, hasApprovals: undefined });
                              setMessagesFilterOpen(false);
                              setMessagesPage(1);
                              setMessagesModalOpen(false);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-full"
                          >
                            <X size={14} />
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Advanced Filters Section */}
                  {messagesFilterOpen && (
                    <div className="bg-slate-50 border-b border-gray-200 p-2 flex flex-wrap items-center justify-center gap-4 animate-in slide-in-from-top-1 fade-in duration-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Vigencia:</span>
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200">
                              <span className={`text-[10px] ${!messagesFilter.expired ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>Vigentes</span>
                              <button
                                onClick={() => { setMessagesFilter(prev => ({ ...prev, expired: !prev.expired })); setMessagesQuick('all'); }}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${messagesFilter.expired ? 'bg-slate-600' : 'bg-emerald-500'}`}
                              >
                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${messagesFilter.expired ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                              </button>
                              <span className={`text-[10px] ${messagesFilter.expired ? 'text-slate-600 font-medium' : 'text-gray-400'}`}>Expirados</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Aprobaciones:</span>
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200">
                              <button
                                onClick={() => { setMessagesFilter(prev => ({ ...prev, hasApprovals: !prev.hasApprovals })); setMessagesQuick('all'); }}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${messagesFilter.hasApprovals ? 'bg-indigo-600' : 'bg-gray-200'}`}
                              >
                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${messagesFilter.hasApprovals ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                              </button>
                              <span className={`text-[10px] ${messagesFilter.hasApprovals ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>Requeridas</span>
                          </div>
                        </div>
                    </div>
                  )}

                  <div className="p-4 flex-1 overflow-y-auto">
                    {messagesLoading ? (
                      <div className="animate-pulse space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messagesItems.map((m) => (
                          <div
                            key={m.id}
                            className={`relative overflow-hidden p-4 rounded-lg border ${m.isEmergency ? 'bg-gradient-to-br from-red-50 via-white to-rose-100 border-red-200' : new Date(m.expiresAt) > new Date() ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
                            onMouseEnter={() => {
                              try {
                                api.viewMessage(m.id);
                              } catch {}
                            }}
                          >
                            {m.isEmergency && (
                              <span className="pointer-events-none absolute inset-0 rounded-lg bg-red-300/10 animate-pulse"></span>
                            )}
                            <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
                                <span className="text-[10px] text-gray-500">
                                  Vistas: {m.viewsCount ?? (m._count?.views || 0)}
                                </span>
                              {m.eventAt && (
                                <span className="relative inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEventTipId(eventTipId === m.id ? null : m.id)
                                      }
                                      className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                                      aria-label="Ver fecha exacta"
                                    >
                                      <Calendar
                                        size={12}
                                        className={
                                          new Date(m.eventAt) <= new Date()
                                            ? 'text-red-600'
                                            : 'text-indigo-600'
                                        }
                                      />
                                    </button>
                                    <span
                                      className={
                                        new Date(m.eventAt) <= new Date()
                                          ? 'text-red-600'
                                          : 'text-gray-500'
                                      }
                                    >
                                      {new Date(m.eventAt) <= new Date()
                                        ? `hace: ${(relativeFrom(m.eventAt) || '')
                                          .replace(/\b(en|hace)\b\s*/, '')
                                          .replace(/segundos?/, 's')
                                          .replace(/minutos?/, 'min')
                                          .replace(/horas?/, 'h')
                                          .replace(/días?/, 'd')
                                          .replace(/mes(es)?/, 'm')
                                          .replace(/años?/, 'a')}`
                                        : `en: ${(relativeIn(m.eventAt) || '')
                                          .replace(/segundos?/, 's')
                                          .replace(/minutos?/, 'min')
                                          .replace(/horas?/, 'h')
                                          .replace(/días?/, 'd')
                                          .replace(/mes(es)?/, 'm')
                                          .replace(/años?/, 'a')}`}
                                    </span>
                                  {eventTipId === m.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setEventTipId(null)}
                                      />
                                      <div className="absolute right-0 top-full z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                                        <span className="font-semibold">Evento:</span>{' '}
                                        {formatLocal(m.eventAt)}
                                      </div>
                                    </>
                                  )}
                                  </span>
                              )}
                              {(!m.state || m.state === 'ACTIVE') &&
                                m.expiresAt &&
                                new Date(m.expiresAt) > new Date() &&
                                (m.sender?.id || m.senderId) === api.getCurrentUserId() && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.cancelMessage(m.id);
                                        setMessagesItems((prev) =>
                                          prev.map((x) =>
                                            x.id === m.id
                                              ? {
                                                ...x,
                                                state: 'CANCELLED',
                                                expiresAt: new Date().toISOString(),
                                              }
                                              : x
                                          )
                                        );
                                      } catch {}
                                    }}
                                    className="px-2 py-1 rounded border text-xs text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    Cancelar
                                  </button>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-900 font-bold">
                                  {m.channel?.title || 'Canal'}
                                </div>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border ${m.isEmergency ? 'bg-red-50 text-red-700 border-red-200' : m.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : m.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                                >
                                    {m.isEmergency
                                      ? 'Prioritario'
                                      : m.priority === 'HIGH'
                                        ? 'Alta'
                                        : m.priority === 'MEDIUM'
                                          ? 'Media'
                                          : 'Baja'}
                                  </span>
                                {m.state === 'CANCELLED' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-100 text-gray-700 border-gray-200">
                                      Cancelado
                                    </span>
                                )}
                                {m.extra?.type === 'comunicado' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                                    <FileText size={10} />
                                    Comunicado
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                    hace:{' '}
                                  {(relativeFrom(m.createdAt) || '')
                                    .replace(/\b(en|hace)\b\s*/, '')
                                    .replace(/segundos?/, 's')
                                    .replace(/minutos?/, 'min')
                                    .replace(/horas?/, 'h')
                                    .replace(/días?/, 'd')
                                    .replace(/mes(es)?/, 'm')
                                    .replace(/años?/, 'a')}
                                  </span>
                              </div>
                              <div />
                            </div>

                            <div className="mt-2 text-sm text-gray-800 flex items-start gap-2">
                              <div className="group relative mt-1.5 shrink-0">
                                <div className={`w-2 h-2 rounded-full ${m.isEmergency ? 'bg-red-600' : m.priority === 'HIGH' ? 'bg-red-500' : m.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  {m.isEmergency ? 'Prioritario' : m.priority === 'HIGH' ? 'Alta' : m.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                              <div className="break-words min-w-0 flex-1">{m.content}</div>
                            </div>
                            {m.extra?.type === 'comunicado' && (
                              <div className="mt-2 mb-2">
                                <button
                                  onClick={() => setViewingComunicado(m)}
                                  className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                                >
                                  <Eye size={14} />
                                  Ver comunicado oficial
                                </button>
                              </div>
                            )}
                            {m.extra && m.extra.schedule && Array.isArray(m.extra.schedule) && m.extra.schedule.length > 0 && expandedSchedules[m.id] && (
                              <div className="mt-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="space-y-2">
                                  {m.extra.schedule
                                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((item: any, idx: number) => (
                                      <div key={idx} className="flex gap-3 text-xs group items-center">
                                        <button
                                          onClick={() => {
                                            setCalendarConfirmEvent(item);
                                            setCalendarConfirmOpen(true);
                                          }}
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                          title="Agregar a calendario"
                                        >
                                          <CalendarPlus size={14} />
                                        </button>
                                        <div className="w-24 shrink-0 flex flex-col">
                                          <span className="font-medium text-gray-900">
                                            {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                                          </span>
                                          {item.time && (
                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                              <Clock size={10} />
                                              {item.time}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex-1 text-gray-700 relative">
                                          <div className="absolute -left-2 top-1.5 w-1 h-1 rounded-full bg-indigo-300"></div>
                                          {item.activity}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                            {m.extra && m.extra.location && (m.extra.location.markers?.length > 0 || m.extra.location.polylines?.length > 0) && expandedLocations[m.id] && (
                              <div className="mt-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                                   <MapContainer
                                    center={
                                      m.extra.location.markers?.[0] || 
                                      (Array.isArray(m.extra.location.polylines?.[0]) 
                                        ? m.extra.location.polylines?.[0]?.[0] 
                                        : m.extra.location.polylines?.[0]?.points?.[0]) || 
                                      [0, 0]
                                    }
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                  >
                                    <TileLayer
                                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    {m.extra.location.markers?.map((pos: [number, number], idx: number) => (
                                      <Marker key={idx} position={pos} />
                                    ))}
                                    {m.extra.location.polylines?.map((poly: any, idx: number) => (
                                      <Polyline 
                                        key={idx} 
                                        positions={Array.isArray(poly) ? poly : poly.points} 
                                        color={Array.isArray(poly) ? "#4F46E5" : poly.color} 
                                      />
                                    ))}
                                  </MapContainer>
                                </div>
                              </div>
                            )}
                            {m.extra && m.extra.attachments && m.extra.attachments.length > 0 && expandedAttachments[m.id] && (
                              <div className="mt-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="grid grid-cols-1 gap-2">
                                  {m.extra.attachments.map((att: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-2 bg-white rounded border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                                    >
                                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
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
                                      <div className="text-indigo-400 group-hover:text-indigo-600">
                                        <Download size={16} />
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-3 -mx-4 -mb-4 px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                              {m.expiresAt && (
                                <span className="relative inline-flex items-center gap-1 mr-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpiresTipId(expiresTipId === m.id ? null : m.id)
                                      }
                                      className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                                      aria-label="Ver fecha exacta"
                                    >
                                      <Hourglass size={12} className="text-gray-500" />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-500">
                                      {(relativeIn(m.expiresAt) || '')
                                        .replace(/en:\s*/, '')
                                        .replace(/segundos?/, 's')
                                        .replace(/minutos?/, 'min')
                                        .replace(/horas?/, 'h')
                                        .replace(/días?/, 'd')
                                        .replace(/mes(es)?/, 'm')
                                        .replace(/años?/, 'a')}
                                    </span>
                                  {expiresTipId === m.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setExpiresTipId(null)}
                                      />
                                      <div className="absolute left-0 top-full z-50 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
                                        <span className="font-semibold">Expira:</span>{' '}
                                        {formatLocal(m.expiresAt)}
                                      </div>
                                    </>
                                  )}
                                  </span>
                              )}
                              {m.extra && m.extra.schedule && Array.isArray(m.extra.schedule) && m.extra.schedule.length > 0 && (
                                <button
                                  onClick={() => setExpandedSchedules(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border transition-colors mr-2 ${expandedSchedules[m.id] ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                >
                                  <Calendar size={12} />
                                  <span>{expandedSchedules[m.id] ? 'Ocultar Horario' : 'Ver Horario'}</span>
                                </button>
                              )}
                              {m.extra && m.extra.location && (m.extra.location.markers?.length > 0 || m.extra.location.polylines?.length > 0) && (
                                <button
                                  onClick={() => setExpandedLocations(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border transition-colors mr-2 ${expandedLocations[m.id] ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                >
                                  <MapPin size={12} />
                                  <span>{expandedLocations[m.id] ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
                                </button>
                              )}
                              {m.extra && m.extra.attachments && m.extra.attachments.length > 0 && (
                                <button
                                  onClick={() => setExpandedAttachments(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border transition-colors mr-2 ${expandedAttachments[m.id] ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                >
                                  <Paperclip size={12} />
                                  <span>{expandedAttachments[m.id] ? 'Ocultar Adjuntos' : 'Ver Adjuntos'}</span>
                                </button>
                              )}
                              {(m.approvals || []).length > 0 && (
  <button
    onClick={() => setExpandedApprovers(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
    className="ml-auto mr-1 inline-flex items-center gap-1 text-purple-600 transition-all hover:text-purple-700 hover:scale-110"
  >
    <Shield 
      size={14} 
      className={`${expandedApprovers[m.id] ? 'animate-pulse' : 'animate-[pulse_2s_ease-in-out_infinite]'}`}
      strokeWidth={2.5}
    />
  </button>
)}
                              {expandedApprovers[m.id] && (m.approvals || []).map((a) =>
                                a.status === 'APPROVED' ? (
                                  <span
                                    key={a.userId}
                                    className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-white border border-green-200 px-1.5 py-0.5 rounded"
                                  >
                                      <CheckIcon size={12} className="text-green-700" />{' '}
                                    <button
                                      className="hover:underline"
                                      onMouseEnter={(e) => {
                                        setApproverHoverUserId(a.user?.id || a.approverId);
                                        setApproverHoverAnchorEl(
                                          e.currentTarget as HTMLElement
                                        );
                                      }}
                                      onMouseLeave={() => {
                                        setApproverHoverUserId(null);
                                        setApproverHoverAnchorEl(null);
                                      }}
                                    >
                                        {a.approver?.fullName ||
                                          a.user?.fullName ||
                                          a.approver?.username ||
                                          a.user?.username ||
                                          a.approverId}
                                      </button>
                                    {approverHoverUserId === (a.user?.id || a.approverId) && (
                                      <Popper
                                        open
                                        placement="top"
                                        anchorEl={approverHoverAnchorEl}
                                        style={{ zIndex: 1000 }}
                                      >
                                        <div className="text-[10px] px-2 py-1 rounded bg-gray-900 text-white shadow">
                                          @{a.approver?.username || a.user?.username || ''}
                                        </div>
                                      </Popper>
                                    )}
                                    {a.removed && (
                                      <span className="text-[10px] text-gray-500">
                                          (removido)
                                        </span>
                                    )}
                                    </span>
                                ) : a.status === 'REJECTED' ? (
                                  <span
                                    key={a.userId}
                                    className="inline-flex items-center gap-1 text-[11px] text-red-700 bg-white border border-red-200 px-1.5 py-0.5 rounded"
                                  >
                                      <X size={12} className="text-red-700" />{' '}
                                    <button
                                      className="hover:underline"
                                      onMouseEnter={(e) => {
                                        setApproverHoverUserId(a.user?.id || a.approverId);
                                        setApproverHoverAnchorEl(
                                          e.currentTarget as HTMLElement
                                        );
                                      }}
                                      onMouseLeave={() => {
                                        setApproverHoverUserId(null);
                                        setApproverHoverAnchorEl(null);
                                      }}
                                    >
                                        {a.approver?.fullName ||
                                          a.user?.fullName ||
                                          a.approver?.username ||
                                          a.user?.username ||
                                          a.approverId}
                                      </button>
                                    {approverHoverUserId === (a.user?.id || a.approverId) && (
                                      <Popper
                                        open
                                        placement="top"
                                        anchorEl={approverHoverAnchorEl}
                                        style={{ zIndex: 1000 }}
                                      >
                                        <div className="text-[10px] px-2 py-1 rounded bg-gray-900 text-white shadow">
                                          @{a.approver?.username || a.user?.username || ''}
                                        </div>
                                      </Popper>
                                    )}
                                    {a.removed && (
                                      <span className="text-[10px] text-gray-500">
                                          (removido)
                                        </span>
                                    )}
                                    </span>
                                ) : m.expiresAt && new Date(m.expiresAt) <= new Date() ? (
                                  <span
                                    key={a.userId}
                                    className="inline-flex items-center gap-1 text-[11px] text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded"
                                  >
                                      <Hourglass size={12} className="text-red-600" />{' '}
                                    <button
                                      className="hover:underline"
                                      onMouseEnter={(e) => {
                                        setApproverHoverUserId(a.user?.id || a.approverId);
                                        setApproverHoverAnchorEl(
                                          e.currentTarget as HTMLElement
                                        );
                                      }}
                                      onMouseLeave={() => {
                                        setApproverHoverUserId(null);
                                        setApproverHoverAnchorEl(null);
                                      }}
                                    >
                                        {a.approver?.fullName ||
                                          a.user?.fullName ||
                                          a.approver?.username ||
                                          a.user?.username ||
                                          a.approverId}
                                      </button>
                                    {approverHoverUserId === (a.user?.id || a.approverId) && (
                                      <Popper
                                        open
                                        placement="top"
                                        anchorEl={approverHoverAnchorEl}
                                        style={{ zIndex: 1000 }}
                                      >
                                        <div className="text-[10px] px-2 py-1 rounded bg-gray-900 text-white shadow">
                                          @{a.approver?.username || a.user?.username || ''}
                                        </div>
                                      </Popper>
                                    )}
                                    {a.removed && (
                                      <span className="text-[10px] text-gray-500">
                                          (removido)
                                        </span>
                                    )}
                                    </span>
                                ) : (
                                  <span
                                    key={a.userId}
                                    className="relative inline-flex items-center gap-1 text-[11px] text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded group"
                                  >
                                      <Clock size={12} className="text-gray-700 cursor-help" />{' '}
                                    <button
                                      className="hover:underline"
                                      onMouseEnter={(e) => {
                                        setApproverHoverUserId(a.user?.id || a.approverId);
                                        setApproverHoverAnchorEl(
                                          e.currentTarget as HTMLElement
                                        );
                                      }}
                                      onMouseLeave={() => {
                                        setApproverHoverUserId(null);
                                        setApproverHoverAnchorEl(null);
                                      }}
                                    >
                                        {a.approver?.fullName ||
                                          a.user?.fullName ||
                                          a.approver?.username ||
                                          a.user?.username ||
                                          a.approverId}
                                      </button>
                                    {approverHoverUserId === (a.user?.id || a.approverId) && (
                                      <Popper
                                        open
                                        placement="top"
                                        anchorEl={approverHoverAnchorEl}
                                        style={{ zIndex: 1000 }}
                                      >
                                        <div className="text-[10px] px-2 py-1 rounded bg-gray-900 text-white shadow">
                                          @{a.approver?.username || a.user?.username || ''}
                                        </div>
                                      </Popper>
                                    )}
                                    {a.removed && (
                                      <span className="text-[10px] text-gray-500">
                                          (removido)
                                        </span>
                                    )}
                                    {m.expiresAt && (
                                      <div className=" hidden absolute left-0 top-full mt-1 bg-gray-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                        Aún tiene{' '}
                                        {(relativeIn(m.expiresAt) || '')
                                          .replace(/en:\s*/, '')
                                          .replace(/segundos?/, 's')
                                          .replace(/minutos?/, 'min')
                                          .replace(/horas?/, 'h')
                                          .replace(/días?/, 'd')
                                          .replace(/mes(es)?/, 'm')
                                          .replace(/años?/, 'a')}{' '}
                                        para aprobarlo
                                      </div>
                                    )}
                                    </span>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                        {messagesItems.length === 0 && (
                          <div className="py-8 text-center text-gray-500">
                            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full">
                              <MessagesSquare size={42} className="text-gray-300" />
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">
                                  Aún no encontramos mensajes con este filtro
                                </span>
                            </div>
                            <div className="text-sm mt-1 mb-10 ">Intenta con otro filtro</div>

                            <div className="text-sm mt-5 ">
                              Si consideras que esto fue un error haznoslo saber aquí, con un
                              solo click
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              
              </div>
              )}


              <button
                onClick={openCompose}
                className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-[100]"
                title="Nuevo Mensaje"
              >
                <Plus size={24} />
              </button>

          {showCompose && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white relative shrink-0">
                  <button
                    onClick={closeComposeAutoSave}
                    className="absolute top-4 right-4 text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                        <Send size={24} className="text-white" />
                      </div>
                      <div className="flex flex-col text-left">
                         <h3 className="text-xl font-bold">{t('compose.title')}</h3>
                         {selectedChannel && (
                           <div className="flex items-center gap-1.5 text-indigo-100 text-sm mt-0.5">
                              {selectedChannel.parentId && (
                                <>
                                  <span className="opacity-80 font-medium">
                                    {channels.find(c => c.id === selectedChannel.parentId)?.title || 'Canal Principal'}
                                  </span>
                                  <ChevronRight size={12} className="opacity-60" />
                                </>
                              )}
                              <span className="font-bold text-white tracking-wide">
                                {selectedChannel.title}
                              </span>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-3 space-y-6 overflow-y-auto flex-1">
                  <div className="mb-6 -mx-6 bg-gray-50 border-b border-gray-100">
                    <div className="p-4 pt-0 flex flex-col gap-4">
                        {/* Header: Add Actions & Audience */}
                        <div className="flex items-center justify-between relative z-20">
                            <div className="relative">
                                <button
                                    onClick={() => setAddMenuOpen(!addMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    <Plus size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wide">Añadir</span>
                                    <ChevronDown size={14} className={`transition-transform ${addMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {addMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            <div className="p-1.5 flex flex-col gap-0.5">
                                                <button onClick={() => { setIsScheduleModalOpen(true); setAddMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors text-gray-700">
                                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-sm font-semibold">Horario</span><span className="text-[10px] text-gray-500">Adjuntar eventos</span></div>
                                                </button>
                                                <button onClick={() => { fileInputRef.current?.click(); setAddMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors text-gray-700">
                                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Paperclip size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-sm font-semibold">Archivo</span><span className="text-[10px] text-gray-500">Fotos, docs, pdf</span></div>
                                                </button>
                                                <button onClick={() => { setIsComunicadoModalOpen(true); setAddMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors text-gray-700">
                                                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><FileText size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-sm font-semibold">Comunicado</span><span className="text-[10px] text-gray-500">Plantilla oficial</span></div>
                                                </button>
                                                <button onClick={() => setAddMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors text-gray-700">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Link size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-sm font-semibold">Enlace</span><span className="text-[10px] text-gray-500">URL externa</span></div>
                                                </button>
                                                <button onClick={() => { setShowLocationPicker(true); setAddMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition-colors text-gray-700">
                                                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><MapPin size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-sm font-semibold">Ubicación</span><span className="text-[10px] text-gray-500">Compartir sitio</span></div>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <button
                               type="button"
                               onClick={() => {
                                 if (selectedChannel) setApproverTipSub(selectedChannel as any);
                                 setApproverModalOpen(true);
                               }}
                               className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:border-indigo-200 transition-all"
                            >
                               <div className="p-1 bg-gray-100 rounded-md group-hover:bg-indigo-50 transition-colors">
                                   <Users size={14} className="text-gray-500 group-hover:text-indigo-600" />
                               </div>
                               <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-700">Configurar Audiencia</span>
                            </button>
                        </div>

                        {/* Controls: Priority & Schedule */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            {/* Priority - Proposal 1 Style */}
                            <div className="flex items-center bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex rounded-lg bg-gray-100 p-1" role="group">
                                    {[MessagePriority.LOW, MessagePriority.MEDIUM, MessagePriority.HIGH].map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        disabled={composeIsEmergency}
                                        onClick={() => setComposePriority(p)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                          composePriority === p
                                            ? p === MessagePriority.LOW
                                              ? 'bg-blue-100 text-blue-700 shadow-sm'
                                              : p === MessagePriority.MEDIUM
                                                ? 'bg-yellow-100 text-yellow-800 shadow-sm'
                                                : 'bg-red-100 text-red-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        } ${composeIsEmergency ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            p === MessagePriority.LOW
                                              ? 'bg-blue-500'
                                              : p === MessagePriority.MEDIUM
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                          }`} />
                                          {p === MessagePriority.LOW ? t('priority.low') : p === MessagePriority.MEDIUM ? t('priority.medium') : t('priority.high')}
                                        </div>
                                      </button>
                                    ))}
                                </div>
                                <div className="w-px h-5 bg-gray-200 mx-3"></div>
                                <div className="flex items-center gap-2 pr-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${composeIsEmergency ? 'text-red-600' : 'text-gray-500'}`}>Prioritario</span>
                                    <button
                                       onClick={() => setComposeIsEmergency(!composeIsEmergency)}
                                       className={`w-9 h-5 rounded-full transition-colors relative ${composeIsEmergency ? 'bg-red-500' : 'bg-gray-200'}`}
                                    >
                                       <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${composeIsEmergency ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
                                    </button>
                                </div>
                            </div>

                            {/* Schedule - Compact Proposal 2 Style */}
                            <div className="flex-1 min-w-[200px] flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2 pl-3 shadow-sm relative overflow-hidden group">
                               <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-indigo-50 to-transparent opacity-50"></div>
                               <div className="flex items-center gap-3 relative z-10">
                                   <div className={`p-1.5 rounded-lg ${composeSendAt ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                       <Clock size={16} />
                                   </div>
                                   <div className="flex flex-col">
                                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">Programación</span>
                                       <span className="text-xs font-bold text-gray-900 leading-none">
                                           {composeSendAt ? dayjs(composeSendAt).format('D MMM, HH:mm') : 'Enviar Ahora'}
                                       </span>
                                       {composeSendAt && (
                                            <span className="text-[10px] font-medium text-indigo-600 mt-0.5">
                                                {relativeIn(composeSendAt)}
                                            </span>
                                       )}
                                   </div>
                               </div>
                               <button 
                                 ref={sendAnchorRef}
                                 onClick={() => setSendPickerOpen(true)} 
                                 className="relative z-10 px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                               >
                                  {composeSendAt ? 'Cambiar' : 'Programar'}
                               </button>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div
                    className={`relative overflow-hidden bg-gradient-to-br ${composeIsEmergency ? 'from-red-50 via-white to-rose-100 border-red-200' : 'from-indigo-50 via-white to-emerald-50 border-gray-200'} p-5 rounded-lg border min-h-[200px]`}
                  >
                    <div className="relative mt-4">
                      {(!composeContent) && (
                        <div className="absolute inset-0 pointer-events-none text-xl font-bold text-gray-400">
                          Escribe tu mensaje
                          <span className="animate-pulse">|</span>
                        </div>
                      )}
                      <textarea
                        value={composeContent}
                        onChange={(e) => setComposeContent(e.target.value)}
                        placeholder=""
                        rows={4}
                        className="w-full bg-transparent border-none p-0 text-xl font-bold text-gray-900 focus:ring-0 focus:outline-none resize-none placeholder-transparent"
                      />
                      {composeComunicado && (
                        <div className="mt-4 bg-amber-50/50 rounded-lg p-4 border border-amber-100 relative group">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 mb-1">
                                {comunicadoTitle || 'Comunicado sin título'}
                              </h4>
                              <div className="text-xs text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: composeComunicado }} />
                            </div>
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setIsComunicadoModalOpen(true)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Editar"
                              >
                                <Settings size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setComposeComunicado(null);
                                  setComunicadoTitle('');
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {composeLocationData && (composeLocationData.markers.length > 0 || composeLocationData.polylines.length > 0) && (
                        <div className="mt-4 bg-emerald-50/50 rounded-lg p-4 border border-emerald-100 relative group">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
                              <MapPin size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 mb-1">
                                Ubicación Adjunta
                              </h4>
                              <div className="text-xs text-gray-500">
                                {composeLocationData.markers.length} marcadores, {composeLocationData.polylines.length} rutas
                              </div>
                              <button
                                onClick={() => setShowLocationPicker(true)}
                                className="text-xs text-indigo-600 font-medium hover:underline mt-1 flex items-center gap-1"
                              >
                                <Eye size={12} />
                                Vista Previa
                              </button>
                            </div>
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setShowLocationPicker(true)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Editar"
                              >
                                <Settings size={14} />
                              </button>
                              <button
                                onClick={() => setComposeLocationData(null)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {composeSchedule.length > 0 && (
                        <div className="mt-4 bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
                          <h4 className="text-xs font-semibold text-indigo-900 mb-3 flex items-center gap-1.5">
                            <Calendar size={14} className="text-indigo-600" />
                            Horario Adjunto
                          </h4>
                          <div className="space-y-3">
                            {composeSchedule
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((item, idx) => (
                                <div key={idx} className="flex gap-4 text-sm group">
                                  <div className="w-32 shrink-0 flex flex-col">
                                    <span className="font-medium text-gray-900">
                                      {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                                    </span>
                                    {item.time && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={10} />
                                        {item.time}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 text-gray-700 relative">
                                    <div className="absolute -left-2 top-1.5 w-1 h-1 rounded-full bg-indigo-300"></div>
                                    {item.activity}
                                  </div>
                                  <button
                                    onClick={() => setComposeSchedule(prev => prev.filter((_, i) => i !== idx))}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleComposeAIAssist}
                        disabled={composeIsGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white text-indigo-600 rounded-md text-sm font-medium transition-colors disabled:opacity-50 shadow-sm backdrop-blur-sm"
                      >
                        <Sparkles size={14} />
                        {composeIsGenerating ? t('ai.drafting') : t('ai.polish')}
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      {composeIsEmergency ? (
                        <div className="relative inline-flex items-center"></div>
                      ) : (
                        composeSendAt && (
                          <span className="inline-flex items-center gap-1">
                                      <Clock size={12} className="text-gray-600" />
                                      <span className="text-gray-500">{relativeIn(composeSendAt)}</span>
                                    </span>
                        )
                      )}
                      {composeEventAt && (
                        <span className="inline-flex items-center gap-1">
                                    <Calendar
                                      size={12}
                                      className={
                                        new Date(composeEventAt) <= new Date()
                                          ? 'text-red-600'
                                          : 'text-indigo-600'
                                      }
                                    />
                                    <span
                                      className={
                                        new Date(composeEventAt) <= new Date()
                                          ? 'text-red-600'
                                          : 'text-gray-500'
                                      }
                                    >
                                      {new Date(composeEventAt) <= new Date()
                                        ? `hace: ${(relativeFrom(composeEventAt) || '')
                                          .replace(/\b(en|hace)\b\s*/, '')
                                          .replace(/segundos?/, 's')
                                          .replace(/minutos?/, 'min')
                                          .replace(/horas?/, 'h')
                                          .replace(/días?/, 'd')
                                          .replace(/mes(es)?/, 'm')
                                          .replace(/años?/, 'a')}`
                                        : relativeIn(composeEventAt) || ''}
                                    </span>
                                  </span>
                      )}
                      {composeExpiresAt && (
                        <span className="inline-flex items-center gap-1">
                                    <Hourglass size={12} className="text-amber-600" />
                                    <span className="text-gray-500">{relativeIn(composeExpiresAt)}</span>
                                  </span>
                      )}
                    </div>
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <div className="flex items-center gap-6 text-xs text-gray-700">
                          {!composeIsEmergency && (
                            <>
                              <DateTimePicker
                                value={composeSendAt ? dayjs(composeSendAt) : null}
                                onChange={(v) => setComposeSendAt(v ? v.toISOString() : '')}
                                minDateTime={dayjs()}
                                maxDateTime={
                                  composeEventAt && composeExpiresAt
                                    ? new Date(composeEventAt) < new Date(composeExpiresAt)
                                      ? dayjs(composeEventAt)
                                      : dayjs(composeExpiresAt)
                                    : composeEventAt
                                      ? dayjs(composeEventAt)
                                      : composeExpiresAt
                                        ? dayjs(composeExpiresAt)
                                        : undefined
                                }
                                open={sendPickerOpen}
                                onClose={() => setSendPickerOpen(false)}
                                slotProps={{
                                  popper: {
                                    anchorEl: sendAnchorRef.current,
                                    placement: 'bottom-start',
                                  },
                                  textField: { sx: { display: 'none' } },
                                }}
                              />
                            </>
                          )}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t('schedule.eventAt')}</span>
                              <button
                                ref={eventAnchorRef}
                                onClick={() => setEventPickerOpen(true)}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                              >
                                <Calendar size={14} />
                              </button>
                            </div>
                            <DateTimePicker
                              value={composeEventAt ? dayjs(composeEventAt) : null}
                              onChange={(v) => setComposeEventAt(v ? v.toISOString() : '')}
                              minDateTime={
                                composeSendAt || composeExpiresAt
                                  ? dayjs(
                                    new Date(
                                      Math.max(
                                        composeSendAt
                                          ? new Date(composeSendAt).getTime()
                                          : Date.now(),
                                        composeExpiresAt
                                          ? new Date(composeExpiresAt).getTime()
                                          : Date.now()
                                      )
                                    )
                                  )
                                  : dayjs()
                              }
                              open={eventPickerOpen}
                              onClose={() => setEventPickerOpen(false)}
                              slotProps={{
                                popper: {
                                  anchorEl: eventAnchorRef.current,
                                  placement: 'bottom-start',
                                },
                                textField: { sx: { display: 'none' } },
                              }}
                            />
                            <div className="text-[11px] text-gray-500">
                              -- {composeEventAt ? formatLocal(composeEventAt) : ''}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t('schedule.expiresAt')}</span>
                              <button
                                ref={expiresAnchorRef}
                                onClick={() => setExpiresPickerOpen(true)}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                              >
                                <Hourglass size={14} />
                              </button>
                            </div>
                            <DateTimePicker
                              value={composeExpiresAt ? dayjs(composeExpiresAt) : null}
                              onChange={(v) => setComposeExpiresAt(v ? v.toISOString() : '')}
                              minDateTime={composeSendAt ? dayjs(composeSendAt) : dayjs()}
                              maxDateTime={composeEventAt ? dayjs(composeEventAt) : undefined}
                              open={expiresPickerOpen}
                              onClose={() => setExpiresPickerOpen(false)}
                              slotProps={{
                                popper: {
                                  anchorEl: expiresAnchorRef.current,
                                  placement: 'bottom-start',
                                },
                                textField: { sx: { display: 'none' } },
                              }}
                            />
                            <div className="text-[11px] text-gray-500">
                              -- {composeExpiresAt ? formatLocal(composeExpiresAt) : ''}
                            </div>
                          </div>
                        </div>
                      </LocalizationProvider>
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700"></span>
                          <div className="flex items-center gap-2">
                          </div>
                        </div>
                        {composeAttachments.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {composeAttachments.map((a, i) => (
                              <li
                                key={`${a.name}-${i}`}
                                className="text-xs text-gray-600 flex items-center justify-between gap-3 p-2 bg-gray-50/50 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="shrink-0 p-1.5 bg-white rounded-md border border-gray-100 shadow-sm">
                                    {a.uploading ? (
                                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                                    ) : (
                                      getFileIcon(a.name)
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="truncate font-medium text-gray-700" title={a.name}>{a.name}</span>
                                    {a.uploading ? (
                                      <span className="text-[10px] text-indigo-600 flex items-center gap-1 animate-pulse">
                                        Subiendo...
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400">
                                        {a.size ? (a.size / 1024).toFixed(0) + ' KB' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Quitar archivo"
                                  onClick={() =>
                                    setComposeAttachments((prev) =>
                                      prev.filter((_, idx) => idx !== i)
                                    )
                                  }
                                >
                                  <Trash size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {
                        /*composeComunicado && (
                          <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-100 flex items-center justify-between group animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <FileText size={18} />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{comunicadoTitle || 'Sin título'}</h4>
                                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                  Comunicado adjunto
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsComunicadoModalOpen(true)}
                                className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                title="Editar comunicado"
                              >
                                <Settings size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setComposeComunicado(null);
                                  setComunicadoTitle('');
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Quitar comunicado"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        )
                          */}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button
                      onClick={saveDraft}
                      className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Save size={18} />
                      <span className="hidden sm:inline">Guardar Borrador</span>
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={cancelCompose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        ref={sendButtonRef}
                        onClick={sendCompose}
                        disabled={composeSending}
                        className={`px-8 py-2.5 ${composeIsEmergency ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200'} text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 relative transform hover:-translate-y-0.5`}
                      >
                        {composeSending ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Send size={18} />
                        )}
                        Enviar Mensaje
                      </button>
                    </div>
                    {composeIsEmergency && sendButtonRef?.current && (
                      <span
                        className="fixed z-[100] pointer-events-none rounded-lg bg-red-300/10 animate-ping"
                        style={{
                          top: sendButtonRef.current.getBoundingClientRect().top - 2,
                          left: sendButtonRef.current.getBoundingClientRect().left - 2,
                          width: sendButtonRef.current.getBoundingClientRect().width + 4,
                          height: sendButtonRef.current.getBoundingClientRect().height + 4,
                        }}
                      />
                    )}
                  </div>
                </div>
                </motion.div>
                </div>
              )}
        
        </div>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar size={20} className="text-purple-200" />
                    Adjuntar Horario
                  </h3>
                  <p className="text-xs text-indigo-100 opacity-90 mt-1">
                    Define la disponibilidad o agenda
                  </p>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setScheduleWeekMode(true)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      scheduleWeekMode
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Semana Completa
                  </button>
                  <button
                    onClick={() => setScheduleWeekMode(false)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      !scheduleWeekMode
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Fechas Específicas
                  </button>
                </div>

                {scheduleWeekMode ? (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Inicio de la semana</label>
                      <input
                        type="date"
                        value={scheduleStartDate}
                        onChange={(e) => setScheduleStartDate(e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(scheduleStartDate);
                        d.setDate(d.getDate() + i + 1); // Adjust roughly to avoid timezone issues, or better:
                        // Proper way: treat scheduleStartDate as YYYY-MM-DD local.
                        const [y, m, day] = scheduleStartDate.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, day + i);
                        const dateStr = dateObj.toLocaleDateString('sv').split('T')[0]; // ISO YYYY-MM-DD local

                        const existing = composeSchedule.find((s) => s.date === dateStr);

                        return (
                          <div
                            key={i}
                            className="flex gap-4 items-start p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                          >
                            <div className="w-28 shrink-0 pt-2 text-sm font-medium text-gray-900 capitalize">
                              {dateObj.toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                placeholder="Actividad (ej. Reunión)"
                                className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                value={existing?.activity || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setComposeSchedule((prev) => {
                                    const filtered = prev.filter((p) => p.date !== dateStr);
                                    if (!val) return filtered;
                                    return [
                                      ...filtered,
                                      { date: dateStr, time: existing?.time, activity: val },
                                    ];
                                  });
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <input
                                  type="time"
                                  className="p-1 text-xs border border-gray-200 rounded-md text-gray-600 bg-white"
                                  value={existing?.time || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setComposeSchedule((prev) => {
                                      const curr = prev.find((p) => p.date === dateStr);
                                      if (!curr && !val) return prev;
                                      const filtered = prev.filter((p) => p.date !== dateStr);
                                      // If no activity yet but time is set, create entry
                                      if (!curr) {
                                          return [...filtered, { date: dateStr, time: val, activity: '' }];
                                      }
                                      return [...filtered, { ...curr, time: val }];
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fecha</label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full p-2 border border-gray-200 rounded-lg"
                          id="custom-date-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Hora (Opcional)
                        </label>
                        <input
                          type="time"
                          className="w-full p-2 border border-gray-200 rounded-lg"
                          id="custom-time-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Actividad</label>
                      <textarea
                        className="w-full p-2 border border-gray-200 rounded-lg h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Describe la actividad..."
                        id="custom-activity-input"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const d = (
                          document.getElementById('custom-date-input') as HTMLInputElement
                        ).value;
                        const t = (
                          document.getElementById('custom-time-input') as HTMLInputElement
                        ).value;
                        const a = (
                          document.getElementById('custom-activity-input') as HTMLInputElement
                        ).value;
                        if (d && a) {
                          setComposeSchedule((prev) => [
                            ...prev,
                            { date: d, time: t, activity: a },
                          ]);
                          (
                            document.getElementById('custom-activity-input') as HTMLInputElement
                          ).value = '';
                          // Optional: Clear date/time or keep for convenience
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors border border-indigo-100"
                    >
                      + Agregar al Horario
                    </button>

                    <div className="space-y-3 mt-6">
                      <h4 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-2">
                        Items Agregados ({composeSchedule.length})
                      </h4>
                      {composeSchedule.length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">No hay items agregados</div>
                      )}
                      {composeSchedule
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-start p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
                          >
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {new Date(item.date).toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                                {item.time && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {item.time}
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-600">{item.activity}</div>
                            </div>
                            <button
                              onClick={() =>
                                setComposeSchedule((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50 shrink-0">
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-indigo-200 shadow-lg transition-all"
                >
                  Confirmar y Volver
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isSettingsModalOpen && selectedChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  Configuración y Estado
                </h3>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Visibilidad</span>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${selectedChannel.isPublic ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}
                      >
                        {selectedChannel.isPublic ? 'Público' : 'Privado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Búsqueda</span>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${!selectedChannel.isHidden ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                      >
                        {!selectedChannel.isHidden ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Búsqueda Exacta</span>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${selectedChannel.searchExactOnly ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                      >
                        {selectedChannel.searchExactOnly ? 'Activado' : 'Desactivado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Política de Aprobación</span>
                      <PolicyBadge policy={selectedChannel.approvalPolicy} />
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-gray-700">Estado de Verificación</span>
                      <StatusBadge status={selectedChannel.verificationStatus} />
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    </>
  )
) : (
  <div className="flex-1 flex items-center justify-center text-gray-400">
    {t('channels.selectPrompt')}
  </div>
)}
      </div>
      {subchannelModalOpen && currentSubchannelParent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full h-full max-w-7xl rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <IconView name={currentSubchannelParent.icon} size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">{currentSubchannelParent.title}</h3>
                    {currentSubchannelParent.description && (
                      <p className="text-sm text-gray-500 mt-1">{currentSubchannelParent.description}</p>
                    )}
                 </div>
              </div>
              <button
                onClick={() => setSubchannelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
               {currentSubchannelParent.subchannels && currentSubchannelParent.subchannels.length > 0 ? (
                  renderCards(currentSubchannelParent.subchannels)
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                       <ListTree size={32} />
                    </div>
                    <p>No hay subcanales disponibles</p>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
      {calendarConfirmOpen && calendarConfirmEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white text-center relative">
              <button
                 onClick={() => setCalendarConfirmOpen(false)}
                 className="absolute top-4 right-4 text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CalendarPlus size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold">Agregar al Calendario</h3>
              <p className="text-indigo-100 text-sm mt-1">Descarga y sincroniza tu evento</p>
            </div>
            
            <div className="p-6">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center bg-white rounded-lg border border-indigo-100 p-2 min-w-[60px] shadow-sm">
                     <span className="text-xs font-bold text-indigo-600 uppercase">
                       {new Date(calendarConfirmEvent.date).toLocaleDateString('es-ES', { month: 'short' })}
                     </span>
                     <span className="text-xl font-bold text-gray-900">
                       {new Date(calendarConfirmEvent.date).getDate()}
                     </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 line-clamp-2">{calendarConfirmEvent.activity}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      {calendarConfirmEvent.time && (
                        <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                          <Clock size={12} /> {calendarConfirmEvent.time}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                         <Calendar size={12} /> {new Date(calendarConfirmEvent.date).toLocaleDateString('es-ES', { weekday: 'long' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center mb-6 px-4">
                Se descargará un archivo <strong>.ics</strong>. Al abrirlo, el evento se añadirá automáticamente a tu calendario predeterminado (Google Calendar, Outlook, iCal).
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setCalendarConfirmOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (calendarConfirmEvent) {
                      downloadIcs(calendarConfirmEvent);
                      setCalendarConfirmOpen(false);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <CalendarPlus size={18} />
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {isComunicadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Redactar Comunicado</h3>
                  <p className="text-xs text-gray-500">Documento oficial con formato enriquecido</p>
                </div>
              </div>
              <button
                onClick={() => setIsComunicadoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 flex flex-col gap-4">
              <div className="flex justify-between items-end gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-gray-700">Título del Comunicado</label>
                  <input
                    type="text"
                    value={comunicadoTitle}
                    onChange={(e) => setComunicadoTitle(e.target.value)}
                    placeholder="Ej. Actualización de Políticas de Seguridad"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => setIsHeaderFooterModalOpen(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2 h-[42px]"
                  title="Personalizar Encabezado y Pie de Página"
                >
                  <LayoutTemplate size={18} />
                  <span className="hidden sm:inline">Diseño</span>
                </button>
              </div>
              
              <div className="flex-1 flex flex-col space-y-2 min-h-[300px] items-center bg-gray-100 p-4 rounded-lg">
                <label className="text-sm font-medium text-gray-700 w-full max-w-[21cm]">Contenido</label>
                <div className="flex-1 flex flex-col w-full max-w-[21cm] shadow-xl">
                  <RichTextEditor
                    value={composeComunicado || ''}
                    onChange={setComposeComunicado}
                    placeholder="Escribe el contenido del comunicado aquí..."
                    className="h-full"
                    enablePagination={true}
                    pageHeight={750} // Match the content split height (approx A4 content area minus header/footer)
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setIsComunicadoModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setViewingComunicado({
                    id: 'preview',
                    content: 'preview',
                    priority: MessagePriority.MEDIUM,
                    isEmergency: false,
                    senderId: 'current-user',
                    channelId: selectedChannel?.id || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    channel: selectedChannel,
                    sender: {
                       id: 'current-user',
                       fullName: 'Vista Previa',
                       email: '',
                       role: 'admin',
                       avatar: '',
                       createdAt: '',
                       updatedAt: ''
                    },
                    extra: {
                      comunicado: {
                        title: comunicadoTitle || 'Título del Comunicado',
                        content: composeComunicado || '<p>Contenido del comunicado...</p>',
                        header: selectedHeader,
                        footer: selectedFooter
                      }
                    }
                  } as any);
                }}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
              >
                <Eye size={18} />
                Vista Previa
              </button>
              <button
                onClick={() => setIsComunicadoModalOpen(false)}
                className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all flex items-center gap-2"
              >
                <CheckIcon size={18} />
                Guardar Comunicado
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,video/*"
      />

      {/* Comunicado Document View Modal */}
      {isHeaderFooterModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Personalizar Diseño</h3>
                  <p className="text-xs text-gray-500">Encabezados y Pies de Página</p>
                </div>
              </div>
              <button
                onClick={() => setIsHeaderFooterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => {
                  setHeaderFooterTab('header');
                  setIsCreatingTemplate(false);
                }}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${headerFooterTab === 'header' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Encabezados
              </button>
              <button
                onClick={() => {
                  setHeaderFooterTab('footer');
                  setIsCreatingTemplate(false);
                }}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${headerFooterTab === 'footer' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Pies de Página
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Sidebar - List of Templates */}
              <div className="w-1/3 border-r border-gray-100 bg-gray-50/30 overflow-y-auto p-4 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplateName('');
                    setNewTemplateContent('');
                    setNewTemplateType('text');
                    setNewTemplateLayout('full');
                    setNewTemplateAlignment('center');
                    setNewTemplateColumns({ left: '', center: '', right: '', leftImage: undefined, centerImage: undefined, rightImage: undefined });
                    setNewTemplateOptions({
                      fontSize: 'base',
                      showDate: false,
                      dateFormat: 'DD/MM/YYYY',
                      showPage: false,
                      showVersion: false,
                      versionText: 'v1.0',
                      backgroundImage: undefined
                    });
                    setIsCreatingTemplate(true);
                  }}
                  className="w-full py-2 px-3 bg-white border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Crear Nuevo
                </button>
                
                {(headerFooterTab === 'header' ? savedHeaders : savedFooters).map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => headerFooterTab === 'header' ? setSelectedHeader(item) : setSelectedFooter(item)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      (headerFooterTab === 'header' ? selectedHeader?.id : selectedFooter?.id) === item.id
                        ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">{item.name}</span>
                      <div className="flex items-center gap-1">
                        {item.type === 'image' && <Image size={14} className="text-gray-400" />}
                        {item.type === 'text' && <Type size={14} className="text-gray-400" />}
                        {item.type === 'html' && <Code size={14} className="text-gray-400" />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplateId(item.id);
                            setNewTemplateName(item.name);
                            setNewTemplateContent(item.content);
                            setNewTemplateType(item.type);
                            if (item.structure) {
                              setNewTemplateLayout(item.structure.layout);
                              setNewTemplateAlignment(item.structure.alignment);
                              setNewTemplateColumns(item.structure.columns);
                              setNewTemplateOptions(item.structure.options);
                            } else {
                               setNewTemplateLayout('full');
                               setNewTemplateAlignment('center');
                               setNewTemplateColumns({ left: '', center: '', right: '', leftImage: undefined, centerImage: undefined, rightImage: undefined });
                               setNewTemplateOptions({
                                 fontSize: 'base',
                                 showDate: false,
                                 dateFormat: 'DD/MM/YYYY',
                                 showPage: false,
                                 showVersion: false,
                                 versionText: 'v1.0',
                                 backgroundImage: undefined
                               });
                            }
                            setIsCreatingTemplate(true);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Editar"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar plantilla?')) {
                              if (headerFooterTab === 'header') {
                                const newHeaders = savedHeaders.filter(h => h.id !== item.id);
                                setSavedHeaders(newHeaders);
                                localStorage.setItem('tify_saved_headers', JSON.stringify(newHeaders));
                                if (selectedHeader?.id === item.id) setSelectedHeader(null);
                              } else {
                                const newFooters = savedFooters.filter(f => f.id !== item.id);
                                setSavedFooters(newFooters);
                                localStorage.setItem('tify_saved_footers', JSON.stringify(newFooters));
                                if (selectedFooter?.id === item.id) setSelectedFooter(null);
                              }
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 h-8 overflow-hidden bg-gray-50 rounded p-1 border border-gray-100">
                       {item.type === 'image' ? 'Imagen' : item.content.replace(/<[^>]*>?/gm, '')}
                    </div>
                  </div>
                ))}
                
                {(headerFooterTab === 'header' ? savedHeaders : savedFooters).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay plantillas guardadas
                  </div>
                )}
              </div>

              {/* Main Area - Preview / Editor */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {isCreatingTemplate ? (
                  <div className="h-full flex flex-col bg-white animate-in fade-in duration-200">
                     {/* 1. Top Bar: Back */}
                     <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-20">
                        <button 
                          onClick={() => setIsCreatingTemplate(false)}
                          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium transition-colors"
                        >
                          <ArrowLeft size={16} />
                          Volver
                        </button>
                     </div>

                     {/* 2. Live Preview (Header) - Only if editing Header */}
                     {headerFooterTab === 'header' && (
                        <div className="shrink-0 bg-gray-100/50 border-b border-gray-200 p-4 flex flex-col items-center justify-center relative overflow-hidden group" style={{ minHeight: '160px' }}>
                           <div className="absolute top-2 left-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Vista Previa (Encabezado)</div>
                           
                           {/* Zoom Controls Overlay */}
                           <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={14} /></button>
                              <span className="text-[10px] font-mono w-8 text-center">{Math.round(previewZoom * 100)}%</span>
                              <button onClick={() => setPreviewZoom(Math.min(2, previewZoom + 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={14} /></button>
                           </div>

                           <div className="w-full max-w-[210mm] bg-white shadow-lg border border-gray-200 min-h-[100px] transition-transform origin-top flex items-center justify-center overflow-hidden relative" style={{ transform: `scale(${previewZoom})` }}>
                               <div className="w-full bg-white text-gray-800 text-sm relative" style={{ 
                                  backgroundImage: newTemplateOptions.backgroundImage ? `url(${newTemplateOptions.backgroundImage})` : 'none',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                               }}>
                                   {newTemplateType === 'image' && newTemplateContent && (
                                      <img src={newTemplateContent} alt="Header" className="w-full h-full object-contain max-h-[150px]" />
                                   )}
                                   {newTemplateType === 'html' && (
                                      <div dangerouslySetInnerHTML={{ __html: newTemplateContent }} />
                                   )}
                                   {newTemplateType === 'text' && (
                                      <div className={`flex flex-col gap-1 w-full p-4 ${newTemplateOptions.fontSize === 'xs' ? 'text-xs' : newTemplateOptions.fontSize === 'sm' ? 'text-sm' : newTemplateOptions.fontSize === 'lg' ? 'text-lg' : newTemplateOptions.fontSize === 'xl' ? 'text-xl' : 'text-base'}`}>
                                         {newTemplateLayout === 'full' ? (
                                            <div className={`w-full whitespace-pre-wrap ${newTemplateAlignment === 'center' ? 'text-center' : newTemplateAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                                               {newTemplateContent || 'Contenido...'}
                                            </div>
                                         ) : (
                                            <div className="flex justify-between items-start w-full gap-4">
                                               <div className="flex-1 flex flex-col items-start gap-1">
                                                  {newTemplateColumns.leftImage && <img src={newTemplateColumns.leftImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-left whitespace-pre-wrap w-full">{newTemplateColumns.left}</div>
                                               </div>
                                               <div className="flex-1 flex flex-col items-center gap-1">
                                                  {newTemplateColumns.centerImage && <img src={newTemplateColumns.centerImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-center whitespace-pre-wrap w-full">{newTemplateColumns.center}</div>
                                               </div>
                                               <div className="flex-1 flex flex-col items-end gap-1">
                                                  {newTemplateColumns.rightImage && <img src={newTemplateColumns.rightImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-right whitespace-pre-wrap w-full">{newTemplateColumns.right}</div>
                                               </div>
                                            </div>
                                         )}
                                         
                                         {(newTemplateOptions.showDate || newTemplateOptions.showPage || newTemplateOptions.showVersion) && (
                                            <div className="flex justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                                                <div className="flex gap-2">
                                                   {newTemplateOptions.showDate && <span>{dayjs().format(newTemplateOptions.dateFormat)}</span>}
                                                   {newTemplateOptions.showVersion && <span>{newTemplateOptions.versionText}</span>}
                                                </div>
                                                {newTemplateOptions.showPage && <span>Pág. 1</span>}
                                            </div>
                                         )}
                                      </div>
                                   )}
                                </div>
                           </div>
                        </div>
                     )}

                     {/* 3. Editor Area */}
                     <div className="flex-1 overflow-y-auto bg-gray-50/30">
                           {/* PROPOSAL B: Visual Toolbar */}
                           <div className="flex flex-col h-full bg-white">
                              {/* Toolbar */}
                              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10 shadow-sm">
                                 <input
                                    type="text"
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder="Nombre de Plantilla..."
                                    className="text-sm font-medium border-none outline-none placeholder-gray-400 w-48 hover:bg-gray-50 rounded px-2 py-1 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all"
                                 />
                                 
                                 <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button onClick={() => setNewTemplateType('text')} className={`p-1.5 rounded ${newTemplateType === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`} title="Texto"><Type size={14} /></button>
                                    <button onClick={() => setNewTemplateType('image')} className={`p-1.5 rounded ${newTemplateType === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`} title="Imagen"><Image size={14} /></button>
                                    <button onClick={() => setNewTemplateType('html')} className={`p-1.5 rounded ${newTemplateType === 'html' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`} title="HTML"><Code size={14} /></button>
                                 </div>

                                 <div className="h-4 w-px bg-gray-200"></div>
                                 
                                 {newTemplateType === 'text' && (
                                    <>
                                       <div className="flex bg-gray-100 rounded-lg p-0.5">
                                          <button onClick={() => setNewTemplateLayout('full')} className={`p-1.5 rounded ${newTemplateLayout === 'full' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`} title="Bloque"><LayoutTemplate size={14} /></button>
                                          <button onClick={() => setNewTemplateLayout('split')} className={`p-1.5 rounded ${newTemplateLayout === 'split' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`} title="Columnas"><Columns size={14} /></button>
                                       </div>
                                       {newTemplateLayout === 'full' && (
                                          <div className="flex bg-gray-100 rounded-lg p-0.5">
                                             <button onClick={() => setNewTemplateAlignment('left')} className={`p-1.5 rounded ${newTemplateAlignment === 'left' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><AlignLeft size={14} /></button>
                                             <button onClick={() => setNewTemplateAlignment('center')} className={`p-1.5 rounded ${newTemplateAlignment === 'center' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><AlignCenter size={14} /></button>
                                             <button onClick={() => setNewTemplateAlignment('right')} className={`p-1.5 rounded ${newTemplateAlignment === 'right' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><AlignRight size={14} /></button>
                                          </div>
                                       )}
                                       <select 
                                          value={newTemplateOptions.fontSize}
                                          onChange={(e) => setNewTemplateOptions({...newTemplateOptions, fontSize: e.target.value as any})}
                                          className="text-xs border-none bg-gray-100 rounded-lg py-1 pl-2 pr-6 focus:ring-0 cursor-pointer"
                                       >
                                          <option value="xs">Muy Pequeño</option>
                                          <option value="sm">Pequeño</option>
                                          <option value="base">Normal</option>
                                          <option value="lg">Grande</option>
                                          <option value="xl">Muy Grande</option>
                                       </select>
                                    </>
                                 )}
                              </div>
                              
                              {/* Content Canvas */}
                              <div className="flex-1 p-8 bg-gray-50/50 flex flex-col items-center overflow-y-auto">
                                 <div className="w-full max-w-xl bg-white shadow-sm border border-gray-200 rounded-xl p-8 min-h-[200px] relative group">
                                    <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-medium text-gray-400">Editor Visual</div>
                                    
                                    {newTemplateType === 'text' ? (
                                       newTemplateLayout === 'full' ? (
                                          <textarea
                                             value={newTemplateContent}
                                             onChange={(e) => setNewTemplateContent(e.target.value)}
                                             placeholder="Escribe aquí..."
                                             className={`w-full h-full min-h-[100px] border-none outline-none resize-none bg-transparent ${newTemplateAlignment === 'center' ? 'text-center' : newTemplateAlignment === 'right' ? 'text-right' : 'text-left'}`}
                                          />
                                       ) : (
                                          <div className="grid grid-cols-3 gap-4 h-full">
                                             {/* Column Left */}
                                             <div className="flex flex-col h-full border-r border-gray-100 pr-2">
                                                {newTemplateColumns.leftImage && (
                                                   <div className="relative mb-2 group/img">
                                                      <img src={newTemplateColumns.leftImage} alt="Left" className="w-full h-20 object-contain bg-gray-50 rounded" />
                                                      <button onClick={() => setNewTemplateColumns(prev => ({...prev, leftImage: undefined}))} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 hover:bg-white opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={12} /></button>
                                                   </div>
                                                )}
                                                <div className="flex items-center gap-2 mb-2">
                                                   <label className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-gray-100 rounded" title="Subir imagen a columna izquierda">
                                                      <input type="file" className="hidden" onChange={(e) => handleColumnImageUpload(e, 'left')} accept="image/*" />
                                                      <Image size={14} />
                                                   </label>
                                                   <span className="text-[10px] font-bold text-gray-300 uppercase">Izq</span>
                                                </div>
                                                <textarea value={newTemplateColumns.left} onChange={(e) => setNewTemplateColumns({...newTemplateColumns, left: e.target.value})} placeholder="Texto..." className="flex-1 resize-none outline-none text-sm w-full" />
                                             </div>

                                             {/* Column Center */}
                                             <div className="flex flex-col h-full border-r border-gray-100 px-2">
                                                {newTemplateColumns.centerImage && (
                                                   <div className="relative mb-2 group/img">
                                                      <img src={newTemplateColumns.centerImage} alt="Center" className="w-full h-20 object-contain bg-gray-50 rounded" />
                                                      <button onClick={() => setNewTemplateColumns(prev => ({...prev, centerImage: undefined}))} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 hover:bg-white opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={12} /></button>
                                                   </div>
                                                )}
                                                <div className="flex items-center gap-2 mb-2 justify-center">
                                                   <span className="text-[10px] font-bold text-gray-300 uppercase">Centro</span>
                                                   <label className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-gray-100 rounded" title="Subir imagen a columna central">
                                                      <input type="file" className="hidden" onChange={(e) => handleColumnImageUpload(e, 'center')} accept="image/*" />
                                                      <Image size={14} />
                                                   </label>
                                                </div>
                                                <textarea value={newTemplateColumns.center} onChange={(e) => setNewTemplateColumns({...newTemplateColumns, center: e.target.value})} placeholder="Texto..." className="flex-1 resize-none outline-none text-center text-sm w-full" />
                                             </div>

                                             {/* Column Right */}
                                             <div className="flex flex-col h-full pl-2">
                                                {newTemplateColumns.rightImage && (
                                                   <div className="relative mb-2 group/img">
                                                      <img src={newTemplateColumns.rightImage} alt="Right" className="w-full h-20 object-contain bg-gray-50 rounded" />
                                                      <button onClick={() => setNewTemplateColumns(prev => ({...prev, rightImage: undefined}))} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 hover:bg-white opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={12} /></button>
                                                   </div>
                                                )}
                                                <div className="flex items-center gap-2 mb-2 justify-end">
                                                   <span className="text-[10px] font-bold text-gray-300 uppercase">Der</span>
                                                   <label className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-gray-100 rounded" title="Subir imagen a columna derecha">
                                                      <input type="file" className="hidden" onChange={(e) => handleColumnImageUpload(e, 'right')} accept="image/*" />
                                                      <Image size={14} />
                                                   </label>
                                                </div>
                                                <textarea value={newTemplateColumns.right} onChange={(e) => setNewTemplateColumns({...newTemplateColumns, right: e.target.value})} placeholder="Texto..." className="flex-1 resize-none outline-none text-right text-sm w-full" />
                                             </div>
                                          </div>
                                       )
                                    ) : newTemplateType === 'image' ? (
                                       <div className="flex flex-col items-center justify-center h-full min-h-[150px] border-2 border-dashed border-gray-100 rounded-lg hover:border-indigo-200 transition-colors">
                                           <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 relative overflow-hidden">
                                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleTemplateImageUpload} />
                                              <Image size={16} /> Subir Imagen
                                           </button>
                                       </div>
                                    ) : (
                                       <textarea value={newTemplateContent} onChange={(e) => setNewTemplateContent(e.target.value)} className="w-full h-full font-mono text-xs border-none outline-none resize-none" placeholder="HTML..." />
                                    )}
                                 </div>
                                 
                                 {/* Toolbar Bottom - Dynamic Fields */}
                                 {newTemplateType === 'text' && (
                                    <div className="mt-6 flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                                       <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors">
                                          <input type="checkbox" checked={newTemplateOptions.showDate} onChange={(e) => setNewTemplateOptions({...newTemplateOptions, showDate: e.target.checked})} className="rounded text-indigo-600 focus:ring-0" />
                                          <Calendar size={14} /> Fecha
                                       </label>
                                       <div className="w-px h-3 bg-gray-200"></div>
                                       <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors">
                                          <input type="checkbox" checked={newTemplateOptions.showPage} onChange={(e) => setNewTemplateOptions({...newTemplateOptions, showPage: e.target.checked})} className="rounded text-indigo-600 focus:ring-0" />
                                          <Hash size={14} /> Paginación
                                       </label>
                                       <div className="w-px h-3 bg-gray-200"></div>
                                       <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors">
                                          <input type="checkbox" checked={newTemplateOptions.showVersion} onChange={(e) => setNewTemplateOptions({...newTemplateOptions, showVersion: e.target.checked})} className="rounded text-indigo-600 focus:ring-0" />
                                          <GitBranch size={14} /> Versión
                                       </label>
                                       <div className="w-px h-3 bg-gray-200"></div>
                                       <div className="flex items-center gap-2">
                                          <div className="relative">
                                             <button className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${newTemplateOptions.backgroundImage ? 'text-indigo-600 font-medium' : 'text-gray-600 hover:text-indigo-600'}`}>
                                                {isUploadingBgImage ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
                                                {newTemplateOptions.backgroundImage ? 'Cambiar Fondo' : 'Fondo'}
                                                <input type="file" accept="image/*" onChange={handleBgImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                             </button>
                                          </div>
                                          {newTemplateOptions.backgroundImage && (
                                             <button onClick={() => setNewTemplateOptions({...newTemplateOptions, backgroundImage: undefined})} className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors" title="Eliminar Fondo">
                                                <X size={12} />
                                             </button>
                                          )}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>
                     </div>

                     {/* Footer Preview (Bottom) - Only if editing Footer */}
                     {headerFooterTab === 'footer' && (
                        <div className="shrink-0 bg-gray-100/50 border-t border-gray-200 p-4 flex flex-col items-center justify-center relative overflow-hidden group" style={{ minHeight: '160px' }}>
                           <div className="absolute bottom-2 left-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Vista Previa (Pie de Página)</div>
                           
                           {/* Zoom Controls Overlay */}
                           <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={14} /></button>
                              <span className="text-[10px] font-mono w-8 text-center">{Math.round(previewZoom * 100)}%</span>
                              <button onClick={() => setPreviewZoom(Math.min(2, previewZoom + 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={14} /></button>
                           </div>

                           <div className="w-full max-w-[210mm] bg-white shadow-lg border border-gray-200 min-h-[100px] transition-transform origin-bottom flex items-center justify-center overflow-hidden relative" style={{ transform: `scale(${previewZoom})` }}>
                               <div className="w-full bg-white text-gray-800 text-sm relative" style={{ 
                                  backgroundImage: newTemplateOptions.backgroundImage ? `url(${newTemplateOptions.backgroundImage})` : 'none',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                               }}>
                                   {newTemplateType === 'image' && newTemplateContent && (
                                      <img src={newTemplateContent} alt="Footer" className="w-full h-full object-contain max-h-[150px]" />
                                   )}
                                   {newTemplateType === 'html' && (
                                      <div dangerouslySetInnerHTML={{ __html: newTemplateContent }} />
                                   )}
                                   {newTemplateType === 'text' && (
                                      <div className={`flex flex-col gap-1 w-full p-4 ${newTemplateOptions.fontSize === 'xs' ? 'text-xs' : newTemplateOptions.fontSize === 'sm' ? 'text-sm' : newTemplateOptions.fontSize === 'lg' ? 'text-lg' : newTemplateOptions.fontSize === 'xl' ? 'text-xl' : 'text-base'}`}>
                                         {newTemplateLayout === 'full' ? (
                                            <div className={`w-full whitespace-pre-wrap ${newTemplateAlignment === 'center' ? 'text-center' : newTemplateAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                                               {newTemplateContent || 'Contenido...'}
                                            </div>
                                         ) : (
                                            <div className="flex justify-between items-start w-full gap-4">
                                               <div className="flex-1 flex flex-col items-start gap-1">
                                                  {newTemplateColumns.leftImage && <img src={newTemplateColumns.leftImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-left whitespace-pre-wrap w-full">{newTemplateColumns.left}</div>
                                               </div>
                                               <div className="flex-1 flex flex-col items-center gap-1">
                                                  {newTemplateColumns.centerImage && <img src={newTemplateColumns.centerImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-center whitespace-pre-wrap w-full">{newTemplateColumns.center}</div>
                                               </div>
                                               <div className="flex-1 flex flex-col items-end gap-1">
                                                  {newTemplateColumns.rightImage && <img src={newTemplateColumns.rightImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                  <div className="text-right whitespace-pre-wrap w-full">{newTemplateColumns.right}</div>
                                               </div>
                                            </div>
                                         )}
                                         
                                         {(newTemplateOptions.showDate || newTemplateOptions.showPage || newTemplateOptions.showVersion) && (
                                            <div className="flex justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                                                <div className="flex gap-2">
                                                   {newTemplateOptions.showDate && <span>{dayjs().format(newTemplateOptions.dateFormat)}</span>}
                                                   {newTemplateOptions.showVersion && <span>{newTemplateOptions.versionText}</span>}
                                                </div>
                                                {newTemplateOptions.showPage && <span>Pág. 1</span>}
                                            </div>
                                         )}
                                      </div>
                                   )}
                                </div>
                           </div>
                        </div>
                     )}
                     
                     {/* Footer Actions */}
                     <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        <button
                           onClick={() => setIsCreatingTemplate(false)}
                           className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                        >
                           Cancelar
                        </button>

                        {editingTemplateId && (
                           <button
                              onClick={() => saveTemplate(true)}
                              disabled={!newTemplateName || (newTemplateType === 'text' && newTemplateLayout === 'split' ? (!newTemplateColumns.left && !newTemplateColumns.center && !newTemplateColumns.right && !newTemplateColumns.leftImage && !newTemplateColumns.centerImage && !newTemplateColumns.rightImage) : !newTemplateContent)}
                              className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                           >
                              Guardar como Nueva
                           </button>
                        )}

                        <button
                           onClick={() => saveTemplate(false)}
                           disabled={!newTemplateName || (newTemplateType === 'text' && newTemplateLayout === 'split' ? (!newTemplateColumns.left && !newTemplateColumns.center && !newTemplateColumns.right && !newTemplateColumns.leftImage && !newTemplateColumns.centerImage && !newTemplateColumns.rightImage) : !newTemplateContent)}
                           className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-lg shadow-indigo-200"
                        >
                           {editingTemplateId ? 'Guardar Cambios' : 'Guardar Plantilla'}
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                     <h4 className="font-semibold text-gray-900 pb-2 border-b border-gray-100 mb-4">
                        Vista Previa
                     </h4>
                     <div className="flex-1 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex flex-col relative group">
                        {/* Zoom Controls */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button 
                                onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.1))}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Reducir"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-xs font-medium w-12 text-center text-gray-700 font-mono select-none">
                                {Math.round(previewZoom * 100)}%
                            </span>
                            <button 
                                onClick={() => setPreviewZoom(z => Math.min(2.0, z + 0.1))}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Aumentar"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <button 
                                onClick={() => setPreviewZoom(1)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Restablecer (100%)"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8 flex items-start justify-center bg-slate-100/50">
                           <div 
                              style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
                              className="w-[21cm] bg-white shadow-xl min-h-[10cm] flex flex-col relative aspect-[1/1.414] transition-transform duration-200 ease-out"
                           >
                           {/* Decorative Header Bar */}
                           <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-300 w-full"></div>

                           <div className="p-12 flex-1 flex flex-col">
                             {/* Header */}
                             {(() => {
                               const headerToUse = headerFooterTab === 'header' && isCreatingTemplate 
                                  ? { 
                                      type: newTemplateType, 
                                      content: newTemplateContent,
                                      structure: newTemplateType === 'text' ? {
                                        layout: newTemplateLayout,
                                        alignment: newTemplateAlignment,
                                        columns: newTemplateColumns,
                                        options: newTemplateOptions
                                      } : undefined
                                    } 
                                  : selectedHeader;
                               
                               if (headerToUse) {
                                  return (
                                     <div className="mb-8 w-full">
                                        {headerToUse.type === 'image' ? (
                                           <img src={headerToUse.content} alt="Header" className="w-full max-h-32 object-contain" />
                                        ) : headerToUse.type === 'html' ? (
                                           <div dangerouslySetInnerHTML={{ __html: headerToUse.content }} />
                                        ) : (
                                          <div 
                                            className={`w-full ${
                                             headerToUse.structure?.options?.fontSize === 'xs' ? 'text-xs' :
                                             headerToUse.structure?.options?.fontSize === 'sm' ? 'text-sm' :
                                             headerToUse.structure?.options?.fontSize === 'lg' ? 'text-lg' :
                                             headerToUse.structure?.options?.fontSize === 'xl' ? 'text-xl' : 'text-base'
                                          } font-serif text-gray-900 border-b-2 border-gray-900 pb-2`}
                                            style={{ 
                                               backgroundImage: headerToUse.structure?.options?.backgroundImage ? `url(${headerToUse.structure.options.backgroundImage})` : 'none',
                                               backgroundSize: 'cover',
                                               backgroundPosition: 'center'
                                            }}
                                          >
                                             {headerToUse.structure?.layout === 'split' ? (
                                                <div className="grid grid-cols-3 gap-4 items-end">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {headerToUse.structure.columns.leftImage && <img src={headerToUse.structure.columns.leftImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                        <div className="text-left whitespace-pre-wrap">{headerToUse.structure.columns.left}</div>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        {headerToUse.structure.columns.centerImage && <img src={headerToUse.structure.columns.centerImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                        <div className="text-center whitespace-pre-wrap">{headerToUse.structure.columns.center}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {headerToUse.structure.columns.rightImage && <img src={headerToUse.structure.columns.rightImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                                        <div className="text-right whitespace-pre-wrap">{headerToUse.structure.columns.right}</div>
                                                    </div>
                                                </div>
                                              ) : (
                                                <div className={
                                                    headerToUse.structure?.alignment === 'center' ? 'text-center' : 
                                                    headerToUse.structure?.alignment === 'right' ? 'text-right' : 'text-left'
                                                }>
                                                    <div className="whitespace-pre-wrap">{headerToUse.content}</div>
                                                </div>
                                              )}
                                              
                                              {(headerToUse.structure?.options?.showDate || headerToUse.structure?.options?.showPage || headerToUse.structure?.options?.showVersion) && (
                                                <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-200 text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                                    <div>
                                                        {headerToUse.structure.options.showVersion && <span>{headerToUse.structure.options.versionText}</span>}
                                                    </div>
                                                    <div className="flex gap-4">
                                                        {headerToUse.structure.options.showDate && <span>{dayjs().format(headerToUse.structure.options.dateFormat)}</span>}
                                                        {headerToUse.structure.options.showPage && <span>Página 1</span>}
                                                    </div>
                                                </div>
                                              )}
                                           </div>
                                        )}
                                     </div>
                                  );
                               }
                               return (
                                  <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-8 opacity-50 grayscale">
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                        <FileText size={32} />
                                      </div>
                                      <div>
                                        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-widest">
                                          Comunicado Oficial
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium">Documento Corporativo</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha</div>
                                      <div className="text-lg font-serif text-gray-900">
                                        {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </div>
                                    </div>
                                  </div>
                               );
                             })()}

                             {/* Title & Content Placeholder */}
                             <div className="text-center mb-8">
                               <span className="inline-block px-4 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                                 Comunicado
                               </span>
                               <h1 className="text-2xl font-serif font-bold text-gray-900 leading-tight">
                                 {comunicadoTitle || 'Título del Comunicado'}
                               </h1>
                             </div>
                             
                             <div className="prose prose-sm max-w-none font-serif text-gray-800 leading-relaxed text-justify flex-1">
                                {composeComunicado ? (
                                   <div dangerouslySetInnerHTML={{ __html: composeComunicado }} />
                                ) : (
                                   <>
                                     <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                     <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                                   </>
                                )}
                             </div>

                             {/* Footer */}
                             <div className="mt-auto pt-8">
                               {(() => {
                                 const footerToUse = headerFooterTab === 'footer' && isCreatingTemplate
                                    ? { 
                                        type: newTemplateType, 
                                        content: newTemplateContent,
                                        structure: newTemplateType === 'text' ? {
                                          layout: newTemplateLayout,
                                          alignment: newTemplateAlignment,
                                          columns: newTemplateColumns,
                                          options: newTemplateOptions
                                        } : undefined
                                      }
                                    : selectedFooter;

                                 if (footerToUse) {
                                    return (
                                       <div className="mt-8 pt-8 border-t border-gray-200 w-full">
                                          {footerToUse.type === 'image' ? (
                                             <img src={footerToUse.content} alt="Footer" className="w-full max-h-24 object-contain" />
                                          ) : footerToUse.type === 'html' ? (
                                             <div dangerouslySetInnerHTML={{ __html: footerToUse.content }} />
                                          ) : (
                                           <div 
                                             className={`w-full ${
                                               footerToUse.structure?.options?.fontSize === 'xs' ? 'text-xs' :
                                               footerToUse.structure?.options?.fontSize === 'sm' ? 'text-sm' :
                                               footerToUse.structure?.options?.fontSize === 'lg' ? 'text-lg' :
                                               footerToUse.structure?.options?.fontSize === 'xl' ? 'text-xl' : 'text-base'
                                            } font-serif text-gray-900`}
                                            style={{ 
                                               backgroundImage: footerToUse.structure?.options?.backgroundImage ? `url(${footerToUse.structure.options.backgroundImage})` : 'none',
                                               backgroundSize: 'cover',
                                               backgroundPosition: 'center'
                                            }}
                                           >
                                               {(footerToUse.structure?.options?.showDate || footerToUse.structure?.options?.showPage || footerToUse.structure?.options?.showVersion) && (
                                                 <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-200 text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                                     <div>
                                                         {footerToUse.structure.options.showVersion && <span>{footerToUse.structure.options.versionText}</span>}
                                                     </div>
                                                     <div className="flex gap-4">
                                                         {footerToUse.structure.options.showDate && <span>{dayjs().format(footerToUse.structure.options.dateFormat)}</span>}
                                                         {footerToUse.structure.options.showPage && <span>Página 1</span>}
                                                     </div>
                                                 </div>
                                               )}

                                               {footerToUse.structure?.layout === 'split' ? (
                                                 <div className="grid grid-cols-3 gap-4 items-start">
                                                     <div className="text-left whitespace-pre-wrap">{footerToUse.structure.columns.left}</div>
                                                     <div className="text-center whitespace-pre-wrap">{footerToUse.structure.columns.center}</div>
                                                     <div className="text-right whitespace-pre-wrap">{footerToUse.structure.columns.right}</div>
                                                 </div>
                                               ) : (
                                                 <div className={
                                                     footerToUse.structure?.alignment === 'center' ? 'text-center' : 
                                                     footerToUse.structure?.alignment === 'right' ? 'text-right' : 'text-left'
                                                 }>
                                                     <div className="whitespace-pre-wrap">{footerToUse.content}</div>
                                                 </div>
                                               )}
                                            </div>
                                          )}
                                       </div>
                                    );
                                 }
                                 return (
                                    <div className="mt-8 pt-8 border-t border-gray-200 flex justify-between items-end opacity-50 grayscale">
                                      <div>
                                        <div className="font-bold text-gray-900 text-base font-serif">
                                          Administración
                                        </div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                                          Autorizado
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <div className="w-20 h-20 border-4 border-amber-200 rounded-full flex items-center justify-center opacity-50 rotate-[-12deg]">
                                          <span className="text-[10px] font-bold text-amber-800 uppercase text-center leading-tight">
                                            Documento<br/>Oficial<br/>Verificado
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                 );
                               })()}
                             </div>
                           </div>
                           
                           {/* Decorative Footer Bar */}
                           <div className="h-4 bg-gray-900 w-full mt-auto"></div>
                        </div>
                     </div>
                  </div>
               </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingComunicado && viewingComunicado.extra?.comunicado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={() => setViewingComunicado(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[60]"
          >
            <X size={24} />
          </button>

          {/* Loading State */}
          {isGeneratingPdf && (
            <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center text-white pointer-events-none">
               <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
               <p className="text-lg font-medium">Generando PDF...</p>
            </div>
          )}

          {/* PDF Preview - Shown when ready */}
          {pdfBlobUrl && !isGeneratingPdf && (
             <iframe 
               src={pdfBlobUrl} 
               className="w-full max-w-5xl h-[85vh] bg-white rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
               title="Vista Previa PDF"
             />
          )}

          {/* HTML Content - Used for generation, hidden if PDF is ready */}
          <div 
             ref={pdfContainerRef}
             className={`${pdfBlobUrl ? 'absolute left-[-9999px] top-0' : 'relative'} w-full max-w-[21cm] bg-white shadow-2xl animate-in zoom-in-95 duration-200 my-8 mx-auto`}
          >
             {/* Paper Container (A4 Ratio approx) */}
            {splitHtmlContent(viewingComunicado.extra.comunicado.content, 200).map((pageHtml, pageIndex) => (
            <div 
              key={pageIndex} 
              className="flex flex-col relative bg-white mb-8 last:mb-0 shadow-sm html2pdf__page-break"
              style={{ width: '21cm', height: '29.6cm', paddingBottom: '0' }}
            >
              {/* Decorative Header Bar */}
              <div className="h-2 bg-gradient-to-r from-amber-500 to-amber-300 w-full shrink-0"></div>
              
              <div className="p-12 md:p-16 flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                {viewingComunicado.extra.comunicado.header ? (
                   <div className="mb-8 w-full">
                      {viewingComunicado.extra.comunicado.header.type === 'image' ? (
                         <img src={viewingComunicado.extra.comunicado.header.content} alt="Header" className="w-full max-h-48 object-contain" />
                      ) : viewingComunicado.extra.comunicado.header.type === 'html' ? (
                         <div dangerouslySetInnerHTML={{ __html: viewingComunicado.extra.comunicado.header.content }} />
                      ) : (
                         <div className={`w-full ${
                            viewingComunicado.extra.comunicado.header.structure?.options?.fontSize === 'xs' ? 'text-xs' :
                            viewingComunicado.extra.comunicado.header.structure?.options?.fontSize === 'sm' ? 'text-sm' :
                            viewingComunicado.extra.comunicado.header.structure?.options?.fontSize === 'lg' ? 'text-lg' :
                            viewingComunicado.extra.comunicado.header.structure?.options?.fontSize === 'xl' ? 'text-xl' : 'text-base'
                         } font-serif text-gray-900 border-b-2 border-gray-900 pb-2`}>
                            {viewingComunicado.extra.comunicado.header.structure?.layout === 'split' ? (
                              <div className="grid grid-cols-3 gap-4 items-end">
                                  <div className="flex flex-col items-start gap-1">
                                      {viewingComunicado.extra.comunicado.header.structure.columns.leftImage && <img src={viewingComunicado.extra.comunicado.header.structure.columns.leftImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                      <div className="text-left whitespace-pre-wrap">{viewingComunicado.extra.comunicado.header.structure.columns.left}</div>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                      {viewingComunicado.extra.comunicado.header.structure.columns.centerImage && <img src={viewingComunicado.extra.comunicado.header.structure.columns.centerImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                      <div className="text-center whitespace-pre-wrap">{viewingComunicado.extra.comunicado.header.structure.columns.center}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      {viewingComunicado.extra.comunicado.header.structure.columns.rightImage && <img src={viewingComunicado.extra.comunicado.header.structure.columns.rightImage} alt="" className="max-w-full h-auto max-h-[80px] object-contain" />}
                                      <div className="text-right whitespace-pre-wrap">{viewingComunicado.extra.comunicado.header.structure.columns.right}</div>
                                  </div>
                              </div>
                            ) : (
                              <div className={
                                  viewingComunicado.extra.comunicado.header.structure?.alignment === 'center' ? 'text-center' : 
                                  viewingComunicado.extra.comunicado.header.structure?.alignment === 'right' ? 'text-right' : 'text-left'
                              }>
                                  <div className="whitespace-pre-wrap">{viewingComunicado.extra.comunicado.header.content}</div>
                              </div>
                            )}
                            
                            {(viewingComunicado.extra.comunicado.header.structure?.options?.showDate || viewingComunicado.extra.comunicado.header.structure?.options?.showPage || viewingComunicado.extra.comunicado.header.structure?.options?.showVersion) && (
                              <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-200 text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                  <div>
                                      {viewingComunicado.extra.comunicado.header.structure.options.showVersion && <span>{viewingComunicado.extra.comunicado.header.structure.options.versionText}</span>}
                                  </div>
                                  <div className="flex gap-4">
                                      {viewingComunicado.extra.comunicado.header.structure.options.showDate && <span>{dayjs().format(viewingComunicado.extra.comunicado.header.structure.options.dateFormat)}</span>}
                                      {viewingComunicado.extra.comunicado.header.structure.options.showPage && <span>Página {pageIndex + 1}</span>}
                                  </div>
                              </div>
                            )}
                         </div>
                      )}
                   </div>
                ) : (
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                      {viewingComunicado.channel?.icon ? (
                        <img src={viewingComunicado.channel.icon} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <FileText size={32} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 uppercase tracking-widest">
                        {viewingComunicado.channel?.title || 'Comunicado Oficial'}
                      </h2>
                      <p className="text-sm text-gray-500 font-medium">Documento Corporativo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha</div>
                    <div className="text-lg font-serif text-gray-900">
                      {new Date(viewingComunicado.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                )}

                {/* Title - Only on first page */}
                {pageIndex === 0 && (
                <div className="text-center mb-12">
                  <span className="inline-block px-4 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                    Comunicado
                  </span>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight">
                    {viewingComunicado.extra.comunicado.title}
                  </h1>
                </div>
                )}

                {/* Content */}
                <div 
                  className="prose prose-lg max-w-none font-serif text-gray-800 leading-relaxed text-justify flex-1"
                  dangerouslySetInnerHTML={{ __html: pageHtml }}
                />

                {/* Footer / Signature */}
                {viewingComunicado.extra.comunicado.footer ? (
                   <div className="mt-16 pt-12 border-t border-gray-200 w-full">
                      {viewingComunicado.extra.comunicado.footer.type === 'image' ? (
                         <img src={viewingComunicado.extra.comunicado.footer.content} alt="Footer" className="w-full max-h-32 object-contain" />
                      ) : viewingComunicado.extra.comunicado.footer.type === 'html' ? (
                         <div dangerouslySetInnerHTML={{ __html: viewingComunicado.extra.comunicado.footer.content }} />
                      ) : (
                         <div className={`w-full ${
                            viewingComunicado.extra.comunicado.footer.structure?.options?.fontSize === 'xs' ? 'text-xs' :
                            viewingComunicado.extra.comunicado.footer.structure?.options?.fontSize === 'sm' ? 'text-sm' :
                            viewingComunicado.extra.comunicado.footer.structure?.options?.fontSize === 'lg' ? 'text-lg' :
                            viewingComunicado.extra.comunicado.footer.structure?.options?.fontSize === 'xl' ? 'text-xl' : 'text-base'
                         } font-serif text-gray-900`}>
                            {(viewingComunicado.extra.comunicado.footer.structure?.options?.showDate || viewingComunicado.extra.comunicado.footer.structure?.options?.showPage || viewingComunicado.extra.comunicado.footer.structure?.options?.showVersion) && (
                              <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-200 text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                  <div>
                                      {viewingComunicado.extra.comunicado.footer.structure.options.showVersion && <span>{viewingComunicado.extra.comunicado.footer.structure.options.versionText}</span>}
                                  </div>
                                  <div className="flex gap-4">
                                      {viewingComunicado.extra.comunicado.footer.structure.options.showDate && <span>{dayjs().format(viewingComunicado.extra.comunicado.footer.structure.options.dateFormat)}</span>}
                                      {viewingComunicado.extra.comunicado.footer.structure.options.showPage && <span>Página {pageIndex + 1}</span>}
                                  </div>
                              </div>
                            )}

                            {viewingComunicado.extra.comunicado.footer.structure?.layout === 'split' ? (
                              <div className="grid grid-cols-3 gap-4 items-start">
                                  <div className="text-left whitespace-pre-wrap">{viewingComunicado.extra.comunicado.footer.structure.columns.left}</div>
                                  <div className="text-center whitespace-pre-wrap">{viewingComunicado.extra.comunicado.footer.structure.columns.center}</div>
                                  <div className="text-right whitespace-pre-wrap">{viewingComunicado.extra.comunicado.footer.structure.columns.right}</div>
                              </div>
                            ) : (
                              <div className={
                                  viewingComunicado.extra.comunicado.footer.structure?.alignment === 'center' ? 'text-center' : 
                                  viewingComunicado.extra.comunicado.footer.structure?.alignment === 'right' ? 'text-right' : 'text-left'
                              }>
                                  <div className="whitespace-pre-wrap">{viewingComunicado.extra.comunicado.footer.content}</div>
                              </div>
                            )}
                         </div>
                      )}
                   </div>
                ) : (
                <div className="mt-16 pt-12 border-t border-gray-200 flex justify-between items-end">
                  <div>
                    <div className="font-bold text-gray-900 text-lg font-serif">
                      {viewingComunicado.sender?.fullName || 'Administración'}
                    </div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                      Autorizado
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-24 h-24 border-4 border-amber-200 rounded-full flex items-center justify-center opacity-50 rotate-[-12deg]">
                      <span className="text-xs font-bold text-amber-800 uppercase text-center leading-tight">
                        Documento<br/>Oficial<br/>Verificado
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Decorative Footer Bar */}
              <div className="h-4 bg-gray-900 w-full mt-auto"></div>
            </div>
            ))}
          </div>
        </div>
      )}
      {showLocationPicker && (
        <LocationPicker
          onSave={handleLocationSave}
          onClose={() => setShowLocationPicker(false)}
          initialData={composeLocationData}
        />
      )}

      <MainChannelSearchModal
        isOpen={showChannelSearch}
        onClose={() => setShowChannelSearch(false)}
        channels={channels}
        selectedParentChannel={
          selectedChannel?.parentId
            ? channels.find(c => c.id === selectedChannel.parentId)
            : channels.find(c => c.id === selectedChannel?.id) || selectedChannel
        }
        onSelect={(channel) => {
          setSelectedChannel(channel);
          setActiveTab('messages');
          setShowChannelSearch(false);
        }}
      />
    </div>
  )};

export default ChannelManager;

