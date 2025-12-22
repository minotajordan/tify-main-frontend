import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, QrCode, Copy, Check } from 'lucide-react';
import { api } from '../services/api';
import { useI18n } from '../i18n';

const ShortLinkManager: React.FC = () => {
  const { t } = useI18n();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLink, setNewLink] = useState({ targetUrl: '', redirectMode: 'IMMEDIATE' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const data = await api.getShortLinks();
      setLinks(data?.items || []); // Backend returns { items: [], pagination: ... }
    } catch (e) {
      console.error('Failed to load links', e);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.createShortLink(newLink);
      setShowCreate(false);
      setNewLink({ targetUrl: '', redirectMode: 'IMMEDIATE' });
      loadLinks();
    } catch (e) {
      alert('Failed to create link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.deleteShortLink(id);
      loadLinks();
    } catch (e) {
      alert('Failed to delete link');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.shortlinks')}</h1>
          <p className="text-gray-500">{t('shortlinks.manage')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t('shortlinks.createBtn')}</span>
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">{t('shortlinks.create')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shortlinks.targetUrl')}</label>
              <input
                type="url"
                value={newLink.targetUrl}
                onChange={(e) => setNewLink({ ...newLink, targetUrl: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                {t('shortlinks.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newLink.targetUrl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('shortlinks.createBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <QrCode size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t('shortlinks.noLinks')}</h3>
          <p className="text-gray-500">{t('shortlinks.start')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <div key={link.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <QrCode size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{link.code}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {link.clicks || 0} {t('shortlinks.clicks')}
                    </span>
                  </div>
                  <a
                    href={link.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mt-1"
                  >
                    {link.targetUrl}
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4 hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {link.shortUrl}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(link.shortUrl, link.id)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Copy Short Link"
                >
                  {copiedId === link.id ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
                
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShortLinkManager;
