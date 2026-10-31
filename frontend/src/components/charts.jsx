import { useId } from 'react';

const shortDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Area/line chart. data = [{ label, value }] */
export function AreaChart({ data, height = 200, color = '#17386A', labelFormat = shortDate }) {
  const gid = useId().replace(/:/g, '');
  const W = 640; const pad = { l: 30, r: 10, t: 12, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const x = (i) => pad.l + (data.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v) => pad.t + (height - pad.t - pad.b) * (1 - v / top);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z` : '';
  const step = Math.max(1, Math.round(data.length / 5));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Line chart">
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, top / 2, top].map((t) => (
        <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#D6E2E9" strokeDasharray="3 4" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#677D93">{t}</text></g>
      ))}
      {area && <path d={area} fill={`url(#${gid})`} />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {data.map((d, i) => (
        <g key={d.label}>
          {d.value > 0 && <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2"><title>{`${labelFormat(d.label)}: ${d.value}`}</title></circle>}
          {i % step === 0 && <text x={x(i)} y={height - 7} textAnchor="middle" fontSize="11" fill="#677D93">{labelFormat(d.label)}</text>}
        </g>
      ))}
    </svg>
  );
}

/** Vertical bars. data = [{ label, value, color? }] */
export function BarChart({ data, height = 200, color = '#17386A', valueFormat = (v) => v }) {
  const W = 640; const pad = { l: 8, r: 8, t: 20, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Bar chart">
      <line x1={pad.l} x2={W - pad.r} y1={height - pad.b} y2={height - pad.b} stroke="#D6E2E9" />
      {data.map((d, i) => {
        const h = ((height - pad.t - pad.b) * d.value) / max;
        const x = pad.l + i * bw + bw * 0.15;
        return (
          <g key={d.label}>
            <rect x={x} y={height - pad.b - h} width={bw * 0.7} height={Math.max(h, d.value ? 2 : 0)} rx="4" fill={d.color || color}><title>{`${d.label}: ${valueFormat(d.value)}`}</title></rect>
            {d.value > 0 && <text x={x + bw * 0.35} y={height - pad.b - h - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#344A63">{valueFormat(d.value)}</text>}
            <text x={x + bw * 0.35} y={height - 9} textAnchor="middle" fontSize="11" fill="#677D93">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal bar list. items = [{ label, value, display?, hint?, color? }] */
export function HBars({ items, max, color = 'bg-indigo-600' }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">{it.label}</span>
            <span className="shrink-0 text-slate-500">{it.display ?? it.value}{it.hint && <span className="ml-1 text-xs text-slate-400">{it.hint}</span>}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-slate-100"><div className={`h-full rounded-sm ${it.color || color}`} style={{ width: `${Math.min(100, (it.value / top) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Donut with legend. segments = [{ label, value, color }] */
export function Donut({ segments, center, caption }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const R = 42; const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Donut chart">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#E7EEF2" strokeWidth="13" />
          {total > 0 && segments.map((s) => {
            const len = (s.value / total) * C; const el = (
              <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}><title>{`${s.label}: ${s.value}`}</title></circle>
            ); offset += len; return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{center ?? total}</span>{caption && <span className="text-xs text-slate-500">{caption}</span>}</div>
      </div>
      <ul className="space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-600">{s.label}</span><span className="font-semibold">{s.value}</span></li>
        ))}
      </ul>
    </div>
  );
}
