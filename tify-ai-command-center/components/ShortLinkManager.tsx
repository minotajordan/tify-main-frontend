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
  Eye,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../services/api';

const DateDisplay = ({ dateString }: { dateString: string }) => {
  const [showRelative, setShowRelative] = useState(true);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRelative(!showRelative);
  };

  return (
    <span
      onClick={handleClick}
      className="cursor-pointer hover:text-indigo-600 transition-colors min-w-[80px] text-right inline-block"
      title={showRelative ? "Click para ver fecha exacta" : "Click para ver tiempo relativo"}
    >
      {showRelative
        ? formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es })
        : new Date(dateString).toLocaleDateString()}
    </span>
  );
};

import { useI18n } from '../i18n';
import { ShortLink, ShortLinkStats, ShortLinkVisit } from '../types';

const ShortLinkManager: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'settings'>('overview');
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<ShortLink | null>(null);
  const [messageModal, setMessageModal] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    interstitialTitle: '',
    interstitialMessage: '',
    bannerImageUrl: '',
  });

  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlightedLinkId, setHighlightedLinkId] = useState<string | null>(null);

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

  const handleInitialCreate = async (url: string) => {
    if (!url) return;
    setIsAnalyzing(true);
    // Update targetUrl in newLink immediately so UI shows the url in the input if needed (though we might mask it with loading)
    setNewLink((prev) => ({ ...prev, targetUrl: url }));

    try {
      // 1. Fetch Metadata first
      const meta = await api.extractMetadata(url);

      const linkData = {
        ...newLink,
        targetUrl: url,
        interstitialTitle: meta.title || '',
        interstitialMessage: meta.description || '',
        bannerImageUrl: meta.image || '',
      };

      // Update state so preview shows correct data
      setNewLink(linkData);

      // 2. Create Link in DB automatically
      const link = await api.createShortLink(linkData);
      setCreatedLink(link);
    } catch (e) {
      console.error('Failed to analyze and create link', e);
      // Fallback: create link without metadata if analysis fails?
      // Or just alert? User asked to wait for metadata.
      // Let's try to create it anyway if metadata fails, or maybe just alert.
      // For now, let's assume we still want to create it even if metadata fails,
      // but the prompt implies the goal is to have the metadata.
      // However, stopping creation because og-tags are missing is bad UX.
      // I'll try to create it with basic data if metadata fails.
      try {
        const link = await api.createShortLink({ ...newLink, targetUrl: url });
        setCreatedLink(link);
      } catch (creationError) {
         setMessageModal({
           show: true,
           type: 'error',
           title: 'Error',
           message: 'No se pudo crear el enlace.',
         });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      // Set value immediately so UI updates
      setNewLink((prev) => ({ ...prev, targetUrl: text }));
      handleInitialCreate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInitialCreate(newLink.targetUrl);
    }
  };

  const handleConfirmDelete = async () => {
    const link = linkToDelete || createdLink;
    if (!link) return;

    setIsDeleting(true);
    try {
      await api.deleteShortLink(link.id);
      
      // If we deleted the link currently being created/viewed
      if (createdLink && createdLink.id === link.id) {
        setCreatedLink(null);
        setNewLink({
          targetUrl: '',
          redirectMode: 'IMMEDIATE',
          interstitialTitle: '',
          interstitialMessage: '',
          bannerImageUrl: '',
          activeFrom: '',
          expiresAt: '',
        });
        setShowCreate(false); // Close creation view if we deleted the just-created link
      }

      setLinkToDelete(null);
      setShowDeleteModal(false);
      loadLinks();
      loadStats();
      setMessageModal({
        show: true,
        type: 'success',
        title: 'Enlace eliminado',
        message: 'El enlace ha sido eliminado correctamente.',
      });
    } catch (e) {
      setMessageModal({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el enlace.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFinalSave = async () => {
    if (!createdLink) return;
    try {
      const updated = await api.updateShortLink(createdLink.id, newLink);
      setCreatedLink(updated); // Update with final data

      // Setup modal data
      setEditData({
        interstitialTitle: updated.interstitialTitle || '',
        interstitialMessage: updated.interstitialMessage || '',
        bannerImageUrl: updated.bannerImageUrl || '',
      });

      setShowSuccessModal(true);
      setShowCreate(false);

      loadLinks();
      loadStats();
    } catch (e) {
      setMessageModal({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el enlace.',
      });
    }
  };

  const handleDelete = (link: ShortLink) => {
    setLinkToDelete(link);
    setShowDeleteModal(true);
  };

  const handleUpdateCreatedLink = async () => {
    if (!createdLink) return;
    try {
      const updated = await api.updateShortLink(createdLink.id, editData);
      setCreatedLink(updated);
      setEditMode(false);
      loadLinks();
      setMessageModal({
        show: true,
        type: 'success',
        title: 'Actualizado',
        message: 'El enlace ha sido actualizado correctamente.',
      });
    } catch (e) {
      setMessageModal({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el enlace.',
      });
    }
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    if (createdLink) {
      setHighlightedLinkId(createdLink.id);
      // Remove highlight after 5 seconds
      setTimeout(() => setHighlightedLinkId(null), 5000);
    }
    setCreatedLink(null);
    setNewLink({
      targetUrl: '',
      redirectMode: 'IMMEDIATE',
      interstitialTitle: '',
      interstitialMessage: '',
      bannerImageUrl: '',
      activeFrom: '',
      expiresAt: '',
    });
    loadLinks();
    loadStats();
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    if (createdLink) {
      setHighlightedLinkId(createdLink.id);
      // Remove highlight after 5 seconds
      setTimeout(() => setHighlightedLinkId(null), 5000);
    }
    setCreatedLink(null);
    setNewLink({
      targetUrl: '',
      redirectMode: 'IMMEDIATE',
      interstitialTitle: '',
      interstitialMessage: '',
      bannerImageUrl: '',
      activeFrom: '',
      expiresAt: '',
    });
    loadLinks();
    loadStats();
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

  const getDisplayUrl = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/L${code}`;
    }
    return `https://tify.pro/L${code}`;
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.toUpperCase();
    } catch {
      return 'WEBSITE';
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
              onClick={handleCloseCreate}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {createdLink ? 'Short URL Generada' : t('shortlinks.targetUrl')}
              </label>
              <div className="flex gap-3">
                {isAnalyzing ? (
                  <div className="flex-1 flex items-center justify-center gap-3 px-5 py-3 border border-indigo-100 bg-indigo-50/50 rounded-xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="text-indigo-700 font-medium animate-pulse">
                      Analizando metadatos y guardando...
                    </span>
                  </div>
                ) : createdLink ? (
                  <div className="flex-1 flex items-center gap-2 px-5 py-3 border border-gray-200 bg-gray-50 rounded-xl animate-in fade-in duration-300">
                    <LinkIcon size={20} className="text-indigo-500" />
                    <span className="text-gray-900 font-bold text-lg truncate flex-1">
                      {getDisplayUrl(createdLink.code)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle size={12} />
                      <span>Creado</span>
                    </div>
                  </div>
                ) : (
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
                )}

                {!isAnalyzing &&
                  (createdLink ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(getDisplayUrl(createdLink.code), createdLink.id)}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:scale-105"
                    >
                      {copiedId === createdLink.id ? <Check size={20} /> : <Copy size={20} />}
                      <span className="hidden md:inline">Copiar</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditData({
                          interstitialTitle: createdLink.interstitialTitle || '',
                          interstitialMessage: createdLink.interstitialMessage || '',
                          bannerImageUrl: createdLink.bannerImageUrl || '',
                        });
                        setShowSuccessModal(true);
                      }}
                      className="px-4 py-3 bg-gray-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 flex items-center gap-2 transition-all hover:scale-105 border border-gray-200"
                      title="Ver QR"
                    >
                      <QrCode size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setLinkToDelete(null);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 flex items-center gap-2 transition-all hover:scale-105 border border-red-100"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInitialCreate(newLink.targetUrl)}
                    disabled={!newLink.targetUrl || metadataLoading}
                    className="px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {metadataLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    ) : (
                      <Globe size={20} />
                    )}
                    <span className="hidden md:inline">Generar</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW CARD GENERATED */}
            {(newLink.bannerImageUrl || newLink.interstitialTitle) && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Eye size={16} className="text-indigo-600" />
                    <span>Vista Previa del Enlace</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 hidden md:inline-block">
                    {isEditingPreview ? 'Modo Edición' : 'Así se verá en redes sociales'}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Card */}
                  <div
                    className={`border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 w-full max-w-sm shadow-lg transition-all relative group ${
                      !isEditingPreview ? 'hover:shadow-xl hover:scale-[1.01] cursor-pointer' : ''
                    }`}
                    onClick={() => !isEditingPreview && setIsEditingPreview(true)}
                  >
                    {!isEditingPreview && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-[1px]">
                        <div className="bg-white/90 text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <Edit2 size={16} />
                          <span>Click para editar</span>
                        </div>
                      </div>
                    )}

                    <div className="aspect-[1.91/1] bg-gray-200 w-full relative">
                      {newLink.bannerImageUrl ? (
                        <img
                          src={newLink.bannerImageUrl}
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
                      {isEditingPreview && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="flex flex-col gap-2 w-full px-6">
                            <input
                              type="url"
                              value={newLink.bannerImageUrl}
                              onChange={(e) =>
                                setNewLink({ ...newLink, bannerImageUrl: e.target.value })
                              }
                              placeholder="URL de la imagen..."
                              className="w-full bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex justify-center">
                              <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">
                                Cambiar URL de imagen
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5 bg-white relative">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                        {getHostname(newLink.targetUrl)}
                      </div>
                      {isEditingPreview ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={newLink.interstitialTitle}
                            onChange={(e) =>
                              setNewLink({ ...newLink, interstitialTitle: e.target.value })
                            }
                            className="w-full font-bold text-gray-900 text-base border-b border-gray-300 focus:border-indigo-600 outline-none py-1 bg-transparent"
                            placeholder="Título del enlace"
                          />
                          <textarea
                            value={newLink.interstitialMessage}
                            onChange={(e) =>
                              setNewLink({ ...newLink, interstitialMessage: e.target.value })
                            }
                            className="w-full text-sm text-gray-600 border-b border-gray-300 focus:border-indigo-600 outline-none py-1 resize-none bg-transparent"
                            rows={2}
                            placeholder="Descripción..."
                          />
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => setIsEditingPreview(false)}
                              className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Listo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h5 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                            {newLink.interstitialTitle || 'Sin título definido'}
                          </h5>
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {newLink.interstitialMessage || 'Sin descripción disponible.'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Call to Action for Edit / Advanced */}
                  <div className="flex-1 space-y-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                          <Settings size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900 text-sm">
                            Configuración Avanzada
                          </div>
                          <div className="text-xs text-gray-500">
                            Fechas de expiración, tipo de redirección
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}
                      >
                        <Settings size={16} />
                      </div>
                    </button>

                    <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 text-sm text-indigo-900 animate-in fade-in duration-700">
                      <p className="mb-2 font-medium flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-500" />
                        Información extraída automáticamente
                      </p>
                      <p className="text-indigo-700/80 text-xs leading-relaxed">
                        Pasa el cursor sobre la tarjeta de vista previa para editar la imagen, el
                        título o la descripción si deseas personalizarlos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!newLink.bannerImageUrl && !newLink.interstitialTitle && (
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
            )}

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

                <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100 hidden">
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

      {!showCreate && activeTab === 'links' && (
        <>
          {!loading && links.length > 0 && (
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar links..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>
          )}

          {loading ? (
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
              {links.filter(link => {
                const search = filterText.toLowerCase();
                return (
                  link.shortUrl.toLowerCase().includes(search) ||
                  link.targetUrl.toLowerCase().includes(search) ||
                  link.code.toLowerCase().includes(search) ||
                  (link.interstitialTitle && link.interstitialTitle.toLowerCase().includes(search)) ||
                  (link.interstitialMessage && link.interstitialMessage.toLowerCase().includes(search))
                );
              }).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                  <Search size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No se encontraron links que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                links.filter(link => {
                  const search = filterText.toLowerCase();
                  return (
                    link.shortUrl.toLowerCase().includes(search) ||
                    link.targetUrl.toLowerCase().includes(search) ||
                    link.code.toLowerCase().includes(search) ||
                    (link.interstitialTitle && link.interstitialTitle.toLowerCase().includes(search)) ||
                    (link.interstitialMessage && link.interstitialMessage.toLowerCase().includes(search))
                  );
                }).map((link) => (
              <div
                key={link.id}
                onClick={() => {
                  setCreatedLink(link);
                  setEditData({
                    interstitialTitle: link.interstitialTitle || '',
                    interstitialMessage: link.interstitialMessage || '',
                    bannerImageUrl: link.bannerImageUrl || '',
                  });
                  setShowSuccessModal(true);
                }}
                className={`group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row cursor-pointer ${
                  highlightedLinkId === link.id
                    ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/10'
                    : 'border-gray-100 hover:border-indigo-200'
                }`}
              >
                {/* Left: Thumbnail */}
                <div className="w-full md:w-56 h-48 md:h-auto bg-gray-50 relative shrink-0 border-b md:border-b-0 md:border-r border-gray-100 group-hover:opacity-90 transition-opacity">
                  {link.bannerImageUrl ? (
                    <img
                      src={link.bannerImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                      <Image size={32} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        No Preview
                      </span>
                    </div>
                  )}
                  
                  {/* Overlay gradient for text readability on image if needed, or just style */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent md:hidden" />
                </div>

                {/* Center: Info + Actions */}
                <div className="flex-1 p-5 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold font-mono border border-indigo-100">
                        /{link.code}
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 flex items-center gap-1 border border-green-100">
                        <TrendingUp size={12} />
                        {link.clicks || 0}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                       <DateDisplay dateString={link.createdAt} />
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1 leading-tight group-hover:text-indigo-700 transition-colors">
                      {link.interstitialTitle || 'Sin título definido'}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {link.interstitialMessage || 'Sin descripción disponible.'}
                    </p>
                  </div>

                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 font-medium text-sm hover:underline block truncate mb-4 flex items-center gap-1.5 p-2 bg-indigo-50/50 rounded-lg"
                  >
                    <ExternalLink size={14} />
                    {link.shortUrl}
                  </a>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                    {/* Actions: Copy & QR next to image - Left Aligned */}
                    <div className="flex items-center gap-3 w-full">
                       <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(link.shortUrl, link.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold active:scale-95 shadow-lg shadow-indigo-100"
                      >
                        {copiedId === link.id ? (
                          <Check size={18} />
                        ) : (
                          <Copy size={18} />
                        )}
                        <span>Copiar</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreatedLink(link);
                          setShowSuccessModal(true);
                        }}
                        className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200"
                        title="QR & Share"
                      >
                        <QrCode size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(link);
                        }}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-200"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                )))}
            </div>
          )}
        </>
      )}

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
                onClick={handleCloseSuccessModal}
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
      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar enlace?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Esta acción no se puede deshacer. El enlace dejará de funcionar inmediatamente.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL */}
      {messageModal && messageModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  messageModal.type === 'success'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {messageModal.type === 'success' ? <Check size={24} /> : <X size={24} />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{messageModal.title}</h3>
              <p className="text-gray-500 text-sm mb-6">{messageModal.message}</p>
              <button
                onClick={() => setMessageModal(null)}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortLinkManager;
