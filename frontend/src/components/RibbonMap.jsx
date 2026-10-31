/**
 * Two files drawn as vertical strips, with a band joining every region that matches exactly.
 * Positions are real token offsets, so a copied block that moved to a different place in the
 * other file shows up as a slanted band.
 */
export default function RibbonMap({ tokenCountA, tokenCountB, regions, nameA = 'File A', nameB = 'File B', height = 240 }) {
  const W = 520; const top = 34; const bottom = 10; const bar = 16; const xa = 70; const xb = W - 70 - bar;
  const inner = height - top - bottom;
  const ya = (t) => top + (inner * t) / Math.max(1, tokenCountA);
  const yb = (t) => top + (inner * t) / Math.max(1, tokenCountB);
  const mid = (xa + bar + xb) / 2;
  const trim = (s) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full max-w-xl" role="img" aria-label={`Matching regions between ${nameA} and ${nameB}`}>
      <text x={xa + bar / 2} y="18" textAnchor="middle" fontSize="12" fontWeight="600" fill="#10294A">{trim(nameA)}</text>
      <text x={xb + bar / 2} y="18" textAnchor="middle" fontSize="12" fontWeight="600" fill="#10294A">{trim(nameB)}</text>
      <rect x={xa} y={top} width={bar} height={inner} fill="#E7EEF2" stroke="#B9C9D5" />
      <rect x={xb} y={top} width={bar} height={inner} fill="#E7EEF2" stroke="#B9C9D5" />
      {regions.map((r, i) => {
        const a0 = ya(r.aTokenStart); const a1 = Math.max(ya(r.aTokenStart + r.tokenCount), a0 + 2);
        const b0 = yb(r.bTokenStart); const b1 = Math.max(yb(r.bTokenStart + r.tokenCount), b0 + 2);
        const d = `M${xa + bar} ${a0} C${mid} ${a0} ${mid} ${b0} ${xb} ${b0} L${xb} ${b1} C${mid} ${b1} ${mid} ${a1} ${xa + bar} ${a1} Z`;
        return (
          <g key={i}>
            <path d={d} fill="#D62839" fillOpacity="0.2" stroke="#D62839" strokeOpacity="0.55" strokeWidth="1"><title>{`${r.tokenCount} tokens match`}</title></path>
            <rect x={xa} y={a0} width={bar} height={a1 - a0} fill="#D62839" />
            <rect x={xb} y={b0} width={bar} height={b1 - b0} fill="#D62839" />
          </g>
        );
      })}
      <text x={xa - 8} y={top + 9} textAnchor="end" fontSize="10" fill="#677D93">start</text>
      <text x={xa - 8} y={top + inner} textAnchor="end" fontSize="10" fill="#677D93">end</text>
    </svg>
  );
}
