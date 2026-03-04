export default function ColorLegend({ pattern }) {
  if (!pattern) return null;

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
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs text-gray-400 font-mono">{color.hex}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-700">{color.label}</td>
                <td className="px-3 py-2 text-gray-600">{pattern.colorPercentages[i]}%</td>
                <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">~{pattern.colorYardages[i]}</td>
                <td className="px-3 py-2 text-gray-500 text-xs hidden md:table-cell">{color.yarnSuggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
