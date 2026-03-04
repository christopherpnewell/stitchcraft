import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'What file types can I upload?',
    a: 'JPEG, PNG, and WebP images up to 10 MB. For best results, use a clear image with good contrast.',
  },
  {
    q: 'How wide should I make my pattern?',
    a: 'It depends on your project. A scarf might be 30–60 stitches wide, a pillow 60–100, and a blanket 100–200. Wider patterns capture more detail but take longer to knit.',
  },
  {
    q: 'What is stitch gauge and why does it matter?',
    a: 'Gauge is the number of stitches and rows per 4 inches (10 cm) in your chosen yarn. Knit It uses your gauge to correct the aspect ratio — knit stitches are wider than tall, so the chart must compensate to keep your finished piece looking like the original image.',
  },
  {
    q: 'How many colors should I use?',
    a: 'Fewer colors (2–4) give a bold, graphic look and are easier to knit. More colors (8–12) capture subtle gradients and photo realism but require more yarn management. Start with 4–6 colors for a good balance.',
  },
  {
    q: 'What does "Smooth isolated stitches" do?',
    a: 'It removes single-stitch color changes that would be impractical to knit. These "orphan stitches" create floats that are too long on the back of the work and look messy. Smoothing replaces them with the surrounding color.',
  },
  {
    q: 'Does background removal work on all images?',
    a: 'It works best when the subject is clearly distinct from a relatively uniform background. Complex or busy backgrounds may not separate cleanly. You can always try it and re-generate without it if the result is not what you want.',
  },
  {
    q: 'What project types are available?',
    a: 'Blanket/afghan, scarf/cowl, pillow/cushion, wall hanging/tapestry, sweater panels (back, left chest, right chest), and tote bag. Each type includes project-specific construction instructions and materials lists in the PDF.',
  },
  {
    q: 'Is Knit It free?',
    a: 'Yes! Knit It is currently in free beta. All features — including wide patterns, many colors, background removal, and sweater templates — are available at no cost during the beta period.',
  },
  {
    q: 'Are my images stored or shared?',
    a: 'No. Uploaded images are processed in memory and temporarily cached for your session only. They are automatically deleted after you download your pattern or after 30 minutes, whichever comes first. We collect only anonymous usage statistics (no images, no personal data).',
  },
  {
    q: 'Can I use Knit It for crochet?',
    a: 'The charts work for any grid-based fiber art — knitting, crochet, cross-stitch, or needlepoint. Just adjust the gauge to match your craft. The construction instructions are knitting-specific, but the chart and color legend are universal.',
  },
];

export default function FAQ() {
  return (
    <article className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-6">
        Frequently Asked Questions
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        Everything you need to know about turning images into knitting patterns with Knit It.
      </p>

      <div className="space-y-6">
        {FAQS.map((faq, i) => (
          <div key={i} className="border-b border-gray-100 pb-6 last:border-0">
            <h2 className="text-base font-semibold text-gray-800 mb-2">{faq.q}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
          </div>
        ))}
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
