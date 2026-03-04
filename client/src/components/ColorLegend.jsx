export default function ColorLegend({ pattern }) {
  if (!pattern) return null;

  const hasAffiliateLinks = pattern.palette.some(c => c.affiliateUrl);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">Color Legend</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Usage</th>
              <th className="px-3 py-2 hidden sm:table-cell">~Yards</th>
              <th className="px-3 py-2 hidden md:table-cell">Suggested Yarn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pattern.palette.map((color, i) => (
              <tr key={color.hex} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      role="img"
                      aria-label={`${color.label} color swatch: ${color.colorName}`}
                      className="w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs text-gray-500 font-mono">{color.hex}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-700">{color.label}</td>
                <td className="px-3 py-2 text-gray-600">{pattern.colorPercentages[i]}%</td>
                <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">~{pattern.colorYardages[i]}</td>
                <td className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <span>{color.yarnSuggestion}</span>
                    {color.affiliateUrl && (
                      <a
                        href={color.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 whitespace-nowrap"
                        title="Buy on Amazon"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                        <span className="text-xs">Buy</span>
                        <span className="sr-only">(opens in new tab)</span>
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasAffiliateLinks && (
        <p className="text-xs text-gray-500 italic">
          Yarn links may earn us a small commission at no extra cost to you.
        </p>
      )}
    </div>
  );
}
