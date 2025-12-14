import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Paperclip, Clock, AlertTriangle, Loader2, X, FileText, Image as ImageIcon, Film, File, MapPin } from 'lucide-react';
import { generateMessageDraft } from '../services/geminiService';
import { api, API_BASE, getAuthToken } from '../services/api';
import { MessagePriority, Channel, DeliveryMethod } from '../types';
import { useI18n } from '../i18n';
import LocationPicker from './LocationPicker';

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <ImageIcon size={24} className="text-purple-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) {
    return <FileText size={24} className="text-blue-500" />;
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
    return <Film size={24} className="text-pink-500" />;
  }
  return <File size={24} className="text-gray-500" />;
};

const MessageCenter: React.FC = () => {
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [priority, setPriority] = useState<MessagePriority>(MessagePriority.MEDIUM);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  useEffect(() => {
    setLoadingChannels(true);
    api
      .getChannels()
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannelId(data[0].id);
      })
      .finally(() => setLoadingChannels(false));
  }, []);

  const handleAIAssist = async () => {
    if (!content.trim()) return;
    setIsGenerating(true);
    const channelName = channels.find((c) => c.id === selectedChannelId)?.title || 'General';
    const draft = await generateMessageDraft(content, channelName);
    setContent(draft);
    setIsGenerating(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setUploadFileName(file.name);
    setUploadFileSize(formatBytes(file.size));
    setUploadProgress(0);
    setFeedback(null);
    
    console.log(`[Upload] Starting upload for ${file.name} (${file.size} bytes)`);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
        console.log(`[Upload] Progress: ${percentComplete}%`);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setUploadProgress(100); // Ensure it shows 100%
        console.log('[Upload] Completed (100%), waiting for server response...');
        
        setTimeout(() => {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('[Upload] Server response:', result);
            setAttachments((prev) => [...prev, { url: result.url, name: result.originalName }]);
            setFeedback({ type: 'success', text: 'File uploaded successfully' });
          } catch (err) {
            console.error('Error parsing response', err);
            setFeedback({ type: 'error', text: 'Failed to parse server response' });
          }
          setUploading(false);
          setUploadProgress(0);
          setUploadFileName('');
          setUploadFileSize('');
          e.target.value = '';
        }, 800); // 800ms delay to let user see 100%
      } else {
        console.error('Upload failed', xhr.responseText);
        let errorMsg = 'Failed to upload file';
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error) errorMsg = errRes.error;
        } catch {}
        setFeedback({ type: 'error', text: errorMsg });
        setUploading(false);
        setUploadProgress(0);
        setUploadFileName('');
        setUploadFileSize('');
        e.target.value = '';
      }
    };

    xhr.onerror = () => {
      console.error('Upload error (Network)');
      setFeedback({ type: 'error', text: 'Network error during upload' });
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
      setUploadFileSize('');
      e.target.value = '';
    };

    const token = getAuthToken();
    xhr.open('POST', `${API_BASE}/upload`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  };

 const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationSave = (data: { markers: [number, number][]; polylines: [number, number][][] }) => {
    let locText = '\n\n📍 Location Attached:';
    if (data.markers.length > 0) {
      locText += `\nMarkers: ${data.markers.map((m) => `[${m[0].toFixed(5)}, ${m[1].toFixed(5)}]`).join(', ')}`;
    }
    if (data.polylines.length > 0) {
      locText += `\nRoutes: ${data.polylines.length} route(s) defined.`;
    }
    setContent((prev) => prev + locText);
    setShowLocationPicker(false);
  };


  const handleSend = async () => {
    if (!selectedChannelId || !content) return;
    setSending(true);
    setFeedback(null);
    try {
      await api.createMessage({
        channelId: selectedChannelId,
        content,
        priority,
        isEmergency,
        isImmediate: isEmergency, // Logic: if emergency, make immediate
        categoryId: isEmergency
          ? '310729e9-c571-11f0-8d01-1be21eee4db9'
          : priority === MessagePriority.LOW
            ? '31072b53-c571-11f0-8d01-1be21eee4db9'
            : priority === MessagePriority.MEDIUM
              ? '31072b7f-c571-11f0-8d01-1be21eee4db9'
              : '31072ba7-c571-11f0-8d01-1be21eee4db9',
        senderId: api.getCurrentUserId() || '',
        deliveryMethod: DeliveryMethod.PUSH,
        attachments: attachments.map((a) => a.url),
      });
      setFeedback({ type: 'success', text: 'Message sent successfully!' });
      setContent('');
      setAttachments([]);
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send size={20} className="text-indigo-600" />
            {t('compose.title')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {feedback && (
            <div
              className={`p-3 rounded text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {feedback.type === 'success' ? t('feedback.sent') : t('feedback.failed')}
            </div>
          )}

          {/* Channel Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('destinationChannel')}
            </label>
            {loadingChannels ? (
              <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            ) : (
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {channels.map((c) => (
                  <React.Fragment key={c.id}>
                    <option value={c.id}>{c.title}</option>
                    {c.subchannels?.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        &nbsp;&nbsp;↳ {sc.title}
                      </option>
                    ))}
                  </React.Fragment>
                ))}
              </select>
            )}
          </div>

          {/* Editor */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900 placeholder-gray-400"
              placeholder={t('content.placeholder')}
            />
            <button
              onClick={handleAIAssist}
              disabled={isGenerating}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isGenerating ? t('ai.drafting') : t('ai.polish')}
            </button>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex flex-wrap gap-3 mb-3">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group flex flex-col items-center justify-center w-24 h-24 bg-white border border-gray-200 rounded-xl p-2 shadow-sm hover:shadow-md transition-all hover:border-indigo-200"
                >
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 rounded-full p-1 shadow border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X size={14} />
                  </button>
                  <div className="p-2 bg-gray-50 rounded-lg mb-2">
                    {getFileIcon(file.name)}
                  </div>
                  <span className="text-[10px] text-gray-600 text-center truncate w-full font-medium" title={file.name}>
                    {file.name}
                  </span>
                </div>
              ))}

              {uploading && (
                <div className="relative flex flex-col items-center justify-center w-24 h-24 bg-indigo-50 border border-indigo-200 rounded-xl p-2 shadow-sm">
                  <div className="relative p-2 mb-2">
                    {getFileIcon(uploadFileName)}
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg backdrop-blur-[1px]">
                      <Loader2 size={20} className="animate-spin text-indigo-600" />
                    </div>
                  </div>
                  <div className="w-full px-1">
                     <div className="text-[10px] text-indigo-700 text-center truncate w-full font-medium mb-1">
                        {uploadFileName}
                     </div>
                     <div className="w-full bg-indigo-200 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                     </div>
                  </div>
                </div>
              )}
            </div>

            <label className="cursor-pointer flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium w-fit px-3 py-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100">
              <Paperclip size={16} />
              <span>{t('compose.addAttachment')}</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>

            <button
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium w-fit px-3 py-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
            >
              <MapPin size={16} />
              <span>Add Location</span>
            </button>
          </div>

          {showLocationPicker && (
            <LocationPicker
              onSave={handleLocationSave}
              onClose={() => setShowLocationPicker(false)}
            />
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('priority')}
                </label>
                <div className="flex rounded-md shadow-sm" role="group">
                  {[MessagePriority.LOW, MessagePriority.MEDIUM, MessagePriority.HIGH].map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={isEmergency}
                      onClick={() => setPriority(p)}
                      className={`px-4 py-2 text-sm font-medium border first:rounded-l-lg last:rounded-r-lg flex-1 capitalize
                          ${
                            priority === p
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          } ${isEmergency ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {p.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center cursor-pointer relative">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {t('emergencyBroadcast')}
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('deliveryPreview')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>
                    {t('estDelivery')}:{' '}
                    <span className="font-medium text-gray-900">{t('instant')}</span>
                  </span>
                </li>
                {isEmergency && (
                  <li className="flex items-center gap-2 text-red-600 font-medium">
                    <AlertTriangle size={14} />
                    <span>{t('bypassDnd')}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Paperclip size={14} />
                  <span>{t('attachmentsAllowed')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              {t('saveDraft')}
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {sending ? t('common.sending') : t('sendMessage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;
