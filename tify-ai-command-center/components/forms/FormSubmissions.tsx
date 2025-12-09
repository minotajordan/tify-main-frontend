import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ArrowLeft, Download, Eye, X, FileText, Table, LayoutList } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Submission {
  id: string;
  data: any;
  createdAt: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  userAgent?: string;
  deviceInfo?: any;
}

const FormSubmissions: React.FC<{ formId: string; onClose: () => void }> = ({
  formId,
  onClose,
}) => {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [viewFile, setViewFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [hasTrackingInfo, setHasTrackingInfo] = useState(false);

  useEffect(() => {
    // Auto-detect view mode based on screen width
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      } else {
        setViewMode('table');
      }
    };
    
    // Set initial
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    try {
      const [formData, subsData] = await Promise.all([
        api.getForm(formId),
        api.getFormSubmissions(formId),
      ]);
      setFormTitle(formData.title);
      setFormData(formData);
      setSubmissions(subsData);

      const keys = Array.from(new Set(subsData.flatMap((s: any) => Object.keys(s.data))));
      setAllKeys(keys);
      setHasTrackingInfo(subsData.some((s: any) => s.ipAddress || s.country || s.city));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) return;

    const headers = ['ID', 'Date', ...allKeys];
    if (hasTrackingInfo) {
      headers.push('IP', 'País', 'Ciudad', 'Dispositivo');
    }

    const csvContent = [
      headers.join(','),
      ...submissions.map((s) => {
        const row = [
          s.id,
          new Date(s.createdAt).toISOString(),
          ...allKeys.map((k) => JSON.stringify(s.data[k] ?? '')),
        ];
        
        if (hasTrackingInfo) {
          row.push(
            s.ipAddress || '',
            s.country || '',
            s.city || '',
            s.deviceInfo ? JSON.stringify(s.deviceInfo).replace(/,/g, ';') : ''
          );
        }
        
        return row.join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `submissions-${formTitle}-${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderValue = (val: any) => {
    if (!val) return '-';

    if (typeof val === 'boolean') {
      return val ? t('forms.public.yes') : t('forms.public.no');
    }

    if (
      typeof val === 'object' &&
      val.name &&
      val.type &&
      val.data &&
      typeof val.data === 'string' &&
      val.data.startsWith('data:')
    ) {
      return (
        <button
          onClick={() => setViewFile(val)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={16} />
          <span className="text-sm font-medium">Ver archivo</span>
        </button>
      );
    }

    return typeof val === 'object' ? JSON.stringify(val) : val;
  };

  if (loading) {
    return (
      <div className="bg-white h-full flex flex-col animate-pulse">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="p-6 space-y-6">
          <div className="h-12 w-full bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('forms.submissions.title')}</h2>
            <p className="text-sm text-gray-500">{formTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista de tabla"
            >
              <Table size={18} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista de tarjetas"
            >
              <LayoutList size={18} />
            </button>
          </div>
          <button
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={18} />
            <span className="hidden sm:inline">{t('forms.submissions.export')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('forms.submissions.empty')}</div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 whitespace-nowrap">{t('forms.submissions.date')}</th>
                        {allKeys.map((key) => (
                          <th key={key} className="px-6 py-3 whitespace-nowrap capitalize">
                            {key}
                          </th>
                        ))}
                        {hasTrackingInfo && (
                          <>
                            <th className="px-6 py-3 whitespace-nowrap">IP</th>
                            <th className="px-6 py-3 whitespace-nowrap">Ubicación</th>
                            <th className="px-6 py-3 whitespace-nowrap">Dispositivo</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(sub.createdAt).toLocaleString()}
                          </td>
                          {allKeys.map((key) => (
                            <td key={key} className="px-6 py-4 whitespace-nowrap text-gray-900">
                              {renderValue(sub.data[key])}
                            </td>
                          ))}
                          {hasTrackingInfo && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                                {sub.ipAddress || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                {sub.country ? `${sub.city ? sub.city + ', ' : ''}${sub.country}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm max-w-[200px] truncate" title={sub.userAgent || ''}>
                                {sub.deviceInfo?.platform ? `${sub.deviceInfo.platform} - ${sub.deviceInfo.browser || ''}` : (sub.userAgent ? sub.userAgent.substring(0, 30) + '...' : '-')}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cards View */}
            {viewMode === 'cards' && (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('forms.submissions.date')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(sub.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {allKeys.map((key) => (
                        <div key={key}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            {key}
                          </p>
                          <div className="text-sm text-gray-900 break-words pl-2 border-l-2 border-gray-100">
                            {renderValue(sub.data[key])}
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasTrackingInfo && (sub.ipAddress || sub.country) && (
                      <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Información de Rastreo
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">IP:</span> {sub.ipAddress || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Ubicación:</span> {sub.country ? `${sub.city ? sub.city + ', ' : ''}${sub.country}` : '-'}
                          </div>
                          <div className="col-span-2 truncate" title={sub.userAgent || ''}>
                            <span className="font-medium">Dispositivo:</span> {sub.deviceInfo?.platform ? `${sub.deviceInfo.platform} (${sub.deviceInfo.screenResolution || ''})` : '-'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {viewFile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{viewFile.name}</h3>
                  <p className="text-xs text-gray-500 uppercase">{viewFile.type.split('/')[1] || 'FILE'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewFile.data;
                    link.download = viewFile.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Descargar
                </button>
                <button
                  onClick={() => setViewFile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center min-h-[300px]">
              {viewFile.type.startsWith('image/') ? (
                <img
                  src={viewFile.data}
                  alt={viewFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              ) : viewFile.type.startsWith('video/') ? (
                <video
                  src={viewFile.data}
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-sm"
                />
              ) : viewFile.type === 'application/pdf' ? (
                <iframe
                  src={viewFile.data}
                  className="w-full h-full rounded-lg shadow-sm border border-gray-200"
                  title={viewFile.name}
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">Vista previa no disponible</p>
                  <p className="text-sm text-gray-400 mt-1">Descarga el archivo para verlo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSubmissions;
