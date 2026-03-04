import { useState, useCallback } from 'react';

/**
 * Hook for managing the pattern generation workflow:
 * upload → configure → generate → download
 */
export function usePattern() {
  const [sessionId, setSessionId] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | uploaded | generating | ready | error
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    return match ? match[1] : '';
  }

  const upload = useCallback(async (file) => {
    setStatus('uploading');
    setError(null);
    setPattern(null);
    setSessionId(null);

    try {
      // Client-side size check
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds 10MB size limit');
      }

      const formData = new FormData();
      formData.append('image', file);

      // First, do a GET to get the CSRF cookie
      await fetch('/api/download/noop', { credentials: 'same-origin' }).catch(() => {});

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setSessionId(data.id);
      setUploadedFileName(file.name);
      setStatus('uploaded');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const generate = useCallback(async (config) => {
    if (!sessionId) return;

    setStatus('generating');
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: sessionId,
          ...config,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setPattern(data.pattern);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [sessionId]);

  const getDownloadUrl = useCallback(() => {
    if (!sessionId) return null;
    return `/api/download/${sessionId}`;
  }, [sessionId]);

  const reset = useCallback(() => {
    setSessionId(null);
    setPattern(null);
    setStatus('idle');
    setError(null);
    setUploadedFileName(null);
  }, []);

  return {
    status,
    error,
    pattern,
    sessionId,
    uploadedFileName,
    upload,
    generate,
    getDownloadUrl,
    reset,
  };
}
