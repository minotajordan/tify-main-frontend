import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Paperclip, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { generateMessageDraft } from '../services/geminiService';
import { api } from '../services/api';
import { MessagePriority, Channel, DeliveryMethod } from '../types';
import { useI18n } from '../i18n';

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
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
      setLoadingChannels(true);
      api.getChannels().then(data => {
          setChannels(data);
          if (data.length > 0) setSelectedChannelId(data[0].id);
      }).finally(()=> setLoadingChannels(false));
  }, []);

  const handleAIAssist = async () => {
    if (!content.trim()) return;
    setIsGenerating(true);
    const channelName = channels.find(c => c.id === selectedChannelId)?.title || 'General';
    const draft = await generateMessageDraft(content, channelName);
    setContent(draft);
    setIsGenerating(false);
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
              categoryId: isEmergency ? '310729e9-c571-11f0-8d01-1be21eee4db9' : (priority===MessagePriority.LOW ? '31072b53-c571-11f0-8d01-1be21eee4db9' : priority===MessagePriority.MEDIUM ? '31072b7f-c571-11f0-8d01-1be21eee4db9' : '31072ba7-c571-11f0-8d01-1be21eee4db9'),
              senderId: api.getCurrentUserId() || '',
              deliveryMethod: DeliveryMethod.PUSH
          });
          setFeedback({ type: 'success', text: 'Message sent successfully!' });
          setContent('');
      } catch (error: any) {
          setFeedback({ type: 'error', text: error.message || 'Failed to send' });
      } finally {
          setSending(false);
      }
  }

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
              <div className={`p-3 rounded text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {feedback.type === 'success' ? t('feedback.sent') : t('feedback.failed')}
              </div>
          )}

          {/* Channel Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('destinationChannel')}</label>
            {loadingChannels ? (
              <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            ) : (
              <select 
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {channels.map(c => (
                  <React.Fragment key={c.id}>
                    <option value={c.id}>{c.title}</option>
                    {c.subchannels?.map(sc => (
                      <option key={sc.id} value={sc.id}>&nbsp;&nbsp;↳ {sc.title}</option>
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

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority')}</label>
                  <div className="flex rounded-md shadow-sm" role="group">
                    {[MessagePriority.LOW, MessagePriority.MEDIUM, MessagePriority.HIGH].map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={isEmergency}
                        onClick={() => setPriority(p)}
                        className={`px-4 py-2 text-sm font-medium border first:rounded-l-lg last:rounded-r-lg flex-1 capitalize
                          ${priority === p 
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
                    <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{t('emergencyBroadcast')}</span>
                  </label>
                </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('deliveryPreview')}</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Clock size={14} /> 
                    <span>{t('estDelivery')}: <span className="font-medium text-gray-900">{t('instant')}</span></span>
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
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-50">
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