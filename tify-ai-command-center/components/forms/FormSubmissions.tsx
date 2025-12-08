import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ArrowLeft, Download } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Submission {
  id: string;
  data: any;
  createdAt: string;
}

const FormSubmissions: React.FC<{ formId: string; onClose: () => void }> = ({
  formId,
  onClose,
}) => {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');

  const [allKeys, setAllKeys] = useState<string[]>([]);

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
      setSubmissions(subsData);

      const keys = Array.from(new Set(subsData.flatMap((s: any) => Object.keys(s.data))));
      setAllKeys(keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (submissions.length === 0) return;

    const headers = ['ID', 'Date', ...allKeys];

    const csvContent = [
      headers.join(','),
      ...submissions.map((s) => {
        const row = [
          s.id,
          new Date(s.createdAt).toISOString(),
          ...allKeys.map((k) => JSON.stringify(s.data[k] || '')),
        ];
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

  if (loading) return <div className="p-8 text-center">{t('forms.submissions.loading')}</div>;

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('forms.submissions.title')}</h2>
            <p className="text-sm text-gray-500">{formTitle}</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={submissions.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Download size={18} />
          {t('forms.submissions.export')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('forms.submissions.empty')}</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                          {typeof sub.data[key] === 'object'
                            ? JSON.stringify(sub.data[key])
                            : sub.data[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSubmissions;
