import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Globe,
  QrCode,
  Image,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { ShortLink } from '../types';

const PublicShortener: React.FC = () => {
  console.log('PublicShortener mounted');
  const { t } = useI18n();
  const [newLink, setNewLink] = useState({
    targetUrl: '',
    redirectMode: 'IMMEDIATE',
    interstitialTitle: '',
    interstitialMessage: '',
    bannerImageUrl: '',
    activeFrom: '',
    expiresAt: '',
  });
  const [createdLink, setCreatedLink] = useState<ShortLink | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialCreate = async (url: string) => {
    if (!url) return;
    setIsAnalyzing(true);
    setError(null);
    // Update targetUrl in newLink immediately
    setNewLink((prev) => ({ ...prev, targetUrl: url }));

    try {
      // 1. Fetch Metadata
      setMetadataLoading(true);
      let meta = { title: '', description: '', image: '' };
      
      // Try Client-side fetch first (Avoids server bans) for supported platforms
      let clientMeta = null;
      
      const fetchOembed = async (endpoint: string) => {
          try {
              const res = await fetch(endpoint);
              if (res.ok) {
                  const data = await res.json();
                  return {
                      title: data.title || '',
                      description: data.description || data.author_name ? `By ${data.author_name}` : '',
                      image: data.thumbnail_url || data.thumbnail_url_with_play_button || ''
                  };
              }
          } catch (e) {
              console.warn(`Client-side fetch failed for ${endpoint}`, e);
          }
          return null;
      };

      // 1. YouTube
      if (/^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/.test(url)) {
          clientMeta = await fetchOembed(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      }
      // 2. Spotify
      else if (/^(https?:\/\/)?(open\.)?spotify\.com\/.+$/.test(url)) {
          clientMeta = await fetchOembed(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      }
      // 3. TikTok
      else if (/^(https?:\/\/)?(www\.|m\.)?tiktok\.com\/.+$/.test(url)) {
          clientMeta = await fetchOembed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      }
      // 4. Twitter / X
      else if (/^(https?:\/\/)?(www\.|m\.)?(twitter\.com|x\.com)\/.+$/.test(url)) {
           // Twitter supports JSONP or CORS with Origin. Fetch usually works if they reflect Origin.
           clientMeta = await fetchOembed(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
      }

      if (clientMeta) {
          meta = clientMeta;
      } else {
          // Fallback to server-side for other sites or if client fetch fails
          try {
            meta = await api.extractMetadata(url);
          } catch (e) {
            console.warn('Failed to fetch metadata, continuing without it', e);
          }
      }
      
      setMetadataLoading(false);

      const linkData = {
        ...newLink,
        targetUrl: url,
        interstitialTitle: meta.title || '',
        interstitialMessage: meta.description || '',
        bannerImageUrl: meta.image || '',
      };

      setNewLink(linkData);

      // 2. Create Link in DB automatically
      const link = await api.createShortLink(linkData);
      setCreatedLink(link);
    } catch (e) {
      console.error('Failed to create link', e);
      setError('No se pudo crear el enlace. Por favor intente nuevamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      setNewLink((prev) => ({ ...prev, targetUrl: text }));
      handleInitialCreate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInitialCreate(newLink.targetUrl);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.toUpperCase();
    } catch {
      return 'WEBSITE';
    }
  };

  const getDisplayUrl = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/L${code}`;
    }
    return `https://tify.pro/L${code}`;
  };

  const handleReset = () => {
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
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-indigo-200">
             <LinkIcon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Acortador de Enlaces</h1>
          <p className="text-gray-500">Crea enlaces cortos, seguros y rastreables en segundos.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">
                {createdLink ? '¡Tu enlace está listo!' : 'Pega tu enlace largo aquí'}
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {isAnalyzing ? (
                  <div className="flex-1 flex items-center justify-center gap-3 px-5 py-4 border border-indigo-100 bg-indigo-50/50 rounded-2xl">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="text-indigo-700 font-medium animate-pulse">
                      Generando enlace mágico...
                    </span>
                  </div>
                ) : createdLink ? (
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 p-2 border border-green-100 bg-green-50/30 rounded-2xl animate-in fade-in duration-300">
                    <div className="flex-1 flex items-center gap-3 px-3 w-full">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            <CheckCircle size={20} className="text-green-500" />
                        </div>
                        <span className="text-gray-900 font-bold text-lg truncate flex-1">
                        {getDisplayUrl(createdLink.code)}
                        </span>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto px-2 pb-2 sm:pb-0">
                        <button
                        onClick={() => copyToClipboard(getDisplayUrl(createdLink.code), createdLink.id)}
                        className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95"
                        >
                        {copiedId === createdLink.id ? <Check size={20} /> : <Copy size={20} />}
                        <span>Copiar</span>
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-3 bg-white text-gray-600 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition-all border border-gray-200 hover:scale-105 active:scale-95"
                            title="Crear otro"
                        >
                            <span>Nuevo</span>
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                        type="url"
                        value={newLink.targetUrl}
                        onChange={(e) => setNewLink({ ...newLink, targetUrl: e.target.value })}
                        onPaste={handlePaste}
                        onKeyDown={handleKeyDown}
                        placeholder="https://ejemplo.com/mi-enlace-largo"
                        className="flex-1 px-6 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-400 transition-all text-lg shadow-sm"
                        autoFocus
                    />
                    <button
                        onClick={() => handleInitialCreate(newLink.targetUrl)}
                        disabled={!newLink.targetUrl || metadataLoading}
                        className="px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        {metadataLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                        <Globe size={20} />
                        )}
                        <span className="hidden sm:inline">Acortar</span>
                    </button>
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-3 text-red-500 text-sm font-medium ml-1 animate-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>

            {/* PREVIEW CARD GENERATED */}
            {(createdLink || newLink.bannerImageUrl || newLink.interstitialTitle) && (
              <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Eye size={16} className="text-indigo-600" />
                    <span>Vista Previa</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 w-full max-w-sm shadow-lg transition-all hover:shadow-xl">
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
                    </div>
                    <div className="p-5 bg-white">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                        {getHostname(newLink.targetUrl)}
                      </div>
                      <h5 className="text-base font-bold text-gray-900 line-clamp-1 mb-1">
                        {newLink.interstitialTitle || 'Sin título definido'}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {newLink.interstitialMessage || 'Sin descripción disponible.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
                Powered by <span className="font-bold text-gray-600">Tify</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default PublicShortener;
