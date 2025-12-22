import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Settings,
  Calendar,
  Globe,
  Type,
  Image,
  FileText,
  X,
  Download,
  Edit2,
  Save,
  TrendingUp,
  Link as LinkIcon,
  Activity,
  PieChart,
  Clock,
  CheckCircle,
  Share2,
  LayoutDashboard,
  List,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { ShortLink, ShortLinkStats, ShortLinkVisit } from '../types';

const ShortLinkManager: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'settings'>('overview');
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ShortLinkStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [newLink, setNewLink] = useState({
    targetUrl: '',
    redirectMode: 'IMMEDIATE',
    interstitialTitle: '',
    interstitialMessage: '',
    bannerImageUrl: '',
    activeFrom: '',
    expiresAt: '',
  });

  // Success/Edit Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    interstitialTitle: '',
    interstitialMessage: '',
    bannerImageUrl: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getShortLinkStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const loadLinks = async () => {
    try {
      const data = await api.getShortLinks();
      setLinks(data?.items || []);
    } catch (e) {
      console.error('Failed to load links', e);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newLink.targetUrl) return;
    try {
      const link = await api.createShortLink(newLink);

      setNewLink({
        targetUrl: '',
        redirectMode: 'IMMEDIATE',
        interstitialTitle: '',
        interstitialMessage: '',
        bannerImageUrl: '',
        activeFrom: '',
        expiresAt: '',
      });
      setShowCreate(false);
      setShowAdvanced(false);

      // Open Success Modal
      setCreatedLink(link);
      setEditData({
        interstitialTitle: link.interstitialTitle || '',
        interstitialMessage: link.interstitialMessage || '',
        bannerImageUrl: link.bannerImageUrl || '',
      });
      setShowSuccessModal(true);

      loadLinks();
      loadStats();
    } catch (e) {
      alert('Failed to create link');
    }
  };

  const fetchMetadata = async (urlOverride?: string) => {
    const url = urlOverride || newLink.targetUrl;
    if (!url) return;

    setMetadataLoading(true);
    try {
      const meta = await api.extractMetadata(url);
      setNewLink((prev) => ({
        ...prev,
        interstitialTitle: meta.title || prev.interstitialTitle,
        interstitialMessage: meta.description || prev.interstitialMessage,
        bannerImageUrl: meta.image || prev.bannerImageUrl,
      }));
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    } finally {
      setMetadataLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      fetchMetadata(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchMetadata();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.deleteShortLink(id);
      loadLinks();
      loadStats();
    } catch (e) {
      alert('Failed to delete link');
    }
  };

  const handleUpdateCreatedLink = async () => {
    if (!createdLink) return;
    try {
      const updated = await api.updateShortLink(createdLink.id, editData);
      setCreatedLink(updated);
      setEditMode(false);
      loadLinks();
    } catch (e) {
      alert('Failed to update link');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadQr = () => {
    const svg = document.getElementById('created-qr-code');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${createdLink?.code}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.shortlinks')}</h1>
          <p className="text-gray-500 mt-1">{t('shortlinks.manage')}</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:scale-105"
          >
            <Plus size={20} />
            <span>{t('shortlinks.createBtn')}</span>
          </button>
        )}
      </div>

      {!showCreate && (
        <div className="flex items-center gap-6 border-b border-gray-200 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard size={18} />
              <span>Resumen</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'links'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <List size={18} />
              <span>Links</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'settings'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <span>Configuración</span>
            </div>
          </button>
        </div>
      )}

      {showCreate && (
        <div
          id="create-form"
          className="mb-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('shortlinks.create')}</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('shortlinks.targetUrl')}
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={newLink.targetUrl}
                  onChange={(e) => setNewLink({ ...newLink, targetUrl: e.target.value })}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com/awesome-content"
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-400 transition-all"
                  autoFocus
                />
                <button
                  onClick={() => fetchMetadata()}
                  disabled={!newLink.targetUrl || metadataLoading}
                  className="px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {metadataLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                  ) : (
                    <Globe size={20} />
                  )}
                  <span className="hidden md:inline">{t('shortlinks.autoFill')}</span>
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition-colors"
              >
                <Settings size={16} />
                <span>
                  {showAdvanced ? t('shortlinks.hideAdvanced') : t('shortlinks.showAdvanced')}
                </span>
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-6 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shortlinks.activeFrom')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3 text-gray-400" size={18} />
                      <input
                        type="datetime-local"
                        value={newLink.activeFrom}
                        onChange={(e) => setNewLink({ ...newLink, activeFrom: e.target.value })}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('shortlinks.expiresAt')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3 text-gray-400" size={18} />
                      <input
                        type="datetime-local"
                        value={newLink.expiresAt}
                        onChange={(e) => setNewLink({ ...newLink, expiresAt: e.target.value })}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shortlinks.redirectType')}
                  </label>
                  <div className="flex gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="redirectMode"
                        value="IMMEDIATE"
                        checked={newLink.redirectMode === 'IMMEDIATE'}
                        onChange={(e) => setNewLink({ ...newLink, redirectMode: e.target.value })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-900">
                        {t('shortlinks.typeImmediate')}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="redirectMode"
                        value="INTERSTITIAL"
                        checked={newLink.redirectMode === 'INTERSTITIAL'}
                        onChange={(e) => setNewLink({ ...newLink, redirectMode: e.target.value })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-900">
                        {t('shortlinks.typeInterstitial')}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-2">
                    Personalización
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shortlinks.pageTitle')}
                    </label>
                    <div className="relative">
                      <Type className="absolute left-4 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={newLink.interstitialTitle}
                        onChange={(e) =>
                          setNewLink({ ...newLink, interstitialTitle: e.target.value })
                        }
                        placeholder={t('shortlinks.pageTitlePlaceholder')}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shortlinks.messageDescription')}
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-3 text-gray-400" size={18} />
                      <textarea
                        value={newLink.interstitialMessage}
                        onChange={(e) =>
                          setNewLink({ ...newLink, interstitialMessage: e.target.value })
                        }
                        placeholder={t('shortlinks.messagePlaceholder')}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('shortlinks.bannerImage')}
                    </label>
                    <div className="relative">
                      <Image className="absolute left-4 top-3 text-gray-400" size={18} />
                      <input
                        type="url"
                        value={newLink.bannerImageUrl}
                        onChange={(e) => setNewLink({ ...newLink, bannerImageUrl: e.target.value })}
                        placeholder={t('shortlinks.bannerImagePlaceholder')}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                {t('shortlinks.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newLink.targetUrl}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 flex items-center gap-2 hover:scale-105 transition-all"
              >
                <span>{t('shortlinks.shortenNow')}</span>
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD STATS - Redesigned to match Local Events Dashboard */}
      {!showCreate && activeTab === 'overview' && stats && (
        <div className="mb-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Total Links Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {t('shortlinks.dashboard.totalLinks')}
                </h3>
                <LinkIcon className="text-indigo-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalLinks}</div>
              <div className="text-xs text-gray-500 mt-1">Links activos</div>
            </div>

            {/* Total Clicks Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {t('shortlinks.dashboard.totalClicks')}
                </h3>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.totalClicks}</div>
              <div className="text-xs text-gray-500 mt-1">Interacciones totales</div>
            </div>

            {/* Active Links Card */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {t('shortlinks.dashboard.activeLinks')}
                </h3>
                <Activity className="text-blue-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.activeLinks}</div>
              <div className="text-xs text-gray-500 mt-1">En las últimas 24h</div>
            </div>

            {/* Avg Clicks Card (New for 4-col layout) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  Promedio
                </h3>
                <PieChart className="text-orange-500" size={20} />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.totalLinks > 0 ? Math.round(stats.totalClicks / stats.totalLinks) : 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Clicks por link</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieChart size={18} className="text-gray-400" />
                {t('shortlinks.dashboard.clicksOverTime')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val: string) =>
                        new Date(val).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelFormatter={(val: string | number) => new Date(val).toLocaleDateString()}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-gray-400" />
                {t('shortlinks.dashboard.recentActivity')}
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 max-h-60 space-y-4">
                {stats.recentVisits && stats.recentVisits.length > 0 ? (
                  stats.recentVisits.map((visit: ShortLinkVisit, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
                          <Globe size={14} />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            Visit /L{visit.shortLink?.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(visit.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
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
      )}

      {!showCreate && activeTab === 'links' && (loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCode size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('shortlinks.noLinks')}</h3>
          <p className="text-gray-500 max-w-sm mx-auto">{t('shortlinks.start')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left: Actions (Desktop: Left, Mobile: Row) */}
              <div className="flex md:flex-col items-center justify-center gap-3 p-4 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                <button
                  onClick={() => {
                    setCreatedLink(link);
                    setShowSuccessModal(true);
                  }}
                  className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm hover:scale-110 hover:shadow-md transition-all border border-gray-100"
                  title="QR & Share"
                >
                  <QrCode size={20} />
                </button>
                <button
                  onClick={() => copyToClipboard(link.shortUrl, link.id)}
                  className="p-2.5 bg-white text-gray-600 rounded-xl shadow-sm hover:scale-110 hover:shadow-md transition-all border border-gray-100"
                  title="Copy Link"
                >
                  {copiedId === link.id ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
                <div className="w-px h-6 bg-gray-300 md:w-6 md:h-px my-1 md:my-2 hidden"></div>
                <button
                  onClick={() => {
                    setCreatedLink(link);
                    setEditData({
                      interstitialTitle: link.interstitialTitle || '',
                      interstitialMessage: link.interstitialMessage || '',
                      bannerImageUrl: link.bannerImageUrl || '',
                    });
                    setShowSuccessModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors md:mt-2"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Center: Info */}
              <div className="flex-1 p-5 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 text-lg tracking-tight">/{link.code}</h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <TrendingUp size={10} />
                      {link.clicks || 0} clicks
                    </span>
                  </div>
                </div>

                <a
                  href={link.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-medium text-base hover:underline block truncate mb-1.5"
                >
                  {link.shortUrl}
                </a>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1 min-w-0">
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate max-w-[300px]">{link.targetUrl}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Right: Thumbnail */}
              <div className="w-full md:w-56 h-32 md:h-auto bg-gray-100 relative shrink-0 border-t md:border-t-0 md:border-l border-gray-100">
                {link.bannerImageUrl ? (
                  <img
                    src={link.bannerImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                    <Image size={32} className="mb-2" />
                    <span className="text-xs font-medium uppercase tracking-wider">No Preview</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                  <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                    Preview
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* SETTINGS TAB PLACEHOLDER */}
      {!showCreate && activeTab === 'settings' && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Configuración Global</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Próximamente podrás configurar dominios personalizados y píxeles de seguimiento.
          </p>
        </div>
      )}

      {/* SUCCESS / EDIT MODAL */}
      {showSuccessModal && createdLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-3 text-indigo-900">
                <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{t('shortlinks.successTitle')}</h3>
                  <p className="text-sm text-indigo-600/70">
                    ¡Tu enlace está listo para compartir!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* LEFT: QR and URL */}
                <div className="flex flex-col items-center justify-center space-y-8 border-r border-gray-100 pr-0 md:pr-10">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 transform hover:scale-105 transition-transform duration-300">
                    <QRCodeSVG
                      id="created-qr-code"
                      value={createdLink.shortUrl}
                      size={220}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 group hover:border-indigo-300 transition-colors">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Globe size={18} className="text-indigo-600" />
                      </div>
                      <span className="flex-1 text-sm font-bold text-gray-900 truncate font-mono">
                        {createdLink.shortUrl}
                      </span>
                      <button
                        onClick={() => copyToClipboard(createdLink.shortUrl, 'url')}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        {copiedId === 'url' ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                    <button
                      onClick={downloadQr}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-900 rounded-xl text-gray-900 hover:bg-gray-900 hover:text-white font-bold transition-all"
                    >
                      <Download size={20} />
                      {t('shortlinks.downloadQr')}
                    </button>
                  </div>
                </div>

                {/* RIGHT: Social Preview */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Share2 size={20} className="text-indigo-600" />
                      {t('shortlinks.socialPreview')}
                    </h4>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${editMode ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                      <Edit2 size={14} />
                      {t('shortlinks.editPreview')}
                    </button>
                  </div>

                  {/* PREVIEW CARD */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 max-w-sm mx-auto md:mx-0 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="aspect-[1.91/1] bg-gray-200 w-full relative group">
                      {editData.bannerImageUrl ? (
                        <img
                          src={editData.bannerImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-100">
                          <Image size={48} className="mb-2" />
                          <span className="text-xs font-medium uppercase tracking-wider">
                            No Image
                          </span>
                        </div>
                      )}
                      {editMode && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-bold px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                            Cambiar Imagen
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 bg-white">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                        EXAMPLE.COM
                      </div>
                      {editMode ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editData.interstitialTitle}
                            onChange={(e) =>
                              setEditData({ ...editData, interstitialTitle: e.target.value })
                            }
                            className="w-full text-base font-bold text-gray-900 border-b-2 border-gray-200 focus:border-indigo-500 outline-none px-0 py-1 transition-colors"
                            placeholder="Título del enlace"
                          />
                          <textarea
                            value={editData.interstitialMessage}
                            onChange={(e) =>
                              setEditData({ ...editData, interstitialMessage: e.target.value })
                            }
                            className="w-full text-sm text-gray-600 border-b-2 border-gray-200 focus:border-indigo-500 outline-none px-0 py-1 resize-none transition-colors"
                            rows={2}
                            placeholder="Descripción del enlace..."
                          />
                          <input
                            type="text"
                            value={editData.bannerImageUrl}
                            onChange={(e) =>
                              setEditData({ ...editData, bannerImageUrl: e.target.value })
                            }
                            className="w-full text-xs text-gray-400 border-b-2 border-gray-200 focus:border-indigo-500 outline-none px-0 py-1 font-mono transition-colors"
                            placeholder="https://... (URL de imagen)"
                          />
                        </div>
                      ) : (
                        <>
                          <h5 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                            {editData.interstitialTitle || 'Sin título definido'}
                          </h5>
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {editData.interstitialMessage ||
                              'Sin descripción disponible para este enlace.'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {editMode && (
                    <button
                      onClick={handleUpdateCreatedLink}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                    >
                      <Save size={18} />
                      {t('shortlinks.update')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortLinkManager;
