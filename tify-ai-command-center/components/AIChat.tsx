import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal, FileText, ArrowRight, Loader2, Cpu } from 'lucide-react';
import { askTifyBrain } from '../services/geminiService';
import { generateFormFromPrompt, GeneratedForm } from '../services/localFormGenerator';
import { webLlmService } from '../services/webLlmService';
import { useI18n } from '../i18n';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  attachment?: {
    type: 'form_preview';
    data: GeneratedForm;
  };
}

interface AIChatProps {
  onNavigateToForms?: () => void;
  variant?: 'full' | 'embedded';
}

const AIChat: React.FC<AIChatProps> = ({ onNavigateToForms, variant = 'full' }) => {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initProgress, setInitProgress] = useState<string>('');
  const [pendingForm, setPendingForm] = useState<GeneratedForm | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          text: t('ai.initialWelcome'),
          timestamp: new Date(),
        },
      ]);
    }
  }, []); // Only on mount

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleCreateForm = (form: GeneratedForm) => {
    setPendingForm(form);
    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'ai',
      text: `¡Excelente elección! Antes de crearlo, ¿qué título te gustaría ponerle al formulario? (Escribe el título, o responde "ok" para mantener "${form.title}")`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // INTERCEPT: Handle Title Confirmation for Pending Form
    if (pendingForm) {
      const keepKeywords = ['ok', 'si', 'yes', 'no', 'skip', 'saltar', 'listo', 'vale', 'keep', 'mantener', 'bien', 'igual'];
      const isKeep = keepKeywords.includes(userMsg.text.toLowerCase().trim());
      
      let finalTitle = pendingForm.title;
      if (!isKeep) {
        finalTitle = userMsg.text;
      }
      
      const finalForm = { ...pendingForm, title: finalTitle };
      localStorage.setItem('tify_pending_ai_form', JSON.stringify(finalForm));
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `Perfecto. Creando formulario "${finalTitle}"...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setPendingForm(null);
      
      setTimeout(() => {
        if (onNavigateToForms) {
          onNavigateToForms();
        }
      }, 1500);
      
      return;
    }

    setIsLoading(true);

    // Check for form generation intent
    const isFormIntent = /crear|create|generate|generar|hacer|make|form|encuesta|survey|formulario|construir|diseñar/i.test(userMsg.text);

    if (isFormIntent) {
      try {
        if (!webLlmService.isReady()) {
          setInitProgress('Initializing Neural Core (This may take a moment)...');
          await webLlmService.initialize((report) => {
            setInitProgress(report.text);
          });
        }

        setInitProgress('Analyzing request with Neural Core...');
        const webLlmForm = await webLlmService.generateForm(userMsg.text);

        if (webLlmForm) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            text: t('ai.formGenerated').replace('{title}', webLlmForm.title),
            timestamp: new Date(),
            attachment: {
              type: 'form_preview',
              data: webLlmForm
            }
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsLoading(false);
          setInitProgress('');
          return;
        }
      } catch (error) {
        console.warn('WebLLM generation failed, falling back to local engine:', error);
      } finally {
        setInitProgress('');
      }

      const generatedForm = generateFormFromPrompt(userMsg.text, t);
      
      if (generatedForm) {
        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            text: t('ai.formGenerated').replace('{title}', generatedForm.title),
            timestamp: new Date(),
            attachment: {
              type: 'form_preview',
              data: generatedForm
            }
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsLoading(false);
        }, 800);
        return;
      }
    }

    const responseText = await askTifyBrain(userMsg.text, lang);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: responseText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const containerClasses = variant === 'full'
    ? "h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full max-w-5xl mx-auto"
    : "h-full flex flex-col bg-white overflow-hidden w-full";

  return (
    <div className={containerClasses}>
      {/* Header */}
      {variant === 'full' && (
        <div className="p-4 border-b border-gray-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold">{t('ai.headerTitle')}</h3>
              <p className="text-xs text-indigo-200">{t('ai.powered')}</p>
            </div>
          </div>
          <div className="bg-slate-800 px-3 py-1 rounded text-xs font-mono text-green-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {t('ai.online')}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${msg.role === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}
            `}
            >
              {msg.role === 'ai' ? <Sparkles size={20} /> : <User size={20} />}
            </div>
            <div
              className={`
              max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
              ${
                msg.role === 'user'
                  ? 'bg-slate-800 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }
            `}
            >
              {msg.text}
              
              {msg.attachment?.type === 'form_preview' && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-start bg-white">
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" />
                        {msg.attachment.data.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{msg.attachment.data.description}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 space-y-2 max-h-[200px] overflow-y-auto">
                    {(msg.attachment.data.fields || []).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                        <span className="font-mono text-gray-400">[{field.type}]</span>
                        <span className="font-medium">{field.label}</span>
                        {field.required && <span className="text-red-500">*</span>}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-white border-t border-gray-200">
                    <button 
                      onClick={() => handleCreateForm(msg.attachment!.data)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      {t('ai.createForm')}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              {initProgress ? <Cpu size={20} className="animate-pulse" /> : <Bot size={20} />}
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              {initProgress ? (
                <div className="flex flex-col gap-2 min-w-[250px]">
                  <span className="text-xs font-medium text-indigo-600 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin shrink-0" />
                    {initProgress}
                  </span>
                  <div className="h-1 w-full bg-indigo-50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-pulse w-full origin-left scale-x-50"></div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative flex items-center gap-2">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Terminal size={18} />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.placeholder')}
            className="w-full pl-11 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-center text-xs text-gray-400">
          {t('ai.disclaimer')}
        </div>
      </div>
    </div>
  );
};

export default AIChat;
