import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
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
} from 'lucide-react';
import { api } from '../services/api';
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
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Autocomplete, Popper, TextField } from '@mui/material';

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
                <div key={a.userId} className="flex items-center justify-between px-2 py-1 text-xs">
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
        </div></>
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

const ChannelManager: React.FC = () => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
  const [showCompose, setShowCompose] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [composePriority, setComposePriority] = useState<MessagePriority>(MessagePriority.MEDIUM);
  const [composeIsEmergency, setComposeIsEmergency] = useState(false);
  const [composeSendAt, setComposeSendAt] = useState<string>('');
  const [composeEventAt, setComposeEventAt] = useState<string>('');
  const [composeExpiresAt, setComposeExpiresAt] = useState<string>('');
  const [sendPickerOpen, setSendPickerOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [expiresPickerOpen, setExpiresPickerOpen] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<
    Array<{ name: string; size: number; type: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sendAnchorRef = useRef<HTMLButtonElement | null>(null);
  const eventAnchorRef = useRef<HTMLButtonElement | null>(null);
  const expiresAnchorRef = useRef<HTMLButtonElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const [composeIsGenerating, setComposeIsGenerating] = useState(false);

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
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    emergency?: boolean;
    expired?: boolean;
    hasApprovals?: boolean;
  }>({});
  const [infoTipOpen, setInfoTipOpen] = useState(true);
  const [statsRange, setStatsRange] = useState<'1h' | '24h' | '7d' | '1m' | 'all'>('24h');
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
    const inlineActive = !!(selectedChannel && selectedChannel.parentId);
    const subId = messagesModalOpen ? messagesForSub : inlineActive ? selectedChannel?.id : null;
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
    const q = messagesSearchDebounced && messagesSearchDebounced.trim().length >= 2 ? messagesSearchDebounced : undefined;
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
  }, [messagesModalOpen, messagesForSub, selectedChannel?.id, selectedChannel?.parentId, messagesPage, messagesLimit, messagesSearchDebounced, messagesQuick, messagesFilter, statsRange]);

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
        if (topLevel.length > 0) setSelectedChannel(topLevel[0]);
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
  }, [selectedChannel?.id, subPage, subLimit]);

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
      setComposeIsGenerating(false);
      setSendPickerOpen(false);
      setEventPickerOpen(false);
      setExpiresPickerOpen(false);
    }
  };

  const sendCompose = async () => {
    if (!selectedChannel || !composeContent.trim()) return;
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
      const publishedAtISO = composeSendAt ? new Date(composeSendAt).toISOString() : undefined;
      const eventAtISO = composeEventAt ? new Date(composeEventAt).toISOString() : undefined;
      let expiresAtISO: string | undefined;
      if (composeExpiresAt) {
        let expires = new Date(composeExpiresAt);
        if (composeEventAt && expires > new Date(composeEventAt)) {
          expires = new Date(composeEventAt);
        }
        if (composeSendAt && expires <= new Date(composeSendAt)) {
          expires = new Date(new Date(composeSendAt).getTime() + 60000);
        }
        expiresAtISO = expires.toISOString();
      }
      await api.createMessage({
        channelId: targetId,
        content: composeContent,
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
        return ( <></> );
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
          className={`flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors rounded-md ${
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
              className="p-0.5 hover:bg-indigo-100 rounded"
            >
              {expanded[channel.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <div className="relative">
            {channel.isHidden ? (
              <EyeOff size={14} className="text-gray-400" />
            ) : (
              <Globe size={14} className="text-gray-400" />
            )}
            {channel.isPublic ? null : (
              <Lock size={10} className="absolute -top-1 -right-1 text-amber-500" />
            )}
          </div>
          <span className="text-sm font-medium truncate">{channel.title}</span>
        </div>

        {channel.subchannels && expanded[channel.id] && (
          <div className="border-l border-gray-200 ml-6">
            {renderTree(channel.subchannels, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading)
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-28 bg-gray-200 rounded" />
              <div className="h-6 w-6 bg-gray-200 rounded" />
            </div>
            <div className="mb-3">
              <div className="h-8 w-full bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2 rounded">
                  <div className="h-4 w-4 bg-gray-200 rounded" />
                  <div className="h-4 w-4 bg-gray-200 rounded-full" />
                  <div className="h-4 w-44 bg-gray-200 rounded" />
                </div>
              ))}
              <div className="ml-6 border-l border-gray-200 pl-3 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2 px-2 py-2 rounded">
                    <div className="h-3 w-3 bg-gray-200 rounded" />
                    <div className="h-3 w-36 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="animate-pulse space-y-4">
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
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-9 bg-gray-200 rounded col-span-3" />
              <div className="h-9 bg-gray-200 rounded col-span-3" />
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* Tree Sidebar */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('channels.title')}</h3>
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-2">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder={t('channels.filterPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          {showCreate && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="Website URL"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="Instagram URL"
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="Facebook URL"
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.twitter}
                  onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  placeholder="Twitter URL"
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  value={form.tiktok}
                  onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                  placeholder="TikTok URL"
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="Logo image URL"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <div className="space-y-2">
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Icon (SF Symbol)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                  className="px-2 py-1 text-sm border border-gray-300 rounded col-span-2"
                />
                <input
                  value={orgNit}
                  onChange={(e) => setOrgNit(e.target.value)}
                  placeholder="NIT"
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {renderTree(channels)}
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
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
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-9 bg-gray-200 rounded col-span-3" />
                <div className="h-9 bg-gray-200 rounded col-span-3" />
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                <div>
                  {parentChannel && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <button
                        onClick={() => setSelectedChannel(parentChannel)}
                        className="hover:underline text-gray-700"
                      >
                        {parentChannel.title}
                      </button>
                      <ChevronRight size={12} className="text-gray-400" />
                      <span className="text-gray-900">{selectedChannel.title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    {selectedChannel.logoUrl ? (
                      <img
                        src={selectedChannel.logoUrl}
                        alt={selectedChannel.title}
                        className="w-10 h-10 rounded-full border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        Logo
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedChannel.title}</h2>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        
                      </div>
                      <StatusBadge status={selectedChannel.verificationStatus} />
                    </div>
                  </div>
                  <p className="text-gray-500">
                    {selectedChannel.description || 'No description provided.'}
                  </p>
                  {!selectedChannel.parentId && selectedChannel.subchannels?.length ? (
                    <>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        Destino por defecto:{' '}
                        <span className="text-gray-900">
                          {selectedChannel.subchannels[0].title}
                        </span>{' '}
                        <Target size={14} className="text-indigo-600" />
                      </div>
                      {selectedChannel.websiteUrl ? (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <Globe size={14} className="text-indigo-600" />
                          <span>{t('channels.website')}:</span>
                          <a
                            href={selectedChannel.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline truncate max-w-[16rem]"
                          >
                            {selectedChannel.websiteUrl}
                          </a>
                        </div>
                      ) : null}
                      {selectedChannel.socialLinks &&
                      Object.keys(selectedChannel.socialLinks).length > 0 ? (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                          {Object.entries(selectedChannel.socialLinks).map(([key, url]) => (
                            <a
                              key={key}
                              href={url as string}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                              <Link size={12} />
                              <span className="truncate max-w-[10rem]">{key}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-1">
                        <button
                          onClick={() => setInfoTipOpen((v) => !v)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCompose}
                    className="relative p-2 text-indigo-400 text-white rounded-md hover:text-indigo-700 flex items-center justify-center"
                  >
                    <span className="absolute inset-0 rounded-md bg-indigo-400 opacity-20 animate-ping pointer-events-none z-0"></span>
                    <MessageSquarePlus size={18} className="relative z-10" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setConfigTipOpen((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-md"
                    >
                      <LucideEye size={18} />
                    </button>
                    {configTipOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setConfigTipOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                          <div className="space-y-2">
                          {composeIsEmergency && (
                            <>
                              <span className="pointer-events-none absolute -top-6 -left-6 h-32 w-32 rounded-full bg-red-300 opacity-30 animate-ping"></span>
                              <span className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-red-300 opacity-30 animate-ping"></span>
                            </>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">{t('channels.visibility')}</div>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedChannel.isPublic
                                ? t('channels.public')
                                : t('channels.private')}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">{t('channels.searchable')}</div>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedChannel.isHidden
                                ? t('channels.searchable_no')
                                : t('channels.searchable_yes')}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">{t('channels.refCode')}</div>
                            <div className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {selectedChannel.referenceCode || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div></>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setSpeedDialOpen((v) => !v)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-md"
                    >
                      <Share2 size={18} />
                    </button>
                    {speedDialOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSpeedDialOpen(false)} />
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
                </div>
              </div>

              {infoTipOpen && (
                <div className="px-3">
                  <div className={`${selectedChannel?.parentId && inlineStatsHidden ? 'hidden' : ''} relative w-full bg-white border border-gray-200 rounded-lg shadow-sm p-4`}>
                    {(!selectedChannel?.parentId || !inlineStatsHidden) && (
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
                    )}
                    {(!selectedChannel?.parentId || !inlineStatsHidden) && (
                      <ChannelStatsPanel channelId={selectedChannel.id} range={statsRange} />
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 flex-1 overflow-y-auto">
                <div className="mb-2"></div>
                <div className="">
                  <div className={`${selectedChannel?.parentId ? 'hidden' : ''} bg-white rounded-lg border border-gray-100 overflow-hidden`}>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-gray-600">
                          <th className="px-4 py-2">Subcanal</th>
                          <th className="px-4 py-2">
                            <Users size={18} className="text-indigo-600" />
                          </th>
                          <th className="px-4 py-2">
                            <ShieldCheck size={18} className="text-purple-600" />
                          </th>
                          <th className="px-4 py-2">
                            <Hourglass size={18} className="text-red-400" />
                          </th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {subLoading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={`sk-${i}`} className="border-t border-gray-100">
                              <td className="px-4 py-2">
                                <div className="animate-pulse flex items-center gap-2">
                                  <div className="h-4 w-4 bg-gray-200 rounded" />
                                  <div className="h-4 w-40 bg-gray-200 rounded" />
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                              </td>
                              <td className="px-4 py-2">
                                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                              </td>
                              <td className="px-4 py-2">
                                <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : subItems && subItems.length > 0 ? (
                          subItems.map((sc) => (
                            <tr
                              key={sc.id}
                              className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                              onDoubleClick={() => setSelectedChannel(sc as any)}
                            >
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <IconView name={sc.icon} size={14} className="text-gray-500" />
                                  <span className="text-gray-900">{sc.title}</span>
                                  {selectedChannel.subchannels &&
                                    selectedChannel.subchannels[0]?.id === sc.id && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center">
                                        <Target size={12} />
                                      </span>
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  className="text-indigo-600 hover:underline cursor-pointer"
                                  onClick={() => {
                                    setSubsForSub(sc.id);
                                    setSubsModalOpen(true);
                                    setSubsPage(1);
                                    setSubsSearch('');
                                  }}
                                >
                                  {sc.memberCount.toLocaleString()}
                                </button>
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  className="text-indigo-600 hover:underline cursor-pointer"
                                  onClick={() => {
                                    setApproverTipSub(sc as any);
                                    setApproverModalOpen(true);
                                    fetchPreviewData(sc.id);
                                  }}
                                >
                                  {sc.counts?.approvers ?? 'Ver'}
                                </button>
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  className="text-indigo-600 hover:underline cursor-pointer"
                                  onClick={() => {
                                    setPendingForSub(sc.id);
                                    setPendingModalOpen(true);
                                    setPendingPage(1);
                                  }}
                                >
                                  {sc.counts?.pending ?? '—'}
                                </button>
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-indigo-600 hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
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
                                                  ? new Date(Date.now() - 30 * 86400000).toISOString()
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
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                              {t('channels.approvers_empty')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                          className="px-2 py-1 text-sm border border-gray-300 rounded col-span-3"
                        />
                        <input
                          value={subDesc}
                          onChange={(e) => setSubDesc(e.target.value)}
                          placeholder="Descripción"
                          className="px-2 py-1 text-sm border border-gray-300 rounded col-span-3"
                        />
                        <input
                          value={subIcon}
                          onChange={(e) => setSubIcon(e.target.value)}
                          placeholder="Icono (SF Symbol)"
                          className="px-2 py-1 text-sm border border-gray-300 rounded col-span-3"
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

                  {approverModalOpen && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg border border-gray-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <ShieldCheck size={18} className="text-purple-600" />
                              {t('channels.approvers')}
                            </h3>
                            <p className="text-xs text-gray-500">
                              Gestión de aprobadores del subcanal
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setApproverModalOpen(false);
                              setApproverTipOpen(false);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="p-6 pt-0">
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
                              .filter((opt) => !(approverTipList || []).some((a) => a.userId === opt.user?.id))
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
                                style={{ width: props.anchorEl?.clientWidth }}
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
                                            setApproverRemoveAnchorEl(e.currentTarget as HTMLElement);
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
                                            <div className="fixed inset-0 z-[900] bg-black/30 transition-opacity duration-200" onClick={() => !approverRemoveLoading && setApproverRemoveId(null)} />
                                            <Popper open placement="bottom-end" anchorEl={approverRemoveAnchorEl} style={{ zIndex: 1000 }}>
                                              <div className="relative bg-white border border-gray-200 rounded shadow-lg p-2">
                                                <div className="absolute -top-1 right-3 w-2 h-2 bg-white border-t border-l border-gray-200 rotate-45"></div>
                                                <div className="text-xs text-gray-700 mb-2">¿Eliminar aprobador?</div>
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
                                                      if (!approverTipSub || !approverRemoveId) return;
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
                                                        if (selectedChannel && !selectedChannel.parentId) {
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
                                                    {approverRemoveLoading ? <Loader2 size={14} className="animate-spin" /> : null} Confirmar
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
                                      onClick={() => !approverAddLoading && setApproverAuthorizeOpen(false)}
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
                                          onClick={() => !approverAddLoading && setApproverAuthorizeOpen(false)}
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
                                          {approverAddLoading ? <Loader2 size={14} className="animate-spin" /> : null} Confirmar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {approverProfileOpen && (
                                  <div className="fixed inset-0 z-50">
                                    <div className="absolute inset-0 bg-black/30" onClick={() => setApproverProfileOpen(false)} />
                                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl">
                                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Users size={18} className="text-indigo-600" />
                                          <span className="text-sm font-semibold text-gray-900">Perfil</span>
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
                                                <div className="text-sm font-semibold text-gray-900">{approverProfile.fullName || approverProfile.username}</div>
                                                <div className="text-xs text-gray-500">@{approverProfile.username}</div>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                              <div className="p-2 rounded border bg-white">
                                                <div className="text-[11px] text-gray-500">Suscripciones</div>
                                                <div className="text-sm font-semibold text-gray-900">{approverProfile.subscribedChannelsCount?.toLocaleString?.() || 0}</div>
                                              </div>
                                              <div className="p-2 rounded border bg-white">
                                                <div className="text-[11px] text-gray-500">Canales propios</div>
                                                <div className="text-sm font-semibold text-gray-900">{approverProfile.ownedChannelsCount?.toLocaleString?.() || 0}</div>
                                              </div>
                                            </div>
                                            <div className="mb-3 text-xs font-semibold text-gray-700">Asignaciones como aprobador</div>
                                            <div className="space-y-2 mb-4">
                                              {approverProfileApprovers.length === 0 ? (
                                                <div className="text-xs text-gray-400">Sin asignaciones</div>
                                              ) : (
                                                approverProfileApprovers.map((ap) => (
                                                  <div key={ap.id} className="p-2 rounded border bg-white flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <IconView name={ap.channel?.icon} size={14} className="text-gray-500" />
                                                      <div className="text-sm text-gray-800">{ap.channel?.title}</div>
                                                    </div>
                                                    {ap.channel?.parentId ? (
                                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center">Subcanal</span>
                                                    ) : null}
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                            <div className="mb-3 text-xs font-semibold text-gray-700">Suscripciones</div>
                                            <div className="space-y-2">
                                              {approverProfileSubs.length === 0 ? (
                                                <div className="text-xs text-gray-400">Sin suscripciones activas</div>
                                              ) : (
                                                approverProfileSubs.map((s) => (
                                                  <div key={s.id} className="p-2 rounded border bg-white flex items-center gap-2">
                                                    <IconView name={s.channel?.icon} size={14} className="text-gray-500" />
                                                    <div className="text-sm text-gray-800">{s.channel?.title}</div>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-xs text-gray-400">No se pudo cargar el perfil</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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
                      <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-gray-200">
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
                        <div className="p-6">
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
                            <div className="max-h-[50vh] overflow-y-auto space-y-3">
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
                  {(messagesModalOpen || selectedChannel?.parentId) && (
                    <div className={`${selectedChannel?.parentId ? 'static bg-transparent z-auto' : 'fixed inset-0 bg-black/40 z-50'} flex items-center justify-center`}>
                      <div className={`bg-white w-full ${selectedChannel?.parentId ? '' : 'max-w-3xl'} rounded-xl shadow-lg border border-gray-200`}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-gray-900">Mensajes</span>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>Rango</span>
                                <button
                                  onClick={(e) => { setRangeMenuOpen((v) => !v); setRangeMenuAnchorEl(e.currentTarget as HTMLElement); }}
                                  className="px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                                >
                                  {statsRange === '1h'
                                    ? '1H'
                                    : statsRange === '24h'
                                      ? '24H'
                                      : statsRange === '7d'
                                        ? '1 Semana'
                                        : statsRange === '1m'
                                          ? '1 Mes'
                                          : 'Histórico'}
                                  <ChevronDown size={12} className="text-gray-500" />
                                </button>
                                {rangeMenuOpen && (
                                  <Popper open placement="bottom-start" anchorEl={rangeMenuAnchorEl} style={{ zIndex: 1000 }}>
                                    <div className="bg-white border border-gray-200 rounded shadow p-1 text-xs">
                                      <button onClick={() => { setStatsRange('1h'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1H</button>
                                      <button onClick={() => { setStatsRange('24h'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">24H</button>
                                      <button onClick={() => { setStatsRange('7d'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1 Semana</button>
                                      <button onClick={() => { setStatsRange('1m'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">1 Mes</button>
                                      <button onClick={() => { setStatsRange('all'); setRangeMenuOpen(false); }} className="block w-full text-left px-2 py-1 rounded hover:bg-gray-50">Histórico</button>
                                    </div>
                                  </Popper>
                                )}
                              </div>
                            </div>
                            <span className="h-4 w-px bg-gray-200"></span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Mensajes{selectedChannel?.title}
                            </h3>
                        </div>
                          {selectedChannel?.parentId ? (
                            <button
                              onClick={() => setInlineStatsHidden((v) => !v)}
                              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-full transition-transform duration-200"
                              aria-label={inlineStatsHidden ? 'Minimizar' : 'Ampliar'}
                              title={inlineStatsHidden ? 'Minimizar' : 'Ampliar'}
                            >
                              {inlineStatsHidden ? (
                                <Minimize2 size={18} className="transform" />
                              ) : (
                                <Maximize2 size={18} className="transform" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
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
                                setMessagesModalOpen(false);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="sticky top-0 z-10 bg-white pb-2 mb-3 border-b border-gray-100 flex items-center justify-between gap-3">
                            <input
                              value={messagesSearch}
                              onChange={(e) => setMessagesSearch(e.target.value)}
                              placeholder="Filtrar mensajes..."
                              className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-xs"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('all')}
                                aria-label="Todos"
                                title="Todos"
                              >
                                <MessagesSquare size={16} className={messagesQuick === 'all' ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Todos</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'emergency' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('emergency')}
                                aria-label="Emergentes"
                                title="Emergentes"
                              >
                                <AlertTriangle size={16} className={messagesQuick === 'emergency' ? 'text-white' : 'text-red-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Emergentes</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'high' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('high')}
                                aria-label="Alta"
                                title="Alta"
                              >
                                <Zap size={16} className={messagesQuick === 'high' ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Alta</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'vigent' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('vigent')}
                                aria-label="Vigentes"
                                title="Vigentes"
                              >
                                <Clock size={16} className={messagesQuick === 'vigent' ? 'text-white' : 'text-emerald-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Vigentes</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'expired' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('expired')}
                                aria-label="Vencidos"
                                title="Vencidos"
                              >
                                <Hourglass size={16} className={messagesQuick === 'expired' ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Vencidos</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'hasApprovals' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('hasApprovals')}
                                aria-label="Con aprob."
                                title="Con aprob."
                              >
                                <CheckCircle size={16} className={messagesQuick === 'hasApprovals' ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Con aprob.</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ${messagesQuick === 'noApprovals' ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesQuick('noApprovals')}
                                aria-label="Sin aprob."
                                title="Sin aprob."
                              >
                                <Clock size={16} className={messagesQuick === 'noApprovals' ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Sin aprob.</div>
                              </button>
                              <button
                                className={`group relative p-2 rounded border ml-2 ${messagesFilterOpen ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => setMessagesFilterOpen((o) => !o)}
                                aria-label="Filtro avanzado"
                                title="Filtro avanzado"
                              >
                                <Settings size={16} className={messagesFilterOpen ? 'text-white' : 'text-slate-600'} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Filtro avanzado</div>
                              </button>
                            </div>
                          </div>
                          {messagesFilterOpen && (
                            <div className="mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 border border-gray-200 rounded p-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Prioridad</span>
                                <select
                                  value={messagesFilter.priority || ''}
                                  onChange={(e) =>
                                    setMessagesFilter((f) => ({
                                      ...f,
                                      priority: ((e.target.value || '') as any) || undefined,
                                    }))
                                  }
                                  className="px-2 py-1 text-xs border rounded"
                                >
                                  <option value="">Todas</option>
                                  <option value="HIGH">Alta</option>
                                  <option value="MEDIUM">Media</option>
                                  <option value="LOW">Baja</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Emergente</span>
                                <select
                                  value={
                                    messagesFilter.emergency === undefined
                                      ? ''
                                      : messagesFilter.emergency
                                        ? '1'
                                        : '0'
                                  }
                                  onChange={(e) =>
                                    setMessagesFilter((f) => ({
                                      ...f,
                                      emergency:
                                        e.target.value === '' ? undefined : e.target.value === '1',
                                    }))
                                  }
                                  className="px-2 py-1 text-xs border rounded"
                                >
                                  <option value="">Todos</option>
                                  <option value="1">Sí</option>
                                  <option value="0">No</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Estado</span>
                                <select
                                  value={
                                    messagesFilter.expired === undefined
                                      ? ''
                                      : messagesFilter.expired
                                        ? '1'
                                        : '0'
                                  }
                                  onChange={(e) =>
                                    setMessagesFilter((f) => ({
                                      ...f,
                                      expired:
                                        e.target.value === '' ? undefined : e.target.value === '1',
                                    }))
                                  }
                                  className="px-2 py-1 text-xs border rounded"
                                >
                                  <option value="">Todos</option>
                                  <option value="0">Vigente</option>
                                  <option value="1">Vencido</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Aprobaciones</span>
                                <select
                                  value={
                                    messagesFilter.hasApprovals === undefined
                                      ? ''
                                      : messagesFilter.hasApprovals
                                        ? '1'
                                        : '0'
                                  }
                                  onChange={(e) =>
                                    setMessagesFilter((f) => ({
                                      ...f,
                                      hasApprovals:
                                        e.target.value === '' ? undefined : e.target.value === '1',
                                    }))
                                  }
                                  className="px-2 py-1 text-xs border rounded"
                                >
                                  <option value="">Todas</option>
                                  <option value="1">Con</option>
                                  <option value="0">Sin</option>
                                </select>
                              </div>
                            </div>
                          )}
                          {messagesLoading ? (
                            <div className="animate-pulse space-y-2">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-16 bg-gray-100 rounded" />
                              ))}
                            </div>
                          ) : (
                            <div className="max-h-[50vh] overflow-y-auto space-y-3">
                              {messagesItems.map((m) => (
                                  <div
                                    key={m.id}
                                    className={`relative overflow-hidden p-4 rounded-lg border ${m.isEmergency ? 'bg-gradient-to-br from-red-50 via-white to-rose-100 border-red-200' : new Date(m.expiresAt) > new Date() ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
                                  >
                                    {m.isEmergency && (
                                      <span className="pointer-events-none absolute inset-0 rounded-lg bg-red-300/10 animate-pulse"></span>
                                    )}
                                    <div className="absolute top-2 right-2 flex items-center gap-2 text-xs">
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
                                          className={`text-[10px] px-1.5 py-0.5 rounded border ${m.isEmergency ? 'bg-red-50 text-red-700 border-red-200' : m.priority === 'HIGH' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : m.priority === 'MEDIUM' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                        >
                                          {m.isEmergency
                                            ? 'Emergente'
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

                                    <div className="mt-2 text-sm text-gray-800">{m.content}</div>
                                    <div className="mt-3 flex items-center gap-2">
                                      {m.expiresAt && (
                                        <span className="relative inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpiresTipId(expiresTipId === m.id ? null : m.id)
                                            }
                                            className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                                            aria-label="Ver fecha exacta"
                                          >
                                            <Hourglass size={12} className="text-amber-600" />
                                          </button>
                                          <span className="text-xs font-semibold text-gray-900">
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
                                      {(m.approvals || []).map((a) =>
                                        a.status === 'APPROVED' ? (
                                          <span
                                            key={a.userId}
                                            className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-white border border-green-200 px-1.5 py-0.5 rounded"
                                          >
                                            <CheckIcon size={12} className="text-green-700" />{' '}
                                            <button
                                              className="hover:underline"
                                              onMouseEnter={(e) => { setApproverHoverUserId(a.user?.id || a.approverId); setApproverHoverAnchorEl(e.currentTarget as HTMLElement); }}
                                              onMouseLeave={() => { setApproverHoverUserId(null); setApproverHoverAnchorEl(null); }}
                                            >
                                              {a.approver?.fullName || a.user?.fullName || a.approver?.username || a.user?.username || a.approverId}
                                            </button>
                                            {approverHoverUserId === (a.user?.id || a.approverId) && (
                                              <Popper open placement="top" anchorEl={approverHoverAnchorEl} style={{ zIndex: 1000 }}>
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
                                              onMouseEnter={(e) => { setApproverHoverUserId(a.user?.id || a.approverId); setApproverHoverAnchorEl(e.currentTarget as HTMLElement); }}
                                              onMouseLeave={() => { setApproverHoverUserId(null); setApproverHoverAnchorEl(null); }}
                                            >
                                              {a.approver?.fullName || a.user?.fullName || a.approver?.username || a.user?.username || a.approverId}
                                            </button>
                                            {approverHoverUserId === (a.user?.id || a.approverId) && (
                                              <Popper open placement="top" anchorEl={approverHoverAnchorEl} style={{ zIndex: 1000 }}>
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
                                              onMouseEnter={(e) => { setApproverHoverUserId(a.user?.id || a.approverId); setApproverHoverAnchorEl(e.currentTarget as HTMLElement); }}
                                              onMouseLeave={() => { setApproverHoverUserId(null); setApproverHoverAnchorEl(null); }}
                                            >
                                              {a.approver?.fullName || a.user?.fullName || a.approver?.username || a.user?.username || a.approverId}
                                            </button>
                                            {approverHoverUserId === (a.user?.id || a.approverId) && (
                                              <Popper open placement="top" anchorEl={approverHoverAnchorEl} style={{ zIndex: 1000 }}>
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
                                            <Clock
                                              size={12}
                                              className="text-gray-700 cursor-help"
                                            />{' '}
                                            <button
                                              className="hover:underline"
                                              onMouseEnter={(e) => { setApproverHoverUserId(a.user?.id || a.approverId); setApproverHoverAnchorEl(e.currentTarget as HTMLElement); }}
                                              onMouseLeave={() => { setApproverHoverUserId(null); setApproverHoverAnchorEl(null); }}
                                            >
                                              {a.approver?.fullName || a.user?.fullName || a.approver?.username || a.user?.username || a.approverId}
                                            </button>
                                            {approverHoverUserId === (a.user?.id || a.approverId) && (
                                              <Popper open placement="top" anchorEl={approverHoverAnchorEl} style={{ zIndex: 1000 }}>
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
                                            { m.expiresAt && (
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
                                    <span className="font-semibold">Aún no encontramos mensajes con este filtro</span>
                                  </div>
                                  <div className="text-sm mt-1 mb-10 ">
                                    Intenta con otro filtro</div>

                                  <div className="text-sm mt-5 ">
                                    Si consideras que esto fue un error haznoslo saber 
                                      aquí, con un solo click
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>{' '}
              </div>

              {showCompose && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{t('compose.title')}</h3>
                      <button
                        onClick={closeComposeAutoSave}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-full"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="relative">
                        <div className="mb-2 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              <button
                                type="button"
                                className="p-1.5 rounded-md hover:bg-gray-100 text-indigo-600"
                              >
                                <Zap size={16} />
                              </button>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none">
                                {t('priority')}
                              </div>
                            </div>
                            <div className="flex rounded-md shadow-sm" role="group">
                              {[
                                MessagePriority.LOW,
                                MessagePriority.MEDIUM,
                                MessagePriority.HIGH,
                              ].map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  disabled={composeIsEmergency}
                                  onClick={() => setComposePriority(p)}
                                  className={`px-3 py-1.5 text-xs font-medium border first:rounded-l-lg last:rounded-r-lg ${composePriority === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} ${composeIsEmergency ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {p === MessagePriority.LOW
                                    ? t('priority.low')
                                    : p === MessagePriority.MEDIUM
                                      ? t('priority.medium')
                                      : t('priority.high')}
                                </button>
                              ))}
                            </div>
                          </div>
                          <label className="flex items-center cursor-pointer relative">
                            <input
                              type="checkbox"
                              checked={composeIsEmergency}
                              onChange={(e) => setComposeIsEmergency(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-red-500 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            <div className="ml-3 relative group">
                              <button
                                type="button"
                                className="p-1.5 rounded-md hover:bg-gray-100 text-red-600"
                              >
                                <AlertTriangle size={16} />
                              </button>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none">
                                {t('emergencyBroadcast')}
                              </div>
                            </div>
                          </label>
                        </div>
                        <textarea
                          value={composeContent}
                          onChange={(e) => setComposeContent(e.target.value)}
                          rows={6}
                          className={`w-full p-4 bg-white border-indigo-200 ring-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder-gray-400`}
                          placeholder={t('content.placeholder')}
                        />
                        <button
                          onClick={handleComposeAIAssist}
                          disabled={composeIsGenerating}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Sparkles size={14} />
                          {composeIsGenerating ? t('ai.drafting') : t('ai.polish')}
                        </button>
                      </div>

                      <div
                        className={`relative overflow-hidden bg-gradient-to-br ${composeIsEmergency ? 'from-red-50 via-white to-rose-100 border-red-200' : 'from-indigo-50 via-white to-emerald-50 border-gray-200'} p-5 rounded-lg border`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconView
                              name={selectedChannel?.icon}
                              size={16}
                              className="text-indigo-600"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {selectedChannel?.title}
                            </span>
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedChannel) setApproverTipSub(selectedChannel as any);
                                setApproverModalOpen(true);
                              }}
                              className="p-1.5 rounded-full text-indigo-600 hover:bg-indigo-50"
                            >
                              <Users size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 text-xl font-bold text-gray-900 whitespace-pre-wrap">
                          {composeContent || t('content.placeholder')}
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
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{t('schedule.sendAt')}</span>
                                    <button
                                      ref={sendAnchorRef}
                                      onClick={() => setSendPickerOpen(true)}
                                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                                    >
                                      <Clock size={14} />
                                    </button>
                                  </div>
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
                                  <div className="text-[11px] text-gray-500">
                                    -- {composeSendAt ? formatLocal(composeSendAt) : ''}
                                  </div>
                                </div>
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
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setComposeAttachments((prev) => [
                                      ...prev,
                                      ...files.map((f) => ({
                                        name: f.name,
                                        size: f.size,
                                        type: f.type,
                                      })),
                                    ]);
                                  }}
                                />
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className={`px-2 py-1 text-xs rounded border ${selectedChannel?.verificationStatus === VerificationStatus.VERIFIED ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                                  disabled={
                                    selectedChannel?.verificationStatus !==
                                    VerificationStatus.VERIFIED
                                  }
                                >
                                  <Paperclip size={12} className="inline mr-1" />
                                  {selectedChannel?.verificationStatus ===
                                  VerificationStatus.VERIFIED
                                    ? 'Adjuntar'
                                    : 'Solo canal verificado'}
                                </button>
                              </div>
                            </div>
                            {composeAttachments.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {composeAttachments.map((a, i) => (
                                  <li
                                    key={`${a.name}-${i}`}
                                    className="text-xs text-gray-600 flex items-center justify-between"
                                  >
                                    <span className="truncate max-w-[16rem]">{a.name}</span>
                                    <button
                                      className="text-red-600 hover:underline"
                                      onClick={() =>
                                        setComposeAttachments((prev) =>
                                          prev.filter((_, idx) => idx !== i)
                                        )
                                      }
                                    >
                                      Quitar
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                        <button
                          onClick={saveDraft}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {t('saveDraft')}
                        </button>
                        <button
                          onClick={cancelCompose}
                          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          ref={sendButtonRef}
                          onClick={sendCompose}
                          disabled={composeSending}
                          className={`px-6 py-2.5 ${composeIsEmergency ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 relative`}
                        >
                          {composeSending ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Send size={18} />
                          )}
                          {t('sendMessage')}
                        </button>
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
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            {t('channels.selectPrompt')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelManager;
