import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Command } from 'lucide-react';
import { useI18n } from '../i18n';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_RESULTS = [
  { id: 1, title: 'Dashboard Analytics', category: 'Module', description: 'View system statistics and overview' },
  { id: 2, title: 'User Management', category: 'Settings', description: 'Manage users and permissions' },
  { id: 3, title: 'Channel Configuration', category: 'Channels', description: 'Setup and modify communication channels' },
  { id: 4, title: 'Form Builder', category: 'Tools', description: 'Create and edit dynamic forms' },
  { id: 5, title: 'Event Planning', category: 'Events', description: 'Manage upcoming events and tickets' },
];

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof MOCK_RESULTS>([]);
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
    const filtered = MOCK_RESULTS.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) || 
      item.description.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative w-full max-w-3xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="w-full relative group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500" />
          <div className="relative flex items-center">
            <Search className="absolute left-6 text-indigo-400 w-8 h-8" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('common.searchPlaceholder') || "Search..."}
              className="w-full bg-slate-800/50 border-2 border-slate-700/50 text-white text-3xl font-light placeholder-slate-500 py-6 pl-20 pr-8 rounded-full focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all shadow-2xl"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-6 text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className={`w-full mt-12 transition-all duration-500 ${results.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {results.length > 0 && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-2">
                Results
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full max-w-2xl group flex items-center gap-6 p-6 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                    <Command size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl text-white font-medium group-hover:text-indigo-300 transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-slate-400 mt-1">
                      {result.description}
                    </p>
                  </div>
                  <ArrowRight className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}
          
          {query && results.length === 0 && (
             <div className="text-center text-slate-500 py-8">
               <p className="text-lg">No results found for "{query}"</p>
             </div>
          )}
        </div>

        {/* Helper Text */}
        {!query && (
          <div className="mt-8 text-slate-500 flex gap-8">
            <span className="flex items-center gap-2 text-sm">
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs">Esc</kbd> to close
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModal;
