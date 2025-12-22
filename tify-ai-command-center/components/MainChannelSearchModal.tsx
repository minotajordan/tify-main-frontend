import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Users, ShieldCheck, LayoutGrid } from 'lucide-react';
import { useI18n } from '../i18n';
import { Channel } from '../types';
import { 
  Bell, BellRing, Globe, AlertTriangle, MapPin, MessagesSquare, 
  Lock, Megaphone, Zap, Mail, Send, Phone, AudioWaveform, 
  RadioTower, Camera, Image, Clock, Calendar 
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  bell: Bell,
  'bell.circle': BellRing,
  globe: Globe,
  'exclamationmark.triangle': AlertTriangle,
  'mappin.and.ellipse': MapPin,
  'bubble.left.and.bubble.right': MessagesSquare,
  'person.2': Users,
  'shield.checkerboard': ShieldCheck,
  lock: Lock,
  megaphone: Megaphone,
  bolt: Zap,
  envelope: Mail,
  paperplane: Send,
  phone: Phone,
  waveform: AudioWaveform,
  radio: RadioTower,
  'antenna.radiowaves.left.and.right': RadioTower,
  camera: Camera,
  photo: Image,
  clock: Clock,
  calendar: Calendar,
};

const IconView: React.FC<{ name?: string; size?: number; className?: string }> = ({
  name,
  size = 14,
  className,
}) => {
  const Comp = (name && ICON_MAP[name]) || MessagesSquare;
  return <Comp size={size} className={className} />;
};

interface MainChannelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onSelect: (channel: Channel) => void;
  selectedParentChannel?: Channel;
}

