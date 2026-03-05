import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy — Loominade';
  }, []);

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2025</p>

      <Section title="Overview">
        <p>
          Loominade (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the service&rdquo;) is a free web tool that converts
          images into knitting patterns. This policy explains what data we collect, how we use it,
          and your rights.
        </p>
      </Section>

      <Section title="Data We Collect">
        <h3 className="font-semibold text-gray-800 mb-1">Anonymous usage analytics</h3>
        <p className="mb-3">
          We record anonymous events (e.g.&nbsp;&ldquo;pattern generated&rdquo;,
          &ldquo;PDF downloaded&rdquo;) along with a randomly generated session ID, your approximate
          IP address (used only for rate-limiting, never stored long-term), browser type, and the
          timestamp. No personal identifiers are linked to these events.
        </p>

        <h3 className="font-semibold text-gray-800 mb-1">CSRF security cookie</h3>
        <p className="mb-3">
          We set a short-lived <code className="bg-gray-100 px-1 rounded text-xs">csrfToken</code>{' '}
          cookie to protect against cross-site request forgery. This cookie contains a signed random
          token and expires after one hour. It is strictly necessary for the service to function and
          is not used for tracking.
        </p>

        <h3 className="font-semibold text-gray-800 mb-1">Image uploads</h3>
        <p>
          Images you upload are processed entirely on our server (resized, re-encoded, and
          analyzed). They are stored temporarily in memory during processing and automatically
          deleted within 30&nbsp;minutes. We never share, sell, or retain your images.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <h3 className="font-semibold text-gray-800 mb-1">Google AdSense</h3>
        <p className="mb-3">
          We use Google AdSense to display advertisements. Google may set cookies such
          as <code className="bg-gray-100 px-1 rounded text-xs">__gads</code> and{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">__gpi</code> to serve personalized
          advertisements. For users in the EEA, UK, and Switzerland, Google&rsquo;s certified
          Consent Management Platform will ask for your consent before personalized ads are shown.
          Google&rsquo;s use of advertising cookies is governed by{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700"
          >
            Google&rsquo;s Privacy Policy
          </a>
          .
        </p>

        <h3 className="font-semibold text-gray-800 mb-1">Amazon Associates</h3>
        <p className="mb-3">
          Pattern results may include affiliate links to yarn products on Amazon. Clicking an
          affiliate link sends your visit to Amazon, who may set their own cookies. We earn a small
          commission on qualifying purchases at no extra cost to you. Amazon&rsquo;s privacy
          practices are described in{' '}
          <a
            href="https://www.amazon.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700"
          >
            Amazon&rsquo;s Privacy Notice
          </a>
          .
        </p>

        <h3 className="font-semibold text-gray-800 mb-1">Google Fonts</h3>
        <p>
          We load fonts from Google Fonts (fonts.googleapis.com / fonts.gstatic.com). Google may
          log your IP address when serving font files. See{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700"
          >
            Google&rsquo;s Privacy Policy
          </a>
          .
        </p>
      </Section>

      <Section title="Your Rights">
        <p>
          You may manage your advertising cookie preferences via Google&rsquo;s consent prompt.
          Because we do not collect personally identifiable information, there is no account to delete.
        </p>
      </Section>

      <Section title="Data Retention">
        <p>
          Anonymous analytics events are retained for up to 90&nbsp;days and then deleted. Uploaded
          images are deleted within 30&nbsp;minutes of upload. CSRF cookies expire after one hour.
        </p>
      </Section>

      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link
          to="/"
          className="text-sm text-brand-600 hover:text-brand-700 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          ← Back to Loominade
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-display font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
