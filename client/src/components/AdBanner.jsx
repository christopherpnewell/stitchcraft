import { useEffect, useRef, useState } from 'react';
import { useCookieConsent } from './CookieConsent.jsx';

// Module-level promise so multiple AdBanner instances share one script load
let _scriptPromise = null;

function loadAdsenseScript(publisherId) {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    s.crossOrigin = 'anonymous';
    s.onload = s.onerror = resolve;
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

// Cache publisher ID — meta tag is static after page load
let _publisherId = null;
function getPublisherId() {
  if (_publisherId === null) {
    _publisherId = document.querySelector('meta[name="adsense-publisher"]')?.content || '';
  }
  return _publisherId;
}

/**
 * Google AdSense ad unit.
 * Only loads the AdSense script and renders after the user has consented
 * to cookies via the CookieConsent banner.
 */
export default function AdBanner({ slot, format = 'auto', className = '' }) {
  const consent = useCookieConsent();
  const adRef = useRef(null);
  const pushed = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (consent !== 'accepted') return;
    const publisherId = getPublisherId();
    if (!publisherId || !slot) return;

    loadAdsenseScript(publisherId).then(() => setScriptReady(true));
  }, [consent, slot]);

  useEffect(() => {
    if (!scriptReady || pushed.current || !adRef.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // AdSense blocked or unavailable — silently fail
    }
  }, [scriptReady]);

  if (!slot || consent !== 'accepted') return null;

  const publisherId = getPublisherId();
  if (!publisherId) return null;

  return (
    <div
      role="complementary"
      aria-label="Advertisement"
      className={`ad-container min-h-[90px] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden ${className}`}
    >
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
