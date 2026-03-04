import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing the pattern generation workflow.
 * Upload triggers auto-generate with suggested settings.
 * Subsequent regeneration is button-triggered only.
 */
export function usePattern() {
  const [sessionId, setSessionId] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

  // AbortController for cancelling stale generate requests
  const abortRef = useRef(null);

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    return match ? match[1] : '';
  }

  // Internal generate that takes an explicit session ID (for use in upload flow)
  const generateWithId = useCallback(async (id, config) => {
    if (!id) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
        body: JSON.stringify({ id, ...config }),
      });

      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Generation failed');
        }
        throw new Error('Server error. Please try again.');
      }
      const data = await res.json();

      setPattern(data.pattern);
      setStatus('ready');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const upload = useCallback(async (file) => {
    setStatus('uploading');
    setError(null);
    setPattern(null);
    setSessionId(null);
    setSuggestions(null);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds 10MB size limit');
      }

      const formData = new FormData();
      formData.append('image', file);

      // Ensure CSRF cookie is set via a safe GET request
      const csrfRes = await fetch('/api/csrf', { credentials: 'same-origin' }).catch(() => null);
      if (!csrfRes || !csrfRes.ok) {
        throw new Error('Unable to reach server. Please check your connection and try again.');
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });

      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.error || 'Upload failed');
        }
        throw new Error('Server error. Please try again.');
      }
      const data = await res.json();

      setSessionId(data.id);
      setUploadedFileName(file.name);
      setSuggestions(data.suggestions);

      // Auto-generate with suggested settings immediately
      const s = data.suggestions;
      const autoConfig = {
        widthStitches: s?.suggestedWidth || 60,
        numColors: s?.suggestedColors || 6,
        stitchGauge: 18,
        rowGauge: 24,
        cleanup: true,
        removeBackground: s?.suggestedBackgroundRemoval || false,
        enhanceDetail: false,
      };
      await generateWithId(data.id, autoConfig);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setStatus('error');
    }
  }, [generateWithId]);

  // Public generate — uses current sessionId from state
  const generate = useCallback(async (config) => {
    if (!sessionId) return;
    await generateWithId(sessionId, config);
  }, [sessionId, generateWithId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const getDownloadUrl = useCallback(() => {
    if (!sessionId) return null;
    return `/api/download/${sessionId}`;
  }, [sessionId]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setSessionId(null);
    setPattern(null);
    setStatus('idle');
    setError(null);
    setUploadedFileName(null);
    setSuggestions(null);
  }, []);

  return {
    status,
    error,
    pattern,
    sessionId,
    uploadedFileName,
    suggestions,
    upload,
    generate,
    getDownloadUrl,
    reset,
  };
}
