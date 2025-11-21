import React, { useState, useEffect } from 'react';
import { Check, X, Clock, AlertCircle, User, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Message } from '../types';
import { useI18n } from '../i18n';

const ApprovalQueue: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { t } = useI18n();

  const fetchPending = () => {
      setLoading(true);
      api.getPendingApprovals()
        .then(setMessages)
        .catch(console.error)
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setProcessing(id);
    try {
        if (action === 'APPROVE') {
            await api.approveMessage(id);
        } else {
            await api.rejectMessage(id);
        }
        // Remove locally
        setMessages(prev => prev.filter(m => m.id !== id));
    } catch (error) {
        console.error("Failed to act on message", error);
        alert("Action failed. Please try again.");
    } finally {
        setProcessing(null);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({length:3}).map((_,i)=> (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-3">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-full bg-gray-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-9 bg-gray-200 rounded" />
                <div className="h-9 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('approval.queue')}</h2>
          <p className="text-gray-500">{t('approval.subtitle')}</p>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
          {messages.length} {t('approval.pending')}
        </span>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
           <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
             <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <Check size={32} />
             </div>
             <h3 className="text-lg font-medium text-gray-900">{t('approval.allCaughtUp')}</h3>
             <p className="text-gray-500">{t('approval.noPending')}</p>
             <button onClick={fetchPending} className="mt-4 text-indigo-600 hover:underline">{t('approval.refresh')}</button>
           </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {msg.channel?.title || t('approval.unknownChannel')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                      msg.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {msg.priority} {t('approval.priorityLabel')}
                    </span>
                    {msg.createdAt && (
                        <span className="flex items-center text-xs text-gray-400 gap-1 ml-auto md:ml-0">
                        <Clock size={12} /> {new Date(msg.createdAt).toLocaleString()}
                        </span>
                    )}
                  </div>
                  
                  <p className="text-gray-900 text-lg leading-relaxed mb-4">
                    {msg.content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span>{t('approval.by')}: <span className="font-medium text-gray-900">{msg.sender?.fullName || 'Unknown'}</span></span>
                    </div>
                    {msg.isEmergency && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertCircle size={14} /> {t('approval.emergencyMode')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col justify-end gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 md:w-48">
                   <button 
                    disabled={processing === msg.id}
                    onClick={() => handleAction(msg.id, 'APPROVE')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                   >
                     {processing === msg.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                     {t('approval.approve')}
                   </button>
                   <button 
                    disabled={processing === msg.id}
                    onClick={() => handleAction(msg.id, 'REJECT')}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     <X size={18} /> {t('approval.reject')}
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;