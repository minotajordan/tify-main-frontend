import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  MoreVertical,
  QrCode,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  Copy,
  Download,
  Share2,
  Clock,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import AIChat from '../AIChat';
import { useI18n } from '../../i18n';
import QRCodeStyling from 'qr-code-styling';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('es');

const COLOMBIA_TZ = 'America/Bogota';

const formatToColombia = (dateStr: string, relative: boolean = false) => {
  if (!dateStr) return '';
  // Convert UTC to Colombia time
  const date = dayjs.utc(dateStr).tz(COLOMBIA_TZ);

  if (relative) {
    return date.fromNow();
  }
  return date.format('D MMM YYYY, h:mm A');
};

interface Form {
  id: string;
  title: string;
  description: string;
  slug: string;
  isActive: boolean;
  isPublished: boolean;
  _count?: { submissions: number };
  createdAt: string;
  expiresAt?: string | null;
}

const FormsList: React.FC<{
  onEdit: (id: string) => void;
  onViewSubmissions: (id: string) => void;
}> = ({ onEdit, onViewSubmissions }) => {
  const { t } = useI18n();
  const [forms, setForms] = useState<Form[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [qrModalForm, setQrModalForm] = useState<Form | null>(null);
  const qrRef = React.useRef<HTMLDivElement>(null);
  const qrCodeRef = React.useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (qrModalForm && qrRef.current) {
      // Clear previous content immediately
      qrRef.current.innerHTML = '';

      const url = `${window.location.origin}/forms/${qrModalForm.slug}`;
      const qrCode = new QRCodeStyling({
        width: 280,
        height: 280,
        data: url,
        dotsOptions: { color: '#1e1b4b', type: 'rounded' },
        cornersSquareOptions: { color: '#4f46e5', type: 'extra-rounded' },
        cornersDotOptions: { color: '#4f46e5' },
        backgroundOptions: { color: '#ffffff' },
      });

      // Small delay to ensure modal is rendered and layout is stable
      const timer = setTimeout(() => {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
          qrCode.append(qrRef.current);
          qrCodeRef.current = qrCode;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [qrModalForm]);

  const fetchForms = async () => {
    try {
      const data = await api.getForms();
      setForms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('forms.deleteConfirm'))) {
      try {
        await api.deleteForm(id);
        setForms(forms.filter((f) => f.id !== id));
      } catch (err) {
        alert(t('forms.deleteError'));
      }
    }
  };

  const handleOpenQR = (form: Form) => {
    setQrModalForm(form);
  };

  const handleCloseQR = () => {
    setQrModalForm(null);
  };

  const handleCopyLink = () => {
    if (!qrModalForm) return;
    const url = `${window.location.origin}/forms/${qrModalForm.slug}`;
    navigator.clipboard.writeText(url);
    alert(t('forms.modal.linkCopied'));
  };

  const handleDownloadQR = () => {
    if (qrCodeRef.current && qrModalForm) {
      qrCodeRef.current.download({ name: `form-${qrModalForm.slug}-qr`, extension: 'png' });
    }
  };

  const handleShare = async () => {
    if (!qrModalForm) return;
    const url = `${window.location.origin}/forms/${qrModalForm.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: qrModalForm.title,
          text: qrModalForm.description || t('forms.modal.scanToAccess'),
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleAIChatComplete = () => {
    const pendingForm = localStorage.getItem('tify_pending_ai_form');
    if (pendingForm) {
      try {
        const form = JSON.parse(pendingForm);
        // Transform to FormEditor structure
        const editorDraft = {
          title: form.title,
          description: form.description,
          fields: form.fields,
          headerContent: `<div style="text-align: center; padding: 20px 0;"><h1 class="text-3xl font-bold text-indigo-600">${form.title}</h1></div>`,
          footerContent: `<div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem;"><p>&copy; ${new Date().getFullYear()} Tify. All rights reserved.</p></div>`,
          successMessage: 'Gracias por tu respuesta.',
          isActive: true,
          isPublished: false,
          collectUserInfo: false,
        };

        localStorage.setItem('tify_form_draft_new', JSON.stringify(editorDraft));
        localStorage.removeItem('tify_pending_ai_form');

        setShowAIChat(false);
        onEdit('new');
      } catch (e) {
        console.error('Error parsing AI draft', e);
        setShowAIChat(false);
      }
    } else {
      setShowAIChat(false);
    }
  };

  const filteredForms = forms.filter(
    (form) =>
      form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded hidden sm:block"></div>
          </div>
          <div className="animate-pulse h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
          {/* Mobile Skeleton */}
          <div className="block md:hidden space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-3 w-full bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-5 w-16 bg-gray-200 rounded-full ml-4"></div>
                </div>
                <div className="flex items-center gap-4 mb-4 border-b border-gray-50 pb-3">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Skeleton */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="space-y-2 animate-pulse">
                        <div className="h-5 w-48 bg-gray-200 rounded"></div>
                        <div className="h-3 w-64 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 animate-pulse">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('forms.manager.title')}</h2>
          <p className="text-sm text-gray-500 hidden sm:block">{t('forms.manager.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3 flex-1 md:justify-end">
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('forms.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <button
            onClick={() => setShowAIChat(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors shadow-sm whitespace-nowrap"
            title="Crear con IA"
          >
            <Sparkles size={18} />
          </button>

          <button
            onClick={() => onEdit('new')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
        {/* Mobile View: Cards */}
        <div className="block md:hidden space-y-4">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => onViewSubmissions(form.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 line-clamp-1">{form.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.description}</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide rounded-full flex items-center gap-1.5 ${
                    !form.isPublished
                      ? 'bg-gray-100 text-gray-600'
                      : form.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {form.isPublished && form.isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                  {form.isPublished && !form.isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                  {!form.isPublished
                    ? t('forms.status.draft')
                    : form.isActive
                      ? t('forms.status.active')
                      : t('forms.status.paused')}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 border-b border-gray-50 pb-3">
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-gray-400" />
                  <span>
                    {form._count?.submissions || 0} {t('forms.list.header.submissions')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  <span>{formatToColombia(form.createdAt, true)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/forms/${form.slug}`, '_blank');
                    }}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('forms.action.viewPublic')}
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenQR(form);
                    }}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('forms.action.qrCode')}
                  >
                    <QrCode size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewSubmissions(form.id);
                    }}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('forms.action.viewSubmissions')}
                  >
                    <Eye size={18} />
                  </button>
                </div>

                <div className="flex gap-1 border-l border-gray-100 pl-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(form.id);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('forms.action.edit')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(form.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('forms.action.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {forms.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
              {t('forms.list.empty')}
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('forms.list.header.title')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('forms.list.header.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('forms.list.header.submissions')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('forms.list.header.created')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('forms.list.header.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredForms.map((form) => (
                <tr
                  key={form.id}
                  className="hover:bg-indigo-50 transition-colors cursor-pointer"
                  onClick={() => onViewSubmissions(form.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{form.title}</div>
                    <div
                      className="text-sm text-gray-500 truncate max-w-xs"
                      title={form.description}
                    >
                      {form.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1.5 ${
                        !form.isPublished
                          ? 'bg-gray-100 text-gray-600'
                          : form.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {form.isPublished && form.isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      )}
                      {form.isPublished && !form.isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                      {!form.isPublished
                        ? t('forms.status.draft')
                        : form.isActive
                          ? t('forms.status.active')
                          : t('forms.status.paused')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {form._count?.submissions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatToColombia(form.createdAt, true)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/forms/${form.slug}`, '_blank');
                        }}
                        className="text-gray-400 hover:text-indigo-600"
                        title={t('forms.action.viewPublic')}
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQR(form);
                        }}
                        className="text-gray-400 hover:text-indigo-600"
                        title={t('forms.action.qrCode')}
                      >
                        <QrCode size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(form.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title={t('forms.action.edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(form.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title={t('forms.action.delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {forms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {t('forms.list.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrModalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">{t('forms.modal.qrTitle')}</h3>
              <button
                onClick={handleCloseQR}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div
                ref={qrRef}
                className="p-4 rounded-xl shadow-sm border border-gray-100 mb-6"
                style={{ backgroundColor: '#ffffff' }}
              />

              <h4 className="text-lg font-bold text-gray-900 text-center mb-1">
                {qrModalForm.title}
              </h4>

              {qrModalForm.expiresAt && (
                <div className="flex items-center gap-1.5 text-amber-600 text-sm mb-6 bg-amber-50 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  <span>
                    {t('forms.modal.expiresOn')}{' '}
                    {formatToColombia(qrModalForm.expiresAt || '', true)} (
                    {formatToColombia(qrModalForm.expiresAt || '')})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <Copy size={20} className="text-indigo-600" />
                  <span className="text-xs font-medium">{t('forms.modal.copyLink')}</span>
                </button>

                <button
                  onClick={handleDownloadQR}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <Download size={20} className="text-indigo-600" />
                  <span className="text-xs font-medium">{t('forms.modal.downloadQR')}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <Share2 size={20} className="text-indigo-600" />
                  <span className="text-xs font-medium">{t('forms.modal.share')}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">{t('forms.modal.scanToAccess')}</p>
            </div>
          </div>
        </div>
      )}
      {showAIChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles size={20} />
                <h3 className="font-semibold">Asistente de Creación</h3>
              </div>
              <button
                onClick={() => setShowAIChat(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AIChat onNavigateToForms={handleAIChatComplete} variant="embedded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsList;
