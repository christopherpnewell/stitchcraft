import { useEffect, useRef } from 'react';

// Cache publisher ID at module scope — the meta tag is static after page load
let _publisherId = null;
function getPublisherId() {
  if (_publisherId === null) {
    _publisherId = document.querySelector('meta[name="adsense-publisher"]')?.content || '';
  }
  return _publisherId;
}

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

  const publisherId = getPublisherId();
  if (!publisherId) {
    return null;
  }

  return (
    <div role="complementary" aria-label="Advertisement" className={`ad-container min-h-[90px] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden ${className}`}>
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
