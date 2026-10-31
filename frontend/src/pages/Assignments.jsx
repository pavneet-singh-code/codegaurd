import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStats } from '../context/StatsContext.jsx';
import { Badge, Empty, ErrorMessage, Loading, PageHeader, StatCard, StatStrip, StatusBadge, dueText, fmtDate } from '../components/ui.jsx';
import Icon from '../components/icons.jsx';

export default function Assignments() {
  const { user } = useAuth();
  const { stats } = useStats();
  const isProf = user.role === 'PROFESSOR';
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const q = params.get('q') || '';
  const [status, setStatus] = useState('');
  const [lang, setLang] = useState('');

  useEffect(() => { api.get('/assignments', { params: { limit: 100 } }).then((r) => setList(r.data.assignments)).catch((e) => setError(errorMessage(e))); }, []);
  const stateById = useMemo(() => new Map((!isProf && stats ? stats.assignments : []).map((a) => [a._id, a])), [stats, isProf]);

  if (error) return <ErrorMessage error={error} />;
  if (!list) return <Loading />;
  const shown = list.filter((a) => (!q || a.title.toLowerCase().includes(q.toLowerCase())) && (!status || a.status === status) && (!lang || a.programmingLanguage === lang));
  const t = stats?.totals;
  return (
    <>
      <PageHeader title="Assignments" subtitle={isProf ? 'Everything you have published.' : 'Everything your professors have published.'}>
        {isProf && <Link className="btn btn-primary" to="/assignments/new">New assignment</Link>}
      </PageHeader>
      {t && (isProf ? (
        <StatStrip>
          <StatCard label="Total" value={t.assignments} icon="book" /><StatCard label="Open" value={t.open} icon="clock" tone="emerald" />
          <StatCard label="Closed" value={t.closed} icon="lock" tone="rose" />
          <StatCard label="Avg. students per assignment" value={t.assignments ? (t.latestSubmissions / t.assignments).toFixed(1) : '0'} icon="users" tone="sky" />
        </StatStrip>
      ) : (
        <StatStrip>
          <StatCard label="Published" value={t.assignments} icon="book" /><StatCard label="Open now" value={t.open} icon="clock" tone="emerald" />
          <StatCard label="Handed in" value={t.submitted} icon="check" tone="violet" /><StatCard label="To do" value={t.pending} icon="flag" tone="amber" />
        </StatStrip>
      ))}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Filter by title" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} /></div>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select>
        <select className="input !w-auto" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">Any language</option><option value="java">Java</option><option value="python">Python</option></select>
        <span className="ml-auto text-sm text-slate-500">{shown.length} of {list.length}</span>
      </div>
      {shown.length === 0 ? <Empty title="No assignments match">{list.length === 0 ? (isProf ? 'Create your first assignment to get started.' : 'Nothing has been published yet.') : 'Try clearing the filters.'}</Empty> : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((a) => {
            const mine = stateById.get(a._id);
            return (
              <div key={a._id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-3"><Link to={`/assignments/${a._id}`} className="text-lg font-semibold text-slate-900 hover:text-indigo-700">{a.title}</Link><StatusBadge status={a.status} /></div>
                <p className="mt-1 text-sm capitalize text-slate-500">{a.programmingLanguage}{a.professor?.name && !isProf ? `, ${a.professor.name}` : ''}</p>
                <p className="mt-3 line-clamp-2 flex-1 text-sm text-slate-600">{a.description || 'No instructions provided.'}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
                  <span className="text-slate-500">{fmtDate(a.deadline)} <span className="text-xs">({dueText(a.deadline)})</span></span>
                  {isProf ? <Badge tone="blue">{a.submissionCount} submitted</Badge> : mine?.submitted ? <Badge tone="green">Submitted v{mine.versions}</Badge> : a.status === 'OPEN' ? <Link className="btn btn-primary !py-1.5" to={`/assignments/${a._id}/submit`}>Submit</Link> : <Badge tone="red">Missed</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
