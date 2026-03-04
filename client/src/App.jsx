import { usePattern } from './hooks/usePattern.js';
import ImageUpload from './components/ImageUpload.jsx';
import PatternConfig from './components/PatternConfig.jsx';
import PatternPreview from './components/PatternPreview.jsx';
import ColorLegend from './components/ColorLegend.jsx';

export default function App() {
  const {
    status,
    error,
    pattern,
    uploadedFileName,
    upload,
    generate,
    getDownloadUrl,
    reset,
  } = usePattern();

  const showConfig = ['uploaded', 'generating', 'ready', 'error'].includes(status) && status !== 'idle';
  const showPreview = status === 'ready' && pattern;
  const downloadUrl = getDownloadUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h1 className="text-xl font-display font-bold text-gray-900">
              Knit<span className="text-brand-600"> It</span>
            </h1>
          </div>
          {status !== 'idle' && (
            <button
              onClick={reset}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero section — visible when idle */}
        {status === 'idle' && (
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-3">
              Turn any image into a<br />
              <span className="text-brand-600">knitting pattern</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Upload a photo, drawing, or logo and get a professional colorwork chart
              with yarn estimates, gauge notes, and a print-ready PDF.
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-medium">Error:</span> {error}
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
            {/* Left sidebar — config */}
            <div className="space-y-6">
              {/* Upload summary */}
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{uploadedFileName}</p>
                  <p className="text-xs text-green-600">Ready to configure</p>
                </div>
              </div>

              <PatternConfig onGenerate={generate} status={status} />

              {/* Download button */}
              {showPreview && downloadUrl && (
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
            </div>

            {/* Right area — preview */}
            <div className="space-y-6">
              {status === 'generating' && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-brand-500 mx-auto mb-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-500">Analyzing image and generating pattern...</p>
                  </div>
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
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
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

        {/* Feature highlights — visible on idle */}
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

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-6 text-center text-xs text-gray-400">
        Knit It — Image to Knitting Pattern Generator
      </footer>
    </div>
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
