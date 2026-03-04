import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms of Service — Knit It';
  }, []);

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2025</p>

      <Section title="Acceptance of Terms">
        <p>
          By using Knit It (&ldquo;the service&rdquo;) at knitit.app, you agree to these Terms of
          Service. If you do not agree, please do not use the service.
        </p>
      </Section>

      <Section title="Use of the Service">
        <p className="mb-2">You may use Knit It to convert images into knitting patterns for personal or commercial use. You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload images that infringe third-party intellectual property rights</li>
          <li>Upload images containing illegal content</li>
          <li>Attempt to overload, attack, or reverse-engineer the service</li>
          <li>Use automated tools to generate patterns at a rate that disrupts the service for other users</li>
        </ul>
      </Section>

      <Section title="Intellectual Property">
        <p className="mb-2">
          <strong>Your images:</strong> You retain all rights to images you upload. By uploading,
          you grant us a temporary, limited license to process the image solely to generate your
          pattern. Images are deleted within 30&nbsp;minutes and are never shared.
        </p>
        <p>
          <strong>Generated patterns:</strong> The knitting patterns generated from your images are
          yours to use freely for personal or commercial knitting projects. We claim no ownership
          over your generated patterns.
        </p>
      </Section>

      <Section title="Disclaimer of Warranties">
        <p>
          The service is provided &ldquo;as is&rdquo; without warranty of any kind. We do not
          guarantee that patterns will be free of errors, that yarn estimates will be exact, or that
          the service will be available at all times. Knitting results depend on your gauge, yarn
          choice, and skill level.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Knit It and its operators shall not be liable for
          any indirect, incidental, special, or consequential damages arising from your use of the
          service, including but not limited to costs of yarn, wasted materials, or unsatisfactory
          knitting results.
        </p>
      </Section>

      <Section title="Third-Party Links">
        <p>
          Pattern results may include affiliate links to yarn suppliers (e.g. Amazon Associates).
          These are third-party sites with their own terms and privacy policies. We are not
          responsible for the content or practices of linked sites.
        </p>
      </Section>

      <Section title="Advertising">
        <p>
          The service may display advertisements served by Google AdSense. Advertisement content is
          determined by Google and is subject to{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700"
          >
            Google&rsquo;s advertising policies
          </a>
          .
        </p>
      </Section>

      <Section title="Changes to Terms">
        <p>
          We may update these terms at any time. Continued use of the service after changes are
          posted constitutes acceptance of the updated terms. The &ldquo;last updated&rdquo; date
          above will reflect the most recent revision.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For questions about these terms, email{' '}
          <a href="mailto:legal@knitit.app" className="text-brand-600 underline hover:text-brand-700">
            legal@knitit.app
          </a>
          .
        </p>
      </Section>

      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link
          to="/"
          className="text-sm text-brand-600 hover:text-brand-700 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          ← Back to Knit It
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
