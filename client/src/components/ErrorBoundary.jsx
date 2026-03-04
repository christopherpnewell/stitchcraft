import { Component } from 'react';

/**
 * Top-level error boundary. Catches render errors and shows a friendly fallback
 * with a "Reload" button rather than a white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log for debugging without exposing details to the user
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-6">
              <svg className="w-9 h-9 text-white" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="none"/>
                <circle cx="14" cy="17" r="9" fill="white" opacity="0.92"/>
                <path d="M5.5 14 Q14 11.5 22.5 14" stroke="#d92668" strokeWidth="1.2" fill="none"/>
                <path d="M5.5 20 Q14 22.5 22.5 20" stroke="#d92668" strokeWidth="1.2" fill="none"/>
                <path d="M12 8.5 Q16 17 12 25.5" stroke="#d92668" strokeWidth="1.2" fill="none"/>
                <path d="M20 8.5 Q16 17 20 25.5" stroke="#d92668" strokeWidth="1.2" fill="none"/>
                <line x1="20" y1="7" x2="27" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="27" cy="27" r="2.5" fill="white"/>
                <line x1="25" y1="7" x2="18" y2="27" stroke="#fce7f3" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="18" cy="27" r="2.5" fill="#fce7f3"/>
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-500 mb-6">
              An unexpected error occurred. Reloading the page usually fixes this.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
