/**
 * ResumeUpload — public applicant resume file input.
 *
 * Uploads to /api/educators/apply/upload-resume (Cloudinary) and calls
 * `onChange(url)` with the returned secure URL. Shows filename + status
 * inline. Falls back gracefully — the parent still keeps the URL text
 * input alongside so applicants can paste a hosted link if uploading fails.
 */
import { useRef, useState } from 'react';
import axios from 'axios';
import { Upload, Loader2, CheckCircle2, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const MAX_MB = 10;

export default function ResumeUpload({ value, onChange, testId = 'resume-upload' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_MB} MB).`);
      return;
    }
    setUploading(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/api/educators/apply/upload-resume`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange && onChange(res.data?.url || '');
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Please retry.');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setFileName('');
    setError('');
    onChange && onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const hasFile = !!value;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
        data-testid={`${testId}-input`}
      />
      {!hasFile && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 hover:border-slate-400 text-slate-600 transition-colors"
          data-testid={`${testId}-btn`}
        >
          <Upload className="w-4 h-4" />
          <span className="truncate">Upload resume (PDF / DOC / image · max {MAX_MB} MB)</span>
        </button>
      )}
      {uploading && (
        <div className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          <span className="truncate">Uploading {fileName}…</span>
        </div>
      )}
      {hasFile && !uploading && (
        <div className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate underline decoration-emerald-300 hover:decoration-emerald-600"
            data-testid={`${testId}-link`}
          >
            {fileName || 'Uploaded resume'}
          </a>
          <button
            type="button"
            onClick={clear}
            className="text-slate-500 hover:text-rose-600"
            data-testid={`${testId}-clear`}
            aria-label="Remove uploaded file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-rose-600" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  );
}
