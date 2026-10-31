import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import RibbonMap from '../components/RibbonMap.jsx';
import { Empty, ErrorMessage, Loading, PageHeader, Pagination, ScoreBar, StatusBadge, fmtDate, pct } from '../components/ui.jsx';

function PairDetail({ analysisId, resultId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/analyses/${analysisId}/results/${resultId}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e))); }, [analysisId, resultId]);
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Loading text="Loading matching code…" />;
  const { summary, regions } = data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {summary.totalRegions} matching region{summary.totalRegions === 1 ? '' : 's'}. Exactly matching tokens: {summary.matchedTokensA} of {summary.tokenCountA} in {data.studentA?.name}'s file, {summary.matchedTokensB} of {summary.tokenCountB} in {data.studentB?.name}'s file.
        Variable and method names are ignored, so renamed copies still match.
      </p>
      {regions.length > 0 && (
        <div className="rounded border border-slate-300 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Where the matches sit in each file</p>
          <RibbonMap tokenCountA={summary.tokenCountA} tokenCountB={summary.tokenCountB} regions={regions} nameA={data.studentA?.name} nameB={data.studentB?.name} />
          <p className="mt-1 text-xs text-slate-500">Each red band joins code that matches exactly. A slanted band means the block moved. Showing the longest {regions.length}.</p>
        </div>
      )}
      {regions.length === 0 ? <Empty title="No matching regions">The files share no run of {5} or more identical tokens.</Empty> : regions.slice(0, 8).map((r, i) => (
        <div key={i} className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs text-slate-500"><span>Region {i + 1}</span><span className="inline-block -rotate-1 font-hand text-xl leading-none text-red-600">{r.tokenCount} tokens in a row</span></div>
          <div className="grid gap-px bg-slate-200 md:grid-cols-2">
            {[['a', data.studentA], ['b', data.studentB]].map(([k, st]) => (
              <div key={k} className="bg-white">
                <div className="px-3 pt-2 text-xs font-medium text-slate-600">{st?.name}, lines {r[k].startLine}-{r[k].endLine}</div>
                <pre className="overflow-x-auto p-3 text-xs leading-5 text-slate-800">{r[k].excerpt}</pre>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">{data.note}</p>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams();
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ minScore: '', status: '', sort: 'similarityScore', order: 'desc' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/analyses/${id}`).then((r) => setMeta(r.data.analysis)).catch((e) => setError(errorMessage(e))); }, [id]);

  const loadRows = useCallback(() => {
    const params = { page, limit: 15, sort: filters.sort, order: filters.order };
    if (filters.minScore !== '') params.threshold = Number(filters.minScore) / 100;
    if (filters.status) params.status = filters.status;
    api.get(`/analyses/${id}/results`, { params }).then((r) => { setRows(r.data.results); setPagination(r.data.pagination); }).catch((e) => setError(errorMessage(e)));
  }, [id, page, filters]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const download = async () => {
    try {
      const res = await api.get(`/analyses/${id}/report.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `codeguard-analysis-${id}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(errorMessage(e)); }
  };
  const setFilter = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };

  if (!meta) return error ? <ErrorMessage error={error} /> : <Loading />;
  const stats = [['Status', <StatusBadge key="s" status={meta.status} />], ['Submissions', meta.totalSubmissions], ['Pairs compared', meta.totalPairsCompared],
    ['Flagged for review', meta.flaggedPairs], ['Threshold', `${Math.round(meta.threshold * 100)}%`], ['k-gram / window', `${meta.parameters.kgramSize} / ${meta.parameters.windowSize}`]];
  return (
    <>
      <PageHeader title="Similarity report" subtitle={`${meta.assignment?.title || ''}, run ${fmtDate(meta.createdAt)}`}>
        <Link className="btn btn-secondary" to={`/assignments/${meta.assignment?._id}/analysis`}>Back to analysis</Link>
        <button className="btn btn-primary" onClick={download}>Download CSV</button>
      </PageHeader>
      <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        This report shows how similar submissions are. It cannot prove plagiarism: short or tightly specified assignments often produce similar code independently. Read the matching code before deciding anything.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        {stats.map(([label, value]) => <div key={label} className="card !p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>)}
      </div>
      <ErrorMessage error={error} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">Minimum similarity (%)<input className="input mt-1 w-32" type="number" min="0" max="100" value={filters.minScore} onChange={setFilter('minScore')} placeholder="any" /></label>
        <label className="text-sm font-medium">Status<select className="input mt-1" value={filters.status} onChange={setFilter('status')}><option value="">All pairs</option><option value="REVIEW_REQUIRED">Review required</option><option value="NOT_FLAGGED">Not flagged</option></select></label>
        <label className="text-sm font-medium">Sort by<select className="input mt-1" value={filters.sort} onChange={setFilter('sort')}><option value="similarityScore">Similarity</option><option value="jaccard">Jaccard</option><option value="sharedFingerprintCount">Shared fingerprints</option></select></label>
        <label className="text-sm font-medium">Order<select className="input mt-1" value={filters.order} onChange={setFilter('order')}><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No pairs match these filters" /> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-slate-200"><tr><th className="th">Students</th><th className="th">Similarity</th><th className="th">Jaccard</th><th className="th">Coverage A / B</th><th className="th">Shared</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <Fragment key={r._id}>
                    <tr>
                      <td className="td font-medium">{r.studentA?.name} <span className="text-slate-400">vs</span> {r.studentB?.name}
                        <div className="text-xs font-normal text-slate-500">v{r.submissionA?.version} / v{r.submissionB?.version}</div></td>
                      <td className="td"><ScoreBar value={r.similarityScore} /></td><td className="td">{pct(r.jaccard)}</td>
                      <td className="td">{pct(r.coverageA)} / {pct(r.coverageB)}</td><td className="td">{r.sharedFingerprintCount}</td>
                      <td className="td"><StatusBadge status={r.status} /></td>
                      <td className="td text-right"><button className="btn btn-secondary" onClick={() => setOpen(open === r._id ? null : r._id)}>{open === r._id ? 'Hide code' : 'Compare code'}</button></td>
                    </tr>
                    {open === r._id && <tr><td colSpan={7} className="bg-slate-50 px-4 py-4"><PairDetail analysisId={id} resultId={r._id} /></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
      <details className="mt-8 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium">How are these numbers calculated?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Similarity</b> is the larger of Coverage A and Coverage B.</li>
          <li><b>Coverage A</b> is the share of A's fingerprints that also appear in B (and the reverse for B). It catches a copy that was padded with extra code.</li>
          <li><b>Jaccard</b> is shared fingerprints divided by all distinct fingerprints in both files.</li>
          <li>Fingerprints are hashed k-grams of normalised tokens selected by winnowing. Files with very few fingerprints are not scored.</li>
        </ul>
      </details>
    </>
  );
}
