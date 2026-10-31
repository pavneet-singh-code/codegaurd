import Icon from './icons.jsx';
export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const pct = (x) => `${(x * 100).toFixed(1)}%`;

export function Loading({ text = 'Loading…' }) {
  return <p className="py-10 text-center text-sm text-slate-500" role="status">{text}</p>;
}
export function ErrorMessage({ error }) {
  if (!error) return null;
  return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>;
}
export function Empty({ title, children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
const tones = { green: 'bg-emerald-100 text-emerald-800', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-900', slate: 'bg-slate-100 text-slate-700', blue: 'bg-indigo-100 text-indigo-800' };
export function Badge({ tone = 'slate', children }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
      <div className="flex gap-2">
        <button className="btn btn-secondary" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button>
        <button className="btn btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
}
export function StatusBadge({ status }) {
  const map = { OPEN: 'green', CLOSED: 'slate', SUBMITTED: 'green', SUPERSEDED: 'slate', COMPLETED: 'green', RUNNING: 'amber', FAILED: 'red', REVIEW_REQUIRED: 'amber', NOT_FLAGGED: 'slate' };
  const label = { REVIEW_REQUIRED: 'Review required', NOT_FLAGGED: 'Not flagged' }[status] || status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge tone={map[status] || 'slate'}>{label}</Badge>;
}

export const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
export const dueText = (d) => { const n = daysUntil(d); return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? 'due today' : n === 1 ? 'due tomorrow' : `due in ${n} days`; };

const valueTone = { rose: 'text-red-600', amber: 'text-amber-700', emerald: 'text-emerald-700' };
// A "ledger" cell: the strip is one ruled sheet, not a row of separate cards.
export function StatCard({ label, value, hint, tone }) {
  return (
    <div className="bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-4xl font-extrabold tabular-nums tracking-tight ${valueTone[tone] || 'text-ink'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card border-t-[3px] !border-t-ink ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><h2 className="text-base font-bold text-ink">{title}</h2>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function ScoreBar({ value }) {
  const color = value >= 0.8 ? 'bg-red-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-sm bg-slate-200"><div className={`h-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} /></div>
      <span className="font-semibold tabular-nums">{pct(value)}</span>
    </div>
  );
}
export function StatStrip({ children }) {
  return <div className="mb-8 grid grid-cols-1 gap-px overflow-hidden rounded border border-slate-300 bg-slate-300 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
