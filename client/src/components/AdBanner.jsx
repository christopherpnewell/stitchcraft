import { useEffect, useRef } from 'react';

/**
 * Google AdSense ad unit.
 * Reads publisher ID from a meta tag injected by the server,
 * and the slot from props. Shows a subtle placeholder when ads are disabled.
 */
export default function AdBanner({ slot, format = 'auto', className = '' }) {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    // Only push ads once per mount, and only if adsbygoogle is loaded
    if (pushed.current) return;
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch {
      // AdSense not loaded (blocked, dev mode, etc.) — silently fail
    }
  }, []);

  // If no slot provided or ads not configured, show nothing
  if (!slot) {
    return null;
  }

  // Get publisher ID from meta tag (injected server-side)
  const publisherMeta = document.querySelector('meta[name="adsense-publisher"]');
  const publisherId = publisherMeta?.content;

  if (!publisherId) {
    return null;
  }

  return (
    <div className={`ad-container min-h-[90px] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
