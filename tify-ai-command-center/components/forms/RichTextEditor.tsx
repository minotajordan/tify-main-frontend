import React, { useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Heading1,
  Heading2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  enablePagination?: boolean;
  pageHeight?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  className = '',
  enablePagination = false,
  pageHeight = 1122 // A4 at 96 DPI is approx 1123px, let's use a safe printable height
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const ToolbarButton: React.FC<{
    icon: React.ElementType;
    command: string;
    arg?: string;
    title?: string;
  }> = ({ icon: Icon, command, arg, title }) => (
    <button
      type="button"
      onClick={() => execCommand(command, arg)}
      className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 flex flex-col ${className}`}>
      {label && (
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100 bg-gray-50 shrink-0">
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <ToolbarButton icon={Bold} command="bold" title="Bold" />
        <ToolbarButton icon={Italic} command="italic" title="Italic" />
        <ToolbarButton icon={Underline} command="underline" title="Underline" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton icon={Heading1} command="formatBlock" arg="H1" title="Heading 1" />
        <ToolbarButton icon={Heading2} command="formatBlock" arg="H2" title="Heading 2" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        className={`outline-none prose max-w-none flex-1 overflow-y-auto relative font-serif text-gray-800 leading-relaxed text-justify ${enablePagination ? 'p-12' : 'p-4'}`}
        style={enablePagination ? {
          backgroundImage: `linear-gradient(to bottom, transparent ${pageHeight - 10}px, #e2e8f0 ${pageHeight - 10}px, #e2e8f0 ${pageHeight}px, transparent ${pageHeight}px)`,
          backgroundSize: `100% ${pageHeight}px`,
          backgroundRepeat: 'repeat-y',
          paddingBottom: '50px'
        } : {}}
        data-placeholder={placeholder}
      />
      {enablePagination && (
        <div className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none bg-white/80 px-1 rounded">
          Formato Paginado (A4)
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
