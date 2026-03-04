export default function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
      Premium
      <span className="text-amber-700 font-normal">(free during beta)</span>
    </span>
  );
}
