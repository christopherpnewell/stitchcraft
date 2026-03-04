import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cookie-consent';
const CONSENT_EVENT = 'cookie-consent-update';

/**
 * Hook returning the current consent value: 'accepted', 'declined', or null.
 * Re-renders automatically when consent changes in any component.
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState(() => localStorage.getItem(CONSENT_KEY));

  useEffect(() => {
    const handler = () => setConsent(localStorage.getItem(CONSENT_KEY));
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  return consent;
}

function saveConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * GDPR/ePrivacy cookie consent banner.
 * Renders only when the user has not yet made a choice.
 * Must be rendered inside BrowserRouter (uses Link).
 */
export default function CookieConsent() {
  const consent = useCookieConsent();

  // Already decided — don't render
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-4 sm:flex sm:items-center sm:gap-6 sm:px-6"
    >
      <p className="flex-1 text-sm text-gray-600 mb-3 sm:mb-0">
        We use cookies to serve personalized ads via Google AdSense.{' '}
        <Link
          to="/privacy"
          className="underline text-brand-600 hover:text-brand-700 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Privacy Policy
        </Link>
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => saveConsent('declined')}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Decline
        </button>
        <button
          onClick={() => saveConsent('accepted')}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