const MainChannelSearchModal: React.FC<MainChannelSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  channels, 
  onSelect,
  selectedParentChannel
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Channel[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [internalViewMode, setInternalViewMode] = useState<'context' | 'global'>('context');
  
  const effectiveViewMode = internalViewMode;

  useEffect(() => {
    if (selectedParentChannel) {
      setInternalViewMode('context');
    } else {
      setInternalViewMode('global');
    }
  }, [selectedParentChannel, isOpen]);

  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [publicChannels, setPublicChannels] = useState<Channel[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Context Mode (Subchannels only)
    if (internalViewMode === 'context' && selectedParentChannel) {
      let subs = selectedParentChannel.subchannels || [];
      if (query.trim()) {
        const lower = query.toLowerCase();
        subs = subs.filter(item => 
            item.title.toLowerCase().includes(lower) || 
            (item.description && item.description.toLowerCase().includes(lower))
        );
      }
      setResults(subs);
      return;
    }

    // Global Mode (Search everything or Browse all)
    const allChannels = channels.filter(c => !c.parentId);
    let filtered = allChannels;
    
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = allChannels.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) || 
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      );
    }

    setResults(filtered);

    // Split into "Mis Canales" (subscribed) and "Públicos" (others)
    const my = filtered.filter(c => (c as any).isSubscribed);
    const publicC = filtered.filter(c => !(c as any).isSubscribed);
    
    setMyChannels(my);
    setPublicChannels(publicC);

  }, [query, channels, selectedParentChannel, isOpen, internalViewMode]);

  if (!isOpen) return null;

  const ChannelResultItem = ({ result, onSelect, onClose }: { result: Channel; onSelect: (c: Channel) => void; onClose: () => void }) => (
    <button
      onClick={() => {
        onSelect(result);
        onClose();
      }}
      className="w-full group flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300 text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors shrink-0">
        <IconView name={result.icon} size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg text-slate-200 font-medium group-hover:text-white transition-colors truncate flex items-center gap-2">
          {result.title}
          {result.parentId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Sub
            </span>
          )}
        </h3>
        <div className="flex flex-col gap-1 mt-1">
          <div className="text-[10px] text-slate-500 font-mono">
            ID: {result.id.substring(0, 8)}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
            <div className="flex items-center gap-1.5" title="Miembros">
              <Users size={13} />
              <span>{result.memberCount?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Aprobadores">
              <ShieldCheck size={13} />
              <span>{(result as any).counts?.approvers || 0}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Pendientes">
              <Clock size={13} />
              <span>{(result as any).counts?.pending || 0}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Mensajes">
              <MessagesSquare size={13} />
              <span>{result._count?.messages || 0}</span>
            </div>
            
            {/* Activity Indicator */}
            <div className="ml-auto flex items-center gap-2" title="Actividad reciente">
               <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <ArrowRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 opacity-0 group-hover:opacity-100" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center pt-[8vh] p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative w-full max-w-2xl flex flex-col items-center z-10">
        
        {/* Context Indicator */}
        {selectedParentChannel && effectiveViewMode === 'context' && (
          <div className="mb-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <span className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-medium">Navegando en</span>
            <button 
              onClick={() => setInternalViewMode('global')}
              className="group flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <IconView name={selectedParentChannel.icon} size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-white font-medium text-sm group-hover:text-indigo-200 transition-colors">{selectedParentChannel.title}</span>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors flex items-center gap-1">
                <LayoutGrid size={10} />
                Ver todos
              </span>
            </button>
          </div>
        )}

        {/* Global View Header */}
        {effectiveViewMode === 'global' && selectedParentChannel && (
          <div className="mb-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
             <button 
              onClick={() => {
                setInternalViewMode('context');
                setQuery(''); // Clear query to truly go back
              }}
              className="text-slate-500 hover:text-white text-xs uppercase tracking-widest mb-2 font-medium flex items-center gap-2 transition-colors"
             >
               <ArrowRight className="rotate-180" size={12} />
               Volver a {selectedParentChannel.title}
             </button>
             {!query && (
               <div className="flex items-center gap-3 px-4 py-2">
                 <span className="text-white font-bold text-xl tracking-tight">Todos los canales</span>
               </div>
             )}
          </div>
        )}

        {/* Search Input */}
        <div className={`w-full transition-all duration-500 ease-out transform ${results.length > 0 || query || selectedParentChannel || effectiveViewMode === 'global' ? 'translate-y-0' : 'translate-y-[25vh]'}`}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-25 blur-xl group-hover:opacity-40 transition-all duration-500" />
            <div className="relative flex items-center bg-slate-900/40 border border-slate-700/50 rounded-full shadow-2xl backdrop-blur-md transition-all group-hover:bg-slate-900/60 group-hover:border-slate-600">
              <Search className="ml-6 text-slate-400 w-6 h-6 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={effectiveViewMode === 'context' && selectedParentChannel ? "Buscar subcanal..." : (t('channels.searchPlaceholder') || "Buscar canal...")}
                className="w-full bg-transparent text-white text-xl font-light placeholder-slate-500 py-4 px-4 focus:outline-none"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="mr-4 p-1 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={`w-full mt-8 transition-all duration-500 ease-out ${results.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          {results.length > 0 && effectiveViewMode === 'context' && (
            <div className="flex flex-col gap-3 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="text-center text-slate-500 text-xs font-medium tracking-[0.2em] uppercase mb-4">
                Subcanales ({results.length})
              </div>
              {results.map((result) => (
                <ChannelResultItem key={result.id} result={result} onSelect={onSelect} onClose={onClose} />
              ))}
            </div>
          )}

          {results.length > 0 && effectiveViewMode === 'global' && (
            <div className="flex flex-col gap-8 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {/* My Channels Section */}
              <div className="flex flex-col gap-3">
                <div className="text-left text-slate-500 text-xs font-medium tracking-[0.2em] uppercase mb-2 mt-2">
                  Mis Canales ({myChannels.length})
                </div>
                {myChannels.length > 0 ? (
                  myChannels.map((result) => (
                    <ChannelResultItem key={result.id} result={result} onSelect={onSelect} onClose={onClose} />
                  ))
                ) : (
                  <div className="text-center text-slate-600 text-sm py-4 italic">No tienes canales aquí</div>
                )}
              </div>

              {/* Public Channels Section */}
              <div className="flex flex-col gap-3">
                <div className="text-left text-slate-500 text-xs font-medium tracking-[0.2em] uppercase mb-2 mt-4">
                  Canales Públicos ({publicChannels.length})
                </div>
                {publicChannels.length > 0 ? (
                  publicChannels.map((result) => (
                    <ChannelResultItem key={result.id} result={result} onSelect={onSelect} onClose={onClose} />
                  ))
                ) : (
                  <div className="text-center text-slate-600 text-sm py-4 italic">No hay canales públicos</div>
                )}
              </div>
            </div>
          )}
        </div>

          
        {query && results.length === 0 && (
           <div className="mt-12 text-center text-slate-500">
             <p className="text-lg font-light">No se encontraron resultados para "{query}"</p>
           </div>
        )}

        {/* Footer info */}
        {!query && (
          <div className={`mt-16 text-slate-600 text-sm transition-all duration-500 ${query ? 'opacity-0' : 'opacity-100'}`}>
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700/50 text-xs font-mono">Esc</kbd> para cerrar
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainChannelSearchModal;
