import { Link } from 'react-router-dom';

export default function HowItWorks() {
  return (
    <article className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
        How <span className="text-brand-600">Knit It</span> Works
      </h1>

      <p className="text-lg text-gray-600 mb-10">
        Knit It converts any image — a photo, drawing, or logo — into a professional
        colorwork knitting chart in three simple steps.
      </p>

      <div className="space-y-10">
        <Step number={1} title="Upload Your Image">
          <p>
            Drag and drop or tap to select a JPEG, PNG, or WebP image (up to 10 MB).
            Knit It analyzes the image to suggest optimal grid width, number of colors,
            and whether background removal would help.
          </p>
        </Step>

        <Step number={2} title="Customize Your Pattern">
          <p>
            Adjust width (30–200 stitches), number of yarn colors (2–12), yarn weight
            gauge preset, and project type (blanket, scarf, pillow, wall hanging, sweater panel, or tote bag).
            Toggle options like background removal, detail enhancement, and stitch smoothing.
          </p>
        </Step>

        <Step number={3} title="Preview & Download">
          <p>
            Knit It generates a pixel-perfect colorwork chart with accurate stitch aspect ratio.
            View the chart on screen with a full color legend including yarn suggestions,
            then download a print-ready PDF with row-by-row instructions, yardage estimates,
            and construction notes for your chosen project type.
          </p>
        </Step>
      </div>

      <div className="mt-12 p-6 bg-brand-50 rounded-xl border border-brand-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Under the Hood</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>K-means++ clustering</strong> reduces the image to your chosen palette size while preserving faithful color representation.</li>
          <li><strong>Aspect ratio correction</strong> accounts for non-square knit stitches — your finished piece matches the original image proportions.</li>
          <li><strong>Stitch smoothing</strong> removes isolated single-stitch color changes that would be impractical to knit.</li>
          <li><strong>Smart background removal</strong> detects and removes solid backgrounds using edge-color sampling and alpha masking.</li>
        </ul>
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors"
        >
          Try It Now
        </Link>
      </div>
    </article>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
        <div className="text-gray-600">{children}</div>
      </div>
    </div>
  );
}
