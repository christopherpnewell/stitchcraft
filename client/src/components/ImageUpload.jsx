import { useState, useRef, useCallback, useEffect } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;

export default function ImageUpload({ onUpload, status }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const prevUrlRef = useRef(null);

  // Revoke previous object URL on change or unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  const validateAndUpload = useCallback((file) => {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('File must be under 10MB.');
      return;
    }

    // Revoke previous URL
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);

    const url = URL.createObjectURL(file);
    prevUrlRef.current = url;
    setPreview(url);
    onUpload(file);
  }, [onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    validateAndUpload(file);
  }, [validateAndUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    validateAndUpload(file);
  }, [validateAndUpload]);

  const isUploading = status === 'uploading';

  return (
    <div className="w-full">
      {error && (
        <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an image file. Click or drag and drop."
        onClick={!isUploading ? handleClick : undefined}
        onKeyDown={!isUploading ? handleKeyDown : undefined}
        onDrop={!isUploading ? handleDrop : undefined}
        onDragOver={!isUploading ? handleDragOver : undefined}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          ${dragOver
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-60 cursor-wait' : ''}
        `}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={preview}
              alt="Upload preview"
              className="max-h-48 max-w-full rounded-lg shadow-md object-contain"
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-brand-600">
                <Spinner />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            )}
            {!isUploading && (
              <p className="text-sm text-gray-500">Click or drag to replace</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-gray-700">
                Drop your image here, or <span className="text-brand-600">browse</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPEG, PNG, WebP, or GIF — up to 10MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload image file"
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
