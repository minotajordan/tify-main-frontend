import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  placeholder?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label,
  className = '',
  aspectRatio = 'video',
  placeholder = 'Click to upload image'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      const result = await api.uploadFile(file);
      onChange(result.url);
    } catch (err) {
      console.error('Upload failed', err);
      setError('Failed to upload image');
    } finally {
      setLoading(false);
      // Reset input so same file can be selected again if needed
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'wide': return 'aspect-[3/1]';
      case 'video':
      default: return 'aspect-video';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div 
        className={`relative group border-2 border-dashed border-gray-300 rounded-lg overflow-hidden transition-all hover:border-indigo-400 bg-gray-50 ${getAspectRatioClass()}`}
        onClick={() => !loading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img 
              src={value} 
              alt="Uploaded" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={handleRemove}
                className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
            {loading ? (
              <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
            ) : (
              <Upload className="mb-2 group-hover:text-indigo-500 transition-colors" size={32} />
            )}
            <span className="text-sm font-medium group-hover:text-indigo-600 transition-colors">
              {loading ? 'Uploading...' : placeholder}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              PNG, JPG, GIF up to 5MB
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};
