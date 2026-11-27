/**
 * ImageUploadField — single-click uploader for the admin blog form.
 *
 * Default UX: click (or drop a file onto) the dashed box → the file is
 * sent to `/api/upload/image` and the returned URL is set on the field.
 * A small "paste URL instead" link reveals a text input so admins who
 * already have a CDN URL in their clipboard don't have to download and
 * re-upload it.
 */
import { useRef, useState } from 'react';
import axios from 'axios';
import { Upload, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ImageUploadField({ value, onChange, label, hint, testId, getAuthHeaders, aspect = 'video' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload/image`, fd, {
        headers: { ...(getAuthHeaders ? getAuthHeaders() : {}), 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        onChange(res.data.url);
        toast.success('Image uploaded');
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      // SAFE FALLBACK — only inline small images as base64 (<500 KB) so a
      // phone photo doesn't bloat the blog HTML past Mongo's 16 MB doc
      // limit and silently break the save. Anything bigger: hard-fail
      // with a visible error so the admin knows to retry.
      if (file.size <= 500 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result);
          toast.warning('Upload service unreachable — stored inline. Replace with a CDN URL before publishing.');
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Image upload failed. Please try again or paste a CDN URL.');
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const aspectClass = aspect === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div data-testid={testId}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      )}
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className={`${aspectClass} w-full max-w-md object-cover rounded-xl border border-slate-200`} />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
            data-testid={testId ? `${testId}-remove` : undefined}
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 text-[11px] font-bold uppercase tracking-widest bg-white/95 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm hover:bg-white"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragging ? 'border-[#D63031] bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
          data-testid={testId ? `${testId}-drop` : undefined}
        >
          {uploading ? (
            <>
              <Upload className="w-6 h-6 mx-auto text-[#D63031] animate-pulse" />
              <div className="text-sm text-slate-500 mt-2 font-medium">Uploading…</div>
            </>
          ) : (
            <>
              <ImageIcon className="w-6 h-6 mx-auto text-slate-400" />
              <div className="text-sm text-slate-600 mt-2 font-medium">Click to upload or drag &amp; drop</div>
              {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="mt-2 text-right">
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-[11px] text-slate-500 hover:text-[#D63031] inline-flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          {showUrlInput ? 'Hide URL input' : 'Paste URL instead'}
        </button>
      </div>
      {showUrlInput && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://cdn.example.com/image.jpg"
          className="mt-1 w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:border-[#D63031] focus:outline-none"
          data-testid={testId ? `${testId}-url` : undefined}
        />
      )}
    </div>
  );
}
