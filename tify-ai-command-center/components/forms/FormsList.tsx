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
} from 'lucide-react';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';
import QRCodeStyling from 'qr-code-styling';

interface Form {
  id: string;
  title: string;
  description: string;
  slug: string;
  isActive: boolean;
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
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className="p-8 text-center text-gray-500">{t('forms.loading')}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{t('forms.list.title')}</h2>
        <button
          onClick={() => onEdit('new')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          {t('forms.create')}
        </button>
      </div>

      <div className="overflow-x-auto">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {forms.map((form) => (
              <tr key={form.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{form.title}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs" title={form.description}>
                    {form.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {form.isActive ? t('forms.status.active') : t('forms.status.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {form._count?.submissions || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(form.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => window.open(`/forms/${form.slug}`, '_blank')}
                      className="text-gray-400 hover:text-indigo-600"
                      title={t('forms.action.viewPublic')}
                    >
                      <ExternalLink size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenQR(form)}
                      className="text-gray-400 hover:text-indigo-600"
                      title={t('forms.action.qrCode')}
                    >
                      <QrCode size={18} />
                    </button>
                    <button
                      onClick={() => onViewSubmissions(form.id)}
                      className="text-gray-400 hover:text-indigo-600"
                      title={t('forms.action.viewSubmissions')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => onEdit(form.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title={t('forms.action.edit')}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(form.id)}
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
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6"
              />

              <h4 className="text-lg font-bold text-gray-900 text-center mb-1">
                {qrModalForm.title}
              </h4>

              {qrModalForm.expiresAt && (
                <div className="flex items-center gap-1.5 text-amber-600 text-sm mb-6 bg-amber-50 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  <span>
                    {t('forms.modal.expiresOn')} {new Date(qrModalForm.expiresAt).toLocaleDateString()}
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
              <p className="text-xs text-gray-500">
                {t('forms.modal.scanToAccess')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsList;
