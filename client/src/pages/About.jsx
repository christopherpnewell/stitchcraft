import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  useEffect(() => {
    document.title = 'About — Knit It';
  }, []);

  return (
    <main id="main-content" className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
        About <span className="text-brand-600">Knit It</span>
      </h1>

      <div className="space-y-6 text-gray-600 leading-relaxed">
        <p className="text-lg">
          Knit It is a free web tool that converts any image into a colorwork knitting pattern.
          Upload a photo, logo, or drawing and get a print-ready PDF chart with yarn suggestions,
          yardage estimates, and project-specific construction instructions.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 pt-4">Why We Built This</h2>
        <p>
          Designing colorwork patterns from images has always been tedious — tracing grids by hand,
          counting stitches, eyeballing colors. Existing tools often ignore stitch aspect ratio,
          producing charts that look great on screen but knit up distorted.
        </p>
        <p>
          Knit It solves this with aspect-ratio-correct chart generation, smart color quantization,
          and practical features like stitch smoothing and background removal. The goal is simple:
          let crafters focus on knitting, not on pixel math.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 pt-4">Features</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>K-means++ color quantization for faithful palettes</li>
          <li>Aspect ratio correction for non-square stitches</li>
          <li>Stitch smoothing to remove impractical single-stitch color changes</li>
          <li>Background removal for photos with busy backgrounds</li>
          <li>Detail enhancement for low-resolution source images</li>
          <li>8 project types with construction instructions</li>
          <li>Yarn suggestions with yardage estimates</li>
          <li>Print-ready PDF with chart, legend, and notes</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 pt-4">Privacy</h2>
        <p>
          Your images are processed server-side and automatically deleted after download or 30 minutes.
          We never store images, IP addresses, or personal information. Anonymous usage statistics
          (e.g., how many patterns are generated per day) help us improve the tool.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 pt-4">Open Beta</h2>
        <p>
          Knit It is currently in free open beta. All features, including premium ones like wide patterns,
          many-color palettes, background removal, and sweater templates, are unlocked at no cost.
        </p>
      </div>

      <div className="mt-10 text-center space-y-3">
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Get Started
        </Link>
        <p className="text-sm text-gray-500">
          Learn more: <Link to="/how-it-works" className="text-brand-600 hover:text-brand-700 underline rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">How It Works</Link> | <Link to="/faq" className="text-brand-600 hover:text-brand-700 underline rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">FAQ</Link>
        </p>
      </div>
    </main>
  );
}
