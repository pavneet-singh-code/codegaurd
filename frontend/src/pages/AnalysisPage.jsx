import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { Empty, ErrorMessage, Loading, PageHeader, StatusBadge, fmtDate } from '../components/ui.jsx';

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({ threshold: 60, kgramSize: 5, windowSize: 4 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/assignments/${id}`), api.get(`/assignments/${id}/analyses`, { params: { limit: 20 } })])
      .then(([a, h]) => { setAssignment(a.data.assignment); setHistory(h.data.analyses); }).catch((e) => setError(errorMessage(e)));
  }, [id]);

  const run = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const res = await api.post(`/assignments/${id}/analyze`, { threshold: Number(form.threshold) / 100, kgramSize: Number(form.kgramSize), windowSize: Number(form.windowSize) });
      navigate(`/analyses/${res.data.analysis._id}`);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!assignment || !history) return error ? <ErrorMessage error={error} /> : <Loading />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Plagiarism analysis" subtitle={`${assignment.title}: ${assignment.submissionCount} student${assignment.submissionCount === 1 ? '' : 's'} have submitted`} />
      <form onSubmit={run} className="card space-y-4">
        <ErrorMessage error={error} />
        <p className="text-sm text-slate-600">Compares the latest submission of every student with every other one. Pairs at or above the threshold are marked <em>review required</em>. A high score is a reason to read the code, not proof of copying.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">Threshold (%)<input className="input mt-1" type="number" min="0" max="100" required value={form.threshold} onChange={set('threshold')} /></label>
          <label className="block text-sm font-medium">k-gram size<input className="input mt-1" type="number" min="2" max="20" required value={form.kgramSize} onChange={set('kgramSize')} /></label>
          <label className="block text-sm font-medium">Winnowing window<input className="input mt-1" type="number" min="1" max="20" required value={form.windowSize} onChange={set('windowSize')} /></label>
        </div>
        <button className="btn btn-primary" disabled={busy || assignment.submissionCount < 2}>{busy ? 'Analysing…' : 'Run analysis'}</button>
        {assignment.submissionCount < 2 && <p className="text-sm text-amber-700">At least two students must submit before an analysis can run.</p>}
      </form>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Previous analyses</h2>
      {history.length === 0 ? <Empty title="No analyses yet" /> : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {history.map((a) => (
            <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <Link className="font-medium text-indigo-700 hover:underline" to={`/analyses/${a._id}`}>{fmtDate(a.createdAt)}</Link>
              <span className="flex items-center gap-3 text-slate-600">threshold {Math.round(a.threshold * 100)}%<span>{a.flaggedPairs} of {a.totalPairsCompared} flagged</span><StatusBadge status={a.status} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
