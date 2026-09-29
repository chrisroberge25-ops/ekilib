export function BalanceRing({
  parts,
  score,
  label,
  light = false,
}: {
  parts: { color: string; value: number }[];
  score: number;
  label: string;
  light?: boolean;
}) {
  const total = parts.reduce((sum, part) => sum + Math.max(part.value, 0), 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const track = light ? "rgba(12,35,64,0.08)" : "rgba(246,240,230,0.16)";
  const scoreFill = light ? "#0c2340" : "#f6f0e6";
  const labelFill = light ? "#a8742e" : "#d4a054";

  return (
    <svg viewBox="0 0 180 180" className="h-44 w-44" role="img" aria-label={`${label} ${score}`}>
      <circle cx="90" cy="90" r={radius} fill="none" stroke={track} strokeWidth="14" />
      {total > 0
        ? parts.map((part, index) => {
            const length = (part.value / total) * circumference;
            const visible = Math.max(length - 3, 0);
            const node = (
              <circle
                key={`${part.color}-${index}`}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth="14"
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform="rotate(-90 90 90)"
              />
            );
            offset += length;
            return node;
          })
        : null}
      <text x="90" y="88" textAnchor="middle" fill={scoreFill} fontSize="32" fontFamily="Fraunces, Georgia, serif">
        {score}
      </text>
      <text x="90" y="110" textAnchor="middle" fill={labelFill} fontSize="11" fontFamily="Outfit, sans-serif">
        {label}
      </text>
    </svg>
  );
}
