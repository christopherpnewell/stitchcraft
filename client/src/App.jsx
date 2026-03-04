import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { usePattern } from './hooks/usePattern.js';
import ImageUpload from './components/ImageUpload.jsx';
import PatternConfig from './components/PatternConfig.jsx';
import PatternPreview from './components/PatternPreview.jsx';
import ColorLegend from './components/ColorLegend.jsx';
import Tips from './components/Tips.jsx';
import AdBanner from './components/AdBanner.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import FAQ from './pages/FAQ.jsx';
import About from './pages/About.jsx';

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Skip to content link for keyboard/screen reader users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-md focus:text-brand-600 focus:font-medium">
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-gray-900">
              Knit<span className="text-brand-600"> It</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm">
            <Link to="/how-it-works" className="text-gray-500 hover:text-gray-700 transition-colors hidden sm:inline">How It Works</Link>
            <Link to="/faq" className="text-gray-500 hover:text-gray-700 transition-colors hidden sm:inline">FAQ</Link>
            <Link to="/about" className="text-gray-500 hover:text-gray-700 transition-colors hidden sm:inline">About</Link>
          </nav>
        </div>
      </header>

      {/* Top ad banner */}
      {isHome && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <AdBanner slot={window.__AD_SLOT_TOP__} />
        </div>
      )}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <footer className="border-t border-gray-100 mt-16 py-6 text-center text-xs text-gray-400 space-y-2">
        <nav aria-label="Footer navigation" className="flex justify-center gap-4 sm:hidden mb-2">
          <Link to="/how-it-works" className="hover:text-gray-600">How It Works</Link>
          <Link to="/faq" className="hover:text-gray-600">FAQ</Link>
          <Link to="/about" className="hover:text-gray-600">About</Link>
        </nav>
        <p>Knit It — Image to Knitting Pattern Generator</p>
        <p>We collect anonymous usage statistics to improve Knit It. No images or personal information are stored.</p>
      </footer>
    </div>
  );
}

function HomePage() {
  const {
    status,
    error,
    pattern,
    uploadedFileName,
    suggestions,
    upload,
    generate,
    getDownloadUrl,
    reset,
  } = usePattern();

  const showConfig = ['uploaded', 'generating', 'ready', 'error'].includes(status) && status !== 'idle';
  const showPreview = (status === 'ready' || status === 'generating') && pattern;
  const downloadUrl = getDownloadUrl();

  const badgeInfo = (() => {
    switch (status) {
      case 'uploading':
        return { text: 'Uploading...', color: 'blue' };
      case 'generating':
        return { text: 'Generating pattern...', color: 'blue' };
      case 'ready':
        return { text: 'Pattern ready', color: 'green' };
      case 'error':
        return { text: 'Something went wrong', color: 'red' };
      default:
        return null;
    }
  })();

  const badgeColors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };

  const badgeIconColors = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Start Over button */}
      {status !== 'idle' && (
        <div className="flex justify-end mb-4">
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Hero section */}
      {status === 'idle' && (
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-3">
            Turn any image into a<br />
            <span className="text-brand-600">knitting pattern</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Upload a photo, drawing, or logo and get a professional colorwork chart
            with yarn estimates, gauge notes, and a print-ready PDF.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span><span className="font-medium">Error:</span> {error}</span>
        </div>
      )}

      {/* Upload area */}
      {(status === 'idle' || status === 'uploading') && (
        <div className="max-w-xl mx-auto">
          <ImageUpload onUpload={upload} status={status} />
        </div>
      )}

      {/* Config + Preview layout */}
      {showConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* Left sidebar */}
          <div className="space-y-5">
            {/* Status badge */}
            {badgeInfo && (
              <div aria-live="polite" className={`flex items-center gap-3 p-3 border rounded-xl ${badgeColors[badgeInfo.color]}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${badgeIconColors[badgeInfo.color]}`}>
                  {badgeInfo.color === 'green' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {badgeInfo.color === 'blue' && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {badgeInfo.color === 'red' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                  <p className="text-xs opacity-80">{badgeInfo.text}</p>
                </div>
              </div>
            )}

            <PatternConfig
              onGenerate={generate}
              status={status}
              suggestions={suggestions}
            />

            {/* Download button */}
            {pattern && downloadUrl && (
              <a
                href={downloadUrl}
                className="
                  block w-full py-3 rounded-xl text-center font-semibold text-base
                  bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm
                  hover:shadow-md active:scale-[0.98]
                "
              >
                Download PDF Pattern
              </a>
            )}

            {/* Sidebar ad */}
            <AdBanner slot={window.__AD_SLOT_SIDEBAR__} className="hidden lg:flex" />

            {/* Tips */}
            <Tips />
          </div>

          {/* Right area — preview */}
          <div className="space-y-6">
            {status === 'generating' && !pattern && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <svg className="animate-spin h-10 w-10 text-brand-500 mx-auto mb-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-500">Analyzing image and generating pattern...</p>
                </div>
              </div>
            )}

            {status === 'generating' && pattern && (
              <div className="flex items-center gap-2 text-sm text-brand-600 mb-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating preview...</span>
              </div>
            )}

            {showPreview && (
              <>
                <PatternPreview pattern={pattern} />
                <ColorLegend pattern={pattern} />
              </>
            )}

            {status === 'uploaded' && !pattern && (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M12 4v16M16 4v16" />
                  </svg>
                  <p>Configure your settings and hit<br /><span className="font-medium text-gray-500">Generate Pattern</span> to see the preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature highlights */}
      {status === 'idle' && (
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Feature
            title="Aspect Ratio Correct"
            desc="Accounts for non-square knit stitches so your finished piece looks right"
          />
          <Feature
            title="Smart Color Quantization"
            desc="K-means clustering produces faithful color palettes from any image"
          />
          <Feature
            title="Print-Ready PDF"
            desc="Professional chart with legend, yarn suggestions, and gauge notes"
          />
        </div>
      )}
    </main>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">404</h1>
      <p className="text-gray-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/" className="inline-block px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
        Back to Home
      </Link>
    </main>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="text-center p-5">
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  );
}
