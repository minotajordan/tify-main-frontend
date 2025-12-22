import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Command,
  Users,
  ShieldCheck,
  Hourglass,
  Target,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Channel } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

import {
  Bell,
  BellRing,
  Globe,
  AlertTriangle,
  MapPin,
  MessagesSquare,
  Lock,
  Megaphone,
  Zap,
  Mail,
  Send,
  Phone,
  AudioWaveform,
  RadioTower,
  Camera,
  Image,
  Clock,
  Calendar,
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

interface SubchannelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  subchannels: Channel[];
  onSelect: (channel: Channel) => void;
}

const SubchannelSearchModal: React.FC<SubchannelSearchModalProps> = ({
  isOpen,
  onClose,
  subchannels,
  onSelect,
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

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const filtered = subchannels.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );
    setResults(filtered);
  }, [query, subchannels]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center pt-[15vh] p-4">
      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative w-full max-w-2xl flex flex-col items-center z-10">
        {/* Search Input */}
        <div
          className={`w-full transition-all duration-500 ease-out transform ${results.length > 0 || query ? 'translate-y-0' : 'translate-y-[25vh]'}`}
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-25 blur-xl group-hover:opacity-40 transition-all duration-500" />
            <div className="relative flex items-center bg-slate-900/40 border border-slate-700/50 rounded-full shadow-2xl backdrop-blur-md transition-all group-hover:bg-slate-900/60 group-hover:border-slate-600">
              <Search className="ml-6 text-slate-400 w-6 h-6 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar subcanales..."
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
        <div
          className={`w-full mt-8 transition-all duration-500 ease-out ${results.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
        >
          {results.length > 0 && (
            <div className="flex flex-col gap-3 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="text-center text-slate-500 text-xs font-medium tracking-[0.2em] uppercase mb-4">
                Resultados ({results.length})
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
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
                    <h3 className="text-lg text-slate-200 font-medium group-hover:text-white transition-colors truncate">
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{result.memberCount?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={12} />
                        <span>{(result as any).counts?.approvers || 0}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        {query && results.length === 0 && (
          <div className="mt-12 text-center text-slate-500">
            <p className="text-lg font-light">No se encontraron subcanales para "{query}"</p>
          </div>
        )}

        {/* Footer info */}
        {!query && (
          <div
            className={`mt-16 text-slate-600 text-sm transition-all duration-500 ${query ? 'opacity-0' : 'opacity-100'}`}
          >
            <span className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700/50 text-xs font-mono">
                Esc
              </kbd>{' '}
              para cerrar
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubchannelSearchModal;
