import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { documentsApi } from '../../api/documents.api.js';

/**
 * Handles file selection → presign → S3 upload → confirm.
 *
 * Props:
 *   documentType  — DocumentType enum value (e.g. 'CV', 'TRANSCRIPT')
 *   label         — display text for the drop zone
 *   accept        — accepted MIME types string (e.g. "application/pdf,.doc")
 *   onUploaded    — called with documentId after successful upload
 *   disabled      — disables the zone
 */
export function FileUploadZone({ documentType, label = 'העלה קובץ', accept, onUploaded, disabled }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [fileName, setFileName] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('uploading');
    setFileName(file.name);
    setErrorMsg(null);

    try {
      const { url, storageKey } = await documentsApi.presign({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        documentType,
      });

      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!uploadRes.ok) throw new Error('Upload to storage failed');

      const doc = await documentsApi.confirm({
        storageKey,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        documentType,
      });

      setStatus('done');
      onUploaded?.(doc.id);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'שגיאה בהעלאה';
      setStatus('error');
      setErrorMsg(msg);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setStatus('idle');
    setFileName(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
        ${status === 'done' ? 'border-green-400 bg-green-50' : ''}
        ${status === 'error' ? 'border-destructive bg-destructive/5' : ''}
        ${status === 'idle' || status === 'uploading'
          ? 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
          : ''}
      `}
      onDragOver={(e) => e.preventDefault()}
      onDrop={!disabled && status === 'idle' ? handleDrop : undefined}
      onClick={() => !disabled && status === 'idle' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || status !== 'idle'}
      />

      {status === 'idle' && (
        <div className="space-y-1">
          <Upload size={20} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/70">גרור לכאן או לחץ לבחירה</p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-muted-foreground">מעלה {fileName}...</p>
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle size={16} />
            <FileText size={14} />
            <span className="truncate max-w-[180px]">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">{errorMsg}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="text-xs text-primary hover:underline"
          >
            נסה שנית
          </button>
        </div>
      )}
    </div>
  );
}
